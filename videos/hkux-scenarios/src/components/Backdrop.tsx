import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from '../theme';

/** Opaque per-scene backdrop: deep indigo with two drifting glow orbs and a dot grid. */
export const Backdrop: React.FC<{glowA?: string; glowB?: string; seed?: number}> = ({
  glowA = C.violet,
  glowB = C.orange,
  seed = 0,
}) => {
  const f = useCurrentFrame() + seed * 37;
  const ax = 300 + Math.sin(f / 70) * 160;
  const ay = 620 + Math.cos(f / 90) * 140;
  const bx = 800 + Math.cos(f / 80) * 140;
  const by = 1250 + Math.sin(f / 60) * 120;
  return (
    <AbsoluteFill style={{backgroundColor: C.ink, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${ax}px ${ay}px, ${glowA}55 0px, transparent 620px), radial-gradient(circle at ${bx}px ${by}px, ${glowB}33 0px, transparent 560px), linear-gradient(180deg, ${C.night} 0%, ${C.ink} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${C.lilac}22 2px, transparent 2.5px)`,
          backgroundSize: '54px 54px',
          backgroundPosition: `${(f * 0.4) % 54}px ${(f * 0.25) % 54}px`,
          maskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
        }}
      />
    </AbsoluteFill>
  );
};
