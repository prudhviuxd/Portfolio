import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Icon} from '../components/Icons';
import {C, SPRING, body, display, serif, tween} from '../theme';

// 35.5s – 38.4s  Brand outro: tiles assemble, wordmark types on.
export const S10Outro: React.FC = () => {
  const f = useCurrentFrame();
  const tile = (txt: string, bg: string, w: number, delay: number, from: [number, number]) => {
    const k = tween(f, [delay, delay + 16], [0, 1], SPRING);
    return (
      <div
        style={{
          width: w,
          height: 120,
          borderRadius: 28,
          background: bg,
          color: C.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: display,
          fontWeight: 700,
          fontSize: 82,
          translate: `${from[0] * (1 - k)}px ${from[1] * (1 - k)}px`,
          rotate: `${(1 - k) * 40}deg`,
          opacity: tween(f, [delay, delay + 4], [0, 1]),
        }}
      >
        {txt}
      </div>
    );
  };
  const word = 'He Knows UX';
  const shown = Math.floor(tween(f, [14, 34], [0, word.length], (x) => x));
  return (
    <AbsoluteFill>
      <Backdrop glowA={C.violet} glowB={C.orange} seed={10} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 120}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, width: 264}}>
          <div style={{display: 'flex', gap: 12}}>
            {tile('H', C.cream, 126, 0, [-500, -300])}
            {tile('K', C.cream, 126, 4, [500, -300])}
          </div>
          {tile('UX', C.orange, 264, 8, [0, 500])}
        </div>
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 108, color: C.cream, marginTop: 56, letterSpacing: -2, height: 120}}>
          {word.slice(0, shown)}
        </div>
        <div
          style={{
            fontFamily: body,
            fontWeight: 500,
            fontSize: 48,
            color: C.lilac,
            marginTop: 10,
            opacity: tween(f, [34, 44], [0, 1]),
            translate: `0px ${tween(f, [34, 46], [20, 0])}px`,
          }}
        >
          Design is <span style={{fontFamily: serif, fontStyle: 'italic', color: C.orange}}>how it works.</span>
        </div>
        <div
          style={{
            marginTop: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '26px 60px',
            borderRadius: 999,
            background: C.orange,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 50,
            color: C.ink,
            scale: String(tween(f, [46, 60], [0, 1], SPRING)),
          }}
        >
          <Icon name="bell" size={52} color={C.ink} stroke={3.6} />
          Subscribe
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
