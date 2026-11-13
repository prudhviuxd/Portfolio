import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Cursor, Icon} from '../components/Icons';
import {Burst} from '../components/ui';
import {C, EASE_IN_OUT, SPRING, display, s, tween} from '../theme';

const T0 = 34.0;
const at = (sec: number) => s(sec - T0);

// 34.0s – 35.5s  “Follow for the next step.”
export const S9Follow: React.FC = () => {
  const f = useCurrentFrame();
  const click = at(34.6);
  const done = f >= click;
  const press = f > click - 2 && f < click + 3 ? 0.92 : 1;
  const bell = done ? Math.sin((f - click) / 1.6) * 22 * tween(f, [click, click + 24], [1, 0]) : 0;
  const confetti = Array.from({length: 14}, (_, i) => i);

  return (
    <AbsoluteFill>
      <Backdrop glowA={C.orange} glowB={C.violet} seed={9} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 300}}>
        <div style={{rotate: `${bell}deg`, transformOrigin: 'top center', marginBottom: 60, scale: String(tween(f, [0, 10], [0, 1], SPRING))}}>
          <Icon name="bell" size={170} color={done ? C.orange : C.lilac} stroke={3} fill={done ? `${C.orange}33` : 'none'} />
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
        <div style={{position: 'absolute', left: 540, top: 930}}>
          <Burst p={tween(f, [click, click + 16], [0, 1], (x) => x)} color={C.mint} size={360} />
          {confetti.map((i) => {
            const ang = (i / confetti.length) * Math.PI * 2;
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
      <Cursor
        size={84}
        style={{
          position: 'absolute',
          left: tween(f, [0, click - 3], [900, 640], EASE_IN_OUT),
          top: tween(f, [0, click - 3], [1350, 930], EASE_IN_OUT),
          scale: String(press),
        }}
      />
    </AbsoluteFill>
  );
};
