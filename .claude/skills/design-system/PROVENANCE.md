# Provenance

This skill was vendored into this repository from a third-party source.

- **Upstream:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Upstream path:** `.claude/skills/design-system/`
- **License:** MIT — see `LICENSE` (Copyright (c) 2024 Next Level Builder).
  The skill's own frontmatter also declares `license: MIT`, `author: claudekit`,
  `version: 1.0.0`.
- **Vendored:** 2026-08-16

## Local modifications

1. The seven `node scripts/...` and `python scripts/...` examples in `SKILL.md`
   assumed the skill directory was the working directory. They were rewritten to
   repo-relative paths (`.claude/skills/design-system/scripts/...`) so they run
   from the repository root.
2. An **Install Notes** section was added to `SKILL.md` recording which files the
   Slide System section references that do not exist in this repo, so the slide
   workflow is not described as usable when its inputs are absent.
3. Added `.gitignore` for `__pycache__/` and `*.pyc`.

No script, data, reference, or template file was modified.

## Note on script paths

`scripts/fetch-background.py` computes the project root as five parents up from
itself, which resolves correctly here (`.claude/skills/design-system/scripts/`
→ repo root) because the vendored layout matches upstream's. Preserve that depth
if the skill is ever relocated.

## Updating

Re-clone upstream, copy `.claude/skills/design-system/` over this directory,
then re-apply the three changes above.
