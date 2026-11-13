import React from 'react';

/**
 * Line icons drawn on a 48x48 grid. `draw` (0..1) animates the stroke on,
 * so every icon can "sketch itself" into the frame.
 */
export const ICONS: Record<string, string[]> = {
  cart: [
    'M5 8h5l4.5 22h20l4.5-15H13',
    'M18 38a2.5 2.5 0 1 0 0.01 0',
    'M32 38a2.5 2.5 0 1 0 0.01 0',
  ],
  sparkle: [
    'M24 5c1.5 9 4.5 12 14 14-9.5 2-12.5 5-14 14-1.5-9-4.5-12-14-14 9.5-2 12.5-5 14-14z',
    'M39 31c.6 3 1.6 4 5 4.6-3.4.6-4.4 1.6-5 4.6-.6-3-1.6-4-5-4.6 3.4-.6 4.4-1.6 5-4.6z',
  ],
  target: [
    'M24 6a18 18 0 1 0 0.01 0',
    'M24 14a10 10 0 1 0 0.01 0',
    'M24 21a3 3 0 1 0 0.01 0',
    'M24 24L40 8M34 8h6v6',
  ],
  tag: ['M6 24V8h16l20 20-14 14z', 'M14 16a2.5 2.5 0 1 0 0.01 0'],
  receipt: [
    'M10 5h28v38l-5-3-4.5 3-4.5-3-4.5 3-4.5-3-5 3z',
    'M16 14h16M16 21h16M16 28h9',
  ],
  bag: ['M9 16h30l-3 26H12z', 'M17 16v-3a7 7 0 0 1 14 0v3'],
  plate: [
    'M24 10a14 14 0 1 0 0.01 0',
    'M24 17a7 7 0 1 0 0.01 0',
    'M4 8v12M2 8v7a2 2 0 0 0 4 0V8M4 20v20',
    'M44 8c-3 2-4 7-4 12h4v20',
  ],
  wallet: ['M6 14h34v26H6z', 'M6 14l26-7v7', 'M30 25h10v8H30z'],
  list: ['M18 12h22M18 24h22M18 36h22', 'M6 12l3 3 5-6M6 24l3 3 5-6M6 36l3 3 5-6'],
  search: ['M21 7a14 14 0 1 0 0.01 0', 'M31 31l11 11'],
  link: [
    'M20 28l8-8',
    'M22 14l4-4a8.5 8.5 0 0 1 12 12l-4 4',
    'M26 34l-4 4a8.5 8.5 0 0 1-12-12l4-4',
  ],
  alert: ['M24 5L44 41H4z', 'M24 18v11', 'M24 34.5v.5'],
  chat: ['M6 8h36v24H20l-9 8v-8H6z', 'M14 17h20M14 24h12'],
  bell: ['M12 34V21a12 12 0 0 1 24 0v13l4 4H8z', 'M20 42a4 4 0 0 0 8 0'],
  check: ['M10 25l9 9 19-20'],
  x: ['M12 12l24 24M36 12L12 36'],
  bolt: ['M27 4L9 27h14l-3 17 19-24H25z'],
  robot: [
    'M10 16h28v24H10z',
    'M24 16V9',
    'M24 6a3 3 0 1 0 0.01 0',
    'M18 26a2 2 0 1 0 0.01 0M30 26a2 2 0 1 0 0.01 0',
    'M18 34h12',
  ],
};

export const Icon: React.FC<{
  name: keyof typeof ICONS;
  size?: number;
  color?: string;
  stroke?: number;
  draw?: number;
  fill?: string;
  style?: React.CSSProperties;
}> = ({name, size = 64, color = 'white', stroke = 3, draw = 1, fill = 'none', style}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{overflow: 'visible', ...style}}>
    {ICONS[name].map((d, i) => (
      <path
        key={i}
        d={d}
        fill={i === 0 ? fill : 'none'}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - Math.max(0, Math.min(1, draw * ICONS[name].length - i))}
      />
    ))}
  </svg>
);

/** Filled pointer cursor. */
export const Cursor: React.FC<{size?: number; style?: React.CSSProperties}> = ({size = 72, style}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={style}>
    <path
      d="M8 4l30 18-13 3 8 15-6 3-8-15-11 9z"
      fill="white"
      stroke="#0E0C2B"
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
  </svg>
);
