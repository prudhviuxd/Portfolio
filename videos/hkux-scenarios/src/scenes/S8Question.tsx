import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Icon} from '../components/Icons';
import {Label} from '../components/ui';
import {C, SPRING, body, display, s, tween} from '../theme';

const T0 = 31.5;
const at = (sec: number) => s(sec - T0);
const DRAFT = '“Click Next to continue…”';

// 31.5s – 34.0s  “What’s a bad usability task you’ve seen?”
export const S8Question: React.FC = () => {
  const f = useCurrentFrame();
  const typed = Math.floor(tween(f, [at(32.6), at(33.8)], [0, DRAFT.length], (x) => x));
  const bubbles = [
    {x: 120, y: 1240, d: 0, c: C.violet},
    {x: 820, y: 1180, d: 6, c: C.orange},
    {x: 700, y: 1330, d: 12, c: C.mint},
  ];
  return (
    <AbsoluteFill>
      <Backdrop glowA={C.violet} glowB={C.orange} seed={8} />
      {bubbles.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y - tween(f, [b.d, b.d + 70], [0, 260], (x) => x),
            opacity: tween(f, [b.d, b.d + 8], [0, 0.9]) * tween(f, [b.d + 50, b.d + 70], [1, 0]),
            rotate: `${(i - 1) * 12}deg`,
          }}
        >
          <Icon name="chat" size={110} color={b.c} stroke={3} fill={`${b.c}33`} />
        </div>
      ))}
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 400}}>
        <Label color={C.lilac} style={{opacity: tween(f, [0, 8], [0, 1])}}>YOUR TURN</Label>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 112,
            lineHeight: 1.02,
            textAlign: 'center',
            color: C.cream,
            marginTop: 20,
            letterSpacing: -2,
          }}
        >
          {['What’s a bad', 'usability task', 'you’ve seen?'].map((line, i) => {
            const st = [0, at(32.2), at(33.0)][i];
            return (
              <div
                key={line}
                style={{
                  color: i === 1 ? C.orange : C.cream,
                  opacity: tween(f, [st, st + 6], [0, 1]),
                  translate: `0px ${tween(f, [st, st + 12], [60, 0], SPRING)}px`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 70,
            width: 860,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '24px 30px',
            borderRadius: 999,
            border: `3px solid ${C.violet}`,
            background: 'rgba(14,12,43,0.7)',
            opacity: tween(f, [at(32.4), at(32.7)], [0, 1]),
            translate: `0px ${tween(f, [at(32.4), at(32.8)], [40, 0], SPRING)}px`,
          }}
        >
          <div style={{width: 64, height: 64, borderRadius: 32, background: `linear-gradient(135deg, ${C.violet}, ${C.orange})`}} />
          <div style={{flex: 1, fontFamily: body, fontWeight: 600, fontSize: 38, color: C.cream}}>
            {typed ? DRAFT.slice(0, typed) : <span style={{color: C.muted}}>Add a comment…</span>}
          </div>
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 32, color: C.orange}}>Post</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
