import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Icon, ICONS} from '../../components/Icons';
import {Label} from '../../components/ui';
import {C, EASE_IN_OUT, SPRING, body, display, mono, tween} from '../../theme';
import {cue} from '../shared';
import {SceneProps} from '../types';

const GX = 120;
const GY = 330;
const GW = 860;
const GH = 1000;

/** 2×2 grid. Items land at (x,y) in 0..1 (y=1 top). Quadrant labels optional (empathy map). */
export const Grid2x2: React.FC<
  SceneProps & {
    xLabel?: string;
    yLabel?: string;
    quadrants?: string[];
    items: {text: string; x: number; y: number; appear?: string; hot?: boolean; reject?: boolean; sticky?: boolean}[];
    note?: {text: string; x: number; y: number};
  }
> = ({cues, accent, xLabel, yLabel, quadrants, items, note}) => {
  const f = useCurrentFrame();
  const rej = cue(cues, 'reject', 9999);
  const nt = cue(cues, 'note', 9999);
  const hot = cue(cues, 'hot', 9999);
  const draw = tween(f, [0, 16], [0, 1]);
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.orange} seed={items.length + 11} />
      {/* Quadrant tiles */}
      {quadrants
        ? quadrants.map((q, i) => (
            <div
              key={q}
              style={{
                position: 'absolute',
                left: GX + (i % 2) * (GW / 2) + 6,
                top: GY + Math.floor(i / 2) * (GH / 2) + 6,
                width: GW / 2 - 12,
                height: GH / 2 - 12,
                borderRadius: 28,
                background: 'rgba(185,180,255,0.08)',
                border: `2px solid rgba(185,180,255,0.25)`,
                padding: 22,
                opacity: tween(f, [i * 3, i * 3 + 8], [0, 1]),
              }}
            >
              <Label color={accent}>{q}</Label>
            </div>
          ))
        : (
          <>
            <div style={{position: 'absolute', left: GX, top: GY, width: 5, height: GH * draw, background: C.lilac, borderRadius: 3}} />
            <div style={{position: 'absolute', left: GX, top: GY + GH, width: GW * draw, height: 5, background: C.lilac, borderRadius: 3}} />
            <div style={{position: 'absolute', left: GX + GW / 2, top: GY, width: 2, height: GH, background: 'rgba(185,180,255,0.25)'}} />
            <div style={{position: 'absolute', left: GX, top: GY + GH / 2, width: GW, height: 2, background: 'rgba(185,180,255,0.25)'}} />
            <div style={{position: 'absolute', left: GX + GW / 2 + 4, top: GY, width: GW / 2 - 4, height: GH / 2, background: `${C.orange}${f >= hot ? '22' : '00'}`, borderRadius: 20}} />
            <Label color={C.lilac} style={{position: 'absolute', left: GX, top: GY + GH + 20}}>{xLabel} →</Label>
            <Label color={C.lilac} style={{position: 'absolute', left: GX - 60, top: GY + GH, transformOrigin: 'left top', rotate: '-90deg'}}>{yLabel} →</Label>
          </>
        )}
      {items.map((it, i) => {
        const ap = it.appear ? cue(cues, it.appear, 10 + i * 6) : 10 + i * 6;
        const k = tween(f, [ap, ap + 14], [0, 1], SPRING);
        const r = it.reject ? tween(f, [rej + 8, rej + 26], [0, 1], EASE_IN_OUT) : 0;
        const lit = it.hot && f >= hot;
        const x = GX + it.x * GW;
        const y = GY + (1 - it.y) * GH;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 150,
              top: y - 60,
              width: 300,
              padding: '16px 18px',
              borderRadius: it.sticky ? 6 : 22,
              background: lit ? C.orange : it.sticky ? '#FFE58A' : C.cream,
              border: `3px solid ${it.reject && f >= rej ? C.red : 'transparent'}`,
              fontFamily: body,
              fontWeight: 700,
              fontSize: 28,
              lineHeight: 1.2,
              color: C.ink,
              boxShadow: lit ? `0 0 60px ${C.orange}` : '0 14px 30px rgba(0,0,0,0.35)',
              opacity: Math.min(1, k * 1.4) * (1 - r),
              scale: String((0.4 + 0.6 * k) * (lit ? tween(f, [hot, hot + 10], [1.15, 1.05], SPRING) : 1)),
              translate: `${r * 120}px ${(1 - k) * -200 + r * 260}px`,
              rotate: `${(i % 2 ? 3 : -3) + r * 40}deg`,
              zIndex: lit ? 5 : 1,
            }}
          >
            {it.text}
            {it.reject ? (
              <div style={{position: 'absolute', right: -14, top: -14, width: 54, height: 54, borderRadius: 27, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: String(tween(f, [rej, rej + 8], [0, 1], SPRING))}}>
                <Icon name="x" size={32} color="white" stroke={6} />
              </div>
            ) : null}
          </div>
        );
      })}
      {note ? (
        <div
          style={{
            position: 'absolute',
            left: GX + note.x * GW - 200,
            top: GY + (1 - note.y) * GH + 70,
            width: 400,
            padding: '18px 22px',
            borderRadius: 8,
            background: C.red,
            color: 'white',
            fontFamily: body,
            fontWeight: 800,
            fontSize: 28,
            lineHeight: 1.22,
            rotate: '-4deg',
            zIndex: 6,
            scale: String(tween(f, [nt, nt + 12], [0, 1], SPRING)),
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{fontFamily: mono, fontSize: 18, letterSpacing: 2, marginBottom: 6}}>WHY THIS COULD FAIL</div>
          {note.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Journey curve(s) across stages. Each line draws at cue "s<i>"; optional drop callout at cue "drop". */
export const Curve: React.FC<
  SceneProps & {stages: string[]; lines: {label: string; values: number[]; color?: string}[]; drop?: {index: number; label: string}}
> = ({cues, accent, stages, lines, drop}) => {
  const f = useCurrentFrame();
  const X0 = 130;
  const W = 820;
  const Y0 = 420;
  const H = 640;
  const px = (i: number) => X0 + (i / (stages.length - 1)) * W;
  const py = (v: number) => Y0 + ((5 - v) / 4) * H;
  const dc = cue(cues, 'drop', 9999);
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.red} seed={stages.length} />
      <Label color={C.lilac} style={{position: 'absolute', left: 80, top: 320}}>HOW USERS FEEL · 1–5</Label>
      {[1, 2, 3, 4, 5].map((v) => (
        <div key={v} style={{position: 'absolute', left: X0, width: W, top: py(v), height: 2, background: 'rgba(185,180,255,0.15)'}} />
      ))}
      {stages.map((s, i) => (
        <div key={s} style={{position: 'absolute', left: px(i) - 90, width: 180, top: Y0 + H + 30, textAlign: 'center', fontFamily: mono, fontWeight: 700, fontSize: 22, color: drop && i === drop.index && f >= dc ? C.orange : C.lilac, opacity: tween(f, [i * 3, i * 3 + 8], [0, 1])}}>
          {s.toUpperCase()}
        </div>
      ))}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {lines.map((ln, li) => {
          const s = cue(cues, `s${li}`, 6 + li * 30);
          const p = tween(f, [s, s + 24], [0, 1]);
          const d = ln.values.map((v, i) => `${i ? 'L' : 'M'}${px(i)} ${py(v)}`).join(' ');
          const col = ln.color ?? (li === 0 ? C.lilac : C.orange);
          return (
            <g key={li}>
              <path d={d} fill="none" stroke={col} strokeWidth={li === lines.length - 1 ? 10 : 6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={li === 0 && lines.length > 1 ? '0.02 0.015' : 1} strokeDashoffset={li === 0 && lines.length > 1 ? 0 : 1 - p} opacity={li === 0 && lines.length > 1 ? p : 1} />
              {ln.values.map((v, i) => (
                <circle key={i} cx={px(i)} cy={py(v)} r={14} fill={col} opacity={p >= i / (ln.values.length - 1) ? 1 : 0} />
              ))}
            </g>
          );
        })}
      </svg>
      {lines.map((ln, li) => {
        const s = cue(cues, `s${li}`, 6 + li * 30);
        return (
          <div key={li} style={{position: 'absolute', right: 80, top: 330 + li * 44, display: 'flex', alignItems: 'center', gap: 12, opacity: tween(f, [s, s + 8], [0, 1])}}>
            <div style={{width: 30, height: 8, borderRadius: 4, background: ln.color ?? (li === 0 ? C.lilac : C.orange)}} />
            <div style={{fontFamily: body, fontWeight: 700, fontSize: 26, color: C.cream}}>{ln.label}</div>
          </div>
        );
      })}
      {drop ? (
        <div
          style={{
            position: 'absolute',
            left: Math.min(px(drop.index) - 170, 1080 - 80 - 340),
            top: py(lines[lines.length - 1].values[drop.index]) + 40,
            width: 340,
            padding: '16px 22px',
            borderRadius: 22,
            background: C.orange,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 34,
            color: C.ink,
            textAlign: 'center',
            scale: String(tween(f, [dc, dc + 12], [0, 1], SPRING)),
          }}
        >
          {drop.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Horizontal-to-vertical timeline of steps, each at cue "s<i>"; optional end card at cue "end". */
export const Timeline: React.FC<SceneProps & {steps: {label: string; sub: string; icon: keyof typeof ICONS}[]; end?: {text: string; icon: keyof typeof ICONS}}> = ({cues, accent, steps, end}) => {
  const f = useCurrentFrame();
  const ec = cue(cues, 'end', 9999);
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.orange} seed={steps.length + 20} />
      <div style={{position: 'absolute', left: 150, top: 360, width: 6, height: 230 * steps.length - 120, background: 'rgba(185,180,255,0.2)', borderRadius: 3}} />
      {steps.map((s, i) => {
        const at = cue(cues, `s${i}`, 4 + i * 20);
        const k = tween(f, [at, at + 14], [0, 1], SPRING);
        return (
          <div key={i} style={{position: 'absolute', left: 90, right: 80, top: 330 + i * 230, display: 'flex', gap: 34, alignItems: 'center', opacity: Math.min(1, k * 1.5), translate: `${(1 - k) * 80}px 0px`}}>
            <div style={{width: 126, height: 126, flexShrink: 0, borderRadius: 63, background: f >= at ? accent : C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${accent}66`}}>
              <Icon name={s.icon} size={66} color={C.ink} stroke={3.4} draw={tween(f, [at + 4, at + 18], [0, 1])} />
            </div>
            <div>
              <Label color={accent}>{s.label}</Label>
              <div style={{fontFamily: display, fontWeight: 700, fontSize: 50, color: C.cream, lineHeight: 1.1, marginTop: 6}}>{s.sub}</div>
            </div>
          </div>
        );
      })}
      {end ? (
        <div style={{position: 'absolute', left: 80, right: 80, top: 330 + steps.length * 230 - 20, display: 'flex', alignItems: 'center', gap: 22, padding: '24px 30px', borderRadius: 30, background: 'rgba(62,224,161,0.15)', border: `3px solid ${C.mint}`, scale: String(tween(f, [ec, ec + 12], [0, 1], SPRING))}}>
          <Icon name={end.icon} size={64} color={C.mint} stroke={4} />
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 44, color: C.cream}}>{end.text}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Five stages in a line bend into a loop at cue "bend"; arrow Test→Define + note at cue "back". */
export const Loop: React.FC<SceneProps & {stages: string[]; note: string}> = ({cues, accent, stages, note}) => {
  const f = useCurrentFrame();
  const bend = tween(f, [cue(cues, 'bend', 30), cue(cues, 'bend', 30) + 24], [0, 1], EASE_IN_OUT);
  const back = cue(cues, 'back', 9999);
  const cx = 540;
  const cy = 780;
  const R = 330;
  // Bend a straight line into a circle: the line is an arc whose curvature grows with `bend`.
  const pos = (i: number) => {
    const n = stages.length - 1;
    const L = 800 + (2 * Math.PI * R * (n / stages.length) - 800) * bend;
    const theta = Math.max(1e-4, bend * 2 * Math.PI * (n / stages.length));
    const r = L / theta;
    const topY = cy - R * bend - 0;
    const ccy = topY + r;
    const phi = -theta / 2 + (i / n) * theta;
    return [cx + r * Math.sin(phi), ccy - r * Math.cos(phi) + (bend > 0 ? 0 : 0)] as const;
  };
  const arrowP = tween(f, [back, back + 18], [0, 1]);
  const [x4, y4] = pos(4);
  const [x1, y1] = pos(1);
  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.mint} seed={5} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.lilac} strokeWidth={4} strokeDasharray="10 14" opacity={bend * 0.6} />
        <path d={`M${x4} ${y4} Q ${cx} ${cy} ${x1} ${y1}`} fill="none" stroke={C.orange} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arrowP} />
      </svg>
      {stages.map((s, i) => {
        const [x, y] = pos(i);
        const hi = (i === 4 || i === 1) && f >= back;
        return (
          <div
            key={s}
            style={{
              position: 'absolute',
              left: x - 80,
              top: y - 80,
              width: 160,
              height: 160,
              borderRadius: 80,
              background: hi ? C.orange : C.cream,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: display,
              fontWeight: 700,
              fontSize: 27,
              color: C.ink,
              opacity: tween(f, [i * 4, i * 4 + 8], [0, 1]),
              scale: String(tween(f, [i * 4, i * 4 + 12], [0.4, 1], SPRING) * (bend > 0 ? 1 : 1) * (1 - 0.0)),
              boxShadow: hi ? `0 0 60px ${C.orange}` : '0 14px 30px rgba(0,0,0,0.35)',
            }}
          >
            {s}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 1200,
          padding: '24px 30px',
          borderRadius: 26,
          background: 'rgba(14,12,43,0.85)',
          border: `3px solid ${C.orange}`,
          fontFamily: body,
          fontWeight: 700,
          fontSize: 36,
          lineHeight: 1.25,
          color: C.cream,
          opacity: tween(f, [back + 12, back + 20], [0, 1]),
          translate: `0px ${tween(f, [back + 12, back + 24], [40, 0], SPRING)}px`,
        }}
      >
        <div style={{fontFamily: mono, fontSize: 22, letterSpacing: 3, color: C.orange, marginBottom: 8}}>NEW PROBLEM STATEMENT</div>
        {note}
      </div>
    </AbsoluteFill>
  );
};
