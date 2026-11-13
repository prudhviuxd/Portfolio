import type React from 'react';

export type StageKey = 1 | 2 | 3 | 4 | 5;

/** A scene type from the library plus its props. `cues` maps names to script phrases. */
export type Beat = {
  /** Phrase in the script where this beat starts (first beat may omit it). */
  at?: string;
  scene: string;
  props?: Record<string, unknown>;
  /** Named moments inside the beat, each anchored to a phrase spoken during it. */
  cues?: Record<string, string>;
};

export type Episode = {
  id: string; // e.g. "1.1"
  stage: StageKey;
  num: number; // 1..5 within stage
  title: string; // short header title (fits one line)
  script: string; // English voiceover, exactly as in the doc
  hot?: string[]; // words highlighted orange in captions
  question: string[]; // CTA headline lines (middle line is orange)
  draft: string; // text typed into the comment box
  follow: string; // e.g. "Follow for the next step" / "...next stage: Define"
  beats: Beat[];
};

export type SceneProps = {
  dur: number;
  accent: string;
  cues: Record<string, number>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SceneComponent = React.FC<any>;
