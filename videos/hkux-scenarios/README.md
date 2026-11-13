# HKUX — "Scenarios, not instructions" (reimagined)

A Remotion rebuild of the HKUX Design Tip 5.1 reel (1080×1920, 30fps, 38.4s).
The original voiceover is kept (`public/voiceover.m4a`); every visual is new.

## Scenes (start time → visual)

| # | Start | Line | Visual | Transition in |
|---|-------|------|--------|---------------|
| 1 | 0.0s | "Click the cart icon and check the total." | Sticky-note task over an app mock, cursor clicks the cart, total drawer slides up | — |
| 2 | 2.75s | "That's not a usability task. That's instructions." | X icon draws on, robotic step pills, **INSTRUCTIONS** stamp slam | push-cut + orange flash |
| 3 | 5.0s | "I ask AI to turn my test goals into realistic scenarios." | Goal chips get absorbed by a glowing AI orb, scenario cards fan out | iris |
| 4 | 10.0s | "Goal: can people understand the final price?" | Target icon, receipt prints out, swinging "?" price tag | 3D cube |
| 5 | 12.6s | AI's draft scenario | Typing AI-draft card + tiles per beat: grocery drop, ₹ budget meter, checklist ticks, "Place order / Not yet" | diagonal wipe |
| 6 | 21.7s | "Does the task use the words on the screen?" | "Same words?" — magnifier sweeps from task card to phone screen | clock wipe |
| 7 | 25.5s | "If the button says Cart…" | Button ↔ task connector, "Gives the answer away" alert, strike-through and rewrite to everyday words | slide up |
| 8 | 31.5s | "What's a bad usability task you've seen?" | Line-by-line headline, floating chat bubbles, comment box typing | flip |
| 9 | 34.0s | "Follow for the next step." | Bell rings, Follow → Following with confetti burst | cube up |
| 10 | 35.5s | — | HK/UX tiles assemble, wordmark types on, Subscribe | iris |

Persistent layers: header (logo, series label, progress bar) and karaoke-style captions
with word timings in `src/captions.ts`.

## Commands

```bash
npm i
npx remotion studio            # preview / tweak
npx remotion render HKUX-Scenarios out/HKUX_Scenarios_Reimagined.mp4 --crf=18
```

Fonts (Space Grotesk, Inter, JetBrains Mono, Fraunces Italic) are bundled in `public/fonts`
so renders don't need network access.

---

# The full series: AI × UX · Design Thinking (24 more Shorts)

Every other Short in the series script doc is built from data, not hand-animated:

```
src/series/
  episodes/stage1..5.ts   one entry per Short: script (verbatim from the doc), header title,
                          caption highlight words, CTA question, and a list of beats
  scenes/                 the scene library every beat draws from
  timing.ts               word timings → frame-accurate beats, cues and caption chunks
  Episode.tsx             assembles one Short: scenes + rotating transitions + header + captions + outro
  recordings.ts           registry of real voiceovers (empty until recordings arrive)
```

A beat is `{at: 'phrase from the script', scene: 'DocCard', props: {...}, cues: {name: 'phrase'}}`.
`at` is where the beat starts and `cues` are moments inside it (a strike-through, a card flip,
a number dropping). Both are **phrases from the script, not times**, so the same data works with
estimated timing now and with your real recordings later.

Scene library: `Statement`, `PromptCard`, `Counter`, `Compare`, `DocCard`, `Transcript`, `CardFan`,
`Flip`, `Keycaps`, `Grid2x2`, `Curve`, `Timeline`, `Loop`, `Phone`, plus the automatic `Question`,
`Follow` and brand outro at the end of every Short.

## Timing before recordings

Until a recording exists, each word is timed with a pace model fitted to the 5.1 voiceover
(0.163s + 0.086s per syllable, plus pauses at punctuation; mean error 0.09s per word). Renders
made this way are silent and paced for the voiceover you'll record.

## Adding a recording

```bash
pip install faster-whisper            # once
cp ~/my-take.m4a public/vo/2.3.m4a    # name it after the Short's id
npm run align -- 2.3                  # writes timings/2.3.json and registers it in recordings.ts
scripts/render-series.sh 2.3          # re-render just that Short, now with audio
```

`align` keeps the doc's exact words for captions and takes only the timing from the recording,
so every beat, cue and caption moves to match your delivery automatically.

## Rendering and review

```bash
scripts/render-series.sh        # all 24 → out/series/HKUX_<id>_<title>.mp4
scripts/render-series.sh 3      # just stage 3
npm run review -- /tmp/review 4 # one still per beat for stage 4, tiled per Short
```
