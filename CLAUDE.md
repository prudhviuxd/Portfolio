# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio site for Prudhvi Raj PJ — design leader and UX strategist.
Plain static HTML/CSS/JS. There is **no build step, no package manager, and no
test runner**: no `package.json`, no `node_modules`, no CI workflows. Open the
HTML files directly or serve the directory statically.

```
index.html                  # Home
resume.html                 # Resume
route-b.html, route-c.html  # Alternate home-page routes/experiments
portfolio-3d.html           # Immersive WebGL route (see below)
case-studies/               # ipl.html, my-mtn.html, who-myyoga.html
assets/css/                 # Per-page + shared stylesheets (base, motion, scroll3d, ...)
assets/js/                  # main.js, motion.js, rhodium.js, portfolio-3d.js
assets/js/vendor/           # three.module.min.js + three.core.min.js (MIT, pinned 0.180.0)
assets/design-tokens.json   # Token source of truth (three-layer)
assets/design-tokens.css    # GENERATED from the JSON — never edit by hand
assets/fonts/, assets/img/
docs/MOODBOARD.md           # Design rationale and direction
.claude/skills/             # Vendored design skills (see below)
```

## The 3D route (`portfolio-3d.html`)

An immersive WebGL route: a scroll-driven camera dolly through an instanced
wireframe corridor, with three accent monoliths marking the case studies.

**It is an addition, not a replacement.** `index.html` remains the primary
route, and the 3D page links to it prominently. This matters because
`docs/MOODBOARD.md` argues directly against WebGL-led portfolios — so the 3D
layer is built to be strictly decorative and to fall away cleanly:

| Condition | Result |
|---|---|
| No JS | `<noscript>` reveals all content, removes the canvas |
| No WebGL | Canvas removed, CSS gradient carries the backdrop |
| `prefers-reduced-motion` | Canvas removed, content in final state, no dolly, no parallax |
| Full support | Scroll dolly + pointer parallax clamped to 0.3 |

Every word of copy lives in the HTML, so the recruiter-skim path and crawlers
never depend on the scene rendering.

Three.js is **self-hosted and pinned** (`assets/js/vendor/`, ~704KB) rather
than pulled from a CDN, so the page works offline and makes no third-party
request. When touching the scene, keep the rules it was built to: cap
`setPixelRatio` at 2, construct no geometry inside the frame loop, update
`camera.aspect` + `updateProjectionMatrix()` on resize, and dispose every
geometry and material on teardown.

Regenerate tokens after editing `assets/design-tokens.json`:

```bash
node .claude/skills/design-system/scripts/generate-tokens.cjs \
  --config assets/design-tokens.json -o assets/design-tokens.css
```

Note the generator prefixes primitives — semantic and component tokens are
`--color-accent`, `--duration-ui`, `--card-bg`; primitives are
`--primitive-spacing-2`, `--primitive-fontSize-lg`.

To preview locally:

```bash
python3 -m http.server 8000
```

## Design Direction

`docs/MOODBOARD.md` is the design source of truth. Its core constraint: this is a
**design leader's** portfolio selling judgement, not a creative technologist's
selling execution. Take visual confidence from the award tier and information
architecture from the recruiter research — the site must survive a 3–5 minute
skim by someone who is not a designer. Prefer visible process, quantified
impact, and clean IA over elaborate WebGL/scroll choreography. Read it before
making visual or structural changes.

## Installed Skills

Four MIT-licensed skills are vendored into `.claude/skills/`. `ui-ux-pro-max`
and `design-system` come from
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill);
`motion-design` comes from the MCPmarket plugin
([knoxgraeme/mcpmarket-plugin](https://github.com/knoxgraeme/mcpmarket-plugin));
`motion-framer` comes from
[freshtechbro/claudedesignskills](https://github.com/freshtechbro/claudedesignskills).
Each has a `PROVENANCE.md` recording its source and local modifications.

All three are **pinned copies** — none auto-updates. Re-vendor manually to pick
up upstream changes.

### ui-ux-pro-max

Searchable local UI/UX databases. Requires Python 3.x, no external dependencies.
Run from the repository root:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> [-n <max_results>]
```

**Domains:** `product`, `style`, `typography`, `color`, `landing`, `chart`,
`ux`, `icons`, `react`, `web`, `google-fonts`, `gsap`

**Design system generation**, with optional 1–10 dials:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system \
  --variance <1-10> --motion <1-10> --density <1-10>
```

`--variance` biases style selection (centered/minimal → bold/asymmetric),
`--motion` attaches a matching GSAP snippet, `--density` overrides the
spacing-scale tokens.

**Stack search** — this repo is plain HTML/CSS, so `html-tailwind` is the
closest match; do not pass a framework stack unless the query is about one:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack html-tailwind
```

Validate the bundled data with
`python3 .claude/skills/ui-ux-pro-max/scripts/validate_data.py`.

If a search returns 0 results, do not fabricate output — retry once with a
narrower query or explicit domain, then say explicitly that the recommendation
came from general defaults rather than a database match.

### design-system

Three-layer token architecture (primitive → semantic → component), component
specs, and a slide-decision system.

```bash
node .claude/skills/design-system/scripts/generate-tokens.cjs --config <tokens.json> -o <out.css>
node .claude/skills/design-system/scripts/validate-tokens.cjs --dir assets/css
python3 .claude/skills/design-system/scripts/search-slides.py "<query>" -d <domain>
```

**Its slide-generation half is not usable yet.** It expects
`assets/design-tokens.json`, `assets/design-tokens.css`,
`docs/brand-guidelines.md`, and `assets/css/slide-animations.css`, none of which
exist here; it also references a `/slides:create` command and `brand` /
`ui-styling` dependency skills that are not installed. See the Install Notes
table at the top of `.claude/skills/design-system/SKILL.md`. The token and
component-spec guidance works standalone.

Note that this repo's CSS predates the token system and contains hardcoded hex
and pixel values — `validate-tokens.cjs` will report many findings against
`assets/css`. Treat those as a backlog, not as regressions to fix wholesale.

### motion-design

Prose-only guidance for choosing easing curves and durations — no scripts, no
data files. Read both `references/decision-tree.md` and
`references/easing-tokens.md` before recommending animation values.

Its premise: every animation needs a job; if it has no job, don't animate.
Evaluate purpose (responsiveness / spatial continuity / understanding /
delight), frequency, and pattern type, then pick tokens accordingly.

Framework-agnostic and CSS-first, so it fits this repo well — but its "Tips"
section suggests naming a framework such as Framer Motion or React Spring.
There is no React and no build step here, so prefer the CSS custom properties
in `references/easing-tokens.md` and reconcile recommendations against the
existing `assets/css/motion.css` and `assets/js/motion.js` rather than
introducing a library.

For scroll reveal, stagger, parallax and page transitions, `ui-ux-pro-max`'s
`--domain gsap` already carries 17 presets across three intensity tiers; use it
alongside this skill rather than duplicating the guidance.

### motion-framer

Motion / Framer Motion reference: motion components, variants, gestures
(hover/tap/drag/focus), `AnimatePresence` exit animations, layout and `layoutId`
shared-element transitions, spring physics, and scroll-linked effects. Ships a
1077-line `references/api_reference.md`, a 74KB `assets/examples/README.md`, a
React+Vite starter under `assets/starter_motion/`, and two generators:

```bash
python3 .claude/skills/motion-framer/scripts/animation_generator.py --type <type> --name <Name>
python3 .claude/skills/motion-framer/scripts/variant_builder.py --preset <preset>
```

**This skill targets React, which this repo does not use.** Its examples are JSX
and assume a bundler; the bundled starter pulls in React, Vite and
`framer-motion` v11. Do not add React, Vite, or a bundler here to use it. Treat
it as reference for a future React project, or translate its concepts — spring
parameters, gesture semantics, stagger orchestration — by hand into
`assets/css/motion.css` and `assets/js/motion.js`.

If a vanilla build is ever wanted here, the current package is `motion`, not
`framer-motion`, imported as an ES module from a CDN:

```js
import { animate, scroll, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm"
```

That would still be a runtime dependency, so weigh it against the
dependency-free convention above before adding it.

Its Resources section claims `references/variants_patterns.md` and
`references/gesture_guide.md`; neither ships. See the Install Notes at the top
of its `SKILL.md`.

## Conventions

- No build step — edit HTML/CSS/JS directly, and keep it dependency-free.
- Stylesheets are largely per-page (`home.css`, `resume.css`, `ipl.css`, ...)
  with shared `base.css` / `motion.css`. Put page-specific rules in the page's
  own file.
- Motion is progressive-enhancement: `index.html` ships a `<noscript>` fallback
  that forces revealed state. Preserve reduced-motion and no-JS behavior when
  touching animation.
- Accessibility is a hard requirement, not a polish pass: 4.5:1 text contrast,
  visible focus, keyboard navigation, and honored `prefers-reduced-motion`.

## Git Workflow

Never push directly to `main`. Work on a branch, commit, then
`git push -u origin <branch>`. Note that the `gh` CLI is **not** available in
the Claude Code remote environment — use the GitHub MCP tools for PRs and
reviews.
