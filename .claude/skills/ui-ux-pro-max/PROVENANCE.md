# Provenance

This skill was vendored into this repository from a third-party source.

- **Upstream:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Upstream path:** `.claude/skills/ui-ux-pro-max/`
- **License:** MIT — see `LICENSE` (Copyright (c) 2024 Next Level Builder)
- **Vendored:** 2026-08-16

## Local modifications

Upstream ships this as a Claude Code *plugin*, so `SKILL.md` invoked the search
script through `${CLAUDE_PLUGIN_ROOT}`. It is installed here as a *project
skill* instead, where that variable is not set, so the 11 command examples in
`SKILL.md` were rewritten to the repo-relative path
`.claude/skills/ui-ux-pro-max/scripts/search.py`, and the surrounding
"Running the search tool" note was updated to match. No other file was changed.

## Updating

Re-clone upstream, copy `.claude/skills/ui-ux-pro-max/` over this directory,
then re-apply the two changes above.
