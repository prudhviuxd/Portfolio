package app.raga.assistant

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import app.raga.assistant.databinding.ActivityEnrollBinding
import org.json.JSONObject
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.SpeakerModel
import org.vosk.android.RecognitionListener
import org.vosk.android.SpeechService

/**
 * Siri-style setup: say "Raga" a few times. Each recording gives a voice print; their average
 * becomes the owner's print. It also learns how the offline recogniser spells the owner's
 * "Raga" (it might hear "ragga" or "rager"), and adds those spellings as wake words.
 */
class EnrollActivity : AppCompatActivity(), RecognitionListener {

    private lateinit var b: ActivityEnrollBinding
    private lateinit var prefs: Prefs
    private var model: Model? = null
    private var spk: SpeakerModel? = null
    private var speech: SpeechService? = null
    private var recognizer: Recognizer? = null
    private val samples = ArrayList<DoubleArray>()
    private val heard = ArrayList<String>()
    private var done = false

    private val prompts = listOf(
        "Say “Raga”", "Again, say “Raga”", "Once more: “Raga”",
        "Say it a little softer: “Raga”", "Say it a little louder: “Raga”", "Last one: “Raga”",
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityEnrollBinding.inflate(layoutInflater)
        setContentView(b.root)
        prefs = Prefs(this)
        RagaService.stop(this) // free the microphone

        b.cancel.setOnClickListener { finish() }
        b.skip.setOnClickListener { finishEnrollment() }
        b.skip.text = "Finish now"
        b.skip.isEnabled = false
        b.phrase.text = "Getting ready…"

        Thread {
            try {
                val m = Model(ModelManager.dir(this, prefs.modelName).absolutePath)
                val s = SpeakerModel(ModelManager.dir(this, ModelManager.SPEAKER_MODEL.id).absolutePath)
                runOnUiThread {
                    if (isFinishing) { m.close(); s.close(); return@runOnUiThread }
                    model = m; spk = s
                    // free recognition (no grammar) so we see exactly what the engine hears for "Raga"
                    val rec = Recognizer(m, 16000f, s).also { recognizer = it }
                    // started a little later, so the microphone is free after the service stops
                    b.root.postDelayed({
                        if (!isFinishing) speech = SpeechService(rec, 16000f).also { it.startListening(this) }
                    }, 600)
                    show()
                }
            } catch (e: Exception) {
                runOnUiThread { b.phrase.text = "Couldn't start: ${e.message}" }
            }
        }.start()
    }

    private fun show() {
        val i = samples.size
        b.progress.max = prompts.size
        b.progress.progress = i
        b.counter.text = "Recording ${i + 1} of ${prompts.size}"
        b.phrase.text = prompts[i]
        b.heard.text = "Speak normally, about an arm's length from the phone."
        b.skip.isEnabled = samples.size >= 3
    }

    override fun onResult(hypothesis: String?) {
        if (done || isFinishing) return
        val json = try { JSONObject(hypothesis ?: return) } catch (_: Exception) { return }
        val text = json.optString("text").trim()
        val vec = json.optJSONArray("spk")
        if (text.isEmpty() || vec == null) return
        if (json.optInt("spk_frames", 0) < MIN_FRAMES) {
            b.heard.text = "Didn't quite catch that — say “Raga” again."
            return
        }
        if (text.split(" ").size > 3) {
            b.heard.text = "Heard “$text”. Just say the single word “Raga”."
            return
        }
        samples += try { DoubleArray(vec.length()) { vec.getDouble(it) } } catch (_: Exception) { return }
        heard += text
        b.heard.text = "Got it ✓  (heard “$text”)"
        if (samples.size >= prompts.size) finishEnrollment() else b.root.postDelayed({ if (!done) show() }, 500)
    }

    private fun finishEnrollment() {
        if (done) return
        if (samples.size < 3) { b.heard.text = "Please record at least 3 times."; return }
        done = true
        speech?.stop()
        prefs.voicePrint = VoiceProfile.centroid(samples)
        prefs.enrollmentSamples = samples.size
        prefs.threshold = VoiceProfile.suggestThreshold(samples).toFloat()

        // Teach the wake listener how this voice's "Raga" comes out of the recogniser.
        // Only spellings that sound like "raga", so everyday words never become wake words.
        val learned = heard.map { it.lowercase().trim() }
            .filter { it.length >= 3 && it.split(" ").size <= 2 && Fuzzy.score(it.replace(" ", ""), "raga") >= 0.5 }
            .groupingBy { it }.eachCount()
            .filter { (w, n) -> n >= 2 || w.startsWith("rag") }
            .keys
        val words = (prefs.wakeWords + learned).distinct()
        prefs.wakeWords = words

        b.progress.progress = prompts.size
        b.counter.text = "All set"
        b.phrase.text = "Raga knows your voice."
        b.heard.text = "Raga will wake up to: ${words.joinToString(", ")}.\n" +
            "Voice match needed: ${"%.2f".format(prefs.threshold)}.\n\n" +
            "Go back and tap Start listening. Say “Raga”, wait for the chime, then your command."
        b.skip.visibility = View.GONE
        b.cancel.text = "Done"
    }

    override fun onPartialResult(hypothesis: String?) {
        if (done) return
        val p = try { JSONObject(hypothesis ?: return).optString("partial") } catch (_: Exception) { return }
        if (p.isNotBlank()) b.heard.text = "Hearing: $p"
    }
    override fun onFinalResult(hypothesis: String?) {}
    override fun onError(exception: Exception?) { b.heard.text = "Microphone error: ${exception?.message}" }
    override fun onTimeout() {}

    override fun onDestroy() {
        // stop first: it waits for the recognition thread, so the native models aren't freed under it
        speech?.stop()
        speech?.shutdown()
        recognizer?.close()
        model?.close()
        spk?.close()
        super.onDestroy()
    }

    companion object {
        private const val MIN_FRAMES = 20 // ~0.2 s of speech
    }
}
