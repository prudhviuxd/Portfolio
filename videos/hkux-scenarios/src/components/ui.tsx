import React from 'react';
import {C, mono} from '../theme';

export const Label: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({
  children,
  color = C.peach,
  style,
}) => (
  <div style={{fontFamily: mono, fontWeight: 700, fontSize: 26, letterSpacing: 4, color, ...style}}>{children}</div>
);

export const Glass: React.FC<{children: React.ReactNode; style?: React.CSSProperties; border?: string}> = ({
  children,
  style,
  border = 'rgba(185,180,255,0.28)',
}) => (
  <div
    style={{
      background: 'linear-gradient(160deg, rgba(123,116,255,0.20), rgba(22,19,74,0.75))',
      border: `2px solid ${border}`,
      borderRadius: 36,
      boxShadow: '0 30px 80px rgba(5,4,25,0.55)',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Ring burst used for clicks and pops. p goes 0..1 */
export const Burst: React.FC<{p: number; color?: string; size?: number; style?: React.CSSProperties}> = ({
  p,
  color = C.orange,
  size = 200,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      width: size,
      height: size,
      marginLeft: -size / 2,
      marginTop: -size / 2,
      borderRadius: '50%',
      border: `${Math.max(0, 10 * (1 - p))}px solid ${color}`,
      scale: String(0.2 + p),
      opacity: p <= 0 || p >= 1 ? 0 : 1 - p,
      ...style,
    }}
  />
);
