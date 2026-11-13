// Renders one still per beat (75% through it) for each episode and tiles them per stage.
// Usage: node scripts/review.mjs <outDir> [episodeIdPrefix]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const only = process.argv[3] ?? '';
fs.mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome');
const ids = ['1-1','1-2','1-3','1-4','1-5','2-1','2-2','2-3','2-4','2-5','3-1','3-2','3-3','3-4','3-5','4-1','4-2','4-3','4-4','4-5','5-2','5-3','5-4','5-5']
  .filter((i) => i.startsWith(only));
for (const id of ids) {
  const comp = await selectComposition({serveUrl, id: `E${id}`, puppeteerInstance: browser});
  const {plan} = comp.props;
  const frames = plan.beats.map((b) => b.start + Math.floor(b.len * 0.75));
  const files = [];
  for (const [i, frame] of frames.entries()) {
    const file = path.join(out, `E${id}_${String(i).padStart(2, '0')}.png`);
    await renderStill({composition: comp, serveUrl, output: file, frame, scale: 0.3, puppeteerInstance: browser});
    files.push(file);
  }
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex', `hstack=inputs=${files.length}`, path.join(out, `row_E${id}.png`)]);
  console.log('done', id, (comp.durationInFrames / 30).toFixed(1) + 's');
}
await browser.close({silent: true});
