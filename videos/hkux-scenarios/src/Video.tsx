import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {pushCut} from '@remotion/transitions/push-cut';
import {iris} from '@remotion/transitions/iris';
import {cube} from '@remotion/transitions/cube';
import {wipe} from '@remotion/transitions/wipe';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {slide} from '@remotion/transitions/slide';
import {flip} from '@remotion/transitions/flip';
import {Captions} from './components/Captions';
import {Header} from './components/Header';
import {C} from './theme';
import {S1Hook} from './scenes/S1Hook';
import {S2Instructions} from './scenes/S2Instructions';
import {S3AI} from './scenes/S3AI';
import {S4Goal} from './scenes/S4Goal';
import {S5Scenario} from './scenes/S5Scenario';
import {S6Check} from './scenes/S6Check';
import {S7Rewrite} from './scenes/S7Rewrite';
import {S8Question} from './scenes/S8Question';
import {S9Follow} from './scenes/S9Follow';
import {S10Outro} from './scenes/S10Outro';

export const W = 1080;
export const H = 1920;
export const TOTAL = 1152; // 38.4s @ 30fps — matches the voiceover

// Each scene's sequence = its spoken length + the transition that follows it,
// so every scene starts entering exactly on its line in the voiceover.
// Scene starts (frames): 0, 83, 150, 300, 378, 651, 765, 945, 1020, 1065.
export const SCENES: {id: string; component: React.FC; duration: number}[] = [
  {id: 'S1-Hook', component: S1Hook, duration: 83 + 12},
  {id: 'S2-Instructions', component: S2Instructions, duration: 67 + 18},
  {id: 'S3-AI', component: S3AI, duration: 150 + 16},
  {id: 'S4-Goal', component: S4Goal, duration: 78 + 18},
  {id: 'S5-Scenario', component: S5Scenario, duration: 273 + 16},
  {id: 'S6-Check', component: S6Check, duration: 114 + 18},
  {id: 'S7-Rewrite', component: S7Rewrite, duration: 180 + 14},
  {id: 'S8-Question', component: S8Question, duration: 75 + 18},
  {id: 'S9-Follow', component: S9Follow, duration: 45 + 18},
  {id: 'S10-Outro', component: S10Outro, duration: 87},
];

export const HKUXScenarios: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={95}>
          <S1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={pushCut({flashColor: C.orange, flashOpacity: 0.5})}
          timing={linearTiming({durationInFrames: 12})}
        />
        <TransitionSeries.Sequence name="Instructions" durationInFrames={85}>
          <S2Instructions />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={iris({width: W, height: H})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 18})}
        />
        <TransitionSeries.Sequence name="AI" durationInFrames={166}>
          <S3AI />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={cube({direction: 'from-right', perspective: 1600})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 16})}
        />
        <TransitionSeries.Sequence name="Goal" durationInFrames={96}>
          <S4Goal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({direction: 'from-bottom-left'})}
          timing={linearTiming({durationInFrames: 18})}
        />
        <TransitionSeries.Sequence name="Scenario" durationInFrames={289}>
          <S5Scenario />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={clockWipe({width: W, height: H})}
          timing={linearTiming({durationInFrames: 16})}
        />
        <TransitionSeries.Sequence name="Check" durationInFrames={132}>
          <S6Check />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 18})}
        />
        <TransitionSeries.Sequence name="Rewrite" durationInFrames={194}>
          <S7Rewrite />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={flip({direction: 'from-left'})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 14})}
        />
        <TransitionSeries.Sequence name="Question" durationInFrames={93}>
          <S8Question />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={cube({direction: 'from-bottom', perspective: 1600})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 18})}
        />
        <TransitionSeries.Sequence name="Follow" durationInFrames={63}>
          <S9Follow />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={iris({width: W, height: H})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 18})}
        />
        <TransitionSeries.Sequence name="Outro" durationInFrames={87}>
          <S10Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Header hideAt={1065} />
      <Captions />
      <Audio src={staticFile('voiceover.m4a')} />
    </AbsoluteFill>
  );
};
