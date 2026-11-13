import {STAGE1} from './episodes/stage1';
import {STAGE2} from './episodes/stage2';
import {STAGE3} from './episodes/stage3';
import {STAGE4} from './episodes/stage4';
import {STAGE5} from './episodes/stage5';
import {RECORDINGS} from './recordings';
import {planEpisode} from './timing';

export const EPISODES = [...STAGE1, ...STAGE2, ...STAGE3, ...STAGE4, ...STAGE5];

export const compId = (id: string) => `E${id.replace('.', '-')}`;

export const PLANS = EPISODES.map((ep) => {
  const rec = RECORDINGS[ep.id];
  return {ep, plan: planEpisode(ep, rec?.words), audio: rec?.audio};
});
