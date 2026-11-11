package app.raga.assistant

/** The speech model writes numbers as words ("seven thirty"). These helpers turn them back into numbers. */
object Numbers {
    private val units = mapOf(
        "zero" to 0, "oh" to 0, "o" to 0, "one" to 1, "two" to 2, "three" to 3, "four" to 4,
        "five" to 5, "six" to 6, "seven" to 7, "eight" to 8, "nine" to 9, "ten" to 10,
        "eleven" to 11, "twelve" to 12, "thirteen" to 13, "fourteen" to 14, "fifteen" to 15,
        "sixteen" to 16, "seventeen" to 17, "eighteen" to 18, "nineteen" to 19,
        "a" to 1, "an" to 1,
    )
    private val tens = mapOf(
        "twenty" to 20, "thirty" to 30, "forty" to 40, "fifty" to 50,
        "sixty" to 60, "seventy" to 70, "eighty" to 80, "ninety" to 90,
    )
    private val digitWords = mapOf(
        "zero" to '0', "oh" to '0', "o" to '0', "one" to '1', "two" to '2', "three" to '3',
        "four" to '4', "five" to '5', "six" to '6', "seven" to '7', "eight" to '8', "nine" to '9',
    )

    /** "twenty five" -> 25, "a hundred" -> 100, "90" -> 90. Returns null if the words are not a number. */
    fun parse(words: List<String>): Int? {
        if (words.isEmpty()) return null
        if (words.size == 1) words[0].toIntOrNull()?.let { return it }
        var total = 0
        var current = 0
        var any = false
        for (w in words) {
            when {
                w == "and" && any -> {}
                w.toIntOrNull() != null -> { current += w.toInt(); any = true }
                units.containsKey(w) -> { current += units.getValue(w); any = true }
                tens.containsKey(w) -> { current += tens.getValue(w); any = true }
                w == "hundred" -> { current = (if (current == 0) 1 else current) * 100; any = true }
                w == "thousand" -> { total += (if (current == 0) 1 else current) * 1000; current = 0; any = true }
                else -> return null
            }
        }
        return if (any) total + current else null
    }

    fun parse(text: String): Int? = parse(text.trim().split(Regex("\\s+")).filter { it.isNotEmpty() })

    /**
     * Spoken phone number: "nine eight four double five ..." -> "98455...".
     * Returns null unless at least 3 digits and nothing but digits were spoken.
     */
    fun parsePhone(text: String): String? {
        val words = text.lowercase().replace("+", " plus ").split(Regex("\\s+")).filter { it.isNotEmpty() }
        val sb = StringBuilder()
        var repeat = 1
        for (w in words) {
            when {
                w == "plus" && sb.isEmpty() -> sb.append('+')
                w == "double" -> repeat = 2
                w == "triple" -> repeat = 3
                w.all { it.isDigit() } -> { repeat(repeat) { sb.append(w) }; repeat = 1 }
                digitWords.containsKey(w) -> { repeat(repeat) { sb.append(digitWords.getValue(w)) }; repeat = 1 }
                else -> return null
            }
        }
        return if (sb.count { it.isDigit() } >= 3) sb.toString() else null
    }

    /** Parse a clock time like "seven thirty p m", "six a m", "ten", "five fifteen in the evening". */
    fun parseClock(text: String): Pair<Int, Int>? {
        var t = " ${text.lowercase()} "
        var pm: Boolean? = null
        for (marker in listOf(" p m ", " pm ", " p.m. ", " in the evening ", " at night ", " in the afternoon ", " tonight ")) {
            if (t.contains(marker)) { pm = true; t = t.replace(marker, " ") }
        }
        for (marker in listOf(" a m ", " am ", " a.m. ", " in the morning ")) {
            if (t.contains(marker)) { pm = false; t = t.replace(marker, " ") }
        }
        t = t.replace(" o'clock ", " ").replace(" o clock ", " ").replace(":", " ")
        val words = t.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (words.isEmpty()) return null

        var hour: Int? = null
        var minute = 0
        // try every split point: hour words | minute words
        for (split in 1..words.size) {
            val h = parse(words.subList(0, split)) ?: continue
            val restWords = words.subList(split, words.size)
            val m = if (restWords.isEmpty()) 0 else parse(restWords.filter { it != "oh" && it != "o" }.let {
                if (restWords.firstOrNull() == "oh" || restWords.firstOrNull() == "o") it else restWords
            }) ?: continue
            if (h in 0..23 && m in 0..59) { hour = h; minute = m; break }
        }
        var h = hour ?: return null
        if (pm == true && h < 12) h += 12
        if (pm == false && h == 12) h = 0
        return h to minute
    }
}
