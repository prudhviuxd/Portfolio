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
 * Records the owner reading a few phrases and stores their average voice print.
 * Raga then only obeys utterances that sound like this voice.
 */
class EnrollActivity : AppCompatActivity(), RecognitionListener {

    private lateinit var b: ActivityEnrollBinding
    private lateinit var prefs: Prefs
    private var model: Model? = null
    private var spk: SpeakerModel? = null
    private var speech: SpeechService? = null
    private val samples = ArrayList<DoubleArray>()
    private var phraseIdx = 0

    private val phrases = listOf(
        "Raga, what time is it right now?",
        "Raga, call my mother on her mobile phone.",
        "Raga, play my favourite song from the playlist.",
        "Raga, send a message to my friend saying I am on my way.",
        "Raga, open the camera and take a photo.",
        "Raga, turn on the flashlight and increase the volume.",
        "The quick brown fox jumps over the lazy dog near the river bank.",
        "Raga, set an alarm for six thirty tomorrow morning.",
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityEnrollBinding.inflate(layoutInflater)
        setContentView(b.root)
        prefs = Prefs(this)
        RagaService.stop(this) // free the microphone

        b.cancel.setOnClickListener { finish() }
        b.skip.setOnClickListener { phraseIdx++; show() }
        b.phrase.text = "Loading…"
        b.skip.isEnabled = false

        Thread {
            try {
                val m = Model(ModelManager.dir(this, prefs.modelName).absolutePath)
                val s = SpeakerModel(ModelManager.dir(this, ModelManager.SPEAKER_MODEL.id).absolutePath)
                runOnUiThread {
                    if (isFinishing) { m.close(); s.close(); return@runOnUiThread }
                    model = m; spk = s
                    speech = SpeechService(Recognizer(m, 16000f, s), 16000f).also { it.startListening(this) }
                    b.skip.isEnabled = true
                    show()
                }
            } catch (e: Exception) {
                runOnUiThread { b.phrase.text = "Couldn't start: ${e.message}" }
            }
        }.start()
    }

    private fun show() {
        val i = samples.size
        b.progress.max = phrases.size
        b.progress.progress = i
        b.counter.text = "Recording ${i + 1} of ${phrases.size}"
        b.phrase.text = "“${phrases[phraseIdx % phrases.size]}”"
        b.heard.text = "Read it aloud in your normal voice."
    }

    override fun onResult(hypothesis: String?) {
        val json = try { JSONObject(hypothesis ?: return) } catch (_: Exception) { return }
        val text = json.optString("text")
        val vec = json.optJSONArray("spk") ?: run {
            if (text.isNotBlank()) b.heard.text = "Heard “$text” — please say the whole phrase."
            return
        }
        val frames = json.optInt("spk_frames", 0)
        if (frames < MIN_FRAMES) {
            b.heard.text = "That was a bit short — please read the whole phrase."
            return
        }
        samples += DoubleArray(vec.length()) { vec.getDouble(it) }
        phraseIdx++
        b.heard.text = "Got it ✓"
        if (samples.size >= phrases.size) finishEnrollment() else b.root.postDelayed({ show() }, 600)
    }

    private fun finishEnrollment() {
        speech?.stop()
        if (samples.size < 3) { b.heard.text = "Not enough speech recorded. Try again."; return }
        prefs.voicePrint = VoiceProfile.centroid(samples)
        prefs.enrollmentSamples = samples.size
        prefs.threshold = VoiceProfile.suggestThreshold(samples).toFloat()
        b.progress.progress = phrases.size
        b.counter.text = "Done"
        b.phrase.text = "Your voice is saved."
        b.heard.text = "Raga will now only respond to you. Voice-match threshold set to ${"%.2f".format(prefs.threshold)}."
        b.skip.visibility = View.GONE
        b.cancel.text = "Finish"
    }

    override fun onPartialResult(hypothesis: String?) {
        val p = try { JSONObject(hypothesis ?: return).optString("partial") } catch (_: Exception) { return }
        if (p.isNotBlank()) b.heard.text = p
    }
    override fun onFinalResult(hypothesis: String?) {}
    override fun onError(exception: Exception?) { b.heard.text = "Error: ${exception?.message}" }
    override fun onTimeout() {}

    override fun onDestroy() {
        speech?.shutdown()
        model?.close()
        spk?.close()
        super.onDestroy()
    }

    companion object {
        private const val MIN_FRAMES = 120 // ~1.2 s of speech
    }
}
