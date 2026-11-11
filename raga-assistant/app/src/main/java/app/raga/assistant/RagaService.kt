package app.raga.assistant

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlinx.coroutines.flow.MutableStateFlow
import org.json.JSONArray
import org.json.JSONObject
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.SpeakerModel
import org.vosk.android.RecognitionListener
import org.vosk.android.SpeechService
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Shared, observable state for the UI. */
enum class UiPhase { OFF, WAITING, LISTENING, THINKING, SPEAKING }

object RagaStatus {
    val running = MutableStateFlow(false)
    val state = MutableStateFlow("Stopped")
    val phase = MutableStateFlow(UiPhase.OFF)
    val heard = MutableStateFlow("")
    val reply = MutableStateFlow("")
    /** 0..1 microphone level while a command is being spoken (drives the orb). */
    val level = MutableStateFlow(0f)
    val log = MutableStateFlow<List<String>>(emptyList())

    fun add(line: String) {
        val ts = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
        // kept in memory only (not logcat), since it can contain message text
        log.value = (listOf("$ts  $line") + log.value).take(60)
    }
}

/**
 * Works like "Hey Siri":
 *  1. WAKE     – a small offline listener (Vosk, restricted to the wake word) waits for "Raga"
 *                and checks that it is the owner's voice.
 *  2. COMMAND  – chime + "Listening…" card; the phone's own speech recognizer (Google) takes the
 *                command, which is far more accurate for accents, names and numbers. If the phone
 *                has none, Raga falls back to the offline recognizer.
 *  3. REPLY    – the command runs, Raga answers out loud and on the card. If it asked a question
 *                ("Shall I send it?") it listens for the answer without needing "Raga" again.
 */
class RagaService : Service(), RecognitionListener {

    private enum class Phase { IDLE, WAKE, COMMAND, REPLY }

    private val main = Handler(Looper.getMainLooper())
    private val workerThread = HandlerThread("raga-commands").apply { start() }
    private val worker = Handler(workerThread.looper)

    private lateinit var prefs: Prefs
    private lateinit var executor: CommandExecutor
    private lateinit var bubble: Bubble

    private var model: Model? = null
    private var spkModel: SpeakerModel? = null
    private var vosk: SpeechService? = null
    private var voskRec: Recognizer? = null
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private var phase = Phase.IDLE
    private var followUp: FollowUp? = null
    private var destroyed = false
    private var turnId = 0
    private var lastPartial = ""
    private var listenNowPending = false
    private var googleReady = false
    /** Set when the phone's recogniser doesn't respond; then commands use the offline one. */
    private var googleBroken = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        bubble = Bubble(this)
        executor = CommandExecutor(this) { main.post { stopSelf() } }
        tts = TextToSpeech(this) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) try { tts?.language = Locale.getDefault() } catch (_: Exception) {}
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (intent?.action == ACTION_LISTEN_NOW) {
            // tapped the orb: the owner is holding the phone, so skip the wake word and voice check
            if (phase == Phase.WAKE) { followUp = null; startCommandTurn() }
            else if (phase == Phase.IDLE) listenNowPending = true
        }
        try {
            goForeground("Starting…")
        } catch (e: Exception) {
            // Android refuses a microphone service unless the app is on screen and has mic permission.
            RagaStatus.add("Couldn't start listening: ${e.message}")
            stopSelf()
            return START_NOT_STICKY
        }
        if (model == null && phase == Phase.IDLE) loadModels()
        return START_NOT_STICKY
    }

    // ------------------------------------------------------------------ notification

    private fun goForeground(text: String) {
        val type = if (Build.VERSION.SDK_INT >= 30) ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE else 0
        ServiceCompat.startForeground(this, NOTIF_ID, notification(text), type)
    }

    private fun notification(text: String): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Raga listening", NotificationManager.IMPORTANCE_LOW))
        }
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(
            this, 1, Intent(this, RagaService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle("Raga is listening")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .addAction(0, "Stop", stop)
            .build()
    }

    private fun status(text: String) {
        RagaStatus.state.value = text
        if (!destroyed) getSystemService(NotificationManager::class.java).notify(NOTIF_ID, notification(text))
    }

    // ------------------------------------------------------------------ models

    private fun loadModels() {
        val modelId = prefs.modelName
        if (!ModelManager.isInstalled(this, modelId) || !ModelManager.isInstalled(this, ModelManager.SPEAKER_MODEL.id)) {
            RagaStatus.add("Models not downloaded. Open the app and download them first.")
            stopSelf()
            return
        }
        status("Loading…")
        Thread {
            try {
                val m = Model(ModelManager.dir(this, modelId).absolutePath)
                val s = SpeakerModel(ModelManager.dir(this, ModelManager.SPEAKER_MODEL.id).absolutePath)
                main.post {
                    if (destroyed) { m.close(); s.close(); return@post }
                    model = m; spkModel = s
                    RagaStatus.running.value = true
                    RagaStatus.add("Ready. Say \"${prefs.wakeWords.firstOrNull() ?: "raga"}\", wait for the chime, then your command.")
                    if (prefs.voicePrint == null) RagaStatus.add("⚠ Voice not set up yet — anyone can wake Raga.")
                    if (!bubble.canShow) RagaStatus.add("⚠ \"Display over other apps\" is off — Raga can't open apps from the background.")
                    if (listenNowPending) { listenNowPending = false; startCommandTurn() } else listenForWakeWord()
                }
            } catch (e: Exception) {
                main.post {
                    RagaStatus.add("Failed to load the speech model: ${e.message}. Delete and download the models again.")
                    stopSelf()
                }
            }
        }.start()
    }

    // ------------------------------------------------------------------ 1. wake word

    private fun stopVosk() {
        vosk?.stop()      // waits for the recognition thread, so freeing below is safe
        vosk?.shutdown()  // releases the microphone
        vosk = null
        voskRec?.close()
        voskRec = null
    }

    private fun listenForWakeWord() {
        if (destroyed) return
        stopVosk()
        phase = Phase.WAKE
        try {
            val words = prefs.wakeWords
            // Restricting the recogniser to the wake word(s) makes spotting "raga" far more reliable
            // than free speech recognition; everything else comes out as [unk] and is ignored.
            val grammar = JSONArray(words + "[unk]").toString()
            val rec = Recognizer(model, SAMPLE_RATE, grammar).also { it.setSpeakerModel(spkModel); voskRec = it }
            vosk = SpeechService(rec, SAMPLE_RATE).also { it.startListening(this) }
            status("Say \"${words.firstOrNull() ?: "raga"}\"")
            RagaStatus.phase.value = UiPhase.WAITING
            RagaStatus.level.value = 0f
        } catch (e: Exception) {
            RagaStatus.add("Microphone error: ${e.message}")
            stopSelf()
        }
    }

    // Vosk callbacks (main thread)
    override fun onPartialResult(hypothesis: String?) {
        if (phase != Phase.COMMAND) return
        val p = try { JSONObject(hypothesis ?: return).optString("partial") } catch (_: Exception) { return }
        if (p.isNotBlank()) { RagaStatus.heard.value = p; RagaStatus.level.value = 0.6f; bubble.show("Raga · listening…", p) }
    }
    override fun onFinalResult(hypothesis: String?) {}
    override fun onError(exception: Exception?) { RagaStatus.add("Microphone error: ${exception?.message}") }

    override fun onTimeout() {
        // only used by the offline command fallback
        if (phase == Phase.COMMAND) onCommandFailed("I didn't hear a command.")
    }

    override fun onResult(hypothesis: String?) {
        val json = try { JSONObject(hypothesis ?: return) } catch (_: Exception) { return }
        val text = json.optString("text").replace("[unk]", "").replace(Regex("\\s+"), " ").trim()
        when (phase) {
            Phase.WAKE -> onWakeCandidate(text, json)
            Phase.COMMAND -> if (text.isNotEmpty()) { stopVosk(); onCommandText(text) } // offline fallback
            else -> {}
        }
    }

    private fun onWakeCandidate(text: String, json: JSONObject) {
        if (text.isEmpty() || CommandParser.afterWakeWord(text, prefs.wakeWords) == null) return
        val spk = try {
            json.optJSONArray("spk")?.let { a -> DoubleArray(a.length()) { a.getDouble(it) } }
        } catch (_: Exception) { null }

        val print = prefs.voicePrint
        if (prefs.verifyVoice && print != null) {
            if (spk == null) {
                RagaStatus.add("✗ heard \"$text\" but couldn't check the voice — say Raga again")
                return
            }
            val score = VoiceProfile.cosine(spk, print)
            val ok = score >= prefs.threshold
            RagaStatus.add("${if (ok) "✓" else "✗"} \"$text\" — voice match ${"%.2f".format(score)} (need ${"%.2f".format(prefs.threshold)})")
            if (!ok) {
                stopVosk()
                phase = Phase.REPLY
                speakThen("Sorry, I only respond to my owner's voice.") { listenForWakeWord() }
                return
            }
        } else {
            RagaStatus.add("✓ \"$text\" (voice check off)")
        }
        followUp = null
        startCommandTurn()
    }

    // ------------------------------------------------------------------ 2. command

    private fun startCommandTurn() {
        stopVosk()
        phase = Phase.COMMAND
        val myTurn = ++turnId
        chime()
        bubble.show(if (followUp != null) "Raga · waiting for your answer" else "Raga · listening…")
        status("Listening for your command…")
        RagaStatus.phase.value = UiPhase.LISTENING
        RagaStatus.heard.value = ""
        RagaStatus.reply.value = if (followUp != null) followUp!!.prompt else ""
        // give the chime a moment so it isn't recognised as speech
        main.postDelayed({ if (turnId == myTurn && phase == Phase.COMMAND && !destroyed) listenForCommand() }, 300)
    }

    private fun listenForCommand() {
        if (prefs.offlineCommands || googleBroken || !SpeechRecognizer.isRecognitionAvailable(this)) {
            listenForCommandOffline()
            return
        }
        val myTurn = turnId
        googleReady = false
        // Watchdogs: some phones' recognisers never answer an app in the background.
        main.postDelayed({
            if (turnId == myTurn && phase == Phase.COMMAND && !googleReady) {
                RagaStatus.add("Phone speech recognizer didn't start — switching to offline recognition")
                googleBroken = true
                recognizer?.destroy(); recognizer = null
                listenForCommandOffline()
            }
        }, 2500)
        main.postDelayed({
            if (turnId == myTurn && phase == Phase.COMMAND && googleReady) {
                RagaStatus.add("Phone speech recognizer gave no result — switching to offline recognition")
                googleBroken = true
                recognizer?.destroy(); recognizer = null
                phase = Phase.REPLY
                speakThen("Sorry, say that again.") { startCommandTurn() }
            }
        }, 14000)
        val sr = recognizer ?: SpeechRecognizer.createSpeechRecognizer(this).also {
            recognizer = it
            it.setRecognitionListener(commandListener)
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
        try {
            sr.startListening(intent)
        } catch (e: Exception) {
            RagaStatus.add("Phone speech recognizer failed (${e.message}); using the offline one")
            listenForCommandOffline()
        }
    }

    /** No Google speech service on this phone: recognise the command with the offline model. */
    private fun listenForCommandOffline() {
        RagaStatus.add("Listening offline for your command")
        try {
            val rec = Recognizer(model, SAMPLE_RATE).also { voskRec = it }
            vosk = SpeechService(rec, SAMPLE_RATE).also { it.startListening(this, 8000) }
        } catch (e: Exception) {
            onCommandFailed("I couldn't use the microphone.")
        }
    }

    private val commandListener = object : android.speech.RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) { googleReady = true; RagaStatus.add("Listening (phone recognizer)") }
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) { RagaStatus.level.value = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f) }
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() { if (phase == Phase.COMMAND) bubble.show("Raga · thinking…", lastPartial) }
        override fun onEvent(eventType: Int, params: Bundle?) {}

        override fun onPartialResults(partialResults: Bundle?) {
            if (phase != Phase.COMMAND) return
            val p = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
            if (!p.isNullOrBlank()) { lastPartial = p; RagaStatus.heard.value = p; bubble.show("Raga · listening…", p) }
        }

        override fun onResults(results: Bundle?) {
            if (phase != Phase.COMMAND) return
            val options = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
                .filter { it.isNotBlank() }
            lastPartial = ""
            if (options.isEmpty()) { onCommandFailed("Sorry, I didn't catch that."); return }
            // prefer the first alternative Raga actually understands
            val best = options.firstOrNull { CommandParser.parse(stripWake(it)) !is Command.Unknown } ?: options.first()
            onCommandText(best)
        }

        override fun onError(error: Int) {
            if (phase != Phase.COMMAND) return
            lastPartial = ""
            val msg = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Sorry, I didn't catch that."
                SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
                    "I need the internet for that, or download offline speech in Google settings."
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "I need microphone permission."
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "The microphone is busy."
                else -> "Sorry, something went wrong with listening."
            }
            RagaStatus.add("Phone speech recognizer error $error")
            recognizer?.destroy(); recognizer = null
            val userIssue = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
            if (!userIssue) {
                // the recogniser itself failed (busy, refused a background app, no network…): go offline
                googleBroken = true
                listenForCommandOffline()
                return
            }
            onCommandFailed(msg)
        }
    }

    private fun stripWake(text: String) =
        CommandParser.afterWakeWord(text, prefs.wakeWords)?.takeIf { it.isNotEmpty() } ?: text

    private fun onCommandFailed(message: String) {
        stopVosk()
        followUp = null
        reply(Outcome(message))
    }

    // ------------------------------------------------------------------ 3. run + reply

    private fun onCommandText(raw: String) {
        phase = Phase.REPLY
        val text = stripWake(raw)
        RagaStatus.add("🗣 $text")
        bubble.show("Raga · you said", text)
        RagaStatus.heard.value = text
        RagaStatus.phase.value = UiPhase.THINKING
        RagaStatus.level.value = 0f
        val pending = followUp
        followUp = null
        worker.post {
            val outcome = try { decide(text, pending) } catch (e: SecurityException) {
                Outcome("I don't have permission for that. Open the Raga app and grant permissions.")
            } catch (e: Exception) {
                Outcome("Something went wrong: ${e.message ?: e.javaClass.simpleName}")
            }
            main.post { if (!destroyed) reply(outcome) }
        }
    }

    /** Runs on the worker thread. */
    private fun decide(text: String, pending: FollowUp?): Outcome {
        val cmd = CommandParser.parse(text)
        when (pending) {
            is FollowUp.Confirm -> return when (cmd) {
                Command.Yes -> pending.onYes()
                Command.No, Command.Cancel -> Outcome("Okay, cancelled.")
                else -> Outcome("Please say yes or no.", pending)
            }
            is FollowUp.Ask -> return if (cmd == Command.Cancel) Outcome("Okay, cancelled.") else pending.onAnswer(text)
            null -> {}
        }
        RagaStatus.add("→ ${cmd.javaClass.simpleName}")
        blockedReason(cmd)?.let { return Outcome(it) }
        return executor.execute(cmd)
    }

    /**
     * Sending messages or files and tapping/typing on screen need a saved voice print
     * (unless voice checking was switched off) and an unlocked phone.
     */
    private fun blockedReason(cmd: Command): String? {
        val sensitive = cmd is Command.SendSms || cmd is Command.SendWhatsApp || cmd is Command.ShareFile ||
            cmd is Command.OpenFile || cmd is Command.Click || cmd is Command.TypeText
        if (!sensitive) return null
        if (prefs.verifyVoice && prefs.voicePrint == null) {
            return "For your safety, teach Raga your voice in the app before sending messages or files."
        }
        if (getSystemService(KeyguardManager::class.java).isKeyguardLocked) return "Please unlock your phone first."
        return null
    }

    private fun reply(outcome: Outcome) {
        phase = Phase.REPLY
        val fu = outcome.followUp
        followUp = fu
        val text = listOfNotNull(outcome.say, fu?.prompt).joinToString(" ").ifBlank { "Done." }
        RagaStatus.add("💬 $text")
        bubble.show("Raga", text)
        RagaStatus.reply.value = text
        RagaStatus.phase.value = UiPhase.SPEAKING
        status(text)
        speakThen(text) {
            if (followUp != null) startCommandTurn() // Siri-style: answer without saying Raga again
            else {
                bubble.hide(1500)
                listenForWakeWord()
            }
        }
    }

    // ------------------------------------------------------------------ speech output

    private fun speakThen(text: String, then: () -> Unit) {
        val engine = tts
        var done = false
        val finish = { if (!done) { done = true; if (!destroyed) then() } }
        if (!prefs.speakReplies || !ttsReady || engine == null) {
            main.postDelayed({ finish() }, 1200L + text.length * 40L)
            return
        }
        val id = "raga-${System.nanoTime()}"
        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) { if (utteranceId == id) main.post { finish() } }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) { if (utteranceId == id) main.post { finish() } }
        })
        // safety net in case the speech engine never reports back
        main.postDelayed({ finish() }, 4000L + text.length * 120L)
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, id)
    }

    private fun chime() {
        try {
            ToneGenerator(AudioManager.STREAM_MUSIC, 70).apply {
                startTone(ToneGenerator.TONE_PROP_ACK, 150)
                main.postDelayed({ release() }, 400)
            }
        } catch (_: Exception) {
        }
    }

    override fun onDestroy() {
        destroyed = true
        phase = Phase.IDLE
        stopVosk()
        recognizer?.destroy()
        recognizer = null
        model?.close()
        spkModel?.close()
        tts?.shutdown()
        bubble.hide()
        worker.post { executor.release() }
        workerThread.quitSafely()
        RagaStatus.running.value = false
        RagaStatus.state.value = "Stopped"
        RagaStatus.phase.value = UiPhase.OFF
        RagaStatus.level.value = 0f
        RagaStatus.add("Stopped listening.")
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "raga"
        private const val NOTIF_ID = 7
        private const val SAMPLE_RATE = 16000f
        const val ACTION_STOP = "app.raga.assistant.STOP"
        const val ACTION_LISTEN_NOW = "app.raga.assistant.LISTEN_NOW"

        /** Tap-to-talk: start (if needed) and listen for a command straight away. */
        fun listenNow(context: Context) {
            val i = Intent(context, RagaService::class.java).setAction(ACTION_LISTEN_NOW)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
        }

        fun start(context: Context) {
            val i = Intent(context, RagaService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
        }

        fun stop(context: Context) {
            context.startService(Intent(context, RagaService::class.java).setAction(ACTION_STOP))
        }
    }
}
