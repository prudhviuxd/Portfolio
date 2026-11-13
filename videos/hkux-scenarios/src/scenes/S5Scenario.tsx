import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Cursor, Icon, ICONS} from '../components/Icons';
import {Glass, Label} from '../components/ui';
import {C, EASE_IN_OUT, SPRING, body, display, s, tween} from '../theme';

const T0 = 12.6;
const at = (sec: number) => s(sec - T0);

const SCRIPT = 'You’re ordering groceries for dinner tonight. Budget ₹500. Get everything on this list and decide if you’ll place the order.';

const Tile: React.FC<{
  x: number;
  y: number;
  start: number;
  icon: keyof typeof ICONS;
  label: string;
  tint: string;
  children?: React.ReactNode;
}> = ({x, y, start, icon, label, tint, children}) => {
  const f = useCurrentFrame();
  const k = tween(f, [start, start + 14], [0, 1], SPRING);
  return (
    <Glass
      border={`${tint}88`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 445,
        height: 330,
        padding: 30,
        opacity: tween(f, [start, start + 5], [0, 1]),
        scale: String(0.6 + 0.4 * k),
        translate: `0px ${(1 - k) * 60}px`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{width: 74, height: 74, borderRadius: 22, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name={icon} size={50} color={C.ink} stroke={3.4} draw={tween(f, [start + 4, start + 20], [0, 1])} />
        </div>
        <Label color={C.cream} style={{fontSize: 26}}>{label}</Label>
      </div>
      <div style={{marginTop: 24}}>{children}</div>
    </Glass>
  );
};

// 12.6s – 21.7s  AI’s draft scenario, illustrated beat by beat.
export const S5Scenario: React.FC = () => {
  const f = useCurrentFrame();
  const typed = Math.floor(tween(f, [at(13.5), at(21.4)], [0, SCRIPT.length], (x) => x));
  const spend = tween(f, [at(17.2), at(18.2)], [0, 486]);
  const ticks = [at(18.8), at(19.1), at(19.4), at(19.7)];
  const items = ['Tomatoes', 'Paneer', 'Rice', 'Coriander'];
  const hover = tween(f, [at(20.4), at(21.1)], [0, 1], EASE_IN_OUT);

  return (
    <AbsoluteFill>
      <Backdrop glowA={C.mint} glowB={C.orange} seed={5} />

      {/* AI draft card */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 290,
          height: 360,
          borderRadius: 36,
          padding: '30px 40px',
          background: 'rgba(14,12,43,0.7)',
          border: `3px solid ${C.mint}`,
          boxShadow: `0 0 60px ${C.mint}33`,
          translate: `0px ${tween(f, [0, 14], [-60, 0], SPRING)}px`,
          opacity: tween(f, [0, 8], [0, 1]),
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <Icon name="sparkle" size={36} color={C.mint} stroke={3.5} />
          <Label color={C.mint} style={{fontSize: 24}}>SCENARIO · AI DRAFT</Label>
        </div>
        <div style={{fontFamily: body, fontWeight: 700, fontSize: 37, lineHeight: 1.28, color: C.cream, marginTop: 14}}>
          {SCRIPT.slice(0, typed)}
          <span style={{opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: C.mint}}>▍</span>
        </div>
      </div>

      {/* Beat 1: groceries for dinner tonight */}
      <Tile x={80} y={690} start={at(14.2)} icon="bag" label="DINNER TONIGHT" tint={C.orange}>
        <div style={{display: 'flex', gap: 18, alignItems: 'flex-end', height: 140}}>
          {['#FF4D6D', '#FFC857', '#3EE0A1', '#FF9F6B', '#B9B4FF'].map((c, i) => {
            const d = at(14.5) + i * 4;
            return (
              <div
                key={c}
                style={{
                  width: 58,
                  height: 58 + (i % 2) * 40,
                  borderRadius: i % 2 ? 18 : 29,
                  background: c,
                  translate: `0px ${tween(f, [d, d + 12], [-260, 0], SPRING)}px`,
                  opacity: tween(f, [d, d + 3], [0, 1]),
                }}
              />
            );
          })}
        </div>
      </Tile>

      {/* Beat 2: budget */}
      <Tile x={555} y={690} start={at(16.6)} icon="wallet" label="BUDGET" tint={C.lilac}>
        <div style={{fontFamily: display, fontWeight: 700, fontSize: 70, color: C.cream}}>
          ₹{Math.round(spend)} <span style={{fontSize: 36, color: C.muted}}>/ 500</span>
        </div>
        <div style={{height: 22, borderRadius: 11, background: 'rgba(185,180,255,0.2)', marginTop: 18, overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${(spend / 500) * 100}%`, borderRadius: 11, background: `linear-gradient(90deg, ${C.mint}, ${C.orange})`}} />
        </div>
      </Tile>

      {/* Beat 3: the list */}
      <Tile x={80} y={1040} start={at(18.4)} icon="list" label="THE LIST" tint={C.mint}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px'}}>
          {items.map((it, i) => (
            <div key={it} style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: body, fontWeight: 600, fontSize: 28, color: C.cream}}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `3px solid ${C.mint}`,
                  background: f >= ticks[i] ? C.mint : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={26} color={C.ink} stroke={6} draw={tween(f, [ticks[i], ticks[i] + 6], [0, 1])} />
              </div>
              {it}
            </div>
          ))}
        </div>
      </Tile>

      {/* Beat 4: the decision */}
      <Tile x={555} y={1040} start={at(20.0)} icon="bolt" label="YOUR CALL" tint={C.orange}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 34, color: C.cream, textAlign: 'center', padding: '14px 0', borderRadius: 18, background: C.orange, scale: String(1 + hover * 0.05)}}>
            Place order
          </div>
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 30, color: C.lilac, textAlign: 'center', padding: '12px 0', borderRadius: 18, border: `2px solid ${C.muted}`}}>
            Not yet
          </div>
        </div>
      </Tile>
      <Cursor
        size={70}
        style={{
          position: 'absolute',
          left: 1000 - hover * 140,
          top: 1440 - hover * 230,
          opacity: tween(f, [at(20.3), at(20.5)], [0, 1]),
        }}
      />
    </AbsoluteFill>
  );
};
