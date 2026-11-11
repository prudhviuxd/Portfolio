# Raga — hands-free voice control for Android

Say **"Raga"** followed by a command and your phone does it. Raga listens all the
time in the background, runs speech recognition **fully offline** on the phone, and
checks every command against **your voice print**, so other people can't control it.

```
"Raga, play Shape of You"            "Raga, call Mom"
"Raga, next song" / "pause"          "Raga, send a message to Ravi saying I'm on my way"
"Raga, open YouTube"                 "Raga, send WhatsApp to Priya saying call me"
"Raga, open file resume"             "Raga, send file report on WhatsApp"
"Raga, click send" / "scroll down"   "Raga, type see you soon"
"Raga, flashlight on" / "volume up"  "Raga, set an alarm for six thirty a m"
"Raga, set a timer for ten minutes"  "Raga, what time is it" / "battery level"
"Raga, take a photo" / "screenshot"  "Raga, navigate to the airport"
"Raga, go home" / "go back" / "lock the phone"
"Raga, help"                          "Raga, stop listening"
```

You can also say just "Raga", wait for the beep, then say the command.
Sending an SMS or WhatsApp message asks "Shall I send it?" first; answer "yes" or "no".
If a name is unclear, Raga asks "Did you mean …?".

## How it works

| Part | How |
| --- | --- |
| Wake word + speech | [Vosk](https://alphacephei.com/vosk/) offline recognizer (small English model, ~40 MB), downloaded once inside the app |
| Your voice only | Vosk speaker model (~13 MB) turns each utterance into a voice print; it is compared with the print saved when you enrolled (cosine similarity). Below the threshold → ignored |
| Always on | Foreground service with a microphone notification; keeps working with the screen off |
| Calls / SMS | `TelecomManager.placeCall`, `SmsManager` — no tapping needed |
| Music | Songs on the phone play directly; otherwise handed to Spotify / YouTube Music / YouTube. Pause/next/previous control any player |
| Apps, files | Fuzzy match against installed apps and files on storage |
| Any other screen | Accessibility service: "click &lt;label&gt;", "type …", "scroll", "back", "home", "lock", "screenshot", and auto-pressing WhatsApp's Send |

Nothing you say leaves the phone. The internet is used only for the one-time model download
(and by apps you ask Raga to open).

## Install

1. Get the APK: download `raga-debug-apk` from the latest **Raga Android app** run under the
   repo's *Actions* tab (or build it yourself, below). Copy it to the phone and open it;
   allow "install unknown apps" when asked.
2. Open **Raga** and go top to bottom:
   1. **Download models** (choose *English (US)* — it knows the word "raga"; *English (India)*
      may suit Indian accents better but will hear "raga" as a different word, see below).
   2. Grant every permission button until each line shows ✓. *Accessibility* is what lets
      Raga tap buttons and send WhatsApp messages; *display over other apps* lets it open apps
      while the screen shows something else.
   3. **Teach Raga my voice** — read 8 short phrases in a quiet room.
3. Tap **Start listening**. A "Raga is listening" notification stays while it runs.

### Tuning
* The log on the main screen shows every utterance with its **voice-match score**.
  If Raga ignores you, lower the strictness slider a little; if someone else can trigger it,
  raise it or re-record your voice.
* If you say "Raga" and the log shows another word (e.g. "raja", "rager"), add that spelling
  to the **wake word** box.

## Build

Requires JDK 17+ and the Android SDK (platform 35).

```bash
cd raga-assistant
./gradlew testDebugUnitTest assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

## Limits (Android rules, not bugs)

* **Android only.** iPhones don't allow third-party apps to listen in the background or control other apps.
* Android doesn't let an app start the microphone at boot, so open Raga and tap Start after a restart.
* Wi-Fi, Bluetooth and mobile data can't be switched by apps since Android 10; Raga opens the
  panel and you can say "Raga, click Wi-Fi".
* Over the lock screen, Raga can call, message, play music and answer questions, but apps it opens
  appear after you unlock.
* Voice matching on a phone microphone is good but not bank-grade; don't rely on it as a security lock.
* Uses permissions (SMS, call, accessibility, all-files) that Google Play restricts. This app is meant
  to be installed on your own phone, not published to the Play Store.

## Code map

```
app/src/main/java/app/raga/assistant/
  RagaService.kt              always-on listener, wake word, voice check, conversation state
  CommandParser.kt            text -> Command (pure Kotlin, unit-tested)
  CommandExecutor.kt          Command -> phone action
  VoiceProfile.kt             voice print math (centroid, cosine, threshold)
  EnrollActivity.kt           records your voice print
  RagaAccessibilityService.kt click / type / scroll / global actions
  LocalPlayer.kt              plays songs stored on the phone
  ModelManager.kt             one-time model download
  Fuzzy.kt, Numbers.kt        name matching, spoken numbers and times
  MainActivity.kt             setup screen
```
