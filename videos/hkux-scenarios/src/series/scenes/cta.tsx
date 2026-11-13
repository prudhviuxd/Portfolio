import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Cursor, Icon} from '../../components/Icons';
import {Burst, Label} from '../../components/ui';
import {C, EASE_IN_OUT, SPRING, body, display, mono, tween} from '../../theme';
import {SceneProps} from '../types';

/** "Your turn" question with a comment box typing a sample answer. */
export const Question: React.FC<SceneProps & {lines: string[]; draft: string}> = ({dur, accent, lines, draft}) => {
  const f = useCurrentFrame();
  const typeStart = Math.round(dur * 0.35);
  const typed = Math.floor(tween(f, [typeStart, Math.max(typeStart + 10, dur - 10)], [0, draft.length], (x) => x));
  const bubbles = [
    {x: 110, y: 1250, d: 0, c: C.violet},
    {x: 840, y: 1200, d: 8, c: C.orange},
    {x: 690, y: 1340, d: 16, c: C.mint},
  ];
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.orange} seed={8} />
      {bubbles.map((b, i) => (
        <div key={i} style={{position: 'absolute', left: b.x, top: b.y - tween(f, [b.d, b.d + 70], [0, 260], (x) => x), opacity: tween(f, [b.d, b.d + 8], [0, 0.9]) * tween(f, [b.d + 50, b.d + 70], [1, 0]), rotate: `${(i - 1) * 12}deg`}}>
          <Icon name="chat" size={110} color={b.c} stroke={3} fill={`${b.c}33`} />
        </div>
      ))}
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 380}}>
        <Label color={C.lilac} style={{opacity: tween(f, [0, 8], [0, 1])}}>YOUR TURN</Label>
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 96, lineHeight: 1.04, textAlign: 'center', color: C.cream, marginTop: 20, letterSpacing: -2, maxWidth: 960}}>
          {lines.map((line, i) => {
            const st = 2 + i * 7;
            return (
              <div key={i} style={{color: i === 1 ? C.orange : C.cream, opacity: tween(f, [st, st + 6], [0, 1]), translate: `0px ${tween(f, [st, st + 12], [60, 0], SPRING)}px`}}>
                {line}
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 64,
            width: 900,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '24px 30px',
            borderRadius: 999,
            border: `3px solid ${C.violet}`,
            background: 'rgba(14,12,43,0.7)',
            opacity: tween(f, [12, 20], [0, 1]),
            translate: `0px ${tween(f, [12, 24], [40, 0], SPRING)}px`,
          }}
        >
          <div style={{width: 64, height: 64, flexShrink: 0, borderRadius: 32, background: `linear-gradient(135deg, ${C.violet}, ${C.orange})`}} />
          <div style={{flex: 1, fontFamily: body, fontWeight: 600, fontSize: 34, color: C.cream, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {typed ? draft.slice(0, typed) : <span style={{color: C.muted}}>Add a comment…</span>}
          </div>
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 32, color: C.orange}}>Post</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Follow button press with bell and confetti; shows the next stage if named. */
export const Follow: React.FC<SceneProps & {text: string}> = ({dur, accent, text}) => {
  const f = useCurrentFrame();
  const click = Math.min(18, Math.round(dur * 0.4));
  const done = f >= click;
  const press = f > click - 2 && f < click + 3 ? 0.92 : 1;
  const bell = done ? Math.sin((f - click) / 1.6) * 22 * tween(f, [click, click + 24], [1, 0]) : 0;
  const next = text.includes(':') ? text.split(':')[1].trim() : null;
  return (
    <AbsoluteFill>
      <Backdrop glowA={C.orange} glowB={accent} seed={9} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 300}}>
        <div style={{rotate: `${bell}deg`, transformOrigin: 'top center', marginBottom: 50, scale: String(tween(f, [0, 10], [0, 1], SPRING))}}>
          <Icon name="bell" size={160} color={done ? C.orange : C.lilac} stroke={3} fill={done ? `${C.orange}33` : 'none'} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '34px 80px',
            borderRadius: 999,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 64,
            background: done ? 'transparent' : C.orange,
            border: `4px solid ${done ? C.mint : C.orange}`,
            color: done ? C.mint : C.ink,
            scale: String(press * tween(f, [2, 12], [0.6, 1], SPRING)),
          }}
        >
          {done ? <Icon name="check" size={60} color={C.mint} stroke={5} draw={tween(f, [click, click + 8], [0, 1])} /> : null}
          {done ? 'Following' : 'Follow'}
        </div>
        {next ? (
          <div style={{marginTop: 50, fontFamily: mono, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: accent, opacity: tween(f, [click + 6, click + 14], [0, 1])}}>
            NEXT STAGE → {next.replace(/\.$/, '').toUpperCase()}
          </div>
        ) : null}
        <div style={{position: 'absolute', left: 540, top: 840}}>
          <Burst p={tween(f, [click, click + 16], [0, 1], (x) => x)} color={C.mint} size={360} />
          {Array.from({length: 14}, (_, i) => {
            const ang = (i / 14) * Math.PI * 2;
            const r = tween(f, [click, click + 22], [0, 300 + (i % 3) * 60]);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: Math.cos(ang) * r,
                  top: Math.sin(ang) * r + tween(f, [click, click + 30], [0, 80], EASE_IN_OUT),
                  width: 18,
                  height: i % 2 ? 18 : 36,
                  borderRadius: 6,
                  background: [C.orange, C.mint, C.violet, C.peach][i % 4],
                  rotate: `${(f - click) * 12 + i * 30}deg`,
                  opacity: done ? tween(f, [click + 18, click + 30], [1, 0]) : 0,
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
      <Cursor size={84} style={{position: 'absolute', left: tween(f, [0, click - 3], [900, 640], EASE_IN_OUT), top: tween(f, [0, click - 3], [1350, 840], EASE_IN_OUT), scale: String(press)}} />
    </AbsoluteFill>
  );
};
