package app.raga.assistant

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlinx.coroutines.flow.MutableStateFlow
import org.json.JSONArray
import org.json.JSONObject
import org.vosk.Recognizer
import java.io.ByteArrayOutputStream
import java.lang.ref.WeakReference
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class UiPhase { OFF, WAITING, LISTENING, THINKING, SPEAKING }

/** Shared, observable state for the UI. */
object RagaStatus {
    val running = MutableStateFlow(false)
    val state = MutableStateFlow("Stopped")
    val phase = MutableStateFlow(UiPhase.OFF)
    val heard = MutableStateFlow("")
    val reply = MutableStateFlow("")
    /** 0..1 microphone level while a command is being spoken (drives the orb). */
    val level = MutableStateFlow(0f)

    fun add(line: String) {
        val ts = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
        // kept in memory only (not logcat), since it can contain message text
        log.value = (listOf("$ts  $line") + log.value).take(80)
    }
    val log = MutableStateFlow<List<String>>(emptyList())
}

/**
 * Always-on part of Raga: listens for the wake word with the offline recogniser (restricted to
 * the wake word, which is far more reliable than free recognition), checks it is the owner's
 * voice, then opens the assistant card over whatever app is on screen. It also shows the
 * floating Raga button.
 *
 * It reads the microphone itself and keeps the audio of the current utterance, so
 * "Raga, open YouTube" said in one breath is decoded in full instead of losing the command.
 */
class RagaService : Service() {

    private val main = Handler(Looper.getMainLooper())
    private lateinit var prefs: Prefs
    private lateinit var fab: FloatingButton
    private lateinit var bubble: Bubble
    @Volatile private var loop: WakeLoop? = null
    private var paused = false
    private var destroyed = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        prefs = Prefs(this)
        bubble = Bubble(this)
        fab = FloatingButton(this, onDismiss = {
            RagaStatus.add("Closed from the floating button.")
            android.widget.Toast.makeText(this, "Raga closed. Open the Raga app to turn it on again.", android.widget.Toast.LENGTH_LONG).show()
            stopSelf()
        }) { AssistActivity.open(this) }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        try {
            goForeground("Starting…")
        } catch (e: Exception) {
            // Android refuses a microphone service unless the app is on screen and has mic permission.
            RagaStatus.add("Couldn't start listening: ${e.message}")
            stopSelf()
            return START_NOT_STICKY
        }
        if (prefs.floatingButton) fab.show()
        if (loop == null && !paused) startLoop()
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
        val talk = PendingIntent.getActivity(
            this, 2, Intent(this, AssistActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, RagaService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle("Raga is listening")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(talk)
            .addAction(0, "Talk", talk)
            .addAction(0, "Stop", stop)
            .build()
    }

    private fun status(text: String) {
        RagaStatus.state.value = text
        if (!destroyed) getSystemService(NotificationManager::class.java).notify(NOTIF_ID, notification(text))
    }

    // ------------------------------------------------------------------ microphone loop

    private fun startLoop() {
        if (destroyed || loop != null) return
        status("Loading…")
        WakeLoop().also { loop = it }.start()
    }

    private fun stopLoop() {
        val l = loop ?: return
        loop = null
        l.running = false
        l.join(1500)
    }

    /** The assistant card is using the microphone. */
    fun pauseWake() {
        paused = true
        stopLoop()
    }

    fun resumeWake() {
        paused = false
        if (!destroyed) main.postDelayed({ if (!paused && !destroyed) startLoop() }, 300)
    }

    private inner class WakeLoop : Thread("raga-wake") {
        @Volatile var running = true

        @SuppressLint("MissingPermission")
        override fun run() {
            val models = try { Shared.models(this@RagaService) } catch (e: Exception) { null }
            if (models == null) {
                main.post { RagaStatus.add("Speech models missing or damaged — download them in Settings."); stopSelf() }
                return
            }
            val (model, speaker) = models
            val words = prefs.wakeWords
            // only the wake word(s) + [unk]: everything else is ignored
            val rec = Recognizer(model, RATE.toFloat(), JSONArray(words + "[unk]").toString())
            rec.setSpeakerModel(speaker)
            val minBuf = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val audio = try {
                AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, RATE, AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT, maxOf(minBuf, RATE * 2))
            } catch (e: Exception) { null }
            if (audio == null || audio.state != AudioRecord.STATE_INITIALIZED) {
                rec.close(); audio?.release()
                main.post { RagaStatus.add("Couldn't open the microphone (another app may be using it)."); loop = null }
                return
            }
            try {
                audio.startRecording()
                main.post {
                    RagaStatus.running.value = true
                    RagaStatus.phase.value = UiPhase.WAITING
                    status("Say \"${words.firstOrNull() ?: "raga"}\"")
                }
                val buf = ByteArray(3200) // 100 ms
                val utterance = ByteArrayOutputStream()
                var silentReads = 0
                while (running) {
                    val n = audio.read(buf, 0, buf.size)
                    if (n <= 0) continue
                    // detect a muted/blocked microphone (all zeros) and say so once
                    if (buf.all { it == 0.toByte() }) {
                        if (++silentReads == 50) main.post { RagaStatus.add("⚠ The microphone is silent — another app may be using it.") }
                    } else silentReads = 0
                    utterance.write(buf, 0, n)
                    if (utterance.size() > RATE * 2 * 12) utterance.reset() // >12 s: not a command
                    if (rec.acceptWaveForm(buf, n)) {
                        val result = rec.result
                        val pcm = utterance.toByteArray()
                        utterance.reset()
                        onUtterance(result, pcm, model)
                    }
                }
            } catch (e: Exception) {
                main.post { RagaStatus.add("Microphone error: ${e.message}") }
            } finally {
                try { audio.stop() } catch (_: Exception) {}
                audio.release()
                rec.close()
            }
        }
    }

    /** Runs on the microphone thread for every finished utterance. */
    private fun onUtterance(json: String, pcm: ByteArray, model: org.vosk.Model) {
        val o = try { JSONObject(json) } catch (_: Exception) { return }
        val raw = o.optString("text").trim()
        val words = raw.split(Regex("\\s+")).filter { it.isNotEmpty() }
        val wake = prefs.wakeWords
        val idx = words.indexOfFirst { w -> wake.any { it == w } }
        if (idx < 0) return
        val heard = words.filter { it != "[unk]" }.joinToString(" ")

        // ---- is it the owner?
        val print = prefs.voicePrint
        if (prefs.verifyVoice && print != null) {
            val spk = try { o.optJSONArray("spk")?.let { a -> DoubleArray(a.length()) { a.getDouble(it) } } } catch (_: Exception) { null }
            if (spk == null) {
                RagaStatus.add("✗ heard \"$heard\" but couldn't check the voice — say Raga again")
                return
            }
            val score = VoiceProfile.cosine(spk, print)
            val ok = score >= prefs.threshold
            RagaStatus.add("${if (ok) "✓" else "✗"} \"$heard\" — voice match ${"%.2f".format(score)} (need ${"%.2f".format(prefs.threshold)})")
            if (!ok) return
        } else {
            RagaStatus.add("✓ \"$heard\" (voice check off)")
        }

        // ---- did they keep talking after "Raga"? decode the whole utterance freely
        var command: String? = null
        if (idx < words.lastIndex) {
            try {
                Recognizer(model, RATE.toFloat()).use { free ->
                    free.acceptWaveForm(pcm, pcm.size)
                    val full = JSONObject(free.finalResult).optString("text")
                    val after = CommandParser.afterWakeWord(full, wake)
                        ?: full.split(" ").drop(1).joinToString(" ") // the wake word itself may be misheard here
                    if (after.isNotBlank() && CommandParser.parse(after) !is Command.Unknown) command = after
                    RagaStatus.add("heard in one breath: \"$full\"")
                }
            } catch (_: Exception) {}
        }

        val cmd = command
        main.post { wakeUp(cmd) }
    }

    private fun wakeUp(command: String?) {
        if (destroyed) return
        // A visible overlay is what lets Android open the card (and later apps) from the background.
        if (!fab.isShowing) bubble.show("Raga", "")
        pauseWake()
        try {
            AssistActivity.open(this, command)
        } catch (e: Exception) {
            RagaStatus.add("Couldn't open Raga over this app: ${e.message}. Allow \"Display over other apps\".")
            resumeWake()
        }
        main.postDelayed({ bubble.hide() }, 1500)
    }

    override fun onDestroy() {
        destroyed = true
        stopLoop()
        fab.hide()
        bubble.hide()
        instance = null
        RagaStatus.running.value = false
        RagaStatus.state.value = "Stopped"
        RagaStatus.phase.value = UiPhase.OFF
        RagaStatus.add("Stopped listening.")
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "raga"
        private const val NOTIF_ID = 7
        private const val RATE = 16000
        const val ACTION_STOP = "app.raga.assistant.STOP"

        private var ref: WeakReference<RagaService>? = null
        var instance: RagaService?
            get() = ref?.get()
            private set(v) { ref = v?.let { WeakReference(it) } }

        fun start(context: Context) {
            val i = Intent(context, RagaService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
        }

        fun stop(context: Context) {
            instance?.stopSelf()
        }
    }
}
