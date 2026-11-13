/**
 * Real voiceover recordings. When a recording lands:
 *  1. put the audio at public/vo/<id>.m4a (e.g. public/vo/1.1.m4a)
 *  2. run `npm run align -- 1.1` to write word timings to timings/1.1.json
 *  3. add the entry below.
 * Every beat and caption then re-times itself from the real words.
 */
export const RECORDINGS: Record<string, {audio: string; words: {t: string; at: number; end: number}[]}> = {};
