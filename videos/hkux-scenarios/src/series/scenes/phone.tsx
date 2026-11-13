import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Icon} from '../../components/Icons';
import {Label} from '../../components/ui';
import {C, SPRING, body, display, mono, tween} from '../../theme';
import {cue} from '../shared';
import {SceneProps} from '../types';

type Row = {name: string; price: string};

/**
 * Phone cart mock with switchable modes and cues:
 *  - mode "sketch": hand-drawn paper; at cue "swap" turns into a grey wireframe
 *  - lorem: lorem ipsum until cue "swap", then real items
 *  - live: items add one by one (cues "i0".."iN"), total ticks up
 *  - overflow: at cue "overflow" extra fee lines push the button below a fold line
 *  - palette: at cue "palette" a colour palette drops in and is crossed out
 */
export const Phone: React.FC<
  SceneProps & {
    title?: string;
    kicker?: string;
    items: Row[];
    fees?: Row[];
    total?: string;
    mode?: 'real' | 'sketch';
    lorem?: boolean;
    live?: boolean;
    overflow?: boolean;
    palette?: boolean;
    button?: string;
  }
> = ({cues, accent, title = 'Cart', kicker, items, fees = [], total, mode = 'real', lorem, live, overflow, palette, button = 'Place order'}) => {
  const f = useCurrentFrame();
  const swap = cue(cues, 'swap', 9999);
  const sw = tween(f, [swap, swap + 14], [0, 1]);
  const isSketch = mode === 'sketch' && f < swap + 7;
  const wire = mode === 'sketch' && f >= swap + 7;
  const showLorem = lorem && f < swap + 7;
  const ov = cue(cues, 'overflow', 9999);
  const pal = cue(cues, 'palette', 9999);
  const grey = wire || mode === 'sketch';

  const sumAt = (n: number) => items.slice(0, n).reduce((a, r) => a + Number(r.price.replace(/[^0-9]/g, '')), 0);
  const added = live ? items.filter((_, i) => f >= cue(cues, `i${i}`, 10 + i * 14)).length : items.length;
  const shownFees = overflow ? fees.filter((_, i) => i < 1 || f >= ov + i * 5) : fees;

  const paper = isSketch;
  const ink = paper ? '#3A3A55' : C.ink;
  const font = paper ? '"Comic Sans MS", "Marker Felt", cursive' : body;
  const flip = mode === 'sketch' ? Math.abs(Math.cos(sw * Math.PI)) : 1;

  return (
    <AbsoluteFill>
      <Backdrop glowA={accent} glowB={C.violet} seed={items.length + 30} />
      {kicker ? <Label color={accent} style={{position: 'absolute', top: 320, left: 0, right: 0, textAlign: 'center'}}>{kicker}</Label> : null}
      <div
        style={{
          position: 'absolute',
          left: 220,
          width: 640,
          top: kicker ? 380 : 330,
          height: 1000,
          borderRadius: paper ? 8 : 64,
          border: paper ? 'none' : `14px solid ${C.lilac}`,
          background: paper ? '#FBF6EA' : grey ? '#F1F1F4' : C.cream,
          overflow: 'hidden',
          rotate: paper ? '-3deg' : '0deg',
          scale: `${flip} 1`,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          opacity: tween(f, [0, 8], [0, 1]),
          translate: `0px ${tween(f, [0, 14], [100, 0], SPRING)}px`,
        }}
      >
        {paper ? (
          <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 58px, #D8E4F2 58px 60px)'}} />
        ) : null}
        <div style={{position: 'relative', padding: '40px 40px 0'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{fontFamily: paper ? font : display, fontWeight: 700, fontSize: 52, color: grey ? '#555' : C.indigo}}>{title}</div>
            <Icon name="cart" size={56} color={grey ? '#777' : C.indigo} stroke={3} />
          </div>
          <div style={{marginTop: 24}}>
            {items.map((r, i) => {
              const on = i < added;
              const at = live ? cue(cues, `i${i}`, 10 + i * 14) : 4 + i * 3;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                    borderBottom: `2px ${paper ? 'solid' : 'dashed'} ${paper ? '#3A3A55' : '#DCD8F7'}`,
                    fontFamily: font,
                    fontWeight: 600,
                    fontSize: 34,
                    color: grey ? '#555' : ink,
                    opacity: on ? tween(f, [at, at + 6], [0, 1]) : 0,
                    translate: `${on ? tween(f, [at, at + 10], [60, 0], SPRING) : 60}px 0px`,
                  }}
                >
                  {paper || wire ? (
                    <>
                      <div style={{width: 260, height: 26, borderRadius: 6, background: paper ? 'transparent' : '#CFCFD6', borderBottom: paper ? '4px solid #3A3A55' : 'none'}} />
                      <div style={{width: 90, height: 26, borderRadius: 6, background: paper ? 'transparent' : '#CFCFD6', borderBottom: paper ? '4px solid #3A3A55' : 'none'}} />
                    </>
                  ) : (
                    <>
                      <span>{showLorem ? ['Lorem ipsum', 'Dolor sit', 'Amet elit', 'Sed do'][i % 4] : r.name}</span>
                      <span>{showLorem ? '₹00' : r.price}</span>
                    </>
                  )}
                </div>
              );
            })}
            {!paper && !wire
              ? shownFees.map((r, i) => {
                  const at = overflow && i > 0 ? ov + i * 5 : 6;
                  return (
                    <div
                      key={`fee${i}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 20,
                        padding: '16px 0',
                        fontFamily: body,
                        fontWeight: 600,
                        fontSize: 32,
                        lineHeight: 1.2,
                        color: showLorem ? C.ink : '#B8501F',
                        opacity: tween(f, [at, at + 6], [0, 1]),
                      }}
                    >
                      <span style={{maxWidth: 340}}>{showLorem ? 'Lorem fee' : r.name}</span>
                      <span>{showLorem ? '₹00' : r.price}</span>
                    </div>
                  );
                })
              : null}
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20, fontFamily: paper ? font : display, fontWeight: 700, color: grey ? '#555' : C.ink}}>
            <span style={{fontSize: 40}}>Total</span>
            <span style={{fontSize: 60, color: live ? C.orange : undefined}}>{live ? `₹${sumAt(added)}` : paper || wire ? '₹—' : showLorem ? '₹000' : total}</span>
          </div>
          <div
            style={{
              marginTop: 30,
              borderRadius: paper ? 8 : 28,
              padding: '26px 0',
              textAlign: 'center',
              fontFamily: paper ? font : display,
              fontWeight: 700,
              fontSize: 40,
              color: grey ? '#444' : C.ink,
              background: paper ? 'transparent' : grey ? '#CFCFD6' : C.orange,
              border: paper ? '4px solid #3A3A55' : 'none',
            }}
          >
            {button}
          </div>
        </div>
        {overflow ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 740, borderTop: `5px dashed ${C.red}`, opacity: tween(f, [ov, ov + 8], [0, 1])}}>
            <div style={{position: 'absolute', right: 20, top: 8, fontFamily: mono, fontWeight: 700, fontSize: 22, color: C.red}}>THE FOLD</div>
          </div>
        ) : null}
      </div>
      {palette ? (
        <div style={{position: 'absolute', left: 120, right: 120, top: 520, display: 'flex', justifyContent: 'center', gap: 18, translate: `0px ${tween(f, [pal, pal + 14], [-700, 0], SPRING)}px`, opacity: f < pal ? 0 : tween(f, [pal + 26, pal + 38], [1, 0])}}>
          {[C.orange, C.violet, C.mint, '#FF4D6D', '#FFC857'].map((c) => (
            <div key={c} style={{width: 120, height: 120, borderRadius: 28, background: c, boxShadow: '0 20px 40px rgba(0,0,0,0.4)'}} />
          ))}
          <div style={{position: 'absolute', left: -20, right: -20, top: 50, height: 16, borderRadius: 8, background: C.red, rotate: '-6deg', transformOrigin: 'left', scale: `${tween(f, [pal + 12, pal + 20], [0, 1])} 1`}} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
