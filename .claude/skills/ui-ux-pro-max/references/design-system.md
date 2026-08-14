# Design system reference

Read this before editing any CSS in this repo.

- [Two systems, one site](#two-systems-one-site)
- [File map and load order](#file-map-and-load-order)
- [Chrome tokens](#chrome-tokens)
- [Type scale](#type-scale)
- [Component inventory](#component-inventory)
- [Motion vocabulary](#motion-vocabulary)
- [Legacy tokens](#legacy-tokens)
- [Adding a new page](#adding-a-new-page)

---

## Two systems, one site

The site runs two design systems simultaneously. This is deliberate and
documented in `docs/MOODBOARD.md` v2 — but it is also the thing most likely to
trip you up, because the same class names mean different things depending on
which stack a page loads.

**Chrome (current).** Defined in `assets/css/rhodium.css`. Near-black
`#08080B`, iridescent cyan/violet/magenta accents, Bricolage Grotesque display,
Instrument Sans body, JetBrains Mono labels. Used by the homepage, both route
explorations, and the résumé. **New work goes here.**

**Legacy (pink/orange).** Defined in `assets/css/base.css`. `#0a0a0b`
background, pink/orange gradient, Playfair Display serif. The three case study
pages were built on it and still carry its layout.

They are reconciled by `assets/css/study.css`, which loads **last** on case
study pages and re-points the legacy token names at chrome values —
`--pink` resolves to the chrome accent, `--font-display` to Bricolage, and so
on. The moodboard's reasoning: the case studies carry hard-won layout work, so
reskinning through a token layer is safer than rewriting them to a new class
vocabulary for no reader-visible gain.

**What this means for you:**

- Editing `base.css` changes the case studies, not the homepage. Editing
  `rhodium.css` changes the homepage, routes and résumé, not the case studies.
- On a case study, a rule you add can be silently overridden by `study.css`
  because it loads later. Check `study.css` before assuming your rule lost to
  specificity.
- Do not "fix" the duplication by merging the systems. That rewrite was
  considered and rejected. If you believe it should be revisited, make the case
  in `docs/MOODBOARD.md` first.

---

## File map and load order

Load order is significant — later files override earlier ones.

**Homepage** (`index.html`)
```
CSS: rhodium.css → motion.css → scroll3d.css
JS:  rhodium.js → motion.js → scroll3d.js
```

**Route explorations** (`route-b.html`, `route-c.html`) — alternate homepage
directions kept for comparison, not dead code
```
route-b: rhodium.css → route-b.css        | rhodium.js
route-c: rhodium.css → route-c.css        | rhodium.js → route-c.js
```

**Résumé** (`resume.html`)
```
CSS: rhodium.css → resume.css             | JS: rhodium.js + inline
```

**Case studies** (`case-studies/who-myyoga.html`, `my-mtn.html`, `ipl.html`)
```
CSS: base.css → case-study.css → <project>.css → interactions.css → study.css
JS:  main.js → study.js
```
Per-project CSS is `who-myyoga.css`, `my-mtn.css`, `ipl.css`. Each page sets
its accent with one attribute on `<main>` — `data-acc="cy"` — which swaps a
single `--acc` variable. One variable is the entire per-project colour budget;
do not add a second accent system per project.

**Layer files** (homepage only)
- `motion.css` / `motion.js` — preloader, masked line reveals, 3D card
  entrances, pinned work stack, scroll-velocity skew, inertia scrolling
- `scroll3d.css` / `scroll3d.js` — scrubbed scroll transforms bound to scroll
  position so they run forwards and backwards: `[data-layer]` parallax,
  `[data-s3d]`, `[data-float]`, `[data-carousel]`, `[data-narrative]`

---

## Chrome tokens

From `:root` in `assets/css/rhodium.css`. Use the variable, never the value.

**Surfaces**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#08080B` | page background |
| `--bg-2` | `#0C0C11` | raised background |
| `--surface` | `rgba(255,255,255,.038)` | glass fill |
| `--surface-2` | `rgba(255,255,255,.06)` | hover fill |
| `--line` | `rgba(255,255,255,.10)` | borders |
| `--line-2` | `rgba(255,255,255,.055)` | hairlines |

**Text**
| Token | Value | Use | on `--bg` | on `--surface` |
|---|---|---|---|---|
| `--text` | `#F4F4F6` | primary | 18.21:1 | 17.11:1 |
| `--text-2` | `#ADB0B8` | secondary, body prose | 9.22:1 | 8.66:1 |
| `--text-3` | `#83878F` | mono labels, captions | 5.55:1 | 5.21:1 |

Both columns matter, and their existence explains an apparent contradiction in
the repo: the ratio comments in `rhodium.css` are measured against `--surface`,
the ones in `docs/MOODBOARD.md` against `--bg`. Neither is wrong. A ratio
quoted without its background is meaningless — run `contrast.py` instead of
copying a number. `--text-3` is the one to watch: it clears AA everywhere, but
it has the least headroom, so it is the token that fails first if a surface
gets lighter.

**Accents** — reserved for emphasis, never for body text.
| Token | Value | Character |
|---|---|---|
| `--cy` | `#4FD8E8` | electric cyan — the default accent |
| `--vi` | `#A98BFF` | violet |
| `--mg` | `#FF7BC8` | magenta |

**Geometry**
| Token | Value |
|---|---|
| `--gut` | `26px` (`18px` under 760) |
| `--maxw` | `1400px` |
| `--r` | `20px` (`16px` under 760) |

**Fonts** — self-hosted variable woff2 in `assets/fonts/`. No runtime fetch.
| Token | Family |
|---|---|
| `--display` | Bricolage Grotesque (300–800) |
| `--body` | Instrument Sans (400–700) |
| `--mono` | JetBrains Mono (400–500) |

---

## Type scale

Every size is a clamp — the scale is fluid, so do not add media queries to
resize type.

| Class | Size | Notes |
|---|---|---|
| `.d-xl` | `clamp(46px,10.5vw,168px)` | hero only, 800 wt, `-.045em`, uppercase, `line-height:.86` |
| `.d-lg` | `clamp(34px,6.4vw,88px)` | section headline, 800 wt, `-.04em`, uppercase |
| `.d-md` | `clamp(26px,3.8vw,52px)` | subsection, 700 wt, `-.032em`, mixed case |
| `.d-sm` | `clamp(19px,2vw,26px)` | card heading, 700 wt, `-.025em` |
| `.lede` | `clamp(16px,1.4vw,19px)` | orienting paragraph, `--text-2` |
| `.prose` | `15px` | body copy, `--text-2` |
| `.mono` | `10.5px` | labels and data, `.2em`, uppercase, `--text-3` |

Display classes carry `font-variation-settings:"opsz"` matched to their size —
keep that when copying a class, it is what stops large Bricolage from looking
soft.

`.chrome` applies the animated iridescent gradient fill to text. **One per
viewport.** It is `background-clip:text` with a `shift` animation, gated behind
reduced motion.

---

## Component inventory

Reuse before inventing. Every class here is in `rhodium.css`.

**Layout** — `.shell` (max-width + gutter), `.grid12` (12 columns),
`.bento` (12-col card grid) with `.sp3` `.sp4` `.sp5` `.sp6` `.sp7` `.sp8`
`.sp12` span helpers, `.sec` (section padding), `.sec-head`

**Chrome** — `.masthead` / `.mast-in` / `.mast-nav` / `.wordmark` / `.burger`
(sticky, hides on scroll down via `.up`), `.chrome-footer` / `.foot-in`

**Content** — `.card` (glass panel with pointer-tracked spotlight via `--mx`
/`--my`), `.case` / `.case-vis` / `.case-body` / `.case-meta` (case study card
with role·problem·outcome data), `.also-list` (compact secondary work index),
`.rail` (stat rail), `.facts` (hero proof points), `.logo` (client tile),
`.cta` / `.links` / `.lk` (contact block)

**Small** — `.btn` with `.btn-a` (solid) / `.btn-b` (ghost), `.pill`, `.chip`,
`.ph` (phase tags), `.lens` (segmented designer/leader toggle driving
`[data-panel]`), `.mq` / `.mq-t` (marquee)

The case study card is where the moodboard's structural argument is enforced:
it carries role, problem and outcome as a `<dl>` so the gist survives without a
click. Keep that shape when adding a case.

---

## Motion vocabulary

**Reveals** — `.rv` (single element, fade + 24px rise) and `.rv-s` (staggered
children, `nth-child` delays to 8). Driven by `IntersectionObserver` in
`rhodium.js` at `threshold: 0.15`, unobserved after firing.

**Easing** — `cubic-bezier(.2,.8,.2,1)` for entrances and hovers,
`cubic-bezier(.6,0,.2,1)` for the masthead and the lens fill. Two curves, and
that consistency is doing real work; a third needs a reason.

**Duration** — 300–500ms for interaction feedback, 700–900ms for reveals.

**Ambient** — `.aura` (three blurred colour orbs on slow drift), film grain via
`body::after` SVG turbulence at `.35` opacity, `mix-blend-mode:overlay`.

**Pointer-only effects** — magnetic buttons and card spotlight are gated behind
`matchMedia('(hover: hover) and (pointer: fine)')` **and** reduced motion.
Anything reacting to cursor position needs both guards.

**The reduced-motion block** at the end of `rhodium.css` neutralises `.rv`,
`.rv-s`, the marquee, the aura, `.chrome`, and component transitions. Extend it
whenever you add motion.

---

## Legacy tokens

Only relevant when editing case study pages. Defined in `base.css`, overridden
by `study.css`.

`--bg` `--bg-soft` `--surface` `--surface-2` `--border` `--border-soft` ·
`--text` `--text-muted` `--text-dim` · `--pink` `--pink-soft` `--orange`
`--amber` `--teal` `--blue` · `--gradient-brand` `--gradient-brand-soft` ·
`--font-display` `--font-body` · `--container` `--radius-sm/md/lg/pill`

The colour names lie after `study.css` loads — `--pink` resolves to the chrome
accent. Do not reason from the name; check the resolved value.

Legacy components: `.container`, `.section` / `.section-head` /
`.section-watermark`, `.btn` + `.btn-primary` / `.btn-ghost`, `.nav` /
`.nav-inner` / `.nav-links` / `.nav-toggle`, `.stat-box`, `.tag-pill`,
`.feature-card`, `.phone` (device mockup frame), `.grid` + `.g-2` `.g-3` `.g-4`,
`.reveal` (legacy reveal class — note it is `.reveal`, not `.rv`).

Legacy breakpoints are **880** and **560**, not the chrome 1100/820/760.

---

## Adding a new page

1. Start from the chrome stack: `rhodium.css` plus one page-specific stylesheet.
2. Copy the `<head>` from `index.html` — including the `<noscript>` block that
   forces reveals visible.
3. Reuse `.masthead` and `.chrome-footer` verbatim. The frame must not change
   between pages; that continuity is the whole point of the v2 moodboard entry.
4. Load `rhodium.js` for nav, reveals, counters and the lens toggle.
5. Only add `motion.js` / `scroll3d.js` if the page actually uses their
   `data-` hooks. They are not free.
