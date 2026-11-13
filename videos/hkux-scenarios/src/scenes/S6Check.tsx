import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Icon} from '../components/Icons';
import {Label} from '../components/ui';
import {C, EASE_IN_OUT, SPRING, body, display, s, tween} from '../theme';

const T0 = 21.7;
const at = (sec: number) => s(sec - T0);

// 21.7s – 25.5s  “Then I check one thing: does the task use the words on the screen?”
export const S6Check: React.FC = () => {
  const f = useCurrentFrame();
  // Magnifier sweeps: task card -> screen -> back
  const sweep = tween(f, [at(23.1), at(24.9)], [0, 1], EASE_IN_OUT);
  const mx = 300 + Math.sin(sweep * Math.PI * 2) * 160 + sweep * 330;
  const my = 760 + sweep * 330;
  const one = at(22.5);

  return (
    <AbsoluteFill>
      <Backdrop glowA={C.violet} glowB={C.peach} seed={6} />
      <div style={{position: 'absolute', top: 320, width: '100%', textAlign: 'center'}}>
        <Label color={C.lilac} style={{opacity: tween(f, [at(22.1), at(22.4)], [0, 1])}}>THE ONE CHECK</Label>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 96,
            color: C.cream,
            marginTop: 12,
            opacity: tween(f, [one, one + 8], [0, 1]),
            scale: String(tween(f, [one, one + 12], [0.7, 1], SPRING)),
          }}
        >
          Same <span style={{color: C.orange}}>words</span>?
        </div>
      </div>

      {/* Task card */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 640,
          width: 560,
          padding: 34,
          borderRadius: 30,
          background: C.cream,
          rotate: '-4deg',
          opacity: tween(f, [at(23.0), at(23.3)], [0, 1]),
          translate: `${tween(f, [at(23.0), at(23.4)], [-200, 0], SPRING)}px 0px`,
        }}
      >
        <Label color={C.indigo} style={{fontSize: 22}}>TASK</Label>
        <div style={{fontFamily: body, fontWeight: 700, fontSize: 38, color: C.ink, marginTop: 10, lineHeight: 1.25}}>
          Open your <span style={{background: `${C.orange}66`, borderRadius: 8, padding: '0 6px'}}>cart</span> and check the total.
        </div>
      </div>

      {/* Phone screen */}
      <div
        style={{
          position: 'absolute',
          right: 100,
          top: 900,
          width: 400,
          height: 470,
          borderRadius: 44,
          border: `10px solid ${C.lilac}`,
          background: C.ink,
          padding: 30,
          rotate: '5deg',
          opacity: tween(f, [at(24.2), at(24.5)], [0, 1]),
          translate: `${tween(f, [at(24.2), at(24.6)], [220, 0], SPRING)}px 0px`,
        }}
      >
        <Label color={C.muted} style={{fontSize: 20}}>SCREEN</Label>
        {[0, 1].map((i) => (
          <div key={i} style={{height: 70, borderRadius: 16, background: 'rgba(185,180,255,0.15)', marginTop: 20}} />
        ))}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            background: C.orange,
            borderRadius: 24,
            padding: '20px 0',
            fontFamily: display,
            fontWeight: 700,
            fontSize: 40,
            color: C.ink,
          }}
        >
          <Icon name="cart" size={44} color={C.ink} stroke={3.6} />
          Cart
        </div>
      </div>

      {/* Magnifier */}
      <div
        style={{
          position: 'absolute',
          left: mx,
          top: my,
          opacity: tween(f, [at(23.1), at(23.3)], [0, 1]),
        }}
      >
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            boxShadow: `inset 0 0 0 10px ${C.cream}, 0 20px 40px rgba(0,0,0,0.4)`,
            backdropFilter: 'blur(0px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 160,
            top: 160,
            width: 26,
            height: 110,
            borderRadius: 13,
            background: C.cream,
            rotate: '-45deg',
            transformOrigin: 'top center',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
