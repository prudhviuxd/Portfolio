package app.raga.assistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import app.raga.assistant.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

/** Siri-style home: the orb, what you said, and Raga's answer. Everything else is in Settings. */
class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding
    private lateinit var prefs: Prefs

    private val askMic = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { refresh() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)
        prefs = Prefs(this)

        ViewCompat.setOnApplyWindowInsetsListener(b.root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, bars.top, v.paddingRight, bars.bottom)
            insets
        }

        b.settings.setOnClickListener { openSettings() }
        b.setupBanner.setOnClickListener { openSettings() }
        b.orb.setOnClickListener { talk() }
        b.power.setOnClickListener {
            if (RagaStatus.running.value) RagaService.stop(this)
            else if (ready()) RagaService.start(this)
        }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { RagaStatus.phase.collect { b.orb.phase = it; refresh() } }
                launch { RagaStatus.level.collect { b.orb.level = it } }
                launch { RagaStatus.heard.collect { b.heard.text = if (it.isBlank()) "" else "“$it”" } }
                launch { RagaStatus.reply.collect { b.reply.text = it } }
                launch { RagaStatus.running.collect { refresh() } }
            }
        }
        RagaApp.showLastCrash(this)
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun openSettings() = startActivity(Intent(this, SettingsActivity::class.java))

    private fun granted(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun hasModels() = ModelManager.isInstalled(this, prefs.modelName) &&
        ModelManager.isInstalled(this, ModelManager.SPEAKER_MODEL.id)

    /** What still needs doing before Raga can work, in plain words. */
    private fun missing(): List<String> = buildList {
        if (!hasModels()) add("download the speech models")
        if (!granted(Manifest.permission.RECORD_AUDIO)) add("allow the microphone")
        if (!Settings.canDrawOverlays(this@MainActivity)) add("allow Raga to show over other apps")
        if (prefs.voicePrint == null) add("teach Raga your voice")
    }

    private fun ready(): Boolean {
        if (!hasModels()) { openSettings(); return false }
        if (!granted(Manifest.permission.RECORD_AUDIO)) {
            askMic.launch(
                if (android.os.Build.VERSION.SDK_INT >= 33)
                    arrayOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.POST_NOTIFICATIONS)
                else arrayOf(Manifest.permission.RECORD_AUDIO),
            )
            return false
        }
        return true
    }

    private fun talk() {
        if (!ready()) return
        RagaService.listenNow(this)
    }

    private fun refresh() {
        if (!::b.isInitialized) return
        val todo = missing()
        b.setupBanner.visibility = if (todo.isEmpty()) View.GONE else View.VISIBLE
        b.setupText.text = "Tap here to " + todo.joinToString(", ") + "."

        val running = RagaStatus.running.value
        b.power.text = if (running) "Stop listening" else "Start listening for “Raga”"
        b.status.text = when (RagaStatus.phase.value) {
            UiPhase.OFF -> if (running) "Starting…" else "Tap the orb to talk"
            UiPhase.WAITING -> "Say “Raga” or tap the orb"
            UiPhase.LISTENING -> "Listening…"
            UiPhase.THINKING -> "Thinking…"
            UiPhase.SPEAKING -> ""
        }
        if (!running && RagaStatus.heard.value.isBlank() && RagaStatus.reply.value.isBlank()) {
            b.heard.text = "Hi, I'm Raga."
            b.reply.text = "Tap the orb, or turn on listening and say “Raga”. Then try:\n" +
                "“Play some music” · “Call Mom” · “Open YouTube” · “What time is it?”"
        }
    }
}
