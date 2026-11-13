// Prints each Short's script split into sentences with the time each lands in the silent render.
import {PLANS} from '../src/series';
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const out: unknown[] = [];
for (const {ep, plan} of PLANS) {
  const lines: {at: string; end: string; text: string}[] = [];
  let cur: typeof plan.words = [];
  plan.words.forEach((w, i) => {
    cur.push(w);
    if (/[.?!]["”’)]*$/.test(w.t) || i === plan.words.length - 1) {
      lines.push({at: fmt(cur[0].at), end: fmt(cur[cur.length - 1].end), text: cur.map((x) => x.t).join(' ')});
      cur = [];
    }
  });
  out.push({id: ep.id, stage: ep.stage, title: ep.title, total: fmt(plan.total / 30), speechEnd: fmt(plan.words[plan.words.length - 1].end), words: plan.words.length, lines});
}
console.log(JSON.stringify(out, null, 1));
