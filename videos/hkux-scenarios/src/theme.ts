import {Easing, interpolate} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Variable font files bundled in public/fonts so rendering never depends on the network.
const font = (family: string, file: string, weight: string, style = 'normal') => {
  loadFont({family, url: staticFile(`fonts/${file}`), weight, style, format: 'woff2'});
  return family;
};

export const display = font('Space Grotesk', 'SpaceGrotesk.woff2', '300 700');
export const body = font('Inter', 'Inter.woff2', '100 900');
export const mono = font('JetBrains Mono', 'JetBrainsMono.woff2', '100 800');
export const serif = font('Fraunces', 'Fraunces-Italic.woff2', '100 900', 'italic');

export const C = {
  ink: '#0E0C2B',
  night: '#16134A',
  indigo: '#2A2580',
  violet: '#7B74FF',
  lilac: '#B9B4FF',
  orange: '#FF7A3D',
  peach: '#FFB48A',
  mint: '#3EE0A1',
  red: '#FF4D6D',
  cream: '#F6F4FF',
  paper: '#FFFFFF',
  muted: '#8E89C9',
};

export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const SPRING = Easing.spring({damping: 14, mass: 0.8});
export const SOFT = Easing.spring({damping: 200});

/** Clamped interpolate helper with ease-out default. */
export const tween = (
  frame: number,
  range: [number, number],
  out: [number, number],
  easing: (t: number) => number = EASE_OUT,
) =>
  interpolate(frame, range, out, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });
