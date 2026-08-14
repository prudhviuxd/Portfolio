# The critique pass

Run this after building, before reporting done. It is ordered by what actually
gets a portfolio rejected, not by what is easiest to check — orientation
failures cost the interview, a 4px spacing inconsistency does not.

Work through it against **the change you made**, not the whole site. Fix what
fails. Report what you fixed and anything you deliberately accepted, with the
reason.

---

## 1. Orientation — does it survive a 5-minute skim?

The reader may not be a designer, and they decide whether there is an
interview. This section outranks everything below it.

- Can a stranger tell **what he leads, at what scale, in which domains** within
  one viewport of landing? If your change pushed that below the fold, it failed
  regardless of how it looks.
- Does every claim carry **evidence** — a number, a team size, an org name?
  Abstract conviction copy with nothing attached is called out by name in the
  moodboard.
- Is the **outcome visible without a click**? Case study cards carry their
  metric on the card. Do not move an outcome behind a hover or an expand.
- Does the reader know **how far into the page they are**? Long pages need
  wayfinding — the scroll progress hairline, section labels, the dot nav.
- Any **dead ends**? A link to nothing burns scan budget and reads as
  carelessness. Check every href you touched.

## 2. Hierarchy — does the eye land in the right order?

- Squint at the screenshot. The first thing you see should be the most
  important thing on screen. If two things compete, one of them needs to drop a
  level on the scale.
- **One chrome phrase per viewport.** Scroll the screenshot and count. This is
  the most frequently broken rule in the repo.
- Is display type doing work, or is it just large? Oversized type that says
  nothing specific is decoration, and decoration is what the peer audience
  discounts.
- Does the section read as **label → headline → substance**? The mono eyebrow
  exists to let the eye skip; if the mono label duplicates the headline, cut it.

## 3. System consistency — does it look assembled or authored?

- Every colour, size, radius and gutter from a **token**. Grep your diff for
  raw hex and stray px. If you added a token, is it in `:root` with a comment?
- Type from the **scale** — no `font-size` on a heading.
- Did you **reuse a component** or clone one? A near-duplicate of `.card` with
  three different values is how the system decays. Extend the original or add a
  modifier.
- Mono used **only** for labels and data, never running prose.
- Right system for the file? Chrome pages and case studies have different
  vocabularies and different breakpoints — see `design-system.md`.
- Does the frame — masthead, footer — stay identical across pages? A changing
  frame is the loudest "assembled in pieces" signal there is.

## 4. Accessibility — non-negotiable, and partly mechanical

Run the script rather than quoting a ratio from a comment — the numbers in
`rhodium.css` are measured against `--surface` and those in the moodboard
against `--bg`, so both are right and neither tells you about the pair you just
wrote:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/contrast.py --css assets/css/rhodium.css
```

- **Contrast**: 4.5:1 body, 3:1 large (24px+, or 19px+ bold). Accent-on-dark
  passes; accent-on-surface often does not — check it, do not assume.
- **Focus visible**: `:focus-visible` is defined globally in `rhodium.css`. If
  you set `outline:none` anywhere, you owe a replacement indicator.
- **Interactive elements are real elements** — `<button>` or `<a href>`, not a
  div with a click handler. Keyboard reach and screen reader semantics both
  depend on it.
- **State is announced**: `aria-expanded` on the burger, `aria-selected` on the
  lens toggle, `aria-label` on icon-only controls. Copy the pattern in
  `rhodium.js`.
- **Decorative elements hidden**: `aria-hidden="true"` on `.aura`, grain,
  preloader, dot nav — anything with no informational content.
- **Images have alt text**, and the moodboard's rule for case studies applies:
  never show an image without a caption. Decorative background images take
  `alt=""`.
- **Tap targets** at least 44×44px on mobile. Mono labels at 10px are easy to
  under-pad.

## 5. Motion — does it rewind, and can it be turned off?

- Is the new animation in the **reduced-motion block** at the end of
  `rhodium.css`? Verify by capturing with reduced motion forced — `shoot.sh`
  does this by default — and confirming the page is fully legible and static.
- Does scroll motion **run backwards**? `scroll3d.js` is scrubbed rather than
  triggered precisely so scrolling up reverses cleanly. A one-shot animation
  bolted into a scrubbed system reads as broken on the way back up.
- Is content **gated** behind motion? Reveals animate what is already in the
  DOM. The `<noscript>` fallback must exist in `<head>`.
- Pointer-driven effects guarded by **both** `(hover: hover) and (pointer:
  fine)` and reduced motion.
- Nothing animates `width`, `height`, `top`/`left`, or `box-shadow` in a loop —
  `transform` and `opacity` only.

## 6. Responsive — check the fold at every width

```bash
bash .claude/skills/ui-ux-pro-max/scripts/shoot.sh <page.html>
```

Read all three PNGs. Specifically:

- **390 (mobile)**: does the hero still orient, or has display type eaten the
  viewport? Does the grid stack in the right order? Do the mono labels still
  fit on one line?
- **820 (tablet)**: the awkward width — this is where 3-up grids go to 2-up and
  cards get too narrow for their content.
- **1440 (desktop)**: does the layout hold at `--maxw: 1400px`, or is there a
  lonely stretch of empty gutter?
- Any **horizontal overflow**? `overflow-x:hidden` on body hides the symptom,
  not the cause. Check for fixed widths and unbroken long strings.
- Did you use the **existing breakpoints** (1100/820/760 chrome, 880/560
  legacy) rather than inventing one?

## 7. Performance and hygiene

- No new network dependency — no CDN, no webfont fetch, no framework.
- Images sized appropriately; nothing at 3.2MB where 200KB reads the same.
- `will-change` only on elements that actually animate, and not left on
  permanently.
- No console errors. No leftover `console.log`.
- Meta title and description updated if the page's content changed. They are
  the first thing a recruiter sees in a search result.

---

## Reporting

State plainly:

1. What you changed, and the design reasoning in one or two sentences.
2. What you verified — name the checks that ran, including screenshot widths
   and contrast ratios where relevant.
3. What you fixed during critique. This is the interesting part; it shows the
   pass happened.
4. What you deliberately accepted and why.

If a check failed and you could not fix it within the scope of the task, say so
explicitly rather than omitting it. An unreported 3.9:1 label costs more trust
than the change earned.
