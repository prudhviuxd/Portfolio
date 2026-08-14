#!/usr/bin/env python3
"""WCAG contrast ratios for this portfolio's tokens.

    python3 contrast.py --css assets/css/rhodium.css
    python3 contrast.py --css assets/css/study.css --bg '#08080B'
    python3 contrast.py '#83878F' '#08080B'

Why this exists: most surfaces here are translucent white over a near-black
page, so a token's effective colour is not the value written in the token. This
composites alpha over the page background before measuring. It also settles the
apparent contradiction between the ratios in rhodium.css (measured against
--surface) and those in docs/MOODBOARD.md (measured against --bg) by reporting
every foreground against every background.

Thresholds: 4.5:1 for body text, 3:1 for large text (24px+, or 19px+ bold).

Known limitation: tokens are collected without selector context, so when a
variable is redeclared under a modifier — as --acc is in study.css, once per
project accent — the last declaration in the file wins rather than the :root
default. Check the file if a value looks unexpected.
"""

import argparse
import re
import sys

HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
RGB = re.compile(r"^rgba?\(([^)]+)\)$")
DECL = re.compile(r"(--[\w-]+)\s*:\s*([^;]+);")
VAR = re.compile(r"var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)")

# Token names that behave as foreground vs. background, by convention in this repo.
FG_HINTS = ("text", "cy", "vi", "mg", "acc", "pink", "orange", "amber", "teal", "blue")
BG_HINTS = ("bg", "surface")


def parse_color(value):
    """Return (r, g, b, a) floats, or None if not a plain colour."""
    v = value.strip()
    m = HEX.match(v)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
    m = RGB.match(v)
    if m:
        parts = [p.strip() for p in m.group(1).replace("/", ",").split(",")]
        if len(parts) < 3:
            return None
        try:
            r, g, b = (float(p.rstrip("%")) for p in parts[:3])
            a = float(parts[3]) if len(parts) > 3 else 1.0
        except ValueError:
            return None
        return (r, g, b, a)
    return None


def composite(fg, bg):
    """Flatten a translucent colour over an opaque one."""
    r, g, b, a = fg
    br, bg_, bb, _ = bg
    return (r * a + br * (1 - a), g * a + bg_ * (1 - a), b * a + bb * (1 - a), 1.0)


def luminance(color):
    def chan(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b, _ = color
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def ratio(c1, c2):
    l1, l2 = luminance(c1), luminance(c2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def verdict(r):
    if r >= 7:
        return "AAA"
    if r >= 4.5:
        return "AA"
    if r >= 3:
        return "AA large only"
    return "FAIL"


def read_tokens(path):
    """Parse :root custom properties, resolving one-level var() references."""
    try:
        css = open(path, encoding="utf-8").read()
    except OSError as e:
        sys.exit(f"Cannot read {path}: {e}")

    raw = {}
    for name, value in DECL.findall(css):
        raw[name] = value.strip()  # later declaration wins, matching the cascade

    resolved = {}
    for name, value in raw.items():
        seen = set()
        while True:
            m = VAR.search(value)
            if not m or m.group(1) in seen:
                break
            seen.add(m.group(1))
            target = raw.get(m.group(1))
            if target is None:
                break
            value = value[: m.start()] + target + value[m.end() :]
        color = parse_color(value)
        if color:
            resolved[name] = color
    return resolved


def classify(tokens):
    fg, bg = {}, {}
    for name, color in tokens.items():
        stem = name[2:]
        if any(h in stem for h in BG_HINTS):
            bg[name] = color
        elif any(stem == h or h in stem.split("-") or stem.startswith(h) for h in FG_HINTS):
            fg[name] = color
    return fg, bg


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("colors", nargs="*", help="two colours to compare, e.g. '#ADB0B8' '#08080B'")
    ap.add_argument("--css", help="CSS file to read :root tokens from")
    ap.add_argument("--bg", default=None, help="page background for compositing (default: the file's --bg)")
    args = ap.parse_args()

    if args.colors:
        if len(args.colors) != 2:
            sys.exit("Pass exactly two colours, or use --css.")
        a, b = (parse_color(c) for c in args.colors)
        if not a or not b:
            sys.exit("Could not parse those colours. Use #rrggbb or rgba(...).")
        base = b if b[3] == 1.0 else composite(b, (0, 0, 0, 1.0))
        if a[3] < 1.0:
            a = composite(a, base)
        r = ratio(a, base)
        print(f"{args.colors[0]} on {args.colors[1]}  {r:5.2f}:1  {verdict(r)}")
        return 0 if r >= 4.5 else 1

    if not args.css:
        ap.print_help()
        return 2

    tokens = read_tokens(args.css)
    if not tokens:
        sys.exit(f"No colour tokens found in {args.css}")

    page_bg = parse_color(args.bg) if args.bg else tokens.get("--bg")
    if not page_bg:
        sys.exit("No --bg token found; pass --bg '#08080B' explicitly.")

    fg, bg = classify(tokens)
    if not fg or not bg:
        sys.exit("Could not classify tokens into foreground/background by name.")

    print(f"{args.css}   page background {'#%02X%02X%02X' % tuple(int(round(c)) for c in page_bg[:3])}\n")

    failures = 0
    for bname, bcolor in sorted(bg.items()):
        flat_bg = composite(bcolor, page_bg) if bcolor[3] < 1.0 else bcolor
        print(f"  on {bname}")
        for fname, fcolor in sorted(fg.items()):
            flat_fg = composite(fcolor, flat_bg) if fcolor[3] < 1.0 else fcolor
            r = ratio(flat_fg, flat_bg)
            v = verdict(r)
            if v == "FAIL":
                failures += 1
            mark = "  " if r >= 4.5 else ("~ " if r >= 3 else "! ")
            print(f"    {mark}{fname:<12} {r:6.2f}:1  {v}")
        print()

    print("4.5:1 body · 3:1 large (24px+, or 19px+ bold)")
    print("'~' passes for large text only · '!' fails both")
    if failures:
        print(f"\n{failures} pair(s) below 3:1. Those combinations are unusable for text —")
        print("check whether any of them are actually used before acting.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
