# Upstream reference

Verbatim copies of upstream files, kept for reference only. **Nothing here is
active configuration** — Claude Code does not read these.

## `ui-ux-pro-max-CLAUDE.md`

The root `CLAUDE.md` from
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
MIT-licensed, retrieved 2026-08-16.

It is kept here rather than installed as this repo's `CLAUDE.md` because it
documents how to *develop the upstream toolkit*, not how to work in this
portfolio. Specifically, it describes `src/ui-ux-pro-max/`, `cli/`,
`.claude-plugin/`, an npm `sync:assets` script, and a "Check asset sync" CI
workflow — none of which exist in this repository. Its search examples also
point at `src/ui-ux-pro-max/scripts/search.py`, whereas the vendored skill lives
at `.claude/skills/ui-ux-pro-max/scripts/search.py`.

The applicable parts — search domains, stack list, design dials, Python
prerequisite, and the branch-based git workflow — were carried into the root
`CLAUDE.md` with paths corrected for this repo.

Useful when re-syncing a vendored skill against a newer upstream release.
