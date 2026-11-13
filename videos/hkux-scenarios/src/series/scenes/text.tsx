import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Icon, ICONS} from '../../components/Icons';
import {Label} from '../../components/ui';
import {C, SPRING, body, display, mono, tween} from '../../theme';
import {Rich, cue} from '../shared';
import {SceneProps} from '../types';

const TONE = {bad: C.red, good: C.mint, ai: C.violet, neutral: C.orange};

/** Kinetic headline: optional icon badge, lines rising in, optional stamp slam. */
export const Statement: React.FC<
  SceneProps & {kicker?: string; lines: string[]; icon?: keyof typeof ICONS; tone?: keyof typeof TONE; stamp?: string; size?: number}
> = ({cues, accent, kicker, lines, icon, tone = 'neutral', stamp, size = 96}) => {
  const f = useCurrentFrame();
  const col = TONE[tone];
  const st = cue(cues, 'stamp', 9999);
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={col} seed={lines[0].length} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 380, paddingTop: 260}}>
        {icon ? (
          <div style={{position: 'relative', width: 200, height: 200, marginBottom: 50}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: 56, background: `${col}22`, border: `4px solid ${col}`, scale: String(tween(f, [0, 14], [0, 1], SPRING)), rotate: `${tween(f, [0, 14], [-20, 0])}deg`}} />
            <Icon name={icon} size={120} color={col} stroke={3.4} draw={tween(f, [6, 24], [0, 1])} style={{position: 'absolute', left: 40, top: 40}} />
          </div>
        ) : null}
        {kicker ? <Label color={col === C.orange ? C.peach : col} style={{marginBottom: 20, opacity: tween(f, [4, 12], [0, 1])}}>{kicker}</Label> : null}
        {lines.map((line, i) => {
          const s = cue(cues, `l${i}`, 6 + i * 8);
          return (
            <div
              key={i}
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1.04,
                letterSpacing: -2,
                color: C.cream,
                textAlign: 'center',
                maxWidth: 940,
                opacity: tween(f, [s, s + 6], [0, 1]),
                translate: `0px ${tween(f, [s, s + 12], [50, 0], SPRING)}px`,
              }}
            >
              <Rich text={line} />
            </div>
          );
        })}
        {stamp ? (
          <div
            style={{
              marginTop: 70,
              fontFamily: mono,
              fontWeight: 700,
              fontSize: 72,
              letterSpacing: 6,
              color: col,
              padding: '14px 34px',
              border: `8px solid ${col}`,
              borderRadius: 20,
              background: 'rgba(14,12,43,0.88)',
              rotate: '-6deg',
              scale: String(tween(f, [st, st + 8], [2.6, 1], SPRING)),
              opacity: tween(f, [st, st + 3], [0, 1]),
            }}
          >
            {stamp}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Chat-style prompt composer: label, typed prompt, optional AI reply chips. */
export const PromptCard: React.FC<SceneProps & {label?: string; text: string; reply?: string[]; replyLabel?: string}> = ({
  dur,
  cues,
  accent,
  label = 'MY PROMPT',
  text,
  reply,
  replyLabel = 'AI DRAFT',
}) => {
  const f = useCurrentFrame();
  const rc = cue(cues, 'reply', reply ? Math.round(dur * 0.55) : 9999);
  const typeEnd = Math.min(rc - 6, Math.round(dur * 0.7));
  const typed = Math.floor(tween(f, [6, Math.max(10, typeEnd)], [0, text.length], (x) => x));
  return (
    <AbsoluteFill>
      <Backdrop glowA={C.violet} glowB={accent} seed={text.length} />
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: reply ? 320 : 520,
          borderRadius: 40,
          background: 'rgba(14,12,43,0.78)',
          border: `3px solid ${C.violet}`,
          boxShadow: `0 0 80px ${C.violet}44`,
          padding: '34px 40px 40px',
          opacity: tween(f, [0, 8], [0, 1]),
          translate: `0px ${tween(f, [0, 14], [60, 0], SPRING)}px`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <div style={{width: 64, height: 64, borderRadius: 20, background: `radial-gradient(circle at 35% 30%, ${C.lilac}, ${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name="sparkle" size={42} color="white" stroke={3} />
          </div>
          <Label color={C.lilac}>{label}</Label>
        </div>
        <div style={{fontFamily: body, fontWeight: 700, fontSize: 42, lineHeight: 1.32, color: C.cream, marginTop: 24, minHeight: 120}}>
          {text.slice(0, typed)}
          <span style={{opacity: typed < text.length || Math.floor(f / 8) % 2 ? 1 : 0, color: C.violet}}>▍</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 10}}>
          <div style={{width: 76, height: 76, borderRadius: 38, background: typed >= text.length ? C.orange : 'rgba(185,180,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: C.ink, fontWeight: 800, fontFamily: body}}>↑</div>
        </div>
      </div>
      {reply ? (
        <div style={{position: 'absolute', left: 80, right: 80, top: 900, display: 'flex', flexDirection: 'column', gap: 16}}>
          <Label color={C.mint} style={{opacity: tween(f, [rc, rc + 6], [0, 1])}}>{replyLabel}</Label>
          {reply.map((r, i) => {
            const s = rc + 4 + i * 5;
            return (
              <div
                key={i}
                style={{
                  fontFamily: body,
                  fontWeight: 700,
                  fontSize: 36,
                  color: C.ink,
                  background: C.cream,
                  borderRadius: 22,
                  padding: '18px 26px',
                  borderLeft: `10px solid ${C.mint}`,
                  opacity: tween(f, [s, s + 6], [0, 1]),
                  translate: `${tween(f, [s, s + 12], [-60, 0], SPRING)}px 0px`,
                }}
              >
                <Rich text={r} em={C.indigo} />
              </div>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Big number that changes: 20 → 3. */
export const Counter: React.FC<SceneProps & {from: number; to: number; label: string; toLabel?: string; icon?: keyof typeof ICONS}> = ({
  cues,
  accent,
  from,
  to,
  label,
  toLabel,
  icon,
}) => {
  const f = useCurrentFrame();
  const drop = cue(cues, 'drop', 9999);
  const val = Math.round(tween(f, [drop, drop + 14], [from, to]));
  const dots = Array.from({length: Math.min(from, 30)}, (_, i) => i);
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.violet} seed={from} />
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 360}}>
        {icon ? <Icon name={icon} size={110} color={accent} stroke={3.2} draw={tween(f, [2, 18], [0, 1])} /> : null}
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 300, lineHeight: 1, color: f >= drop ? C.orange : C.cream, scale: String(tween(f, [0, 12], [0.6, 1], SPRING) * (f >= drop ? tween(f, [drop, drop + 10], [1.15, 1], SPRING) : 1))}}>
          {val}
        </div>
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 60, color: C.cream, marginTop: 6}}>{f >= drop && toLabel ? toLabel : label}</div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, width: 760, justifyContent: 'center', marginTop: 50}}>
          {dots.map((i) => (
            <div
              key={i}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: i < to ? C.orange : C.lilac,
                opacity: tween(f, [2 + i, 6 + i], [0, 1]) * (i < to ? 1 : tween(f, [drop, drop + 10], [0.9, 0.15])),
                scale: String(i < to && f >= drop ? tween(f, [drop, drop + 10], [1.4, 1], SPRING) : 1),
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

type Side = {label: string; text: string; tone?: 'bad' | 'good' | 'neutral'; style?: 'chat' | 'card'; badge?: string};

/** Two stacked panels, the second arriving at cue "bottom". */
export const Compare: React.FC<SceneProps & {top: Side; bottom: Side}> = ({cues, accent, top, bottom, dur}) => {
  const f = useCurrentFrame();
  const b = cue(cues, 'bottom', Math.round(dur * 0.45));
  const panel = (s: Side, start: number) => {
    const col = s.tone === 'bad' ? C.red : s.tone === 'good' ? C.mint : C.lilac;
    const chat = s.style === 'chat';
    return (
      <div
        style={{
          opacity: tween(f, [start, start + 6], [0, 1]),
          translate: `0px ${tween(f, [start, start + 14], [60, 0], SPRING)}px`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16}}>
          <div style={{width: 16, height: 16, borderRadius: 8, background: col}} />
          <Label color={col}>{s.label}</Label>
        </div>
        <div
          style={{
            position: 'relative',
            background: chat ? (s.tone === 'good' ? C.cream : 'rgba(123,116,255,0.25)') : C.cream,
            border: `3px solid ${col}`,
            borderRadius: chat ? '40px 40px 40px 8px' : 30,
            padding: '30px 36px',
            fontFamily: body,
            fontWeight: 700,
            fontSize: 40,
            lineHeight: 1.3,
            color: chat && s.tone !== 'good' ? C.cream : C.ink,
          }}
        >
          <Rich text={s.text} em={chat && s.tone !== 'good' ? C.peach : C.indigo} />
          {s.badge ? (
            <div
              style={{
                position: 'absolute',
                right: -10,
                top: -30,
                fontFamily: mono,
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: 2,
                color: C.ink,
                background: col,
                padding: '10px 18px',
                borderRadius: 999,
                rotate: '4deg',
                scale: String(tween(f, [start + 14, start + 24], [0, 1], SPRING)),
              }}
            >
              {s.badge}
            </div>
          ) : null}
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.violet} seed={top.text.length} />
      <div style={{position: 'absolute', left: 80, right: 80, top: 290, height: 1150, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 90}}>
        {panel(top, 0)}
        {panel(bottom, b)}
      </div>
    </AbsoluteFill>
  );
};
