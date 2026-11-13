import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, display, mono, tween} from '../theme';

export const LogoMark: React.FC<{size?: number}> = ({size = 88}) => {
  const cell = size / 2 - 3;
  const tile = (bg: string, fg: string, txt: string, w: number) => (
    <div
      style={{
        width: w,
        height: cell,
        borderRadius: cell * 0.22,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: display,
        fontWeight: 700,
        fontSize: cell * 0.68,
      }}
    >
      {txt}
    </div>
  );
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 6, width: size}}>
      <div style={{display: 'flex', gap: 6}}>
        {tile(C.cream, C.ink, 'H', cell)}
        {tile(C.cream, C.ink, 'K', cell)}
      </div>
      {tile(C.orange, C.ink, 'UX', size)}
    </div>
  );
};

/** Persistent top bar: logo, series label and a progress track. Hidden on the outro. */
export const Header: React.FC<{hideAt: number}> = ({hideAt}) => {
  const frame = useCurrentFrame();
  const out = tween(frame, [hideAt, hideAt + 12], [1, 0]);
  return (
    <AbsoluteFill style={{opacity: tween(frame, [0, 10], [0, 1]) * out}}>
      <div
        style={{
          position: 'absolute',
          top: 110,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <LogoMark size={76} />
        <div style={{flex: 1}}>
          <div style={{fontFamily: mono, fontSize: 26, color: C.peach, letterSpacing: 4, fontWeight: 700}}>
            STAGE 5 · TEST · 1 OF 5
          </div>
          <div style={{fontFamily: display, fontSize: 44, color: C.cream, fontWeight: 700, marginTop: 4}}>
            Scenarios, not instructions
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 236,
          left: 80,
          right: 80,
          height: 8,
          borderRadius: 4,
          background: 'rgba(185,180,255,0.18)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${tween(frame, [0, hideAt], [0, 100], (x) => x)}%`,
            background: `linear-gradient(90deg, ${C.violet}, ${C.orange})`,
            borderRadius: 4,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
