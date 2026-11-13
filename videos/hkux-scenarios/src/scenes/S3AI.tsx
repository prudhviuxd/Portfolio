import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Icon} from '../components/Icons';
import {Label} from '../components/ui';
import {C, EASE_IN_OUT, SPRING, body, mono, s, tween} from '../theme';

const T0 = 5.0;
const at = (sec: number) => s(sec - T0);

const GOALS = ['find price', 'checkout', 'compare'];
const SCENARIOS = [
  {icon: 'plate' as const, title: 'Dinner tonight', tint: C.orange},
  {icon: 'bag' as const, title: 'Weekly shop', tint: C.mint},
  {icon: 'bolt' as const, title: 'Late snack', tint: C.violet},
];

// 5.0s – 10.0s  “I ask AI to turn my test goals into realistic scenarios.”
export const S3AI: React.FC = () => {
  const f = useCurrentFrame();
  const orbIn = tween(f, [at(6.3), at(6.8)], [0, 1], SPRING);
  const absorb = at(7.9);
  const emit = at(8.55);
  const pulse = 1 + Math.sin(f / 5) * 0.03 + tween(f, [absorb + 10, absorb + 16], [0, 0.12]) - tween(f, [emit, emit + 10], [0, 0.12]);

  return (
    <AbsoluteFill>
      <Backdrop glowA={C.violet} glowB={C.mint} seed={3} />

      {/* Goal chips */}
      <Label color={C.lilac} style={{position: 'absolute', top: 330, width: '100%', textAlign: 'center', opacity: tween(f, [at(7.2), at(7.4)], [0, 1]) * tween(f, [absorb, absorb + 8], [1, 0])}}>
        MY TEST GOALS
      </Label>
      {GOALS.map((g, i) => {
        const x0 = 150 + i * 280;
        const appear = at(7.2) + i * 4;
        const k = tween(f, [absorb + i * 3, absorb + i * 3 + 14], [0, 1], EASE_IN_OUT);
        return (
          <div
            key={g}
            style={{
              position: 'absolute',
              left: x0 + (540 - 120 - x0) * k,
              top: 390 + (760 - 390) * k,
              width: 240,
              textAlign: 'center',
              fontFamily: mono,
              fontWeight: 700,
              fontSize: 30,
              color: C.ink,
              background: C.lilac,
              padding: '18px 0',
              borderRadius: 40,
              opacity: tween(f, [appear, appear + 6], [0, 1]) * (1 - k),
              scale: String(tween(f, [appear, appear + 10], [0.5, 1], SPRING) * (1 - k * 0.7)),
            }}
          >
            {g}
          </div>
        );
      })}

      {/* AI orb */}
      <div
        style={{
          position: 'absolute',
          left: 540 - 170,
          top: 780 - 170,
          width: 340,
          height: 340,
          scale: String(orbIn * pulse),
        }}
      >
        {[0, 1, 2].map((r) => (
          <div
            key={r}
            style={{
              position: 'absolute',
              inset: -30 - r * 34,
              borderRadius: '50%',
              border: `3px ${r === 1 ? 'dashed' : 'solid'} ${r === 2 ? C.mint : C.violet}${r === 0 ? 'aa' : '55'}`,
              rotate: `${(f * (r % 2 ? -1.6 : 1.1)) % 360}deg`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${C.lilac}, ${C.violet} 45%, ${C.indigo} 100%)`,
            boxShadow: `0 0 120px ${C.violet}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sparkle" size={170} color="white" stroke={3} fill="rgba(255,255,255,0.2)" draw={tween(f, [at(6.4), at(7.0)], [0, 1])} />
        </div>
      </div>

      {/* Scenario cards fan out */}
      {SCENARIOS.map((sc, i) => {
        const st = emit + i * 4;
        const k = tween(f, [st, st + 16], [0, 1], SPRING);
        const tx = (i - 1) * 300 * k;
        const ty = 780 + (1180 - 780) * k + Math.abs(i - 1) * -30 * k;
        return (
          <div
            key={sc.title}
            style={{
              position: 'absolute',
              left: 540 - 135 + tx,
              top: ty - 130,
              width: 270,
              height: 270,
              borderRadius: 34,
              background: C.cream,
              border: `4px solid ${sc.tint}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              rotate: `${(i - 1) * 7 * k}deg`,
              opacity: tween(f, [st, st + 4], [0, 1]),
              scale: String(0.3 + 0.7 * k),
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            }}
          >
            <Icon name={sc.icon} size={96} color={C.ink} stroke={3} draw={tween(f, [st + 6, st + 22], [0, 1])} />
            <div style={{fontFamily: body, fontWeight: 800, fontSize: 32, color: C.ink}}>{sc.title}</div>
          </div>
        );
      })}
      <Label
        color={C.mint}
        style={{position: 'absolute', top: 1360, width: '100%', textAlign: 'center', opacity: tween(f, [emit + 14, emit + 22], [0, 1])}}
      >
        REALISTIC SCENARIOS
      </Label>
    </AbsoluteFill>
  );
};
