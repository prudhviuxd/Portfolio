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
