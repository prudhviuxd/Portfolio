package app.raga.assistant

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
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlinx.coroutines.flow.MutableStateFlow
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
object RagaStatus {
    val running = MutableStateFlow(false)
    val state = MutableStateFlow("Stopped")
    val log = MutableStateFlow<List<String>>(emptyList())

    fun add(line: String) {
        val ts = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
        log.value = (listOf("$ts  $line") + log.value).take(60)
        Log.i("Raga", line)
    }
}

/**
 * Always-on listener. Runs as a foreground service with a microphone, recognises speech
 * fully offline with Vosk, checks every utterance against the owner's voice print, and
 * acts on commands that start with the wake word.
 */
class RagaService : Service(), RecognitionListener {

    private val main = Handler(Looper.getMainLooper())
    private lateinit var prefs: Prefs
    private lateinit var executor: CommandExecutor

    private var model: Model? = null
    private var spkModel: SpeakerModel? = null
    private var speech: SpeechService? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var speaking = 0

    // conversation state
    private var awakeUntil = 0L
    private var followUp: FollowUp? = null
    private var followUpUntil = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        executor = CommandExecutor(this) { stopSelf() }
        tts = TextToSpeech(this) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(id: String?) {}
                override fun onDone(id: String?) = main.post { doneSpeaking() }.let {}
                @Deprecated("Deprecated in Java")
                override fun onError(id: String?) = main.post { doneSpeaking() }.let {}
            })
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        goForeground("Starting…")
        if (speech == null) loadAndListen()
        return START_STICKY
    }

    private fun goForeground(text: String) {
        val type = if (Build.VERSION.SDK_INT >= 30) ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE else 0
        ServiceCompat.startForeground(this, NOTIF_ID, notification(text), type)
    }

    private fun notification(text: String): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Raga listening", NotificationManager.IMPORTANCE_LOW))
        }
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, RagaService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle("Raga is listening")
            .setContentText(text)
            .setOngoing(true)
            .setContentIntent(open)
            .addAction(0, "Stop", stop)
            .build()
    }

    private fun updateNotification(text: String) {
        RagaStatus.state.value = text
        getSystemService(NotificationManager::class.java).notify(NOTIF_ID, notification(text))
    }

    private fun loadAndListen() {
        val modelId = prefs.modelName
        if (!ModelManager.isInstalled(this, modelId) || !ModelManager.isInstalled(this, ModelManager.SPEAKER_MODEL.id)) {
            RagaStatus.add("Models not downloaded. Open the app and download them first.")
            stopSelf()
            return
        }
        updateNotification("Loading speech model…")
        Thread {
            try {
                val m = Model(ModelManager.dir(this, modelId).absolutePath)
                val s = SpeakerModel(ModelManager.dir(this, ModelManager.SPEAKER_MODEL.id).absolutePath)
                main.post {
                    model = m; spkModel = s
                    startRecognizer()
                }
            } catch (e: Exception) {
                main.post {
                    RagaStatus.add("Failed to load model: ${e.message}")
                    stopSelf()
                }
            }
        }.start()
    }

    private fun startRecognizer() {
        try {
            val rec = Recognizer(model, SAMPLE_RATE, spkModel)
            speech = SpeechService(rec, SAMPLE_RATE).also { it.startListening(this) }
            RagaStatus.running.value = true
            updateNotification("Say \"${prefs.wakeWords.firstOrNull() ?: "raga"}\" and a command")
            RagaStatus.add("Listening. Wake words: ${prefs.wakeWords.joinToString()}")
            if (prefs.voicePrint == null) RagaStatus.add("⚠ No voice enrolled yet — anyone can give commands.")
        } catch (e: Exception) {
            RagaStatus.add("Microphone error: ${e.message}")
            stopSelf()
        }
    }

    // ------------------------------------------------------------------ recognition callbacks

    override fun onPartialResult(hypothesis: String?) {}

    override fun onResult(hypothesis: String?) {
        if (hypothesis == null || speaking > 0) return
        val json = try { JSONObject(hypothesis) } catch (_: Exception) { return }
        val text = json.optString("text").trim()
        if (text.isEmpty()) return
        val spk = json.optJSONArray("spk")?.let { a -> DoubleArray(a.length()) { a.getDouble(it) } }
        handleUtterance(text, spk)
    }

    override fun onFinalResult(hypothesis: String?) {}
    override fun onError(exception: Exception?) {
        RagaStatus.add("Recognizer error: ${exception?.message}")
    }
    override fun onTimeout() {}

    // ------------------------------------------------------------------ conversation logic

    private fun handleUtterance(text: String, spk: DoubleArray?) {
        val now = System.currentTimeMillis()
        val afterWake = CommandParser.afterWakeWord(text, prefs.wakeWords)
        val pending = followUp?.takeIf { now < followUpUntil }
        val awake = now < awakeUntil

        // Ignore background speech that is neither addressed to Raga nor a reply it is waiting for.
        if (afterWake == null && pending == null && !awake) return

        if (afterWake != null && afterWake.isEmpty() && pending == null) {
            // Just the wake word. Too short to check the voice reliably, so wake up and
            // verify the command that follows instead.
            awakeUntil = now + AWAKE_MS
            beep()
            RagaStatus.add("👂 Awake — say your command")
            return
        }

        if (!isOwner(text, spk)) return

        val command = afterWake ?: text

        if (pending != null) {
            followUp = null
            val parsed = CommandParser.parse(command)
            when (pending) {
                is FollowUp.Confirm -> when (parsed) {
                    Command.Yes -> respond(safely { pending.onYes() })
                    Command.No, Command.Cancel -> respond(Outcome("Okay, cancelled."))
                    else -> {
                        // not a yes/no: treat it as a fresh command if it was addressed to Raga
                        if (afterWake != null && afterWake.isNotEmpty()) respond(executor.execute(parsed))
                        else respond(Outcome(null, pending), reprompt = "Please say yes or no. ")
                    }
                }
                is FollowUp.Ask ->
                    if (parsed == Command.Cancel) respond(Outcome("Okay, cancelled."))
                    else respond(safely { pending.onAnswer(command) })
            }
            return
        }

        awakeUntil = 0
        val cmd = CommandParser.parse(command)
        RagaStatus.add("→ ${cmd.javaClass.simpleName}: $command")
        respond(executor.execute(cmd))
    }

    private fun safely(block: () -> Outcome): Outcome = try { block() } catch (e: SecurityException) {
        Outcome("I don't have permission for that. Open the Raga app and grant permissions.")
    } catch (e: Exception) { Outcome("Something went wrong: ${e.message}") }

    private fun isOwner(text: String, spk: DoubleArray?): Boolean {
        val print = prefs.voicePrint
        if (!prefs.verifyVoice || print == null) {
            RagaStatus.add("🗣 \"$text\"")
            return true
        }
        if (spk == null) {
            RagaStatus.add("✗ \"$text\" — too short to check the voice, ignored")
            return false
        }
        val score = VoiceProfile.cosine(spk, print)
        val ok = score >= prefs.threshold
        RagaStatus.add("${if (ok) "✓" else "✗"} \"$text\" — voice match ${"%.2f".format(score)} (need ${"%.2f".format(prefs.threshold)})")
        return ok
    }

    private fun respond(outcome: Outcome, reprompt: String = "") {
        val fu = outcome.followUp
        if (fu != null) {
            followUp = fu
            followUpUntil = System.currentTimeMillis() + FOLLOW_UP_MS
        }
        val text = listOfNotNull(outcome.say, fu?.let { reprompt + it.prompt }).joinToString(" ")
        if (text.isBlank()) { beep(); return }
        RagaStatus.add("💬 $text")
        say(text)
    }

    private fun say(text: String) {
        if (!prefs.speakReplies || !ttsReady) return
        speaking++
        speech?.setPause(true)
        tts?.speak(text, TextToSpeech.QUEUE_ADD, null, "raga-${System.nanoTime()}")
    }

    private fun doneSpeaking() {
        speaking = (speaking - 1).coerceAtLeast(0)
        if (speaking == 0) {
            // replies that ask something keep the window open from when Raga stops talking
            if (followUp != null) followUpUntil = System.currentTimeMillis() + FOLLOW_UP_MS
            speech?.setPause(false)
        }
    }

    private fun beep() {
        try {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 60).apply {
                startTone(ToneGenerator.TONE_PROP_BEEP, 120)
                main.postDelayed({ release() }, 300)
            }
        } catch (_: Exception) {
        }
    }

    override fun onDestroy() {
        speech?.stop()
        speech?.shutdown()
        speech = null
        model?.close()
        spkModel?.close()
        tts?.shutdown()
        executor.release()
        RagaStatus.running.value = false
        RagaStatus.state.value = "Stopped"
        RagaStatus.add("Stopped listening.")
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "raga"
        private const val NOTIF_ID = 7
        private const val SAMPLE_RATE = 16000f
        private const val AWAKE_MS = 8_000L
        private const val FOLLOW_UP_MS = 12_000L
        const val ACTION_STOP = "app.raga.assistant.STOP"

        fun start(context: Context) {
            val i = Intent(context, RagaService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
        }

        fun stop(context: Context) {
            context.startService(Intent(context, RagaService::class.java).setAction(ACTION_STOP))
        }
    }
}
