package app.raga.assistant

import android.content.Context

class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("raga", Context.MODE_PRIVATE)

    /** Words that wake the assistant. The speech model may hear "raga" slightly differently. */
    var wakeWords: List<String>
        get() = (sp.getString("wake_words", null) ?: DEFAULT_WAKE_WORDS)
            .split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
        set(v) = sp.edit().putString("wake_words", v.joinToString(", ")).apply()

    var voicePrint: DoubleArray?
        get() = VoiceProfile.decode(sp.getString("voice_print", null))
        set(v) = sp.edit().putString("voice_print", v?.let { VoiceProfile.encode(it) }).apply()

    var enrollmentSamples: Int
        get() = sp.getInt("enroll_samples", 0)
        set(v) = sp.edit().putInt("enroll_samples", v).apply()

    /** Cosine similarity an utterance needs to count as the owner's voice. */
    var threshold: Float
        get() = snap(sp.getFloat("threshold", 0.45f))
        set(v) = sp.edit().putFloat("threshold", snap(v)).apply()

    var verifyVoice: Boolean
        get() = sp.getBoolean("verify_voice", true)
        set(v) = sp.edit().putBoolean("verify_voice", v).apply()

    var speakReplies: Boolean
        get() = sp.getBoolean("speak_replies", true)
        set(v) = sp.edit().putBoolean("speak_replies", v).apply()

    var modelName: String
        get() = sp.getString("model", ModelManager.SPEECH_MODELS.first().id)!!
        set(v) = sp.edit().putString("model", v).apply()

    companion object {
        /** Round to the 0.01 grid the strictness slider requires (an off-grid value crashes it). */
        fun snap(v: Float): Float = (Math.round(v.coerceIn(0.10f, 0.90f) * 100f) / 100f)

        const val DEFAULT_WAKE_WORDS = "raga, ragha, ragga, raja"
    }
}
