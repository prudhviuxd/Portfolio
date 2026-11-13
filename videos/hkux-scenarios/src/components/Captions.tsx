import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CHUNKS} from '../captions';
import {C, FPS, body, tween} from '../theme';

const END_HOLD = 35.5;

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const idx = CHUNKS.findIndex((c, i) => {
    const start = c[0].at;
    const next = CHUNKS[i + 1]?.[0].at ?? END_HOLD;
    return t >= start && t < next;
  });
  if (idx === -1) return null;
  const chunk = CHUNKS[idx];
  const startF = chunk[0].at * FPS;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 250}}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 18px',
          maxWidth: 900,
          fontFamily: body,
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 1.15,
          letterSpacing: -1,
          translate: `0px ${tween(frame, [startF, startF + 8], [24, 0])}px`,
          opacity: tween(frame, [startF, startF + 5], [0, 1]),
        }}
      >
        {chunk.map((w, i) => {
          const wf = w.at * FPS;
          const nextAt = (chunk[i + 1]?.at ?? CHUNKS[idx + 1]?.[0].at ?? END_HOLD) * FPS;
          const spoken = frame >= wf;
          const active = spoken && frame < nextAt;
          const pop = tween(frame, [wf, wf + 6], [1.12, 1]);
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                display: 'inline-block',
                color: spoken ? (w.hot ? C.orange : C.cream) : 'rgba(246,244,255,0.28)',
                scale: spoken ? String(pop) : '1',
                textShadow: '0 6px 30px rgba(10,8,40,0.8)',
              }}
            >
              {w.t}
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -6,
                  height: 7,
                  borderRadius: 4,
                  background: w.hot ? C.orange : C.violet,
                  transformOrigin: 'left',
                  scale: `${active ? tween(frame, [wf, wf + 6], [0, 1]) : 0} 1`,
                }}
              />
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
