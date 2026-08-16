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
case-studies/               # ipl.html, my-mtn.html, who-myyoga.html
assets/css/                 # Per-page + shared stylesheets (base, motion, scroll3d, ...)
assets/js/                  # main.js, motion.js, rhodium.js
assets/fonts/, assets/img/
docs/MOODBOARD.md           # Design rationale and direction
.claude/skills/             # Vendored design skills (see below)
```

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

Two skills are vendored into `.claude/skills/`, both MIT-licensed from
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
Each has a `PROVENANCE.md` recording its source and local modifications.

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
