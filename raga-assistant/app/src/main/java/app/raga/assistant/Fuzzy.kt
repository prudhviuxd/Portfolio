package app.raga.assistant

import java.text.Normalizer
import kotlin.math.max
import kotlin.math.min

/** Fuzzy name matching for contacts, apps, songs and files heard through speech recognition. */
object Fuzzy {

    fun normalize(s: String): String {
        val noAccents = Normalizer.normalize(s, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "")
        return noAccents.lowercase()
            .replace(Regex("\\.[a-z0-9]{1,5}$"), "") // drop file extension
            .replace(Regex("[^a-z0-9 ]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    fun levenshtein(a: String, b: String): Int {
        if (a == b) return 0
        if (a.isEmpty()) return b.length
        if (b.isEmpty()) return a.length
        var prev = IntArray(b.length + 1) { it }
        var cur = IntArray(b.length + 1)
        for (i in 1..a.length) {
            cur[0] = i
            for (j in 1..b.length) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                cur[j] = min(min(cur[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost)
            }
            val t = prev; prev = cur; cur = t
        }
        return prev[b.length]
    }

    private fun ratio(a: String, b: String): Double {
        val len = max(a.length, b.length)
        if (len == 0) return 1.0
        return 1.0 - levenshtein(a, b).toDouble() / len
    }

    /**
     * Similarity between what was spoken and a candidate name, 0..1.
     * Combines whole-string similarity, spacing-insensitive similarity
     * ("what's app" vs "WhatsApp") and best per-word alignment, so that
     * "mom" matches "Mom", "call ravi" matches "Ravi Kumar", etc.
     */
    fun score(spoken: String, candidate: String): Double {
        val s = normalize(spoken)
        val c = normalize(candidate)
        if (s.isEmpty() || c.isEmpty()) return 0.0
        if (s == c) return 1.0

        val whole = ratio(s, c)
        val compact = ratio(s.replace(" ", ""), c.replace(" ", ""))

        val sWords = s.split(" ")
        val cWords = c.split(" ")
        // each spoken word against its best candidate word
        val perWord = sWords.map { sw -> cWords.maxOf { cw -> ratio(sw, cw) } }.average()
        // spoken is a prefix of the candidate's words ("ravi" -> "ravi kumar")
        val prefixBonus = if (c.startsWith(s) || cWords.containsAll(sWords)) 0.92 else 0.0
        // penalise when the candidate has many more words than were spoken
        val coverage = min(1.0, sWords.size.toDouble() / cWords.size)
        val tokenScore = perWord * (0.75 + 0.25 * coverage)

        return maxOf(whole, compact, tokenScore, prefixBonus)
    }

    data class Match<T>(val item: T, val score: Double)

    fun <T> best(spoken: String, items: Collection<T>, name: (T) -> String): Match<T>? =
        items.asSequence()
            .map { Match(it, score(spoken, name(it))) }
            .maxByOrNull { it.score }
}
