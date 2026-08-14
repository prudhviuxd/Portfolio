---
name: ui-ux-pro-max
description: Design and build UI for this portfolio to a senior standard — orient in the existing design decisions first, build inside the chrome design system, then critique the result and fix what fails before reporting done. Use this skill whenever a task touches how the site looks, reads, or moves: editing anything under assets/css/ or assets/js/, any .html page, adding or restyling a section, case study, hero, card, nav, or component; changing colour, type, spacing, layout, motion, or responsive behaviour; reviewing or critiquing a page; or acting on open-ended direction like "make this look better", "polish the homepage", "this feels off", "redesign the work section". Trigger even when the request sounds like a one-line CSS tweak — unanchored tweaks are exactly how this system drifts, and it has drifted before.
---

# UI/UX Pro Max

## What this site is actually for

This is a hiring artifact for a **design leader**, and it is read by two people
whose interests pull in opposite directions:

- **A hiring manager or recruiter**, often not a designer, scanning for 3–5 minutes.
  They reject on: no orientation, buried process, unquantified impact, confusing
  navigation. They are the person who decides.
- **A design peer**, judging craft. They reject on: timid type, muddy hierarchy,
  generic components, motion that feels bolted on.

`docs/MOODBOARD.md` names this conflict and resolves it: take the **visual
confidence** of the award tier and the **information architecture** of the
recruiter research. *Craft signals taste; structure signals judgement.*

The practical consequence, and the single most useful thing in this skill:
**every change gets tested on both axes.** A change that wins on craft while
costing legibility is a regression here, even when it plainly looks better.
Oversized type that pushes the orienting sentence below the fold is a
regression. A hover-reveal that hides the outcome metric until you interact is
a regression. Judgement is the product being sold; visible judgement beats
visible technique every time.

When the two axes genuinely conflict and you cannot serve both, say so, pick
legibility, and explain the trade in your report. That is the house position.

---

## Phase 1 — Orient before you touch CSS

Skipping this is what produces work that looks fine in isolation and wrong in
place.

1. **Read `docs/MOODBOARD.md`.** It is a decision log, not decoration. It
   already answers most "should I…" questions — whether to add WebGL (no),
   how many chrome phrases per viewport (one), whether to rewrite the WHO
   case study layout (no, the risk is all downside). Working against a
   recorded decision without knowing it exists is the main failure mode.

2. **Identify which of the two systems your file belongs to.** This site runs
   two design systems at once, and editing the wrong one recreates the exact
   seam the moodboard was written to close. `references/design-system.md` has
   the file map — read it before editing any CSS, every time. It takes seconds
   and the failure it prevents is expensive.

3. **State the tension and your decision before writing code.** Two or three
   sentences: what pulls one way, what pulls the other, what you chose. For
   anything larger than a single component — a new section, a new page, a
   restyle — append that decision to `docs/MOODBOARD.md` in the existing voice
   (diagnosis table, then the call, then what to avoid).

   This is not ceremony. The moodboard is itself evidence of the judgement the
   site is selling, and a reader who opens it should find a continuous line of
   reasoning rather than a document that stopped being maintained.

4. **If you are overriding an existing decision, say which one and why.**
   Silently reversing a recorded call is worse than not recording one.

---

## Phase 2 — Build inside the system

Full token tables, class inventory, and the file map are in
`references/design-system.md`. The rules below are the ones that are load-bearing
and easy to violate by accident.

**Tokens, never literals.** A raw hex or a raw px in a rule means one of two
things: the system already has a name for that value and you missed it, or you
are introducing a new one — in which case add it to `:root` deliberately, with a
comment, rather than inlining it. Literals scattered through component rules are
how the pink/orange system quietly diverged from the chrome one.

**One chrome phrase per viewport.** `.chrome` is an animated iridescent text
fill. Two of them in view at once cancel each other out and read as decoration
instead of emphasis. This is the most frequently broken rule here.

**Type comes off the scale.** `.d-xl` `.d-lg` `.d-md` `.d-sm` for display,
`.lede` `.prose` for body, `.mono` for labels and data. Do not put a
`font-size` on a heading. If nothing on the scale fits, that is a signal about
hierarchy, not a licence for a one-off size.

**Mono is for labels and data only** — uppercase, `.14em`–`.2em` tracking,
`--text-3`. It is the system's way of saying "this is metadata." Running prose
in mono breaks that signal.

**Every animation needs a reduced-motion escape.** The pattern lives at the
bottom of `rhodium.css`: a `@media (prefers-reduced-motion: reduce)` block that
neutralises transforms, opacity and animation. Add your new animation to it in
the same commit — not later. Motion here is scroll-driven and heavy; for someone
with vestibular sensitivity an ungated addition is not a rough edge, it is a
door closing.

**Scroll must never gate content.** Reveal classes animate content that is
already in the DOM, and every page carries a `<noscript>` block in `<head>`
forcing `.rv`/`.reveal` visible. If you add a reveal mechanism, add its
noscript fallback in the same edit. Content that exists only after a scroll
event does not survive the 5-minute skim, and does not survive JS being slow.

**Use the breakpoints that exist:** 1100 / 820 / 760 on chrome pages, 880 / 560
on legacy pages. A fourth breakpoint invented for one component is a component
that is fighting the grid.

**No new runtime dependencies.** No CDN, no framework, no webfont fetch — fonts
are self-hosted woff2 — and no WebGL. The moodboard rejects WebGL explicitly:
wrong signal for a leadership hire, and a performance cost paid by the person
scanning on a phone.

**JS style:** vanilla, IIFE-wrapped, `'use strict'`, feature-guarded (`if (el)`
before use), `{ passive: true }` on scroll listeners, `IntersectionObserver`
over manual scroll math. Read `assets/js/rhodium.js` before adding behaviour;
match it.

**Contrast is a hard gate**, not a preference: 4.5:1 for body text, 3:1 for
large text (24px+, or 19px+ bold). Compute it rather than quoting it — the
ratios written in `rhodium.css` are measured against `--surface` and the ones
in `docs/MOODBOARD.md` against `--bg`, so the same token carries two different
correct-looking numbers. A ratio without its background means nothing:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/contrast.py --css assets/css/rhodium.css
python3 .claude/skills/ui-ux-pro-max/scripts/contrast.py '#83878F' '#08080B'
```

---

## Phase 3 — Look at it, then critique it

A design change you have not seen is a guess. Chromium is available locally, so
looking is cheap:

```bash
bash .claude/skills/ui-ux-pro-max/scripts/shoot.sh index.html
# writes desktop / tablet / mobile PNGs, then Read them
```

Then read the images. Actually read them — the point is to catch what the diff
cannot show you: a hero that no longer fits above the fold, a card grid that
collapsed to one column too early, an accent that vanishes against its
background, type that was confident at 1440 and shouty at 390.

Then run the audit in `references/critique.md` against the change. It covers
orientation, hierarchy, system consistency, accessibility, motion, and
responsive behaviour, and it tells you which checks are mechanical (run the
script) versus which need your eyes.

**Fix what fails before you report.** Then, in your report, state what you
checked, what you fixed, and anything you deliberately accepted along with the
reason. Reporting "done" on a change that ships a 3.9:1 label costs more trust
than the change ever earned — and the person reading your report is the same
person selling judgement on this site.

---

## Reference files

- `references/design-system.md` — the two systems, file map and load order,
  token tables, type scale, component inventory, motion vocabulary. Read before
  editing any CSS.
- `references/critique.md` — the Phase 3 audit checklist, ordered by what
  actually gets a portfolio rejected.

## Bundled scripts

- `scripts/shoot.sh` — screenshots a page at desktop/tablet/mobile widths,
  handling the JS preloader and scroll reveals that otherwise capture a blank
  page. Run it, then Read the PNGs.
- `scripts/contrast.py` — WCAG contrast ratios. Parses `:root` tokens from a CSS
  file and composites translucent surfaces over the page background, or checks
  two colours directly.
