import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Icon, ICONS} from '../../components/Icons';
import {Label} from '../../components/ui';
import {C, SPRING, body, display, mono, tween} from '../../theme';
import {Rich, cue} from '../shared';
import {SceneProps} from '../types';

export type Card = {
  text: string;
  icon?: keyof typeof ICONS;
  keep?: boolean;
  label?: string;
  reject?: boolean;
  style?: 'paper' | 'ai' | 'note' | 'theme';
  appear?: string;
};

const STYLE = {
  paper: {bg: '#FFF7E8', fg: C.ink, border: '#E8DCC2', rot: 1},
  ai: {bg: 'rgba(123,116,255,0.22)', fg: C.cream, border: C.violet, rot: 0},
  note: {bg: '#FFE58A', fg: C.ink, border: '#F0CF5A', rot: 1},
  theme: {bg: C.cream, fg: C.ink, border: C.lilac, rot: 0},
};

/** Grid of cards; at cue "cull" non-kept cards fade and kept ones light up. Rejects get crossed at cue "reject". */
export const CardFan: React.FC<SceneProps & {kicker?: string; cols?: number; cards: Card[]; size?: number; top?: number}> = ({
  cues,
  accent,
  kicker,
  cols = 2,
  cards,
  size = 32,
  top = 330,
}) => {
  const f = useCurrentFrame();
  const cull = cue(cues, 'cull', 9999);
  const rej = cue(cues, 'reject', 9999);
  const gap = 22;
  const w = (920 - gap * (cols - 1)) / cols;
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.violet} seed={cards.length} />
      <div style={{position: 'absolute', left: 80, right: 80, top: top - 30, height: 1450 - top, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26}}>
      {kicker ? <Label color={accent} style={{opacity: tween(f, [0, 8], [0, 1])}}>{kicker}</Label> : null}
      <div style={{display: 'flex', flexWrap: 'wrap', gap}}>
        {cards.map((c, i) => {
          const st = STYLE[c.style ?? 'theme'];
          const ap = c.appear ? cue(cues, c.appear, 4 + i * 3) + (i % 10) * 2 : 4 + i * 3;
          const k = tween(f, [ap, ap + 12], [0, 1], SPRING);
          const culled = !c.keep && f >= cull;
          const lit = c.keep && f >= cull;
          const r = c.reject ? tween(f, [rej + 12, rej + 30], [0, 1]) : 0;
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                width: w,
                minHeight: cols >= 4 ? 120 : 150,
                padding: '20px 22px',
                borderRadius: 24,
                background: lit ? C.orange : st.bg,
                border: `3px solid ${lit ? C.orange : c.reject && f >= rej ? C.red : st.border}`,
                color: lit ? C.ink : st.fg,
                fontFamily: body,
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1.22,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                opacity: Math.min(1, k * 1.5) * (culled ? tween(f, [cull, cull + 10], [1, 0.18]) : 1) * (1 - r),
                scale: String((0.5 + 0.5 * k) * (lit ? tween(f, [cull, cull + 10], [1.08, 1], SPRING) : 1)),
                rotate: `${(st.rot * ((i % 3) - 1) * 2) + r * 25}deg`,
                translate: `0px ${(1 - k) * 60 + r * 300}px`,
                boxShadow: lit ? `0 0 50px ${C.orange}88` : '0 12px 30px rgba(0,0,0,0.3)',
              }}
            >
              {c.icon ? <Icon name={c.icon} size={52} color={lit ? C.ink : st.fg} stroke={3} draw={tween(f, [ap + 4, ap + 18], [0, 1])} /> : null}
              <div><Rich text={c.text} em={st.fg === C.ink ? C.indigo : C.peach} /></div>
              {c.label && f >= cull ? (
                <div style={{fontFamily: mono, fontSize: 22, fontWeight: 700, letterSpacing: 2, color: lit ? C.ink : C.muted, opacity: tween(f, [cull + 4, cull + 10], [0, 1])}}>{c.label}</div>
              ) : null}
              {c.reject ? (
                <div style={{position: 'absolute', right: -16, top: -16, width: 64, height: 64, borderRadius: 32, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: String(tween(f, [rej, rej + 10], [0, 1], SPRING))}}>
                  <Icon name="x" size={38} color="white" stroke={6} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      </div>
    </AbsoluteFill>
  );
};

/** Rows of red "bad" cards flipping over to their green opposite. Each row flips at cue "f<i>". */
export const Flip: React.FC<SceneProps & {kicker?: string; rows: {bad: string; good: string}[]; badLabel?: string; goodLabel?: string}> = ({
  cues,
  accent,
  kicker,
  rows,
  badLabel = 'WORST IDEA',
  goodLabel = 'FLIPPED',
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop glowA={C.red} glowB={accent} seed={rows.length + 3} />
      {kicker ? <Label color={accent} style={{position: 'absolute', top: 320, left: 80}}>{kicker}</Label> : null}
      <div style={{position: 'absolute', left: 80, right: 80, top: 390, display: 'flex', flexDirection: 'column', gap: 30}}>
        {rows.map((r, i) => {
          const ap = cue(cues, `a${i}`, 4 + i * 6);
          const fl = cue(cues, `f${i}`, 9999);
          const p = tween(f, [fl, fl + 14], [0, 1], SPRING);
          const showGood = p > 0.5;
          const col = showGood ? C.mint : C.red;
          return (
            <div key={i} style={{perspective: 1400, opacity: tween(f, [ap, ap + 6], [0, 1]), translate: `${tween(f, [ap, ap + 12], [-80, 0], SPRING)}px 0px`}}>
              <div
                style={{
                  height: 230,
                  borderRadius: 30,
                  padding: '24px 32px',
                  background: showGood ? 'rgba(62,224,161,0.15)' : 'rgba(255,77,109,0.15)',
                  border: `4px solid ${col}`,
                  transform: `rotateX(${showGood ? (1 - p) * -180 : p * 180}deg)`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <Icon name={showGood ? 'check' : 'x'} size={34} color={col} stroke={5} />
                  <Label color={col} style={{fontSize: 22}}>{showGood ? goodLabel : badLabel}</Label>
                </div>
                <div style={{fontFamily: display, fontWeight: 700, fontSize: 46, lineHeight: 1.1, color: C.cream}}>{showGood ? r.good : r.bad}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** SCAMPER keycaps; picked letters light at cue "p<i>" and show their idea. */
export const Keycaps: React.FC<SceneProps & {letters: {k: string; word: string}[]; picks: {index: number; idea: string}[]}> = ({cues, accent, letters, picks}) => {
  const f = useCurrentFrame();
  const litAt = (idx: number) => {
    const pi = picks.findIndex((p) => p.index === idx);
    return pi === -1 ? 9999 : cue(cues, `p${pi}`, 9999);
  };
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.violet} seed={7} />
      <div style={{position: 'absolute', left: 60, right: 60, top: 340, display: 'flex', justifyContent: 'center', gap: 14}}>
        {letters.map((l, i) => {
          const ap = cue(cues, 'keys', 2) + i * 3;
          const lit = f >= litAt(i);
          const press = lit ? tween(f, [litAt(i), litAt(i) + 4], [0, 14]) - tween(f, [litAt(i) + 4, litAt(i) + 10], [0, 14]) : 0;
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: tween(f, [ap, ap + 6], [0, 1]), translate: `0px ${tween(f, [ap, ap + 12], [-80, 0], SPRING) + press}px`}}>
              <div
                style={{
                  width: 116,
                  height: 126,
                  borderRadius: 24,
                  background: lit ? C.orange : C.cream,
                  boxShadow: `0 ${14 - press}px 0 ${lit ? '#B8501F' : '#9C97D6'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 76,
                  color: C.ink,
                }}
              >
                {l.k}
              </div>
              <div style={{fontFamily: mono, fontSize: 17, fontWeight: 700, color: lit ? C.orange : C.muted, textAlign: 'center', width: 124}}>{l.word}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 640, display: 'flex', flexDirection: 'column', gap: 26}}>
        {picks.map((p, i) => {
          const s = cue(cues, `p${i}`, 9999);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 24,
                alignItems: 'center',
                background: 'rgba(14,12,43,0.75)',
                border: `3px solid ${C.orange}`,
                borderRadius: 30,
                padding: '26px 30px',
                opacity: tween(f, [s + 4, s + 10], [0, 1]),
                translate: `0px ${tween(f, [s + 4, s + 16], [50, 0], SPRING)}px`,
              }}
            >
              <div style={{width: 86, height: 86, flexShrink: 0, borderRadius: 20, background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: display, fontWeight: 700, fontSize: 56, color: C.ink}}>{letters[p.index].k}</div>
              <div style={{fontFamily: body, fontWeight: 700, fontSize: 38, lineHeight: 1.25, color: C.cream}}>{p.idea}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
