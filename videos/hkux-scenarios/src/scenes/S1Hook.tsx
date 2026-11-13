import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Cursor, Icon} from '../components/Icons';
import {Burst, Label} from '../components/ui';
import {C, EASE_IN_OUT, SPRING, body, display, s, tween} from '../theme';

// 0.00s – 2.75s  “Click the cart icon and check the total.”
export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const click = s(0.95);
  const cx = tween(f, [s(0.2), click - 3], [180, 735], EASE_IN_OUT);
  const cy = tween(f, [s(0.2), click - 3], [1250, 545], EASE_IN_OUT);
  const press = f > click - 2 && f < click + 4 ? 0.85 : 1;
  const totalIn = tween(f, [s(1.7), s(2.1)], [0, 1], SPRING);

  return (
    <AbsoluteFill>
      <Backdrop seed={1} />
      {/* Sticky-note instruction */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 330,
          width: 600,
          padding: '26px 32px',
          background: C.peach,
          borderRadius: 14,
          rotate: `${tween(f, [0, 12], [-12, -4])}deg`,
          translate: `0px ${tween(f, [0, 12], [-140, 0], SPRING)}px`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          zIndex: 3,
        }}
      >
        <Label color={C.ink} style={{fontSize: 22, opacity: 0.7}}>TASK 01</Label>
        <div style={{fontFamily: body, fontWeight: 800, fontSize: 44, color: C.ink, marginTop: 6, lineHeight: 1.1}}>
          Click the cart icon and check the total.
        </div>
      </div>

      {/* App mock */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          top: 470,
          height: 820,
          borderRadius: 48,
          background: C.cream,
          overflow: 'hidden',
          scale: String(tween(f, [0, 14], [0.9, 1], SPRING)),
          opacity: tween(f, [0, 8], [0, 1]),
        }}
      >
        <div
          style={{
            height: 150,
            background: C.paper,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 48px 26px',
            borderBottom: '2px solid #E6E3FA',
          }}
        >
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 46, color: C.indigo}}>FreshCart</div>
          <div style={{position: 'relative', scale: String(press)}}>
            <Icon name="cart" size={78} color={C.indigo} stroke={3.4} draw={tween(f, [4, 20], [0, 1])} />
            <div
              style={{
                position: 'absolute',
                top: -10,
                right: -12,
                width: 40,
                height: 40,
                borderRadius: 20,
                background: C.orange,
                color: 'white',
                fontFamily: body,
                fontWeight: 800,
                fontSize: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scale: String(tween(f, [click, click + 10], [0.6, 1], SPRING)),
              }}
            >
              4
            </div>
          </div>
        </div>
        {/* Product skeletons */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, padding: 44}}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 190,
                borderRadius: 26,
                background: ['#FFE3D3', '#E0DDFF', '#D6F7E9', '#FFE9F0'][i],
                opacity: tween(f, [6 + i * 3, 16 + i * 3], [0, 1]),
                translate: `0px ${tween(f, [6 + i * 3, 16 + i * 3], [30, 0])}px`,
              }}
            />
          ))}
        </div>
        {/* Total drawer */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 200,
            background: C.indigo,
            translate: `0px ${(1 - totalIn) * 220}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 54px',
          }}
        >
          <div style={{fontFamily: body, fontWeight: 600, fontSize: 40, color: C.lilac}}>Total</div>
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 76, color: C.cream}}>₹486</div>
        </div>
      </div>

      <Burst p={tween(f, [click, click + 14], [0, 1], (x) => x)} style={{left: 850, top: 640}} size={180} />
      <Cursor style={{position: 'absolute', left: cx + 80, top: cy + 70, scale: String(press)}} size={84} />
    </AbsoluteFill>
  );
};
