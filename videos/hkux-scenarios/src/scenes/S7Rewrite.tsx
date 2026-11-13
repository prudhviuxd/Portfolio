import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Icon} from '../components/Icons';
import {Label} from '../components/ui';
import {C, SPRING, body, display, s, tween} from '../theme';

const T0 = 25.5;
const at = (sec: number) => s(sec - T0);

const NEW_TEXT = 'See what you’ve picked so far.';

// 25.5s – 31.5s  “If the button says Cart and the task says Cart, you’ve given them the answer. Rewrite it in everyday words.”
export const S7Rewrite: React.FC = () => {
  const f = useCurrentFrame();
  const link = tween(f, [at(27.5), at(28.1)], [0, 1]);
  const alarm = at(28.0);
  const rewrite = at(29.7);
  const strike = tween(f, [rewrite, rewrite + 8], [0, 1]);
  const typed = Math.floor(tween(f, [rewrite + 8, at(31.0)], [0, NEW_TEXT.length], (x) => x));
  const good = at(30.3);
  const shake = f > alarm && f < alarm + 14 ? Math.sin(f * 2.4) * 10 * (1 - (f - alarm) / 14) : 0;

  return (
    <AbsoluteFill>
      <Backdrop glowA={C.orange} glowB={C.violet} seed={7} />

      {/* UI button */}
      <div style={{position: 'absolute', top: 320, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Label color={C.lilac}>BUTTON SAYS</Label>
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: C.orange,
            borderRadius: 999,
            padding: '26px 64px',
            fontFamily: display,
            fontWeight: 700,
            fontSize: 64,
            color: C.ink,
            scale: String(tween(f, [at(25.7), at(26.3)], [0, 1], SPRING)),
            boxShadow: `0 0 0 ${link * 14}px ${C.red}55`,
          }}
        >
          <Icon name="cart" size={64} color={C.ink} stroke={3.6} draw={tween(f, [at(25.8), at(26.4)], [0, 1])} />
          Cart
        </div>
      </div>

      {/* Connector */}
      <svg style={{position: 'absolute', left: 0, top: 0}} width={1080} height={1920}>
        <path
          d="M540 560 C 540 650, 680 650, 680 800"
          stroke={C.red}
          strokeWidth={8}
          strokeDasharray="1"
          pathLength={1}
          strokeDashoffset={1 - link}
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {/* Task card */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          top: 810,
          padding: '38px 44px',
          borderRadius: 34,
          background: C.cream,
          translate: `${shake}px 0px`,
          opacity: tween(f, [at(26.8), at(27.1)], [0, 1]),
          scale: String(tween(f, [at(26.8), at(27.2)], [0.85, 1], SPRING)),
          outline: `${f >= good ? 6 : 0}px solid ${C.mint}`,
        }}
      >
        <Label color={C.indigo} style={{fontSize: 22}}>TASK SAYS</Label>
        <div style={{position: 'relative', fontFamily: body, fontWeight: 700, fontSize: 48, color: C.ink, marginTop: 12, display: 'inline-block', opacity: 1 - strike * 0.55}}>
          Open your{' '}
          <span style={{background: f >= at(27.5) ? `${C.red}55` : 'transparent', borderRadius: 8, padding: '0 6px'}}>cart</span>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '54%',
              height: 6,
              borderRadius: 3,
              background: C.red,
              width: `${strike * 100}%`,
            }}
          />
        </div>
        <div style={{fontFamily: body, fontWeight: 800, fontSize: 52, color: C.indigo, marginTop: 14, minHeight: 64}}>
          {NEW_TEXT.slice(0, typed)}
        </div>
      </div>

      {/* Warning pill */}
      <div
        style={{
          position: 'absolute',
          top: 1170,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{position: 'relative', width: 700, height: 110}}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              borderRadius: 999,
              background: C.red,
              fontFamily: display,
              fontWeight: 700,
              fontSize: 44,
              color: 'white',
              scale: String(tween(f, [alarm, alarm + 10], [0, 1], SPRING) * tween(f, [good - 4, good + 4], [1, 0])),
            }}
          >
            <Icon name="alert" size={52} color="white" stroke={3.6} />
            Gives the answer away
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              borderRadius: 999,
              background: C.mint,
              fontFamily: display,
              fontWeight: 700,
              fontSize: 44,
              color: C.ink,
              scale: String(tween(f, [good, good + 12], [0, 1], SPRING)),
            }}
          >
            <Icon name="check" size={52} color={C.ink} stroke={5} draw={tween(f, [good + 4, good + 14], [0, 1])} />
            Everyday words
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
