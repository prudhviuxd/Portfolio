package app.raga.assistant

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.math.BigDecimal
import java.math.MathContext
import kotlin.math.abs
import kotlin.math.roundToLong

/** Regression: an off-grid threshold made the strictness Slider throw and crash the app on every launch. */
class ThresholdTest {
    // same check Material's Slider performs before drawing
    private fun onSliderGrid(v: Float, from: Float = 0.10f, step: Float = 0.01f): Boolean {
        val d = BigDecimal(v.toString()).subtract(BigDecimal(from.toString())).toDouble()
        val r = BigDecimal(d.toString()).divide(BigDecimal(step.toString()), MathContext.DECIMAL64).toDouble()
        return abs(r.roundToLong() - r) < 0.0001
    }

    @Test fun snappedValuesAreAlwaysValidForTheSlider() {
        assertEquals(0.44f, Prefs.snap(0.4378f))
        var x = 0.0f
        while (x <= 1.0f) {
            assertTrue("snap($x)", onSliderGrid(Prefs.snap(x)))
            x += 0.00137f
        }
        val samples = listOf(doubleArrayOf(1.0, 0.1, 0.3), doubleArrayOf(0.8, 0.2, 0.35), doubleArrayOf(0.9, 0.05, 0.2))
        assertTrue(onSliderGrid(Prefs.snap(VoiceProfile.suggestThreshold(samples).toFloat())))
    }
}
