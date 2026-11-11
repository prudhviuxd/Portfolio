package app.raga.assistant

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HelpersTest {
    @Test fun numbers() {
        assertEquals(25, Numbers.parse("twenty five"))
        assertEquals(100, Numbers.parse("a hundred"))
        assertEquals(7 to 30, Numbers.parseClock("seven thirty"))
        assertEquals(22 to 5, Numbers.parseClock("ten oh five p m"))
        assertEquals(0 to 0, Numbers.parseClock("twelve a m"))
        assertEquals("9845512345", Numbers.parsePhone("nine eight four double five one two three four five"))
        assertNull(Numbers.parsePhone("mom"))
    }

    @Test fun fuzzy() {
        assertTrue(Fuzzy.score("mom", "Mom") == 1.0)
        assertTrue(Fuzzy.score("ravi", "Ravi Kumar") >= 0.9)
        assertTrue(Fuzzy.score("whatsapp", "WhatsApp") == 1.0)
        assertTrue(Fuzzy.score("what's app", "WhatsApp") >= 0.8)
        assertTrue(Fuzzy.score("you tube", "YouTube") >= 0.8)
        assertTrue(Fuzzy.score("resume", "Resume_2024.pdf") >= 0.7)
        assertTrue(Fuzzy.score("priya", "Pooja") < 0.55)
        val best = Fuzzy.best("spotify", listOf("Spotify", "Settings", "Snapchat")) { it }
        assertEquals("Spotify", best?.item)
    }

    @Test fun voiceProfile() {
        val a = doubleArrayOf(1.0, 0.0, 0.2)
        val b = doubleArrayOf(0.9, 0.1, 0.25)
        val other = doubleArrayOf(-0.2, 1.0, 0.0)
        val c = VoiceProfile.centroid(listOf(a, b))
        assertTrue(VoiceProfile.cosine(a, c) > 0.95)
        assertTrue(VoiceProfile.cosine(other, c) < 0.2)
        val round = VoiceProfile.decode(VoiceProfile.encode(c))!!
        assertTrue(VoiceProfile.cosine(round, c) > 0.9999)
    }
}
