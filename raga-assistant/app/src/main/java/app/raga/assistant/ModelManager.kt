package app.raga.assistant

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream

/**
 * Downloads the offline Vosk models once (about 55 MB in total). After that,
 * all listening, recognition and voice checks happen on the phone with no internet.
 */
object ModelManager {

    data class ModelInfo(val id: String, val label: String, val url: String, val sha256: String)

    val SPEECH_MODELS = listOf(
        ModelInfo(
            "vosk-model-small-en-us-0.15", "English (US) — knows the word \"raga\"",
            "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
            "30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498",
        ),
        ModelInfo(
            "vosk-model-small-en-in-0.4", "English (India) — better for Indian accents",
            "https://alphacephei.com/vosk/models/vosk-model-small-en-in-0.4.zip",
            "20663dcac4d5cb783a579c54d98339344a688e4ec6e1b4a4b059fd1235454cc7",
        ),
    )

    val SPEAKER_MODEL = ModelInfo(
        "vosk-model-spk-0.4", "Speaker identification",
        "https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip",
        "a74d8f51144484813e16af689bb0f916b7a111e2347f467c4933c1166097b5a7",
    )

    fun modelsDir(context: Context) = File(context.filesDir, "models")
    fun dir(context: Context, id: String) = File(modelsDir(context), id)
    fun isInstalled(context: Context, id: String) = File(dir(context, id), ".complete").exists()

    /** Blocking. Call from a background thread. */
    fun download(context: Context, info: ModelInfo, onProgress: (Int) -> Unit) {
        val target = dir(context, info.id)
        if (isInstalled(context, info.id)) return
        target.deleteRecursively()
        modelsDir(context).mkdirs()

        val zip = File(context.cacheDir, "${info.id}.zip")
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        val conn = URL(info.url).openConnection() as HttpURLConnection
        conn.connectTimeout = 20_000
        conn.readTimeout = 60_000
        conn.instanceFollowRedirects = true
        try {
            if (conn.responseCode !in 200..299) error("Download failed: HTTP ${conn.responseCode}")
            val total = conn.contentLengthLong
            conn.inputStream.use { input ->
                FileOutputStream(zip).use { out ->
                    val buf = ByteArray(64 * 1024)
                    var read = 0L
                    var lastPct = -1
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        digest.update(buf, 0, n)
                        read += n
                        if (total > 0) {
                            val pct = (read * 90 / total).toInt()
                            if (pct != lastPct) { lastPct = pct; onProgress(pct) }
                        }
                    }
                }
            }
        } finally {
            conn.disconnect()
        }

        // Refuse a tampered or corrupted download: native code parses these files.
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        if (!actual.equals(info.sha256, ignoreCase = true)) {
            zip.delete()
            error("Downloaded file failed its integrity check. Please try again.")
        }

        // The archive contains a single top-level folder named after the model; strip it.
        val root = target.canonicalFile
        ZipInputStream(zip.inputStream().buffered()).use { zin ->
            while (true) {
                val entry = zin.nextEntry ?: break
                val rel = entry.name.substringAfter('/', "")
                if (rel.isEmpty()) continue
                val out = File(target, rel).canonicalFile
                if (!out.path.startsWith(root.path + File.separator)) continue // zip-slip guard
                if (entry.isDirectory) out.mkdirs() else {
                    out.parentFile?.mkdirs()
                    FileOutputStream(out).use { zin.copyTo(it) }
                }
            }
        }
        zip.delete()
        File(target, ".complete").writeText("ok")
        onProgress(100)
    }
}
