package app.raga.assistant

import android.content.ContentUris
import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.provider.MediaStore

data class Song(val id: Long, val title: String, val artist: String, val album: String)

/** Plays songs stored on the phone, so "Raga play <song>" works offline. */
class LocalPlayer(private val context: Context) {
    private var player: MediaPlayer? = null
    private var queue: List<Song> = emptyList()
    private var index = 0

    val isActive get() = player != null
    val current: Song? get() = queue.getOrNull(index)

    fun loadLibrary(): List<Song> {
        val out = ArrayList<Song>()
        val proj = arrayOf(
            MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST, MediaStore.Audio.Media.ALBUM,
        )
        try {
            context.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, proj,
                "${MediaStore.Audio.Media.IS_MUSIC} != 0", null, null,
            )?.use { c ->
                while (c.moveToNext()) {
                    out += Song(c.getLong(0), c.getString(1) ?: "", c.getString(2) ?: "", c.getString(3) ?: "")
                }
            }
        } catch (_: SecurityException) {
        }
        return out
    }

    fun play(queue: List<Song>, start: Int = 0) {
        if (queue.isEmpty()) return
        this.queue = queue
        this.index = start.coerceIn(0, queue.lastIndex)
        startCurrent()
    }

    private var failures = 0

    private fun startCurrent() {
        release()
        val song = current ?: return
        val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, song.id)
        try {
            player = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build(),
            )
            setDataSource(context, uri)
            setOnCompletionListener { failures = 0; next() }
            setOnErrorListener { _, _, _ -> skipBroken(); true }
            setOnPreparedListener { it.start() }
            prepareAsync()
            }
        } catch (e: Exception) {
            skipBroken()
        }
    }

    /** A song that can't be played (deleted, unsupported) is skipped, without looping forever. */
    private fun skipBroken() {
        release()
        if (++failures < minOf(queue.size, 5)) next() else failures = 0
    }

    fun pause() { try { player?.takeIf { it.isPlaying }?.pause() } catch (_: IllegalStateException) {} }
    fun resume() { try { player?.start() } catch (_: IllegalStateException) {} }
    fun next() { if (queue.isNotEmpty()) { index = (index + 1) % queue.size; startCurrent() } }
    fun previous() { if (queue.isNotEmpty()) { index = (index - 1 + queue.size) % queue.size; startCurrent() } }

    fun release() {
        player?.release()
        player = null
    }
}
