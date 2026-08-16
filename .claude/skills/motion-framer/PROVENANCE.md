# Provenance

- **Upstream:** https://github.com/freshtechbro/claudedesignskills
- **Upstream path:** `.claude/skills/motion-framer/`
- **License:** MIT — see `LICENSE` (Copyright (c) 2025 Claude Skills Project)
- **Vendored:** 2026-08-16

## Local modifications

1. Added an **Install Notes** section to the top of `SKILL.md` recording that
   this skill targets React while this repo does not use it, the
   `framer-motion` (v11) vs `motion` package split, the two reference files the
   Resources section claims but upstream never shipped, and repo-relative script
   invocation paths.
2. Added `.gitignore` for `__pycache__/` and `*.pyc`.

No script, reference, or asset file was modified. In particular the
doubled-brace bug documented below was left in place rather than patched, so
this directory stays a clean mirror of upstream and re-vendoring is a
straight copy.

## Verification

- Audited both Python scripts: no `subprocess`, `os.system`, `eval`/`exec`,
  sockets, or network calls. The only writes are to a user-supplied `--output`
  path.
- Exercised all 11 `animation_generator.py --type` values and all 7
  `variant_builder.py --preset` values.
- **Found an upstream bug:** `--type stagger`, `variant` and `layout` emit
  standalone variant objects with doubled braces (`hidden: {{ opacity: 0 }}`),
  a leaked Python format-string escape that is a JS `SyntaxError` — confirmed
  with `node --eval`. The other eight types and all presets are clean. JSX
  props of the form `initial={{ … }}` are *correct* and unaffected. Documented
  in the Install Notes of `SKILL.md`; left unpatched here.
- Cross-checked the skill's API claims against the live docs at motion.dev:
  transition types (`tween`/`spring`/`inertia`), spring parameters
  (`stiffness`, `damping`, `mass`, `bounce`, `visualDuration`) and animation
  controls all match.

## Not vendored

The upstream repo carries ~20 other skills (`gsap-scrolltrigger`, `threejs-webgl`,
`lottie-animations`, `react-three-fiber`, `locomotive-scroll`, and others), each
also mirrored as a `.zip`. Only `motion-framer` was taken.

## Updating

Re-clone upstream, copy `.claude/skills/motion-framer/` over this directory,
then re-apply the two changes above.
