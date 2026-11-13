import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import type {TransitionPresentation} from '@remotion/transitions';
import {pushCut} from '@remotion/transitions/push-cut';
import {iris} from '@remotion/transitions/iris';
import {cube} from '@remotion/transitions/cube';
import {wipe} from '@remotion/transitions/wipe';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {slide} from '@remotion/transitions/slide';
import {flip} from '@remotion/transitions/flip';
import {S10Outro} from '../scenes/S10Outro';
import {C} from '../theme';
import {SeriesCaptions, SeriesHeader, STAGES} from './shared';
import {Plan} from './timing';
import {Episode as EpisodeT, SceneComponent} from './types';
import {Statement, PromptCard, Counter, Compare} from './scenes/text';
import {DocCard, Transcript} from './scenes/docs';
import {CardFan, Flip, Keycaps} from './scenes/cards';
import {Grid2x2, Curve, Timeline, Loop} from './scenes/charts';
import {Phone} from './scenes/phone';
import {Question, Follow} from './scenes/cta';

export const SCENES: Record<string, SceneComponent> = {
  Statement, PromptCard, Counter, Compare, DocCard, Transcript, CardFan, Flip, Keycaps, Grid2x2, Curve, Timeline, Loop, Phone, Question, Follow,
};

const W = 1080;
const H = 1920;

// Rotating set of transitions; each cut uses the next one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSITIONS: {make: () => TransitionPresentation<any>; frames: number; spring?: boolean}[] = [
  {make: () => pushCut({flashColor: C.orange, flashOpacity: 0.45}), frames: 12},
  {make: () => iris({width: W, height: H}), frames: 18, spring: true},
  {make: () => cube({direction: 'from-right', perspective: 1600}), frames: 16, spring: true},
  {make: () => wipe({direction: 'from-bottom-left'}), frames: 16},
  {make: () => slide({direction: 'from-bottom'}), frames: 16, spring: true},
  {make: () => clockWipe({width: W, height: H}), frames: 16},
  {make: () => flip({direction: 'from-left'}), frames: 14, spring: true},
  {make: () => cube({direction: 'from-bottom', perspective: 1600}), frames: 16, spring: true},
];

export type EpisodeProps = {ep: EpisodeT; plan: Plan; audio?: string};

export const EpisodeVideo: React.FC<EpisodeProps> = ({ep, plan, audio}) => {
  const accent = STAGES[ep.stage].color;
  const seed = Number(ep.id.replace('.', ''));
  const items: React.ReactNode[] = [];
  plan.beats.forEach((b, i) => {
    const Comp = SCENES[b.scene];
    if (!Comp) throw new Error(`Unknown scene ${b.scene} in ${ep.id}`);
    const tr = TRANSITIONS[(seed + i) % TRANSITIONS.length];
    const T = Math.min(tr.frames, Math.floor(b.len / 3));
    items.push(
      <TransitionSeries.Sequence key={`s${i}`} name={`${i + 1}. ${b.scene}`} durationInFrames={b.len + T}>
        <Comp dur={b.len + T} accent={accent} cues={b.cues} {...b.props} />
      </TransitionSeries.Sequence>,
    );
    items.push(
      <TransitionSeries.Transition
        key={`t${i}`}
        presentation={tr.make()}
        timing={tr.spring ? springTiming({config: {damping: 200}, durationInFrames: T}) : linearTiming({durationInFrames: T})}
      />,
    );
  });
  items.push(
    <TransitionSeries.Sequence key="outro" name="Outro" durationInFrames={87}>
      <S10Outro />
    </TransitionSeries.Sequence>,
  );
  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <TransitionSeries>{items}</TransitionSeries>
      <SeriesHeader stage={ep.stage} num={ep.num} title={ep.title} hideAt={plan.outroStart} />
      <SeriesCaptions chunks={plan.chunks} endAt={plan.outroStart} />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
