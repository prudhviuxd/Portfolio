package app.raga.assistant

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CommandParserTest {
    private val wake = listOf("raga", "ragha")
    private fun p(s: String) = CommandParser.parse(s)

    @Test fun wakeWord() {
        assertEquals("call mom", CommandParser.afterWakeWord("raga call mom", wake))
        assertEquals("open youtube", CommandParser.afterWakeWord("hey ragha open youtube", wake))
        assertEquals("", CommandParser.afterWakeWord("raga", wake))
        assertNull(CommandParser.afterWakeWord("call mom", wake))
        assertEquals("call raja", CommandParser.afterWakeWord("raga call raja", listOf("raga", "raja")))
    }

    @Test fun media() {
        assertEquals(Command.PlaySong("shape of you"), p("play shape of you"))
        assertEquals(Command.PlaySong("believer"), p("play the song believer"))
        assertEquals(Command.PlaySong("arijit singh", MusicApp.SPOTIFY), p("play arijit singh on spotify"))
        assertEquals(Command.Media(MediaAction.PAUSE), p("pause"))
        assertEquals(Command.Media(MediaAction.PAUSE), p("stop the music"))
        assertEquals(Command.Media(MediaAction.PLAY), p("resume"))
        assertEquals(Command.Media(MediaAction.PLAY), p("play"))
        assertEquals(Command.Media(MediaAction.NEXT), p("next song"))
        assertEquals(Command.Media(MediaAction.PREVIOUS), p("previous track"))
        assertEquals(Command.PlaySong("music"), p("play some music"))
    }

    @Test fun calls() {
        assertEquals(Command.Call("mom"), p("call mom"))
        assertEquals(Command.Call("ravi kumar"), p("please call ravi kumar"))
        assertEquals(Command.Call("nine eight four five"), p("dial nine eight four five"))
    }

    @Test fun messages() {
        assertEquals(Command.SendSms("ravi", "i'm on my way"), p("send a message to ravi saying i'm on my way"))
        assertEquals(Command.SendSms("mom", "i will be late"), p("text mom saying i will be late"))
        assertEquals(Command.SendSms("mom", null), p("send a message to mom"))
        assertEquals(Command.SendWhatsApp("priya", "call me"), p("send what's app to priya saying call me"))
        assertEquals(Command.SendWhatsApp("priya", "call me"), p("send whatsapp message to priya saying call me"))
        assertEquals(Command.SendWhatsApp("dad", null), p("send a message to dad on whatsapp"))
    }

    @Test fun appsAndFiles() {
        assertEquals(Command.OpenApp("youtube"), p("open you tube"))
        assertEquals(Command.OpenApp("whatsapp"), p("open whats app"))
        assertEquals(Command.OpenApp("google maps"), p("launch google maps app"))
        assertEquals(Command.OpenFile("resume"), p("open file resume"))
        assertEquals(Command.OpenFile("invoice march"), p("open the pdf invoice march"))
        assertEquals(Command.ShareFile("report", "whatsapp"), p("send file report on whatsapp"))
        assertEquals(Command.TakePhoto, p("open camera"))
        assertEquals(Command.OpenPanel(Panel.SETTINGS), p("open settings"))
    }

    @Test fun device() {
        assertEquals(Command.Flashlight(true), p("turn on the flashlight"))
        assertEquals(Command.Flashlight(false), p("torch off"))
        assertEquals(Command.Volume(VolumeChange.UP), p("volume up"))
        assertEquals(Command.Volume(VolumeChange.MUTE), p("mute"))
        assertEquals(Command.Volume(VolumeChange.SET, 50), p("set volume to fifty percent"))
        assertEquals(Command.SetAlarm(6, 30, null), p("set an alarm for six thirty a m"))
        assertEquals(Command.SetAlarm(19, 15, null), p("set alarm for seven fifteen p m"))
        assertEquals(Command.SetTimer(600), p("set a timer for ten minutes"))
        assertEquals(Command.SetTimer(5400), p("set a timer for one hour thirty minutes"))
        assertEquals(Command.TellTime, p("what time is it"))
        assertEquals(Command.TellBattery, p("battery level"))
        assertEquals(Command.OpenPanel(Panel.WIFI), p("turn on wifi"))
    }

    @Test fun screen() {
        assertEquals(Command.Global(GlobalAction.HOME), p("go home"))
        assertEquals(Command.Global(GlobalAction.BACK), p("go back"))
        assertEquals(Command.Global(GlobalAction.LOCK), p("lock the phone"))
        assertEquals(Command.Global(GlobalAction.SCREENSHOT), p("take a screenshot"))
        assertEquals(Command.Click("send"), p("click send"))
        assertEquals(Command.Click("send"), p("press the send button"))
        assertEquals(Command.TypeText("see you soon"), p("type see you soon"))
        assertEquals(Command.Scroll(true), p("scroll down"))
    }

    @Test fun webAndConversation() {
        assertEquals(Command.Navigate("the airport"), p("navigate to the airport"))
        assertEquals(Command.WebSearch("cricket score"), p("search for cricket score"))
        assertEquals(Command.WebSearch("who is the prime minister"), p("who is the prime minister"))
        assertEquals(Command.Yes, p("yes"))
        assertEquals(Command.Yes, p("okay"))
        assertEquals(Command.No, p("no"))
        assertEquals(Command.Cancel, p("never mind"))
        assertEquals(Command.StopListening, p("stop listening"))
        assertTrue(p("blah blah") is Command.Unknown)
    }
}
