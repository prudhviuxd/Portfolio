#!/usr/bin/env bash
# Render every series episode (or those matching a prefix) to out/series/.
# Usage: scripts/render-series.sh [prefix]   e.g. scripts/render-series.sh 2
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/series
npx remotion bundle --out-dir build --log=error >/dev/null
node -e '
const fs=require("fs");
const src=["1","2","3","4","5"].map(n=>fs.readFileSync(`src/series/episodes/stage${n}.ts`,"utf8")).join("\n");
for (const m of src.matchAll(/id: .(\d\.\d).,[\s\S]*?title: (["\x27])(.*?)\2,/g)) console.log(m[1]+"\t"+m[3]);
' | while IFS=$'\t' read -r id title; do
  [[ -n "${1:-}" && "$id" != "$1"* ]] && continue
  slug=$(echo "$title" | tr -cd '[:alnum:] ,-' | tr ' ' '-' | tr -s '-' | sed 's/,//g')
  out="out/series/HKUX_${id}_${slug}.mp4"
  npx remotion render build "E${id/./-}" "$out" --codec=h264 --crf=20 --concurrency=4 --log=error
  echo "rendered $out"
done
