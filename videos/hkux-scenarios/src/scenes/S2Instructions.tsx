import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Icon} from '../components/Icons';
import {Label} from '../components/ui';
import {C, SPRING, display, mono, s, tween} from '../theme';

// 2.75s – 5.0s  “That’s not a usability task. That’s instructions.”
export const S2Instructions: React.FC = () => {
  const f = useCurrentFrame();
  const stamp = s(4.85 - 2.75);
  const steps = ['TAP  cart', 'READ  total', 'DONE'];
  return (
    <AbsoluteFill>
      <Backdrop glowA={C.red} glowB={C.violet} seed={2} />
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 360}}>
        <div style={{position: 'relative', width: 230, height: 230}}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `${C.red}22`,
              border: `4px solid ${C.red}`,
              scale: String(tween(f, [0, 14], [0, 1], SPRING)),
            }}
          />
          <Icon
            name="x"
            size={150}
            color={C.red}
            stroke={5}
            draw={tween(f, [6, 22], [0, 1])}
            style={{position: 'absolute', left: 40, top: 40}}
          />
        </div>
        <Label color={C.lilac} style={{marginTop: 50, opacity: tween(f, [6, 14], [0, 1])}}>
          THIS IS NOT
        </Label>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 104,
            color: C.cream,
            textAlign: 'center',
            lineHeight: 1,
            marginTop: 16,
            opacity: tween(f, [8, 18], [0, 1]),
            translate: `0px ${tween(f, [8, 18], [40, 0])}px`,
          }}
        >
          a usability
          <br />
          task.
        </div>

        {/* Robotic step list: what instructions really are */}
        <div style={{display: 'flex', gap: 18, marginTop: 70}}>
          {steps.map((st, i) => (
            <div
              key={st}
              style={{
                fontFamily: mono,
                fontSize: 28,
                fontWeight: 700,
                color: C.lilac,
                padding: '16px 22px',
                borderRadius: 14,
                border: `2px dashed ${C.muted}`,
                opacity: tween(f, [s(1.2) + i * 4, s(1.2) + i * 4 + 8], [0, 1]),
                translate: `${tween(f, [s(1.2) + i * 4, s(1.2) + i * 4 + 8], [-30, 0])}px 0px`,
              }}
            >
              {st}
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* Stamp slam */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 260}}>
        <div
          style={{
            fontFamily: mono,
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: 6,
            color: C.orange,
            padding: '18px 40px',
            border: `8px solid ${C.orange}`,
            borderRadius: 20,
            background: 'rgba(14,12,43,0.85)',
            rotate: '-9deg',
            scale: String(tween(f, [stamp, stamp + 8], [2.6, 1], SPRING)),
            opacity: tween(f, [stamp, stamp + 3], [0, 1]),
          }}
        >
          INSTRUCTIONS
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
