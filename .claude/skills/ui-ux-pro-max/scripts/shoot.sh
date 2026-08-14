#!/usr/bin/env bash
# Screenshot a page at desktop / tablet / mobile widths.
#
#   bash .claude/skills/ui-ux-pro-max/scripts/shoot.sh index.html
#   bash .claude/skills/ui-ux-pro-max/scripts/shoot.sh case-studies/ipl.html
#   bash .claude/skills/ui-ux-pro-max/scripts/shoot.sh index.html 1440x2400 390x844
#
# Prints the PNG paths. Read the images afterwards — capturing without looking
# is the same as not capturing.
#
# Three things this handles, each of which otherwise produces a misleading shot:
#
#   1. The homepage runs a JS preloader that covers the viewport, so a naive
#      capture catches the loading screen.
#   2. Content below the fold is invisible until IntersectionObserver fires, so
#      it captures blank. Both are solved by screenshotting a temporary copy of
#      the page with the preloader hidden and reveal classes forced visible —
#      the same thing the <noscript> block in each page's <head> does.
#   3. Headless Chromium clamps its window to a 500px minimum width. Asking for
#      390 renders at 500 and crops, which invents overflow bugs that do not
#      exist. Below 520 this script renders the page inside a fixed-width
#      iframe instead, so media queries see the real width. The plain strip on
#      the right of those shots is padding, not the page.
#
# Chromium captures the viewport, not the full page. To see further down, pass a
# taller spec: 1440x2400.

set -euo pipefail

PAGE="${1:-index.html}"
shift || true
SPECS=("$@")
if [ ${#SPECS[@]} -eq 0 ]; then
  SPECS=(1440x900 820x1100 390x844)
fi

if [ ! -f "$PAGE" ]; then
  echo "No such page: $PAGE (run from the repo root)" >&2
  exit 1
fi

CHROME=""
for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome \
         /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do
  [ -x "$c" ] && CHROME="$c" && break
done
if [ -z "$CHROME" ]; then
  for c in chromium chromium-browser google-chrome; do
    command -v "$c" >/dev/null 2>&1 && CHROME="$(command -v "$c")" && break
  done
fi
if [ -z "$CHROME" ]; then
  echo "No Chromium found. Looked in /opt/pw-browsers and on PATH." >&2
  exit 1
fi

PAGEDIR="$(cd "$(dirname "$PAGE")" && pwd)"
PAGEFILE="$(basename "$PAGE")"
BASE="${PAGEFILE%.html}"

# Temp files live beside the page so relative asset paths keep resolving.
COPY=".uiux-shot-$$-page.html"
FRAME=".uiux-shot-$$-frame.html"
cleanup() { rm -f "$PAGEDIR/$COPY" "$PAGEDIR/$FRAME"; }
trap cleanup EXIT

python3 - "$PAGEDIR/$PAGEFILE" "$PAGEDIR/$COPY" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
inject = (
    '<style id="uiux-shot-overrides">'
    '.rv,.rv-s>*,.reveal{opacity:1!important;transform:none!important;}'
    '.pre{display:none!important;}'
    '</style>'
)
out, n = re.subn(r"</head>", inject + "\n</head>", src, count=1, flags=re.I)
if not n:
    out = inject + src
open(sys.argv[2], "w", encoding="utf-8").write(out)
PY

OUTDIR="${SHOOT_OUT:-${TMPDIR:-/tmp}/uiux-shots}"
mkdir -p "$OUTDIR"
STAMP="$(date +%H%M%S)"

for spec in "${SPECS[@]}"; do
  W="${spec%x*}"
  H="${spec#*x}"
  case "$W" in
    ''|*[!0-9]*) echo "Bad spec '$spec', expected WIDTHxHEIGHT" >&2; continue ;;
  esac

  if   [ "$W" -ge 1200 ]; then LABEL=desktop
  elif [ "$W" -ge 700  ]; then LABEL=tablet
  else                         LABEL=mobile
  fi
  OUT="$OUTDIR/${BASE}-${LABEL}-${W}x${H}-${STAMP}.png"

  if [ "$W" -lt 520 ]; then
    # Below Chromium's minimum window width: render in a fixed-width iframe.
    cat > "$PAGEDIR/$FRAME" <<EOF
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#000;overflow:hidden}
iframe{border:0;display:block;width:${W}px;height:${H}px}</style>
<iframe src="$COPY" scrolling="no"></iframe>
EOF
    TARGET="file://$PAGEDIR/$FRAME"
    WINW=520
  else
    TARGET="file://$PAGEDIR/$COPY"
    WINW="$W"
  fi

  "$CHROME" \
    --headless \
    --no-sandbox \
    --disable-gpu \
    --hide-scrollbars \
    --force-prefers-reduced-motion \
    --virtual-time-budget=8000 \
    --window-size="${WINW},${H}" \
    --screenshot="$OUT" \
    "$TARGET" >/dev/null 2>&1 || true

  if [ -s "$OUT" ]; then
    echo "$OUT"
  else
    echo "FAILED to capture ${W}x${H}" >&2
  fi
done

cat >&2 <<'MSG'

Now Read these PNGs. Check: does the page orient above the fold at every width,
does the eye land in the right order, does the grid stack sensibly, is any text
clipped or overflowing. Mobile shots have padding on the right — that is the
capture, not the layout.
MSG
