"""Align a voiceover recording to its script and register it.

Usage:  python3 scripts/align.py 1.1          (reads public/vo/1.1.m4a)

Transcribes with faster-whisper (word timestamps), then maps the recognised
words onto the script's exact words, so captions keep the doc's wording while
timing comes from the recording. Writes timings/<id>.json and adds the
episode to src/series/recordings.ts.
"""
import difflib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def script_for(ep_id: str) -> str:
    for f in sorted((ROOT / "src/series/episodes").glob("stage*.ts")):
        src = f.read_text()
        m = re.search(r"id: '" + re.escape(ep_id) + r"',[\s\S]*?script: `([\s\S]*?)`", src)
        if m:
            return m.group(1)
    sys.exit(f"No script found for {ep_id}")


def main() -> None:
    ep_id = sys.argv[1]
    audio = ROOT / "public/vo" / f"{ep_id}.m4a"
    if not audio.exists():
        sys.exit(f"Missing {audio}")
    from faster_whisper import WhisperModel

    import subprocess

    import numpy as np

    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(audio), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        check=True, capture_output=True,
    ).stdout
    samples = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    model = WhisperModel("base.en", compute_type="int8")
    segments, _ = model.transcribe(samples, word_timestamps=True)
    heard = [w for s in segments for w in s.words]
    words = script_for(ep_id).split()

    a = [norm(w.word) for w in heard]
    b = [norm(w) for w in words]
    times: list = [None] * len(words)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(j2 - j1):
                times[j1 + k] = (heard[i1 + k].start, heard[i1 + k].end)
        elif tag == "replace" and i2 > i1:
            # Spread the script words evenly over the recognised span.
            s, e = heard[i1].start, heard[i2 - 1].end
            n = j2 - j1
            for k in range(n):
                times[j1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)

    # Fill gaps (words whisper skipped) by interpolating between neighbours.
    for j, t in enumerate(times):
        if t is None:
            prev = next((times[k][1] for k in range(j - 1, -1, -1) if times[k]), 0.0)
            nxt = next((times[k][0] for k in range(j + 1, len(times)) if times[k]), prev + 0.4)
            times[j] = (prev, max(prev + 0.05, min(nxt, prev + 0.4)))

    out = [{"t": w, "at": round(t[0], 3), "end": round(t[1], 3)} for w, t in zip(words, times)]
    (ROOT / "timings").mkdir(exist_ok=True)
    (ROOT / "timings" / f"{ep_id}.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))

    reg = ROOT / "src/series/recordings.ts"
    src = reg.read_text()
    imp = f"import t{ep_id.replace('.', '_')} from '../../timings/{ep_id}.json';\n"
    entry = f"  '{ep_id}': {{audio: 'vo/{ep_id}.m4a', words: t{ep_id.replace('.', '_')}}},\n"
    if imp not in src:
        src = imp + src
    if f"'{ep_id}':" not in src:
        src = src.replace("= {};", "= {\n};").replace("\n};", "\n" + entry + "};", 1)
    reg.write_text(src)
    matched = sum(1 for w in out if w["end"] > w["at"])
    print(f"{ep_id}: {len(out)} words aligned ({matched} timed), ends at {out[-1]['end']:.1f}s")


if __name__ == "__main__":
    main()
