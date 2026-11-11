package app.raga.assistant

import android.graphics.Bitmap
import android.view.View
import androidx.test.core.app.ActivityScenario
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/** Opens each screen in a simulated phone: catches start-up crashes and saves screenshots. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w411dp-h891dp-xxhdpi")
class ScreensTest {
    private fun shot(v: View, name: String) {
        val out = System.getProperty("raga.shots") ?: return
        val bmp = Bitmap.createBitmap(v.width.coerceAtLeast(1), v.height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        v.draw(android.graphics.Canvas(bmp))
        File(out).mkdirs()
        File(out, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test fun home() {
        ActivityScenario.launch(MainActivity::class.java).onActivity { a ->
            shot(a.window.decorView, "home_idle")
            RagaStatus.phase.value = UiPhase.LISTENING
            RagaStatus.heard.value = "Play Shape of You"
            RagaStatus.reply.value = "Playing Shape of You"
            org.robolectric.shadows.ShadowLooper.idleMainLooper()
            shot(a.window.decorView, "home_listening")
        }
    }

    @Test fun settings() {
        // an off-grid strictness value used to crash this screen
        Prefs(androidx.test.core.app.ApplicationProvider.getApplicationContext()).threshold = 0.4378f
        ActivityScenario.launch(SettingsActivity::class.java).onActivity { a -> shot(a.window.decorView, "settings") }
    }
}
