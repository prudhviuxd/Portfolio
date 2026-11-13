import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {Icon} from '../components/Icons';
import {Label} from '../components/ui';
import {C, SPRING, body, display, mono, s, tween} from '../theme';

const T0 = 10.0;
const at = (sec: number) => s(sec - T0);

// 10.0s – 12.6s  “Goal: can people understand the final price?”
export const S4Goal: React.FC = () => {
  const f = useCurrentFrame();
  const lines = [
    ['Tomatoes', '₹60'],
    ['Paneer', '₹180'],
    ['Delivery', '₹40'],
    ['Taxes & fees', '₹?'],
  ];
  const priceAt = at(12.0);
  return (
    <AbsoluteFill>
      <Backdrop glowA={C.orange} glowB={C.violet} seed={4} />
      <div style={{position: 'absolute', top: 320, left: 80, right: 80, display: 'flex', alignItems: 'center', gap: 28}}>
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 34,
            background: C.orange,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scale: String(tween(f, [0, 12], [0, 1], SPRING)),
          }}
        >
          <Icon name="target" size={92} color={C.ink} stroke={3.4} draw={tween(f, [4, 22], [0, 1])} />
        </div>
        <div>
          <Label>THE GOAL</Label>
          <div style={{fontFamily: display, fontWeight: 700, fontSize: 62, color: C.cream, lineHeight: 1.05, marginTop: 8, opacity: tween(f, [at(10.3), at(10.6)], [0, 1])}}>
            Can people understand the <span style={{color: C.orange}}>final price?</span>
          </div>
        </div>
      </div>

      {/* Receipt printing out */}
      <div style={{position: 'absolute', left: 230, top: 640, width: 620, height: 720, overflow: 'hidden'}}>
        <div
          style={{
            background: C.cream,
            borderRadius: '24px 24px 0 0',
            padding: '44px 50px 70px',
            translate: `0px ${tween(f, [at(10.4), at(11.6)], [-720, 0])}px`,
            clipPath:
              'polygon(0 0,100% 0,100% 96%,95% 100%,90% 96%,85% 100%,80% 96%,75% 100%,70% 96%,65% 100%,60% 96%,55% 100%,50% 96%,45% 100%,40% 96%,35% 100%,30% 96%,25% 100%,20% 96%,15% 100%,10% 96%,5% 100%,0 96%)',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30}}>
            <Icon name="receipt" size={54} color={C.indigo} stroke={3} />
            <div style={{fontFamily: mono, fontWeight: 700, fontSize: 28, color: C.indigo, letterSpacing: 3}}>ORDER #2481</div>
          </div>
          {lines.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: body,
                fontWeight: 600,
                fontSize: 36,
                color: '#4A4680',
                padding: '14px 0',
                borderBottom: '2px dashed #D9D5F5',
              }}
            >
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28}}>
            <span style={{fontFamily: display, fontWeight: 700, fontSize: 48, color: C.ink}}>Total</span>
            <span
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: 64,
                color: C.ink,
                background: `${C.orange}55`,
                borderRadius: 14,
                padding: '0 18px',
              }}
            >
              ₹???
            </span>
          </div>
        </div>
      </div>

      {/* Swinging price tag */}
      <div
        style={{
          position: 'absolute',
          left: 700,
          top: 560,
          transformOrigin: '20px 20px',
          rotate: `${Math.sin((f - priceAt) / 4) * 18 * tween(f, [priceAt, priceAt + 30], [1, 0.2]) + 14}deg`,
          scale: String(tween(f, [priceAt, priceAt + 10], [0, 1], SPRING)),
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 40,
            background: C.orange,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: display,
            fontWeight: 700,
            fontSize: 140,
            color: C.ink,
            boxShadow: '0 20px 60px rgba(255,122,61,0.5)',
          }}
        >
          ?
        </div>
      </div>
    </AbsoluteFill>
  );
};
