import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Icon} from '../../components/Icons';
import {Label} from '../../components/ui';
import {C, SPRING, body, display, mono, tween} from '../../theme';
import {Rich, cue} from '../shared';
import {SceneProps} from '../types';

export type DocLine = {
  text: string;
  mark?: 'circle' | 'strike' | 'highlight' | 'cross' | 'check';
  rewrite?: string;
  tag?: string;
  tagTo?: string;
  tone?: 'bad' | 'good';
  cue?: string; // cue name for the mark
  appear?: string; // cue name for appearing
};

/** A paper document whose lines get marked up on cue. */
export const DocCard: React.FC<SceneProps & {kicker: string; title?: string; lines: DocLine[]; size?: number}> = ({
  cues,
  accent,
  kicker,
  title,
  lines,
  size = 42,
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.orange} seed={kicker.length} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 290, height: 1130, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
      <div
        style={{
          background: C.cream,
          borderRadius: 36,
          padding: '34px 40px 30px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          opacity: tween(f, [0, 8], [0, 1]),
          translate: `0px ${tween(f, [0, 14], [80, 0], SPRING)}px`,
          rotate: `${tween(f, [0, 14], [3, 0])}deg`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <Icon name="receipt" size={40} color={C.indigo} stroke={3} />
          <Label color={C.indigo} style={{fontSize: 24}}>{kicker}</Label>
        </div>
        {title ? <div style={{fontFamily: display, fontWeight: 700, fontSize: 44, color: C.ink, marginTop: 10}}>{title}</div> : null}
        <div style={{marginTop: 14}}>
          {lines.map((ln, i) => {
            const ap = ln.appear ? cue(cues, ln.appear, 6 + i * 5) : 6 + i * 5;
            const mk = ln.cue ? cue(cues, ln.cue, 9999) : 9999;
            const m = tween(f, [mk, mk + 10], [0, 1]);

            const markCol = ln.mark === 'circle' ? C.orange : ln.mark === 'check' ? '#18A874' : C.red;
            const tagCol = f >= mk && ln.tagTo ? (ln.tone === 'good' ? '#18A874' : C.red) : ln.tone === 'good' ? '#18A874' : ln.tone === 'bad' ? C.red : C.indigo;
            return (
              <div
                key={i}
                style={{
                  padding: '16px 0',
                  borderBottom: i < lines.length - 1 ? '2px dashed #DCD8F7' : 'none',
                  opacity: tween(f, [ap, ap + 6], [0, 1]) * (ln.mark === 'cross' ? tween(f, [mk + 10, mk + 20], [1, 0.35]) : 1),
                  translate: `${tween(f, [ap, ap + 10], [-40, 0])}px 0px`,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                  <div style={{position: 'relative', flex: 1, fontFamily: body, fontWeight: 600, fontSize: size, lineHeight: 1.25, color: C.ink}}>
                    <span
                      style={{
                        background: ln.mark === 'highlight' ? `rgba(255,122,61,${0.45 * m})` : 'transparent',
                        borderRadius: 8,
                        opacity: ln.rewrite && ln.mark === 'strike' ? 1 - m * 0.5 : 1,
                      }}
                    >
                      <Rich text={ln.text} em={C.indigo} />
                    </span>
                    {ln.mark === 'strike' || ln.mark === 'cross' ? (
                      <div style={{position: 'absolute', left: 0, top: '50%', height: 6, borderRadius: 3, background: C.red, width: `${m * 100}%`}} />
                    ) : null}
                    {ln.mark === 'circle' ? (
                      <svg style={{position: 'absolute', left: -18, top: -14, overflow: 'visible'}} width="104%" height="130%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <ellipse cx="50" cy="50" rx="49" ry="46" fill="none" stroke={markCol} strokeWidth={3} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - m} style={{strokeWidth: 6}} />
                      </svg>
                    ) : null}
                  </div>
                  {ln.mark === 'cross' || ln.mark === 'check' ? (
                    <div style={{scale: String(tween(f, [mk, mk + 10], [0, 1], SPRING))}}>
                      <Icon name={ln.mark === 'cross' ? 'x' : 'check'} size={48} color={markCol} stroke={6} />
                    </div>
                  ) : null}
                  {ln.tag ? (
                    <div
                      style={{
                        fontFamily: mono,
                        fontWeight: 700,
                        fontSize: 22,
                        letterSpacing: 1,
                        color: 'white',
                        background: tagCol,
                        padding: '8px 16px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        scale: String(ln.tagTo ? (f >= mk ? tween(f, [mk, mk + 10], [1.4, 1], SPRING) : 1) : tween(f, [mk, mk + 10], [0, 1], SPRING)),
                      }}
                    >
                      {f >= mk && ln.tagTo ? ln.tagTo : ln.tag}
                    </div>
                  ) : null}
                </div>
                {ln.rewrite ? (
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      fontFamily: body,
                      fontWeight: 800,
                      fontSize: size,
                      lineHeight: 1.25,
                      color: '#0F8A5F',
                      opacity: tween(f, [mk + 8, mk + 14], [0, 1]),
                      translate: `0px ${tween(f, [mk + 8, mk + 18], [20, 0], SPRING)}px`,
                      maxHeight: m > 0 ? 400 : 0,
                      overflow: 'hidden',
                    }}
                  >
                    <span>→</span>
                    <span>{ln.rewrite}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </AbsoluteFill>
  );
};

/** Transcript rows with timestamps lighting up; one opens a clip of a hovering thumb. */
export const Transcript: React.FC<SceneProps & {rows: {ts: string; text: string; hot?: boolean}[]; clipLabel?: string}> = ({cues, accent, rows, clipLabel = 'P3 · 04:12'}) => {
  const f = useCurrentFrame();
  const light = cue(cues, 'light', 20);
  const clip = cue(cues, 'clip', 9999);
  const k = tween(f, [clip, clip + 16], [0, 1], SPRING);
  const hover = Math.sin((f - clip) / 6) * 14;
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.violet} seed={rows.length} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 300, opacity: 1 - k * 0.6, scale: String(1 - k * 0.08)}}>
        <Label color={C.lilac}>TRANSCRIPTS · 5 SESSIONS</Label>
        {rows.map((r, i) => {
          const lit = r.hot && f >= light + i * 4;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 20,
                alignItems: 'baseline',
                marginTop: 18,
                padding: '16px 22px',
                borderRadius: 20,
                background: lit ? 'rgba(255,122,61,0.16)' : 'rgba(185,180,255,0.08)',
                border: `2px solid ${lit ? C.orange : 'transparent'}`,
                opacity: tween(f, [i * 3, i * 3 + 6], [0, 1]),
              }}
            >
              <div style={{fontFamily: mono, fontWeight: 700, fontSize: 28, color: lit ? C.orange : C.muted}}>{r.ts}</div>
              <div style={{fontFamily: body, fontWeight: 600, fontSize: 34, color: lit ? C.cream : C.lilac}}>{r.text}</div>
            </div>
          );
        })}
      </div>
      {/* Clip */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 560,
          height: 780,
          borderRadius: 40,
          background: C.ink,
          border: `6px solid ${C.orange}`,
          overflow: 'hidden',
          opacity: k,
          scale: String(0.6 + 0.4 * k),
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{position: 'absolute', top: 24, left: 28, display: 'flex', gap: 12, alignItems: 'center'}}>
          <div style={{width: 18, height: 18, borderRadius: 9, background: C.red, opacity: Math.floor(f / 10) % 2 ? 1 : 0.3}} />
          <Label color={C.cream} style={{fontSize: 22}}>{clipLabel}</Label>
        </div>
        <div style={{position: 'absolute', left: 90, right: 90, top: 110, bottom: -40, background: C.cream, borderRadius: 40, padding: 30}}>
          {['Tomatoes ₹60', 'Paneer ₹180', 'Delivery fee ₹40', 'Small cart fee ₹25'].map((t, i) => (
            <div key={t} style={{fontFamily: body, fontWeight: 600, fontSize: 28, color: i > 1 ? C.red : C.ink, padding: '12px 0', borderBottom: '2px dashed #DCD8F7'}}>{t}</div>
          ))}
          <div style={{marginTop: 30, background: C.orange, borderRadius: 24, padding: '22px 0', textAlign: 'center', fontFamily: display, fontWeight: 700, fontSize: 40, color: C.ink}}>Pay ₹305</div>
        </div>
        <div style={{position: 'absolute', left: 380 + hover, top: 610 + Math.abs(hover) * 0.5, width: 90, height: 150, borderRadius: '45px 45px 30px 30px', background: '#E8B79A', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', rotate: '-12deg'}} />
      </div>
    </AbsoluteFill>
  );
};
