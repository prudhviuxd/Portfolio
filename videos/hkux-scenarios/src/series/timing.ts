import {Episode} from './types';

export type TimedWord = {t: string; norm: string; at: number; end: number};

export const norm = (w: string) => w.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9₹'×-]/g, '').replace(/^'+|'+$/g, '');

const syllables = (w: string) => {
  const s = w.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s) return 1;
  if (/^\d+$/.test(s)) return Math.max(2, s.length);
  let n = (s.match(/[aeiouy]+/g) ?? []).length;
  if (s.endsWith('e') && n > 1) n--;
  return Math.max(1, n);
};

/**
 * Estimated word timings, fitted to the real 5.1 voiceover:
 * 0.163s + 0.086s per syllable, +0.377s after . ? ! :, +0.252s after a comma.
 * Replaced by real timings (timings/<id>.json) once a recording exists.
 */
export const estimateTimings = (script: string, lead = 0.2): TimedWord[] => {
  const words = script.split(/\s+/).filter(Boolean);
  let t = lead;
  return words.map((w) => {
    const end = /[.?!:]["”’)]*$/.test(w) ? 0.377 : /[,;]["”’)]*$/.test(w) ? 0.252 : 0;
    const d = 0.163 + 0.086 * syllables(w);
    const tw = {t: w, norm: norm(w), at: t, end: t + d};
    t += d + end;
    return tw;
  });
};

/** Index of the first word of `phrase`, searching from `from`. */
export const findPhrase = (words: TimedWord[], phrase: string, from = 0): number => {
  const p = phrase.split(/\s+/).map(norm).filter(Boolean);
  for (let i = from; i <= words.length - p.length; i++) {
    if (p.every((x, k) => words[i + k].norm === x)) return i;
  }
  throw new Error(`Phrase not found after word ${from}: "${phrase}"`);
};

export type Chunk = {words: (TimedWord & {hot: boolean})[]};

/** Caption chunks: max 4 words / 24 chars, break after sentence punctuation. */
export const chunkWords = (words: TimedWord[], hot: string[] = []): Chunk[] => {
  const hotSet = new Set(hot.map(norm));
  const chunks: Chunk[] = [];
  let cur: Chunk['words'] = [];
  let chars = 0;
  words.forEach((w, i) => {
    const len = w.t.length + 1;
    if (cur.length && (cur.length >= 4 || chars + len > 26)) {
      chunks.push({words: cur});
      cur = [];
      chars = 0;
    }
    cur.push({...w, hot: hotSet.has(w.norm)});
    chars += len;
    const gap = (words[i + 1]?.at ?? w.end) - w.end;
    if (/[.?!:]["”’)]*$/.test(w.t) || (/,["”’)]*$/.test(w.t) && cur.length >= 2) || gap > 0.6) {
      chunks.push({words: cur});
      cur = [];
      chars = 0;
    }
  });
  if (cur.length) chunks.push({words: cur});
  return chunks;
};

export const FPS = 30;
export const OUTRO = 87; // frames

export type Plan = {
  words: TimedWord[];
  chunks: Chunk[];
  beats: {scene: string; props: Record<string, unknown>; start: number; len: number; cues: Record<string, number>}[];
  outroStart: number;
  total: number;
};

/** Turn an episode + word timings into frame-accurate beats. */
export const planEpisode = (ep: Episode, real?: {t: string; at: number; end: number}[]): Plan => {
  const words: TimedWord[] = real ? real.map((w) => ({...w, norm: norm(w.t)})) : estimateTimings(ep.script);
  const f = (sec: number) => Math.round(sec * FPS);

  // CTA beats are appended automatically.
  const qPhrase = ep.question.join(' ').split(/\s+/).slice(0, 3).join(' ');
  const all = [
    ...ep.beats,
    {at: qPhrase, scene: 'Question', props: {lines: ep.question, draft: ep.draft}},
    {at: ep.follow.split(' ').slice(0, 2).join(' '), scene: 'Follow', props: {text: ep.follow}},
  ];

  let cursor = 0;
  const starts = all.map((b, i) => {
    if (i === 0 && !b.at) return {idx: 0, sec: 0};
    const idx = findPhrase(words, b.at!, cursor);
    cursor = idx;
    return {idx, sec: i === 0 ? 0 : words[idx].at - 0.08};
  });
  const lastEnd = words[words.length - 1].end;
  const outroStart = f(lastEnd + 0.45);

  const beats = all.map((b, i) => {
    const start = f(starts[i].sec);
    const next = i + 1 < all.length ? f(starts[i + 1].sec) : outroStart;
    const cues: Record<string, number> = {};
    const bc = (b as {cues?: Record<string, string>}).cues ?? {};
    for (const [k, phrase] of Object.entries(bc)) {
      cues[k] = f(words[findPhrase(words, phrase, starts[i].idx)].at) - start;
    }
    return {scene: b.scene, props: b.props ?? {}, start, len: next - start, cues};
  });
  return {words, chunks: chunkWords(words, ep.hot), beats, outroStart, total: outroStart + OUTRO};
};
