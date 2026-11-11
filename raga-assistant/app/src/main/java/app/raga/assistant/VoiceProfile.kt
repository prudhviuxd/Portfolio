package app.raga.assistant

import kotlin.math.sqrt

/**
 * Speaker verification. Vosk's speaker model turns each utterance into a 128-number
 * "x-vector" voice print. Enrollment averages several of the owner's prints; at run time each
 * utterance is compared with that average by cosine similarity, and anything below the
 * threshold is ignored. That is how Raga responds to your voice only.
 */
object VoiceProfile {

    fun normalize(v: DoubleArray): DoubleArray {
        val n = sqrt(v.sumOf { it * it })
        return if (n == 0.0) v.copyOf() else DoubleArray(v.size) { v[it] / n }
    }

    fun cosine(a: DoubleArray, b: DoubleArray): Double {
        if (a.size != b.size || a.isEmpty()) return 0.0
        var dot = 0.0; var na = 0.0; var nb = 0.0
        for (i in a.indices) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
        if (na == 0.0 || nb == 0.0) return 0.0
        return dot / (sqrt(na) * sqrt(nb))
    }

    /** Average of the length-normalised enrollment vectors. */
    fun centroid(samples: List<DoubleArray>): DoubleArray {
        require(samples.isNotEmpty())
        val dim = samples[0].size
        val sum = DoubleArray(dim)
        for (s in samples) {
            val n = normalize(s)
            for (i in 0 until dim) sum[i] += n[i]
        }
        return normalize(sum)
    }

    /**
     * Suggest a threshold from the enrollment itself: a bit below the weakest
     * enrollment sample's similarity to the centroid, clamped to a sane range.
     */
    fun suggestThreshold(samples: List<DoubleArray>): Double {
        val c = centroid(samples)
        val weakest = samples.minOf { cosine(it, c) }
        return (weakest - 0.12).coerceIn(0.30, 0.70)
    }

    fun encode(v: DoubleArray): String = v.joinToString(",") { "%.6f".format(java.util.Locale.US, it) }

    fun decode(s: String?): DoubleArray? =
        s?.takeIf { it.isNotBlank() }?.split(",")?.mapNotNull { it.trim().toDoubleOrNull() }
            ?.takeIf { it.isNotEmpty() }?.toDoubleArray()
}
