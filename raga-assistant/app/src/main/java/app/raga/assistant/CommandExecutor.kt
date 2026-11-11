package app.raga.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.app.SearchManager
import android.content.ActivityNotFoundException
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.AlarmClock
import android.provider.ContactsContract
import android.provider.MediaStore
import android.provider.Settings
import android.telecom.TelecomManager
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import android.view.KeyEvent
import android.webkit.MimeTypeMap
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** What to say back, and optionally a follow-up question that waits for the owner's answer. */
data class Outcome(val say: String?, val followUp: FollowUp? = null)

sealed class FollowUp(val prompt: String) {
    /** Yes/no question. */
    class Confirm(prompt: String, val onYes: () -> Outcome) : FollowUp(prompt)
    /** Free-text answer, e.g. the body of a message. */
    class Ask(prompt: String, val onAnswer: (String) -> Outcome) : FollowUp(prompt)
}

class CommandExecutor(private val ctx: Context, private val onStopRequested: () -> Unit) {

    private val player = LocalPlayer(ctx)
    private val main = Handler(Looper.getMainLooper())

    fun release() = player.release()

    /** Contact and app names, given to the speech recogniser so it hears them correctly. */
    fun vocabulary(): List<String> {
        val names = ArrayList<String>()
        try { names += contacts().map { it.name }.take(150) } catch (_: Exception) {}
        try { names += apps().map { it.label }.take(150) } catch (_: Exception) {}
        return names.distinct()
    }

    fun execute(cmd: Command): Outcome = try {
        run(cmd)
    } catch (e: SecurityException) {
        Outcome("I don't have permission for that. Open the Raga app and grant permissions.")
    } catch (e: ActivityNotFoundException) {
        Outcome("No app on this phone can do that.")
    } catch (e: Exception) {
        Outcome("Something went wrong: ${e.message ?: e.javaClass.simpleName}")
    }

    private fun run(cmd: Command): Outcome = when (cmd) {
        is Command.PlaySong -> playSong(cmd)
        is Command.Media -> media(cmd.action)
        is Command.Call -> call(cmd.who)
        is Command.SendSms -> sms(cmd.who, cmd.body)
        is Command.SendWhatsApp -> whatsApp(cmd.who, cmd.body)
        is Command.OpenApp -> openApp(cmd.name)
        is Command.OpenFile -> openFile(cmd.name)
        is Command.ShareFile -> shareFile(cmd.name, cmd.app)
        is Command.Global -> global(cmd.action)
        is Command.Click -> a11y { if (it.clickByText(cmd.label)) Outcome(null) else Outcome("I can't see ${cmd.label} on the screen.") }
        is Command.TypeText -> a11y { if (it.typeText(cmd.text)) Outcome(null) else Outcome("Tap a text box first, or say click and its name.") }
        is Command.Scroll -> a11y { it.scroll(cmd.down); Outcome(null) }
        is Command.Flashlight -> flashlight(cmd.on)
        is Command.Volume -> volume(cmd)
        is Command.SetAlarm -> alarm(cmd)
        is Command.SetTimer -> timer(cmd.seconds)
        is Command.OpenPanel -> panel(cmd.panel)
        Command.TakePhoto -> {
            start(Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA))
            Outcome("Camera is open. Say Raga, click shutter, to take the photo.")
        }
        Command.TellTime -> Outcome("It's " + SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date()))
        Command.TellDate -> Outcome("Today is " + SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(Date()))
        Command.TellBattery -> {
            val bm = ctx.getSystemService(BatteryManager::class.java)
            val pct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            Outcome("Battery is at $pct percent" + if (bm.isCharging) " and charging." else ".")
        }
        is Command.WebSearch -> {
            val i = Intent(Intent.ACTION_WEB_SEARCH).putExtra(SearchManager.QUERY, cmd.query)
            if (!tryStart(i)) start(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/search?q=" + Uri.encode(cmd.query))))
            Outcome("Searching for ${cmd.query}")
        }
        is Command.Navigate -> {
            val i = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + Uri.encode(cmd.destination)))
            if (!tryStart(i)) start(Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(cmd.destination))))
            Outcome("Starting directions to ${cmd.destination}")
        }
        Command.Help -> Outcome(
            "Say Raga, then a command. For example: play a song, pause, next song, call Mom, " +
                "send a message to Ravi saying I'm on my way, send WhatsApp to Mom, open YouTube, " +
                "open file resume, flashlight on, volume up, set an alarm for 6 a m, set a timer for 5 minutes, " +
                "what time is it, take a photo, go home, go back, scroll down, click send, or stop listening.",
        )
        Command.StopListening -> { main.postDelayed(onStopRequested, 1500); Outcome("Okay, I'll stop listening. Bye.") }
        Command.Yes, Command.No, Command.Cancel -> Outcome(null)
        is Command.Unknown -> unknown(cmd.text)
    }

    // ------------------------------------------------------------------ helpers

    private fun has(perm: String) = ContextCompat.checkSelfPermission(ctx, perm) == PackageManager.PERMISSION_GRANTED

    private fun start(intent: Intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(intent)
    }

    private fun tryStart(intent: Intent): Boolean = try {
        start(intent); true
    } catch (_: ActivityNotFoundException) {
        false
    }

    private inline fun a11y(block: (RagaAccessibilityService) -> Outcome): Outcome {
        val svc = RagaAccessibilityService.instance
            ?: return Outcome(
                if (BuildConfig.SCREEN_CONTROL) "Turn on Raga in Accessibility settings so I can control the screen."
                else "Screen control needs the full version of Raga.",
            )
        return block(svc)
    }

    /** Pick the best fuzzy match; act on a strong match, ask "did you mean" on a weak one. */
    private fun <T> resolve(
        spoken: String, items: Collection<T>, name: (T) -> String, what: String, act: (T) -> Outcome,
    ): Outcome {
        val m = Fuzzy.best(spoken, items, name) ?: return Outcome("I couldn't find any $what.")
        return when {
            m.score >= 0.80 -> act(m.item)
            m.score >= 0.55 -> Outcome(null, FollowUp.Confirm("Did you mean ${name(m.item)}?") { act(m.item) })
            else -> Outcome("I couldn't find $spoken in your $what.")
        }
    }

    // ------------------------------------------------------------------ contacts

    data class Contact(val name: String, val number: String)

    private fun contacts(): List<Contact> {
        if (!has(Manifest.permission.READ_CONTACTS)) throw SecurityException()
        val byName = LinkedHashMap<String, Contact>()
        ctx.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER,
                ContactsContract.CommonDataKinds.Phone.IS_SUPER_PRIMARY,
            ),
            null, null, null,
        )?.use { c ->
            while (c.moveToNext()) {
                val name = c.getString(0) ?: continue
                val number = c.getString(1) ?: continue
                val primary = c.getInt(2) != 0
                if (primary || name !in byName) byName[name] = Contact(name, number)
            }
        }
        return byName.values.toList()
    }

    /** A spoken phone number, or the best-matching contact. */
    private fun withContact(who: String, act: (Contact) -> Outcome): Outcome {
        Numbers.parsePhone(who)?.let { return act(Contact(it, it)) }
        return resolve(who, contacts(), { it.name }, "contacts", act)
    }

    // ------------------------------------------------------------------ calls & messages

    @SuppressLint("MissingPermission")
    private fun call(who: String): Outcome = withContact(who) { c ->
        if (!has(Manifest.permission.CALL_PHONE)) throw SecurityException()
        val tm = ctx.getSystemService(TelecomManager::class.java)
        tm.placeCall(Uri.fromParts("tel", c.number, null), Bundle())
        Outcome("Calling ${c.name}")
    }

    private fun sms(who: String, body: String?): Outcome = withContact(who) { c ->
        val send: (String) -> Outcome = { text ->
            Outcome(null, FollowUp.Confirm("Send to ${c.name}: $text. Shall I send it?") {
                if (!has(Manifest.permission.SEND_SMS)) {
                    // Lite: no direct SMS permission, so open the Messages app with the text filled in
                    start(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + Uri.encode(c.number))).putExtra("sms_body", text))
                    Outcome("The message is ready. Tap send.")
                } else {
                    val sm = if (Build.VERSION.SDK_INT >= 31) ctx.getSystemService(SmsManager::class.java)
                    else @Suppress("DEPRECATION") SmsManager.getDefault()
                    sm.sendMultipartTextMessage(c.number, null, sm.divideMessage(text), null, null)
                    Outcome("Message sent to ${c.name}.")
                }
            })
        }
        if (body.isNullOrBlank()) Outcome(null, FollowUp.Ask("What should the message to ${c.name} say?") { send(it) })
        else send(body)
    }

    private fun whatsApp(who: String, body: String?): Outcome = withContact(who) { c ->
        val send: (String) -> Outcome = { text ->
            Outcome(null, FollowUp.Confirm("WhatsApp to ${c.name}: $text. Shall I send it?") {
                val pkg = listOf("com.whatsapp", "com.whatsapp.w4b").firstOrNull { isInstalled(it) }
                if (pkg == null) Outcome("WhatsApp isn't installed.") else openWhatsApp(pkg, c, text)
            })
        }
        if (body.isNullOrBlank()) Outcome(null, FollowUp.Ask("What should the WhatsApp message say?") { send(it) })
        else send(body)
    }

    private fun openWhatsApp(pkg: String, c: Contact, text: String): Outcome {
        val phone = internationalDigits(c.number)
        val uri = Uri.parse("https://api.whatsapp.com/send?phone=$phone&text=" + Uri.encode(text))
        start(Intent(Intent.ACTION_VIEW, uri).setPackage(pkg))
        val svc = RagaAccessibilityService.instance
        return if (svc != null) {
            main.postDelayed({ svc.clickWhatsAppSend() }, 2500)
            Outcome("Sending on WhatsApp to ${c.name}.")
        } else {
            Outcome("The message is ready in WhatsApp. Tap send, or turn on Raga accessibility to let me send it.")
        }
    }

    private fun isInstalled(pkg: String) = try {
        ctx.packageManager.getPackageInfo(pkg, 0); true
    } catch (_: PackageManager.NameNotFoundException) {
        false
    }

    /** WhatsApp links need the number with its country code and no "+" or leading zero. */
    private fun internationalDigits(number: String): String {
        val digits = number.filter { it.isDigit() }
        if (number.trim().startsWith("+")) return digits
        if (digits.startsWith("00")) return digits.drop(2)
        val iso = ctx.getSystemService(TelephonyManager::class.java)
            ?.let { it.simCountryIso.ifEmpty { it.networkCountryIso } }?.lowercase()
            ?: Locale.getDefault().country.lowercase()
        val cc = COUNTRY_CODES[iso] ?: return digits
        val local = digits.trimStart('0')
        return if (local.startsWith(cc) && local.length > 10) local else cc + local
    }

    // ------------------------------------------------------------------ media

    private fun playSong(cmd: Command.PlaySong): Outcome {
        val q = cmd.query
        cmd.app?.let { return playInApp(q, it) }

        val library = player.loadLibrary()
        val generic = q in setOf("music", "songs", "some music", "something", "anything", "my music", "all songs", "a song")
        if (generic && library.isNotEmpty()) {
            player.play(library.shuffled())
            return Outcome("Playing your music.")
        }
        if (library.isNotEmpty()) {
            val best = library.map { s ->
                s to maxOf(
                    Fuzzy.score(q, s.title),
                    Fuzzy.score(q, s.artist) - 0.05,
                    Fuzzy.score(q, s.album) - 0.1,
                    Fuzzy.score(q, "${s.title} ${s.artist}"),
                )
            }.maxBy { it.second }
            if (best.second >= 0.72) {
                val song = best.first
                // if it was an artist match, queue all that artist's songs
                val artistQueue = library.filter { it.artist == song.artist && Fuzzy.score(q, song.artist) >= 0.8 }
                if (artistQueue.size > 1) player.play(artistQueue.shuffled()) else player.play(listOf(song) + (library - song).shuffled())
                return Outcome("Playing ${player.current?.title ?: song.title}")
            }
        }
        // not on the phone: hand off to a streaming app that supports "play from search"
        val search = Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH)
            .putExtra(MediaStore.EXTRA_MEDIA_FOCUS, "vnd.android.cursor.item/*")
            .putExtra(SearchManager.QUERY, q)
        if (tryStart(search)) return Outcome("Playing $q")
        return playInApp(q, MusicApp.YOUTUBE)
    }

    private fun playInApp(q: String, app: MusicApp): Outcome {
        val (pkg, name) = when (app) {
            MusicApp.SPOTIFY -> "com.spotify.music" to "Spotify"
            MusicApp.YOUTUBE_MUSIC -> "com.google.android.apps.youtube.music" to "YouTube Music"
            MusicApp.YOUTUBE -> "com.google.android.youtube" to "YouTube"
        }
        val playFromSearch = Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH)
            .putExtra(MediaStore.EXTRA_MEDIA_FOCUS, "vnd.android.cursor.item/*")
            .putExtra(SearchManager.QUERY, q).setPackage(pkg)
        if (app != MusicApp.YOUTUBE && tryStart(playFromSearch)) return Outcome("Playing $q on $name")
        val ytSearch = Intent(Intent.ACTION_SEARCH).setPackage(pkg).putExtra(SearchManager.QUERY, q)
        if (tryStart(ytSearch)) return Outcome("Searching $name for $q. Say Raga, click, and the video name.")
        start(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(q))))
        return Outcome("Searching YouTube for $q")
    }

    private fun media(action: MediaAction): Outcome {
        if (player.isActive) {
            when (action) {
                MediaAction.PLAY -> player.resume()
                MediaAction.PAUSE -> player.pause()
                MediaAction.NEXT -> player.next()
                MediaAction.PREVIOUS -> player.previous()
            }
            return Outcome(if (action == MediaAction.NEXT || action == MediaAction.PREVIOUS) player.current?.title else null)
        }
        // control whatever app is playing (Spotify, YouTube Music, ...)
        val code = when (action) {
            MediaAction.PLAY -> KeyEvent.KEYCODE_MEDIA_PLAY
            MediaAction.PAUSE -> KeyEvent.KEYCODE_MEDIA_PAUSE
            MediaAction.NEXT -> KeyEvent.KEYCODE_MEDIA_NEXT
            MediaAction.PREVIOUS -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
        }
        val am = ctx.getSystemService(AudioManager::class.java)
        am.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
        am.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        return Outcome(null)
    }

    // ------------------------------------------------------------------ apps

    data class App(val label: String, val pkg: String)

    private fun apps(): List<App> {
        val pm = ctx.packageManager
        val main = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return pm.queryIntentActivities(main, 0)
            .map { App(it.loadLabel(pm).toString(), it.activityInfo.packageName) }
            .distinctBy { it.pkg }
    }

    private fun launch(app: App): Outcome {
        val i = ctx.packageManager.getLaunchIntentForPackage(app.pkg) ?: return Outcome("I can't open ${app.label}.")
        start(i)
        return Outcome("Opening ${app.label}")
    }

    private fun openApp(name: String): Outcome = resolve(name, apps(), { it.label }, "apps") { launch(it) }

    private fun unknown(text: String): Outcome {
        val m = Fuzzy.best(text, apps()) { it.label }
        if (m != null && m.score >= 0.85) return launch(m.item)
        return Outcome("Sorry, I didn't understand: $text. Say Raga help to hear what I can do.")
    }

    // ------------------------------------------------------------------ files

    data class FileHit(val id: Long, val name: String, val path: String?, val mime: String?)

    private fun findFiles(spoken: String): List<FileHit> {
        val uri = MediaStore.Files.getContentUri("external")
        val proj = arrayOf(
            MediaStore.Files.FileColumns._ID, MediaStore.Files.FileColumns.DISPLAY_NAME,
            @Suppress("DEPRECATION") MediaStore.Files.FileColumns.DATA, MediaStore.Files.FileColumns.MIME_TYPE,
        )
        val longest = Fuzzy.normalize(spoken).split(" ").maxByOrNull { it.length } ?: ""
        val out = ArrayList<FileHit>()
        fun q(selection: String?, args: Array<String>?) {
            ctx.contentResolver.query(uri, proj, selection, args, "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC")?.use { c ->
                while (c.moveToNext() && out.size < 20_000) {
                    val name = c.getString(1) ?: continue
                    out += FileHit(c.getLong(0), name, c.getString(2), c.getString(3))
                }
            }
        }
        val base = "${MediaStore.Files.FileColumns.MIME_TYPE} IS NOT NULL"
        if (longest.length >= 3) q("$base AND ${MediaStore.Files.FileColumns.DISPLAY_NAME} LIKE ?", arrayOf("%$longest%"))
        if (out.isEmpty()) q(base, null)
        return out
    }

    private fun fileUri(f: FileHit): Uri {
        val path = f.path
        if (path != null && File(path).canRead()) {
            return FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", File(path))
        }
        return ContentUris.withAppendedId(MediaStore.Files.getContentUri("external"), f.id)
    }

    private fun mimeOf(f: FileHit) = f.mime
        ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(f.name.substringAfterLast('.', "").lowercase())
        ?: "*/*"

    private fun openFile(name: String): Outcome = resolve(name, findFiles(name), { it.name }, "files") { f ->
        val i = Intent(Intent.ACTION_VIEW).setDataAndType(fileUri(f), mimeOf(f))
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        start(i)
        Outcome("Opening ${f.name}")
    }

    private fun shareFile(name: String, target: String?): Outcome = resolve(name, findFiles(name), { it.name }, "files") { f ->
        val send = Intent(Intent.ACTION_SEND).setType(mimeOf(f))
            .putExtra(Intent.EXTRA_STREAM, fileUri(f))
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        val app = target?.let { t -> Fuzzy.best(t, apps()) { it.label }?.takeIf { it.score >= 0.75 }?.item }
        if (app != null) {
            send.setPackage(app.pkg)
            if (tryStart(send)) return@resolve Outcome("Sharing ${f.name} on ${app.label}. Say Raga, click, and the person's name.")
        }
        start(Intent.createChooser(send, "Send ${f.name}"))
        Outcome(
            if (target != null && app == null) "Sharing ${f.name}. Say Raga, click, and the name of the app or person."
            else "Sharing ${f.name}. Say Raga, click, and the app name.",
        )
    }

    // ------------------------------------------------------------------ device

    private fun global(action: GlobalAction): Outcome {
        if (action == GlobalAction.HOME && RagaAccessibilityService.instance == null) {
            start(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME))
            return Outcome(null)
        }
        return a11y {
            if (it.global(action)) Outcome(if (action == GlobalAction.SCREENSHOT) "Screenshot taken." else null)
            else Outcome("This phone doesn't support that.")
        }
    }

    private fun flashlight(on: Boolean): Outcome {
        val cm = ctx.getSystemService(CameraManager::class.java)
        val id = cm.cameraIdList.firstOrNull {
            cm.getCameraCharacteristics(it).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        } ?: return Outcome("This phone has no flashlight.")
        cm.setTorchMode(id, on)
        return Outcome("Flashlight ${if (on) "on" else "off"}.")
    }

    private fun volume(cmd: Command.Volume): Outcome {
        val am = ctx.getSystemService(AudioManager::class.java)
        val s = AudioManager.STREAM_MUSIC
        val ui = AudioManager.FLAG_SHOW_UI
        when (cmd.change) {
            VolumeChange.UP -> repeat(2) { am.adjustStreamVolume(s, AudioManager.ADJUST_RAISE, ui) }
            VolumeChange.DOWN -> repeat(2) { am.adjustStreamVolume(s, AudioManager.ADJUST_LOWER, ui) }
            VolumeChange.MUTE -> am.adjustStreamVolume(s, AudioManager.ADJUST_MUTE, ui)
            VolumeChange.UNMUTE -> am.adjustStreamVolume(s, AudioManager.ADJUST_UNMUTE, ui)
            VolumeChange.MAX -> am.setStreamVolume(s, am.getStreamMaxVolume(s), ui)
            VolumeChange.SET -> am.setStreamVolume(s, am.getStreamMaxVolume(s) * (cmd.percent ?: 50) / 100, ui)
        }
        return Outcome(null)
    }

    private fun alarm(cmd: Command.SetAlarm): Outcome {
        val i = Intent(AlarmClock.ACTION_SET_ALARM)
            .putExtra(AlarmClock.EXTRA_HOUR, cmd.hour)
            .putExtra(AlarmClock.EXTRA_MINUTES, cmd.minute)
            .putExtra(AlarmClock.EXTRA_SKIP_UI, true)
        cmd.label?.let { i.putExtra(AlarmClock.EXTRA_MESSAGE, it) }
        start(i)
        val h12 = if (cmd.hour % 12 == 0) 12 else cmd.hour % 12
        val ampm = if (cmd.hour < 12) "a m" else "p m"
        return Outcome("Alarm set for $h12:${"%02d".format(cmd.minute)} $ampm.")
    }

    private fun timer(seconds: Int): Outcome {
        start(
            Intent(AlarmClock.ACTION_SET_TIMER)
                .putExtra(AlarmClock.EXTRA_LENGTH, seconds)
                .putExtra(AlarmClock.EXTRA_SKIP_UI, true),
        )
        val m = seconds / 60
        val s = seconds % 60
        val text = listOfNotNull(
            m.takeIf { it > 0 }?.let { "$it minute" + if (it > 1) "s" else "" },
            s.takeIf { it > 0 }?.let { "$it second" + if (it > 1) "s" else "" },
        ).joinToString(" and ")
        return Outcome("Timer set for $text.")
    }

    private fun panel(p: Panel): Outcome {
        val action = when (p) {
            Panel.WIFI -> if (Build.VERSION.SDK_INT >= 29) Settings.Panel.ACTION_WIFI else Settings.ACTION_WIFI_SETTINGS
            Panel.BLUETOOTH -> Settings.ACTION_BLUETOOTH_SETTINGS
            Panel.MOBILE_DATA -> if (Build.VERSION.SDK_INT >= 29) Settings.Panel.ACTION_INTERNET_CONNECTIVITY else Settings.ACTION_DATA_ROAMING_SETTINGS
            Panel.HOTSPOT -> Settings.ACTION_WIRELESS_SETTINGS
            Panel.SETTINGS -> Settings.ACTION_SETTINGS
        }
        start(Intent(action))
        return Outcome(
            if (p == Panel.SETTINGS) "Opening settings."
            else "Android only lets apps open this switch for you. Say Raga, click, and the switch name.",
        )
    }

    companion object {
        /** Calling codes for the most common SIM countries (used for WhatsApp links). */
        val COUNTRY_CODES = mapOf(
            "in" to "91", "us" to "1", "ca" to "1", "gb" to "44", "au" to "61", "ae" to "971",
            "sa" to "966", "sg" to "65", "my" to "60", "de" to "49", "fr" to "33", "it" to "39",
            "es" to "34", "nl" to "31", "ie" to "353", "nz" to "64", "za" to "27", "pk" to "92",
            "bd" to "880", "lk" to "94", "np" to "977", "qa" to "974", "kw" to "965", "om" to "968",
            "bh" to "973", "jp" to "81", "kr" to "82", "cn" to "86", "br" to "55", "mx" to "52",
            "id" to "62", "ph" to "63", "th" to "66", "ng" to "234", "ke" to "254",
        )
    }
}
