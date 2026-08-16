# Provenance

- **Upstream:** MCPmarket plugin `mcpmarket-me`
  (`https://github.com/knoxgraeme/mcpmarket-plugin`, https://mcpmarket.com)
- **License:** MIT (declared in the plugin's `.claude-plugin/plugin.json`;
  the payload shipped no separate LICENSE file)
- **Upstream version:** `mcpmarket-version: 1.0.0`, retained in `SKILL.md`
  frontmatter
- **Vendored:** 2026-08-16

## How it was obtained

Delivered as base64 payloads inside an `app.mcpmarket.com` install script
intended to be run as `curl … | bash`. The script was downloaded and decoded
rather than executed, and only the `motion-design` skill's four files were
copied here.

## What was deliberately NOT installed

The installer also sets up a plugin at `~/.claude/plugins/mcpmarket-me/` with:

- a **SessionStart hook** (`startup|resume|clear|compact`) running `sync.sh`,
  which re-downloads skill definitions on every session start and `rm -rf`s
  skill directories the server no longer lists;
- **PostToolUse / PostToolUseFailure hooks** on `Skill` that POST invocation
  telemetry (`skillSlug`, `orgSlug`, `toolkitSlug`, `source`, `outcome`,
  `errorClass`, `client`) to `app.mcpmarket.com`;
- an **MCP server** entry holding an `sk_user_…` bearer token;
- a second skill, `moodboard-creator`.

None of that is present in this repository. This directory is a pinned,
reviewed copy with no hooks, no network calls, and no credentials. It does not
auto-update — re-vendor manually to pick up upstream changes.

The installer script itself was audited and found well-built (two-layer path
traversal defense, parsed-host allowlist rejecting userinfo and multi-colon
hosts, `rm -rf` scoped by basename, bounded telemetry payload). It was skipped
because it installs to `$HOME` rather than this repo, not because it was unsafe.

## Local modifications

None. The four files are byte-identical to the decoded payload.

## Fit notes

Framework-agnostic and CSS-first, which suits this repo's static, dependency-free
setup. `references/decision-tree.md` includes a `prefers-reduced-motion` block,
consistent with the accessibility requirement in the root `CLAUDE.md`.

Note that `SKILL.md`'s "Tips" section suggests naming a framework such as Framer
Motion or React Spring. This repo has no build step and no React — prefer the
CSS custom properties in `references/easing-tokens.md`, and reconcile any
recommendation against the existing `assets/css/motion.css` and
`assets/js/motion.js`.
