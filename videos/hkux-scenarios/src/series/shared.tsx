import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {LogoMark} from '../components/Header';
import {C, body, display, mono, tween} from '../theme';
import {Chunk, FPS} from './timing';
import {StageKey} from './types';

export const STAGES: Record<StageKey, {name: string; color: string; glow: string}> = {
  1: {name: 'EMPATHISE', color: C.mint, glow: '#2BB585'},
  2: {name: 'DEFINE', color: C.lilac, glow: C.violet},
  3: {name: 'IDEATE', color: C.peach, glow: '#E0662E'},
  4: {name: 'PROTOTYPE', color: '#7FD3FF', glow: '#2C8BD6'},
  5: {name: 'TEST', color: C.orange, glow: C.orange},
};

export const cue = (cues: Record<string, number>, k: string, fallback: number) => cues[k] ?? fallback;

/** Renders text with *emphasis* in orange. */
export const Rich: React.FC<{text: string; em?: string}> = ({text, em = C.orange}) => (
  <>
    {text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith('*') ? (
        <span key={i} style={{color: em}}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

export const SeriesHeader: React.FC<{stage: StageKey; num: number; title: string; hideAt: number}> = ({stage, num, title, hideAt}) => {
  const frame = useCurrentFrame();
  const st = STAGES[stage];
  return (
    <AbsoluteFill style={{opacity: tween(frame, [0, 10], [0, 1]) * tween(frame, [hideAt, hideAt + 12], [1, 0])}}>
      <div style={{position: 'absolute', top: 110, left: 80, right: 80, display: 'flex', alignItems: 'center', gap: 24}}>
        <LogoMark size={76} />
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontFamily: mono, fontSize: 26, color: st.color, letterSpacing: 4, fontWeight: 700}}>
            STAGE {stage} · {st.name} · {num} OF 5
          </div>
          <div style={{fontFamily: display, fontSize: 42, color: C.cream, fontWeight: 700, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {title}
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', top: 236, left: 80, right: 80, height: 8, borderRadius: 4, background: 'rgba(185,180,255,0.18)', overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${tween(frame, [0, hideAt], [0, 100], (x) => x)}%`, background: `linear-gradient(90deg, ${st.color}, ${C.orange})`, borderRadius: 4}} />
      </div>
    </AbsoluteFill>
  );
};

export const SeriesCaptions: React.FC<{chunks: Chunk[]; endAt: number}> = ({chunks, endAt}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = chunks.findIndex((c, i) => t >= c.words[0].at - 0.05 && t < (chunks[i + 1]?.words[0].at ?? endAt / FPS) - 0.05);
  if (idx === -1 || frame >= endAt) return null;
  const chunk = chunks[idx];
  const startF = chunk.words[0].at * FPS - 2;
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 250}}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 18px',
          maxWidth: 920,
          fontFamily: body,
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 1.15,
          letterSpacing: -1,
          translate: `0px ${tween(frame, [startF, startF + 8], [24, 0])}px`,
          opacity: tween(frame, [startF, startF + 5], [0, 1]),
        }}
      >
        {chunk.words.map((w, i) => {
          const wf = w.at * FPS;
          const nextAt = (chunk.words[i + 1]?.at ?? chunks[idx + 1]?.words[0].at ?? endAt / FPS) * FPS;
          const spoken = frame >= wf;
          const active = spoken && frame < nextAt;
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                display: 'inline-block',
                color: spoken ? (w.hot ? C.orange : C.cream) : 'rgba(246,244,255,0.28)',
                textShadow: '0 6px 30px rgba(10,8,40,0.8)',
              }}
            >
              {w.t}
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -6,
                  height: 7,
                  borderRadius: 4,
                  background: w.hot ? C.orange : C.violet,
                  transformOrigin: 'left',
                  scale: `${active ? tween(frame, [wf, wf + 6], [0, 1]) : 0} 1`,
                }}
              />
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
