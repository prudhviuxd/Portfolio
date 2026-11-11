package app.raga.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.PowerManager
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.widget.RadioButton
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import app.raga.assistant.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding
    private lateinit var prefs: Prefs

    // lazy: checking the manifest needs the activity's context, which isn't ready during construction
    private val runtimePerms by lazy { buildList {
        add(Manifest.permission.RECORD_AUDIO)
        add(Manifest.permission.READ_CONTACTS)
        add(Manifest.permission.CALL_PHONE)
        add(Manifest.permission.SEND_SMS)
        add(Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= 33) {
            add(Manifest.permission.POST_NOTIFICATIONS)
            add(Manifest.permission.READ_MEDIA_AUDIO)
            add(Manifest.permission.READ_MEDIA_IMAGES)
            add(Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
    }.filter { declared(it) }.toTypedArray() }

    private val askPerms = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { refresh() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)
        prefs = Prefs(this)

        // models
        ModelManager.SPEECH_MODELS.forEachIndexed { i, m ->
            b.modelGroup.addView(RadioButton(this).apply {
                id = 1000 + i
                text = m.label
                isChecked = prefs.modelName == m.id
                setOnClickListener { prefs.modelName = m.id; refresh() }
            })
        }
        b.download.setOnClickListener { download() }

        // permissions
        b.grantRuntime.setOnClickListener { askPerms.launch(runtimePerms) }
        b.grantOverlay.setOnClickListener {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
        }
        b.grantAccessibility.setOnClickListener {
            Toast.makeText(this, "Find “Raga” in the list and turn it on", Toast.LENGTH_LONG).show()
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
        b.grantFiles.setOnClickListener {
            if (Build.VERSION.SDK_INT >= 30) {
                startActivity(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName")))
            } else {
                askPerms.launch(arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE))
            }
        }
        b.grantBattery.setOnClickListener { requestIgnoreBattery() }

        // voice
        b.enroll.setOnClickListener {
            if (!hasModels()) toast("Download the models first.")
            else if (!granted(Manifest.permission.RECORD_AUDIO)) askPerms.launch(runtimePerms)
            else startActivity(Intent(this, EnrollActivity::class.java))
        }
        b.verifySwitch.setOnCheckedChangeListener { _, on -> prefs.verifyVoice = on; refresh() }
        b.threshold.addOnChangeListener { _, v, fromUser -> if (fromUser) { prefs.threshold = v; refresh() } }

        // keep content clear of the status bar / gesture bar (Android 15 draws edge to edge)
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(b.root) { v, insets ->
            val bars = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        showLastCrash()

        // wake words
        b.wakeWords.setText(prefs.wakeWords.joinToString(", "))
        b.wakeWords.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, c: Int, d: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, c: Int, d: Int) {}
            override fun afterTextChanged(s: Editable?) {
                prefs.wakeWords = s.toString().split(",").map { it.trim() }.filter { it.isNotEmpty() }
            }
        })
        b.speakSwitch.setOnCheckedChangeListener { _, on -> prefs.speakReplies = on }

        b.toggle.setOnClickListener {
            if (RagaStatus.running.value) RagaService.stop(this) else startListening()
        }

        b.examples.text = "Say “Raga”, wait for the chime and the Listening card, then say:\n\n" +
            EXAMPLES.joinToString("\n") { "• $it" }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { RagaStatus.running.collect { refresh() } }
                launch { RagaStatus.state.collect { refresh() } }
                launch { RagaStatus.log.collect { b.log.text = it.take(25).joinToString("\n").ifEmpty { "Nothing yet." } } }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    /** Lite leaves some permissions out of its manifest; don't ask for those. */
    private fun declared(p: String): Boolean = try {
        val info = packageManager.getPackageInfo(packageName, PackageManager.GET_PERMISSIONS)
        info.requestedPermissions?.contains(p) == true
    } catch (_: Exception) { false }

    private fun granted(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun hasModels() = ModelManager.isInstalled(this, prefs.modelName) &&
        ModelManager.isInstalled(this, ModelManager.SPEAKER_MODEL.id)

    private fun accessibilityOn(): Boolean {
        val enabled = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val me = ComponentName(this, RagaAccessibilityService::class.java).flattenToString()
        return enabled.split(':').any { it.equals(me, ignoreCase = true) }
    }

    private fun allFiles() = if (Build.VERSION.SDK_INT >= 30) {
        if (declared(Manifest.permission.MANAGE_EXTERNAL_STORAGE)) Environment.isExternalStorageManager() else true
    }
    else granted(Manifest.permission.READ_EXTERNAL_STORAGE)

    private fun batteryOk() = getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)

    private fun refresh() {
        if (!::b.isInitialized) return
        val running = RagaStatus.running.value
        b.status.text = if (running) "● ${RagaStatus.state.value}" else "Not listening"
        b.toggle.text = if (running) "Stop listening" else "Start listening"

        val models = hasModels()
        b.download.text = if (models) "Models downloaded ✓" else "Download models (~55 MB, one time)"
        b.download.isEnabled = !models

        val runtimeOk = runtimePerms.filter { it != Manifest.permission.POST_NOTIFICATIONS }.all { granted(it) }
        val overlay = Settings.canDrawOverlays(this)
        val a11y = accessibilityOn()
        val files = allFiles()
        val battery = batteryOk()
        fun mark(ok: Boolean) = if (ok) "✓" else "✗"
        b.permStatus.text = listOf(
            "${mark(runtimeOk)} Microphone, contacts, calls, SMS, media",
            "${mark(overlay)} Show Raga over other apps (needed to open apps)",
            if (BuildConfig.SCREEN_CONTROL) "${mark(a11y)} Screen control: click, type, scroll, back, home, lock"
            else "– Screen control isn't in Raga Lite (install the full version for click, type, scroll)",
            "${mark(files)} Find and open any file",
            "${mark(battery)} Keep running with the screen off",
        ).joinToString("\n")
        b.grantRuntime.isEnabled = !runtimeOk
        b.grantOverlay.isEnabled = !overlay
        b.grantAccessibility.isEnabled = !a11y
        b.grantFiles.isEnabled = !files
        if (Build.VERSION.SDK_INT >= 30 && !declared(Manifest.permission.MANAGE_EXTERNAL_STORAGE)) b.grantFiles.visibility = android.view.View.GONE
        b.grantBattery.isEnabled = !battery

        if (!BuildConfig.SCREEN_CONTROL) b.grantAccessibility.visibility = android.view.View.GONE

        val enrolled = prefs.voicePrint != null
        b.voiceStatus.text = if (enrolled) "Voice saved from ${prefs.enrollmentSamples} recordings. Raga ignores other voices."
        else "Not set up yet — until you do, anyone can give Raga commands."
        b.enroll.text = if (enrolled) "Re-record my voice" else "Teach Raga my voice"
        b.verifySwitch.isChecked = prefs.verifyVoice
        b.threshold.value = Prefs.snap(prefs.threshold)
        b.threshold.isEnabled = prefs.verifyVoice
        b.thresholdLabel.text = "Voice-match strictness: ${"%.2f".format(prefs.threshold)} " +
            "(raise it if others can trigger Raga; lower it if Raga ignores you — the log shows each score)"
        b.speakSwitch.isChecked = prefs.speakReplies
    }

    private fun startListening() {
        when {
            !hasModels() -> toast("Download the models first.")
            !granted(Manifest.permission.RECORD_AUDIO) -> askPerms.launch(runtimePerms)
            else -> RagaService.start(this)
        }
    }

    private fun download() {
        val speechModel = ModelManager.SPEECH_MODELS.first { it.id == prefs.modelName }
        b.download.isEnabled = false
        b.downloadProgress.visibility = android.view.View.VISIBLE
        lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    for ((i, m) in listOf(speechModel, ModelManager.SPEAKER_MODEL).withIndex()) {
                        ModelManager.download(this@MainActivity, m) { pct ->
                            runOnUiThread {
                                b.downloadProgress.progress = pct
                                b.download.text = "Downloading ${i + 1}/2: ${m.label} — $pct%"
                            }
                        }
                    }
                }
                toast("Models ready")
            } catch (e: Exception) {
                toast("Download failed: ${e.message}")
            } finally {
                b.downloadProgress.visibility = android.view.View.GONE
                refresh()
            }
        }
    }

    @SuppressLint("BatteryLife")
    private fun requestIgnoreBattery() {
        startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
    }

    /** If Raga crashed last time, show what happened so it can be copied and reported. */
    private fun showLastCrash() {
        val f = RagaApp.crashFile(this)
        if (!f.exists()) return
        val report = try { f.readText() } catch (_: Exception) { "" }
        f.delete()
        if (report.isBlank()) return
        com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
            .setTitle("Raga crashed last time")
            .setMessage("Copy these details and send them to whoever is fixing the app.\n\n" + report.take(3000))
            .setPositiveButton("Copy details") { _, _ ->
                val cm = getSystemService(android.content.ClipboardManager::class.java)
                cm.setPrimaryClip(android.content.ClipData.newPlainText("Raga crash", report))
                toast("Copied")
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_LONG).show()

    companion object {
        val EXAMPLES = listOf(
            "play Shape of You",
            "play some music  /  pause  /  next song",
            "play Arijit Singh on Spotify",
            "call Mom",
            "send a message to Ravi saying I'm on my way",
            "send WhatsApp to Priya saying call me",
            "open YouTube",
            "open file resume",
            "send file report on WhatsApp",
            "click send  /  scroll down  /  go back  /  go home",
            "type see you soon",
            "turn on the flashlight",
            "volume up  /  mute",
            "set an alarm for six thirty a m",
            "set a timer for ten minutes",
            "what time is it  /  battery level",
            "take a photo  /  take a screenshot",
            "navigate to the airport",
            "search for cricket score",
            "lock the phone",
            "stop listening",
        )
    }
}
