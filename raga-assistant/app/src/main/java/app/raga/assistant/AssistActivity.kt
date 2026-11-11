package app.raga.assistant

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import app.raga.assistant.databinding.ActivityAssistBinding
import org.json.JSONObject
import org.vosk.Recognizer
import org.vosk.android.RecognitionListener
import org.vosk.android.SpeechService
import java.util.Locale

/**
 * The Siri-style card that slides up over whatever app is open. Opened by the wake word,
 * the floating Raga button, the orb, or the phone's assistant gesture (long-press power /
 * home, or a headset button). Listening happens here, in the foreground, where the phone's
 * Google speech recogniser works properly.
 */
class AssistActivity : AppCompatActivity() {

    private lateinit var b: ActivityAssistBinding
    private val main = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var pendingSpeech: Pair<String, () -> Unit>? = null
    private var offline: SpeechService? = null
    private var offlineRec: Recognizer? = null
    private var turn = 0
    private var googleReady = false
    private var finished = false
    private var vocabulary: ArrayList<String> = arrayListOf()
    /** Typing to Raga: keep the card open for a back-and-forth instead of closing after each answer. */
    private var chatMode = false
        set(v) {
            field = v
            b.chatScroll.visibility = if (v && chatLog.isNotEmpty()) View.VISIBLE else View.GONE
            b.orb.layoutParams = b.orb.layoutParams.apply { val s = if (v) 90 else 150; width = dp(s); height = dp(s) }
        }
    private val chatLog = StringBuilder()

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun addChat(who: String, text: String) {
        if (chatLog.isNotEmpty()) chatLog.append("\n\n")
        chatLog.append(who).append("  ").append(text)
        b.chat.text = chatLog
        b.chatScroll.visibility = View.VISIBLE
        b.chatScroll.post { b.chatScroll.fullScroll(View.FOCUS_DOWN) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 27) setShowWhenLocked(true)
        b = ActivityAssistBinding.inflate(layoutInflater)
        setContentView(b.root)
        // keep the card above the gesture / navigation bar
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(b.root) { v, insets ->
            val bars = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        b.root.setOnClickListener { close() }       // tap outside the card
        b.card.setOnClickListener { }               // taps on the card don't close it
        b.orb.setOnClickListener { chatMode = false; hideKeyboard(); listen() } // tap the orb to speak again
        b.close.setOnClickListener { close() }
        b.input.setOnFocusChangeListener { _, focused ->
            if (focused) { chatMode = true; turn++; stopListening(); ui(UiPhase.WAITING) }
        }
        b.send.setOnClickListener { sendTyped() }
        b.input.setOnEditorActionListener { _, _, _ -> sendTyped(); true }

        RagaService.instance?.pauseWake()           // free the microphone
        tts = TextToSpeech(this) { st ->
            ttsReady = st == TextToSpeech.SUCCESS
            if (ttsReady) try { tts?.language = Locale.getDefault() } catch (_: Exception) {}
            pendingSpeech?.let { (t, then) -> pendingSpeech = null; speakThen(t, then) }
        }
        Shared.worker.post {
            val v = ArrayList(Shared.executor(this).vocabulary())
            main.post { vocabulary = v }
        }
        start(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        start(intent)
    }

    private fun start(intent: Intent?) {
        finished = false
        // "Raga, open YouTube" said in one breath arrives already heard — but only trust it from Raga itself
        val said = intent?.getStringExtra(EXTRA_COMMAND)?.takeIf { intent.getStringExtra(EXTRA_TOKEN) == Shared.token }
        if (!said.isNullOrBlank()) process(said) else listen()
    }

    private fun sendTyped() {
        val t = b.input.text.toString().trim()
        if (t.isEmpty()) return
        chatMode = true
        b.input.setText("")
        process(t)
    }

    private fun hideKeyboard() {
        b.input.clearFocus()
        getSystemService(android.view.inputmethod.InputMethodManager::class.java)
            ?.hideSoftInputFromWindow(b.input.windowToken, 0)
    }

    // ------------------------------------------------------------------ UI state

    private fun ui(phase: UiPhase, heard: String? = null, reply: String? = null) {
        b.orb.phase = phase
        RagaStatus.phase.value = phase
        heard?.let { b.heard.text = if (it.isBlank()) "" else "“$it”"; RagaStatus.heard.value = it }
        reply?.let { b.reply.text = it; RagaStatus.reply.value = it }
        b.hint.text = when (phase) {
            UiPhase.LISTENING -> "Listening…"
            UiPhase.THINKING -> "Thinking…"
            else -> if (chatMode) "Type a message, or tap the orb to speak" else "Tap the orb to speak"
        }
        b.reply.visibility = if (b.reply.text.isNullOrBlank()) View.GONE else View.VISIBLE
    }

    // ------------------------------------------------------------------ listening

    private fun listen() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            reply(Outcome("Open Raga's settings and allow the microphone first."), closeAfter = true)
            return
        }
        stopListening()
        val myTurn = ++turn
        ui(UiPhase.LISTENING, heard = "", reply = Shared.followUp?.prompt ?: "")
        chime()
        if (Prefs(this).offlineCommands || !SpeechRecognizer.isRecognitionAvailable(this)) {
            listenOffline(); return
        }
        main.postDelayed({ if (turn == myTurn) listenGoogle(myTurn) }, 250)
    }

    private fun listenGoogle(myTurn: Int) {
        val sr = SpeechRecognizer.createSpeechRecognizer(this).also { recognizer = it }
        sr.setRecognitionListener(googleListener)
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
        if (Build.VERSION.SDK_INT >= 33 && vocabulary.isNotEmpty()) {
            // help the recogniser with names it wouldn't otherwise know
            i.putStringArrayListExtra(RecognizerIntent.EXTRA_BIASING_STRINGS, ArrayList(vocabulary.take(300)))
        }
        googleReady = false
        try { sr.startListening(i) } catch (e: Exception) { listenOffline(); return }
        main.postDelayed({
            if (turn == myTurn && !googleReady && !finished) {
                RagaStatus.add("Phone speech recognizer didn't start — using offline recognition")
                listenOffline()
            }
        }, 3000)
    }

    private val googleListener = object : android.speech.RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) { googleReady = true }
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {
            val l = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)
            b.orb.level = l; RagaStatus.level.value = l
        }
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() { ui(UiPhase.THINKING) }
        override fun onEvent(eventType: Int, params: Bundle?) {}
        override fun onPartialResults(partialResults: Bundle?) {
            partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                ?.takeIf { it.isNotBlank() }?.let { ui(UiPhase.LISTENING, heard = it) }
        }
        override fun onResults(results: Bundle?) {
            val options = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty().filter { it.isNotBlank() }
            if (options.isEmpty()) { reply(Outcome("Sorry, I didn't catch that. Tap the orb to try again.")); return }
            val best = options.firstOrNull { CommandParser.parse(stripWake(it)) !is Command.Unknown } ?: options.first()
            process(best)
        }
        override fun onError(error: Int) {
            RagaStatus.add("Phone speech recognizer error $error")
            when (error) {
                SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                    reply(Outcome("Sorry, I didn't catch that. Tap the orb to try again."))
                else -> listenOffline() // recogniser unavailable, busy or offline: use Raga's own
            }
        }
    }

    /** Raga's own offline recogniser (less accurate, but needs no internet or Google). */
    private fun listenOffline() {
        stopListening()
        val myTurn = turn
        ui(UiPhase.LISTENING, reply = "Listening offline…")
        Shared.worker.post {
            val models = try { Shared.models(this) } catch (_: Exception) { null }
            main.post {
                if (turn != myTurn || finished) return@post
                if (models == null) { reply(Outcome("I can't listen right now. Download the speech models in Settings.")); return@post }
                try {
                    val rec = Recognizer(models.first, 16000f).also { offlineRec = it }
                    offline = SpeechService(rec, 16000f).also { it.startListening(offlineListener, 8000) }
                } catch (e: Exception) {
                    reply(Outcome("I couldn't use the microphone."))
                }
            }
        }
    }

    private val offlineListener = object : RecognitionListener {
        override fun onPartialResult(hypothesis: String?) {
            val p = try { JSONObject(hypothesis ?: return).optString("partial") } catch (_: Exception) { return }
            if (p.isNotBlank()) ui(UiPhase.LISTENING, heard = p)
        }
        override fun onResult(hypothesis: String?) {
            val t = try { JSONObject(hypothesis ?: return).optString("text") } catch (_: Exception) { return }
            if (t.isNotBlank()) { stopListening(); process(t) }
        }
        override fun onFinalResult(hypothesis: String?) {}
        override fun onError(exception: Exception?) { reply(Outcome("Microphone error.")) }
        override fun onTimeout() { stopListening(); reply(Outcome("I didn't hear anything. Tap the orb to try again.")) }
    }

    private fun stopListening() {
        recognizer?.destroy(); recognizer = null
        offline?.stop(); offline?.shutdown(); offline = null
        offlineRec?.close(); offlineRec = null
        b.orb.level = 0f
    }

    private fun stripWake(text: String) =
        CommandParser.afterWakeWord(text, Prefs(this).wakeWords)?.takeIf { it.isNotEmpty() } ?: text

    // ------------------------------------------------------------------ acting & answering

    private fun process(raw: String) {
        stopListening()
        val text = stripWake(raw)
        RagaStatus.add("🗣 $text")
        if (chatMode) { addChat("You:", text); ui(UiPhase.THINKING, heard = "", reply = "") }
        else ui(UiPhase.THINKING, heard = text, reply = "")
        val ctx = applicationContext
        Shared.worker.post {
            val outcome = try { Shared.decide(ctx, text) } catch (e: SecurityException) {
                Outcome("I don't have permission for that. Open Raga's settings and allow it.")
            } catch (e: Exception) {
                Outcome("Something went wrong: ${e.message ?: e.javaClass.simpleName}")
            }
            main.post { if (!isDestroyed) reply(outcome) }
        }
    }

    private fun reply(outcome: Outcome, closeAfter: Boolean = false) {
        stopListening()
        val fu = outcome.followUp
        Shared.followUp = fu
        val text = listOfNotNull(outcome.say, fu?.prompt).joinToString(" ").ifBlank { "Done." }
        RagaStatus.add("💬 $text")
        if (chatMode) { addChat("Raga:", text); ui(UiPhase.SPEAKING, reply = "") }
        else ui(UiPhase.SPEAKING, reply = text)
        speakThen(text) {
            when {
                closeAfter -> close()
                chatMode -> ui(UiPhase.WAITING)       // chatting: stay open for the next message
                Shared.followUp != null -> listen()   // answer without saying "Raga" again
                else -> main.postDelayed({ if (!chatMode) close() }, 1500)
            }
        }
    }

    private fun speakThen(text: String, then: () -> Unit) {
        var done = false
        val finish = { if (!done) { done = true; if (!finished) then() } }
        val engine = tts
        if (!Prefs(this).speakReplies || chatMode) { main.postDelayed({ finish() }, 1500L + text.length * 40L); return }
        if (!ttsReady || engine == null) {
            // engine still starting: speak once it's ready, but never wait forever
            pendingSpeech = text to { finish() }
            main.postDelayed({ pendingSpeech = null; finish() }, 3000L + text.length * 60L)
            return
        }
        val id = "raga-${System.nanoTime()}"
        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) { if (utteranceId == id) main.post { finish() } }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) { if (utteranceId == id) main.post { finish() } }
        })
        main.postDelayed({ finish() }, 4000L + text.length * 120L)
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, id)
    }

    private fun chime() {
        try {
            ToneGenerator(AudioManager.STREAM_MUSIC, 60).apply {
                startTone(ToneGenerator.TONE_PROP_ACK, 120)
                main.postDelayed({ release() }, 400)
            }
        } catch (_: Exception) {}
    }

    private fun close() {
        if (finished) return
        finished = true
        turn++
        stopListening()
        RagaStatus.phase.value = if (RagaService.instance != null) UiPhase.WAITING else UiPhase.OFF
        finish()
        @Suppress("DEPRECATION") overridePendingTransition(0, android.R.anim.fade_out)
    }

    override fun onDestroy() {
        finished = true
        stopListening()
        tts?.shutdown()
        RagaService.instance?.resumeWake()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_COMMAND = "command"
        private const val EXTRA_TOKEN = "token"

        fun open(ctx: Context, command: String? = null) {
            val i = Intent(ctx, AssistActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            command?.let { i.putExtra(EXTRA_COMMAND, it).putExtra(EXTRA_TOKEN, Shared.token) }
            ctx.startActivity(i)
        }
    }
}
