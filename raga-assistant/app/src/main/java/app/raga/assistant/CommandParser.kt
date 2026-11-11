package app.raga.assistant

/** Everything Raga understands. Parsing is pure Kotlin so it can be unit-tested off-device. */
sealed class Command {
    // media
    data class PlaySong(val query: String, val app: MusicApp? = null) : Command()
    data class Media(val action: MediaAction) : Command()

    // communication
    data class Call(val who: String) : Command()
    data class SendSms(val who: String, val body: String?) : Command()
    data class SendWhatsApp(val who: String, val body: String?) : Command()

    // apps & files
    data class OpenApp(val name: String) : Command()
    /** Close an app (null = the app that was on screen). */
    data class CloseApp(val name: String?) : Command()
    object CloseAllApps : Command()
    data class OpenFile(val name: String) : Command()
    data class ShareFile(val name: String, val app: String?) : Command()

    // phone control (accessibility)
    data class Global(val action: GlobalAction) : Command()
    data class Click(val label: String) : Command()
    data class TypeText(val text: String) : Command()
    data class Scroll(val down: Boolean) : Command()

    // device
    data class Flashlight(val on: Boolean) : Command()
    data class Volume(val change: VolumeChange, val percent: Int? = null) : Command()
    data class SetAlarm(val hour: Int, val minute: Int, val label: String?) : Command()
    data class SetTimer(val seconds: Int) : Command()
    data class OpenPanel(val panel: Panel) : Command()
    object TakePhoto : Command()
    object TellTime : Command()
    object TellDate : Command()
    object TellBattery : Command()

    // web
    data class WebSearch(val query: String) : Command()
    data class Navigate(val destination: String) : Command()

    // conversation
    object Yes : Command()
    object No : Command()
    object Cancel : Command()
    object Help : Command()
    object StopListening : Command()
    data class Unknown(val text: String) : Command()
}

enum class MusicApp { SPOTIFY, YOUTUBE, YOUTUBE_MUSIC }
enum class MediaAction { PLAY, PAUSE, NEXT, PREVIOUS }
enum class GlobalAction { HOME, BACK, RECENTS, NOTIFICATIONS, QUICK_SETTINGS, LOCK, SCREENSHOT }
enum class VolumeChange { UP, DOWN, MUTE, UNMUTE, SET, MAX }
enum class Panel { WIFI, BLUETOOTH, SETTINGS, MOBILE_DATA, HOTSPOT }

object CommandParser {

    /** Words the small model hears for things it has no single word for. */
    private val respellings = listOf(
        Regex("\\bwhat'?s ?app\\b") to "whatsapp",
        Regex("\\bwhat sap\\b") to "whatsapp",
        Regex("\\bwhats up\\b") to "whatsapp",
        Regex("\\bwhat's up\\b") to "whatsapp",
        Regex("\\byou tube\\b") to "youtube",
        Regex("\\bflash light\\b") to "flashlight",
        Regex("\\bscreen shot\\b") to "screenshot",
        Regex("\\bblue tooth\\b") to "bluetooth",
        Regex("\\bwi fi\\b") to "wifi",
        Regex("\\bwifi\\b") to "wifi",
        Regex("\\bhot spot\\b") to "hotspot",
    )

    fun clean(text: String): String {
        var t = " " + text.lowercase().replace(Regex("[^a-z0-9' ]"), " ").replace(Regex("\\s+"), " ").trim() + " "
        for ((re, rep) in respellings) t = re.replace(t, rep)
        // politeness and filler
        val filler = Regex("^ (please|can you|could you|would you|will you|kindly|hey|ok|okay|um|uh|and|now) (?=\\S)")
        repeat(3) { t = filler.replace(t, " ") }
        t = t.replace(Regex("(?<=\\S) (please|for me) $"), " ")
        return t.replace(Regex("\\s+"), " ").trim()
    }

    /**
     * Split an utterance on the wake word.
     * Returns null when no wake word was said, or the (possibly empty) command that follows it.
     */
    fun afterWakeWord(text: String, wakeWords: List<String>): String? {
        val words = text.lowercase().trim().split(Regex("\\s+"))
        val wake = wakeWords.map { it.lowercase().trim() }.filter { it.isNotEmpty() }
        for (i in words.indices) {
            for (w in wake) {
                val ww = w.split(" ")
                if (i + ww.size <= words.size && words.subList(i, i + ww.size) == ww) {
                    return words.drop(i + ww.size).joinToString(" ").trim()
                }
            }
        }
        return null
    }

    private fun match(t: String, vararg patterns: String): MatchResult? {
        for (p in patterns) Regex("^(?:$p)$").find(t)?.let { return it }
        return null
    }

    private fun stripArticles(s: String) = s.replace(Regex("^(the|a|an|my) "), "").trim()

    fun parse(raw: String): Command {
        val t = clean(raw)
        if (t.isEmpty()) return Command.Unknown(raw)

        // ---------- conversation ----------
        match(t, "(yes|yeah|yep|yup|sure|ok|okay|confirm|do it|go ahead|correct|right|send it|yes please)( please)?")?.let { return Command.Yes }
        match(t, "(no|nope|nah|don't|do not|wrong|no thanks)")?.let { return Command.No }
        match(t, "(cancel|never ?mind|forget it|stop that|nothing)")?.let { return Command.Cancel }
        match(t, "(help|what can you do|what do you do|commands)")?.let { return Command.Help }
        match(t, "(stop listening|go to sleep|sleep|shut down|turn yourself off|goodbye|good bye)")?.let { return Command.StopListening }

        // ---------- media control ----------
        match(t, "(pause|stop)( the)?( music| song| playback| video)?")?.let { return Command.Media(MediaAction.PAUSE) }
        match(t, "(resume|continue|unpause|play)( the)?( music| song| playback)?")?.let { return Command.Media(MediaAction.PLAY) }
        match(t, "(next|skip)( the)?( song| track| one)?|play( the)? next( song| track)?|skip (this|it)")?.let { return Command.Media(MediaAction.NEXT) }
        match(t, "(previous|last|go back to the previous)( song| track| one)?|play( the)? previous( song| track)?")?.let { return Command.Media(MediaAction.PREVIOUS) }

        // ---------- calls ----------
        match(t, "(call|dial|phone|ring|make a call to|place a call to) (.+)")?.let {
            val who = stripArticles(it.groupValues[2].replace(Regex(" (now|on (the )?phone|on mobile)$"), ""))
            return Command.Call(who)
        }

        // ---------- whatsapp ----------
        match(
            t,
            "(?:send )?(?:a )?whatsapp(?: message)? to (.+?)(?: (?:saying|that says|that|says|telling|tell them|with) (.+))?",
            "(?:send )?(?:a )?(?:message|text) to (.+?) on whatsapp(?: (?:saying|that says|that|says|with) (.+))?",
            "(?:send )?(?:a )?(?:message|text) to (.+?) (?:saying|that says|that|says|with) (.+) on whatsapp",
            "whatsapp (.+?)(?: (?:saying|that says|that|says) (.+))?",
        )?.let {
            return Command.SendWhatsApp(stripArticles(it.groupValues[1]), it.groupValues.getOrNull(2)?.ifBlank { null })
        }

        // ---------- sms ----------
        match(
            t,
            "(?:send )?(?:a |an )?(?:message|text|text message|sms) to (.+?)(?: (?:saying|that says|that|says|telling|tell them|with) (.+))?",
            "(?:send )?(?:a |an )?(?:message|text|sms) (.+?) (?:saying|that says|that|says) (.+)",
            "(?:text|message|sms) (.+?)(?: (?:saying|that says|that|says) (.+))?",
            "tell (.+?) that (.+)",
        )?.let {
            return Command.SendSms(stripArticles(it.groupValues[1]), it.groupValues.getOrNull(2)?.ifBlank { null })
        }

        // ---------- files ----------
        match(t, "(?:send|share) (?:the )?(?:file|document|photo|picture|video|pdf) (.+?) (?:on|via|using|through|with) (.+)")?.let {
            return Command.ShareFile(it.groupValues[1], it.groupValues[2])
        }
        match(t, "(?:send|share) (?:the )?(?:file|document|photo|picture|video|pdf) (.+?)(?: to (.+))?")?.let {
            return Command.ShareFile(it.groupValues[1], it.groupValues.getOrNull(2)?.ifBlank { null })
        }
        match(t, "(?:open|show|find|show me) (?:the |my )?(?:file|document|pdf|photo|picture|video|image|doc) (?:called |named )?(.+)")?.let {
            return Command.OpenFile(it.groupValues[1])
        }

        // ---------- device ----------
        match(t, "(?:turn|switch) (on|off) (?:the )?(?:flashlight|torch|flash|light)|(?:flashlight|torch|flash|light) (on|off)|(?:turn|switch) (?:the )?(?:flashlight|torch|flash|light) (on|off)")?.let {
            val v = it.groupValues.drop(1).first { g -> g.isNotEmpty() }
            return Command.Flashlight(v == "on")
        }
        match(t, "(?:turn |increase |raise )?(?:the )?volume up|(?:increase|raise) (?:the )?volume|louder")?.let { return Command.Volume(VolumeChange.UP) }
        match(t, "(?:turn |decrease |lower )?(?:the )?volume down|(?:decrease|lower|reduce) (?:the )?volume|quieter|softer")?.let { return Command.Volume(VolumeChange.DOWN) }
        match(t, "(?:max|maximum|full) volume|volume (?:max|maximum|full)")?.let { return Command.Volume(VolumeChange.MAX) }
        match(t, "unmute(?: the)?(?: phone| volume| sound)?")?.let { return Command.Volume(VolumeChange.UNMUTE) }
        match(t, "mute(?: the)?(?: phone| volume| sound)?|silent mode|silence")?.let { return Command.Volume(VolumeChange.MUTE) }
        match(t, "(?:set )?(?:the )?volume (?:to )?(.+?)(?: percent)?")?.let {
            Numbers.parse(it.groupValues[1])?.let { n -> return Command.Volume(VolumeChange.SET, n.coerceIn(0, 100)) }
        }

        match(t, "(?:set |create |make )?(?:an |the |a )?alarm (?:for |at )?(.+?)(?: (?:called|named|for|to) (.+))?|wake me up at (.+)")?.let {
            val timeText = it.groupValues[1].ifEmpty { it.groupValues[3] }
            Numbers.parseClock(timeText)?.let { (h, m) ->
                return Command.SetAlarm(h, m, it.groupValues.getOrNull(2)?.ifBlank { null })
            }
        }
        match(t, "(?:set |start )?(?:a |the )?timer (?:for )?(.+)|(.+) timer")?.let {
            parseDuration(it.groupValues[1].ifEmpty { it.groupValues[2] })?.let { s -> return Command.SetTimer(s) }
        }

        match(t, "(?:what's |what is )?(?:the )?time(?: is it)?(?: now)?|what time is it(?: now)?|tell me the time")?.let { return Command.TellTime }
        match(t, "(?:what's |what is )?(?:the |today's )?date(?: today)?|what day is (?:it|today)|what's today")?.let { return Command.TellDate }
        match(t, "(?:what's |what is |how much )?(?:the |my )?battery(?: level| percentage| left)?|how much battery(?: is left| do i have)?")?.let { return Command.TellBattery }

        match(t, "(?:take|click|capture) (?:a |an )?(?:photo|picture|pic|selfie|photograph)|open (?:the )?camera|camera")?.let { return Command.TakePhoto }
        match(t, "take (?:a )?screenshot|screenshot|capture (?:the )?screen")?.let { return Command.Global(GlobalAction.SCREENSHOT) }

        match(t, "(?:turn (?:on|off) |open |show )?(?:the )?wifi(?: settings)?(?: on| off)?")?.let { return Command.OpenPanel(Panel.WIFI) }
        match(t, "(?:turn (?:on|off) |open |show )?(?:the )?bluetooth(?: settings)?(?: on| off)?")?.let { return Command.OpenPanel(Panel.BLUETOOTH) }
        match(t, "(?:turn (?:on|off) |open |show )?(?:the )?(?:mobile )?data(?: settings)?(?: on| off)?")?.let { return Command.OpenPanel(Panel.MOBILE_DATA) }
        match(t, "(?:turn (?:on|off) |open |show )?(?:the )?hotspot(?: settings)?(?: on| off)?")?.let { return Command.OpenPanel(Panel.HOTSPOT) }

        // ---------- closing apps ----------
        match(t, "(?:close|clear|kill|quit|exit|shut down|remove) (?:all|all the|every|all my|all of the|all open)(?: recent)? apps?(?: in the background)?|clear (?:all )?(?:recent apps|recents)|close everything")?.let { return Command.CloseAllApps }
        match(t, "(?:close|quit|exit|kill|shut)(?: down)?(?: (?:this|the|current|that|open))?(?: app| application)?|close it")?.let { return Command.CloseApp(null) }
        match(t, "(?:close|quit|exit|kill|shut down|shut) (?:the |my )?(.+?)(?: app| application)?")?.let { return Command.CloseApp(it.groupValues[1]) }

        // ---------- screen control ----------
        match(t, "(?:go )?home|(?:go to |show )?(?:the )?home screen|minimi[sz]e(?: (?:this|the) app)?")?.let { return Command.Global(GlobalAction.HOME) }
        match(t, "(?:go )?back|go to (?:the )?previous screen")?.let { return Command.Global(GlobalAction.BACK) }
        match(t, "(?:show )?(?:the )?recent(?:s| apps)|(?:open )?recent apps|switch apps?")?.let { return Command.Global(GlobalAction.RECENTS) }
        match(t, "(?:show |open |pull down )?(?:the |my )?notifications?(?: panel| shade)?")?.let { return Command.Global(GlobalAction.NOTIFICATIONS) }
        match(t, "(?:show |open )?(?:the )?quick settings")?.let { return Command.Global(GlobalAction.QUICK_SETTINGS) }
        match(t, "lock(?: the)?(?: phone| screen| device)?")?.let { return Command.Global(GlobalAction.LOCK) }
        match(t, "scroll (down|up)|(?:page|swipe) (down|up)")?.let {
            val d = it.groupValues[1].ifEmpty { it.groupValues[2] }
            return Command.Scroll(d == "down")
        }
        match(t, "(?:click|tap|press|select|touch|hit) (?:on )?(?:the )?(.+?)(?: button| option| icon)?")?.let { return Command.Click(it.groupValues[1]) }
        match(t, "(?:type|write|enter|input) (.+)")?.let { return Command.TypeText(it.groupValues[1]) }

        // ---------- web & maps ----------
        match(t, "(?:navigate|take me|directions|drive|get directions|show me the way|route) (?:to )?(.+)")?.let { return Command.Navigate(it.groupValues[1]) }
        match(t, "(?:search google for|search for|search|google|look up|find out|who is|what is|what are|where is|how to|how do i) (.+)")?.let {
            val prefix = Regex("^(who is|what is|what are|where is|how to|how do i) ").find(t)?.value ?: ""
            return Command.WebSearch((prefix + it.groupValues[1]).trim())
        }

        // ---------- open app / settings ----------
        match(t, "(?:open|launch|start|run|show) (?:the )?settings|settings")?.let { return Command.OpenPanel(Panel.SETTINGS) }
        match(t, "(?:open|launch|start|run|go to|show|switch to) (?:the |my )?(.+?)(?: app| application)?")?.let { return Command.OpenApp(it.groupValues[1]) }

        // ---------- play ----------
        match(t, "(?:play|put on|listen to)(?: me)? (.+?) (?:on|in|from|using) (spotify|youtube music|youtube)")?.let {
            val app = when (it.groupValues[2]) {
                "spotify" -> MusicApp.SPOTIFY
                "youtube music" -> MusicApp.YOUTUBE_MUSIC
                else -> MusicApp.YOUTUBE
            }
            return Command.PlaySong(cleanSongQuery(it.groupValues[1]), app)
        }
        match(t, "(?:play|put on|listen to)(?: me)? (.+)")?.let { return Command.PlaySong(cleanSongQuery(it.groupValues[1])) }

        return Command.Unknown(t)
    }

    private fun cleanSongQuery(q: String) = if (q.matches(Regex("(some |my |the |a |any )?(music|songs?|tracks?|something)"))) "music" else q
        .replace(Regex("^(the |a |some |my )?(song|songs|track|music|album) (called |named |by )?"), "")
        .replace(Regex(" (song|songs|music)$"), "")
        .trim()
        .ifEmpty { "music" }

    /** "five minutes", "one hour thirty minutes", "ninety seconds", "half an hour" -> seconds */
    fun parseDuration(text: String): Int? {
        val t = text.lowercase().replace("half an hour", "thirty minutes").replace("an hour and a half", "ninety minutes")
        val re = Regex("([a-z0-9 ]+?) (hours?|minutes?|mins?|seconds?|secs?)\\b")
        var total = 0
        var found = false
        for (m in re.findAll(t)) {
            val n = Numbers.parse(m.groupValues[1].replace(Regex("^(and|for) "), "").trim()) ?: continue
            found = true
            total += when {
                m.groupValues[2].startsWith("h") -> n * 3600
                m.groupValues[2].startsWith("m") -> n * 60
                else -> n
            }
        }
        return if (found && total > 0) total else null
    }
}
