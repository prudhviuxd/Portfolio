package app.raga.assistant

import android.app.Application
import android.os.Build
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Saves the details of any crash to a private file, so the next time Raga opens it can
 * show them and the owner can copy them (no data is sent anywhere).
 */
class RagaApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, e ->
            try {
                val sw = StringWriter()
                e.printStackTrace(PrintWriter(sw))
                crashFile(this).writeText(
                    "Raga ${BuildConfig.VERSION_NAME} on Android ${Build.VERSION.RELEASE} " +
                        "(${Build.MANUFACTURER} ${Build.MODEL})\n" +
                        SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()) +
                        " thread=${thread.name}\n\n" + sw.toString().take(12_000),
                )
            } catch (_: Throwable) {
            }
            previous?.uncaughtException(thread, e)
        }
    }

    companion object {
        fun crashFile(app: android.content.Context) = File(app.filesDir, "last_crash.txt")

        /** If Raga crashed last time, show what happened so it can be copied and reported. */
        fun showLastCrash(a: android.app.Activity) {
            val f = crashFile(a)
            if (!f.exists()) return
            val report = try { f.readText() } catch (_: Exception) { "" }
            f.delete()
            if (report.isBlank()) return
            com.google.android.material.dialog.MaterialAlertDialogBuilder(a)
                .setTitle("Raga crashed last time")
                .setMessage("Copy these details and send them to whoever is fixing the app.\n\n" + report.take(3000))
                .setPositiveButton("Copy details") { _, _ ->
                    val cm = a.getSystemService(android.content.ClipboardManager::class.java)
                    cm.setPrimaryClip(android.content.ClipData.newPlainText("Raga crash", report))
                }
                .setNegativeButton("Close", null)
                .show()
        }
    }
}
