/* ============================================================
   TEXTURES — every image in this scene is generated at runtime.
   No binary assets to download, no CORS, and the labels stay
   crisp because they are drawn at device resolution.
   ============================================================ */

import * as THREE from 'three';

/* One canvas helper so every generator is the same three lines. */
function canvas(w, h) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return { el, ctx: el.getContext('2d') };
}

function toTexture(el, renderer) {
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  tex.needsUpdate = true;
  return tex;
}

/* ---------- soft radial dot, used for stars and light pools ---------- */
export function makeGlowTexture(size = 256, falloff = 2.6) {
  const { el, ctx } = canvas(size, size);
  const r = size / 2;
  const grd = ctx.createRadialGradient(r, r, 0, r, r, r);

  /* Hand-rolled falloff — a plain linear gradient reads as a flat disc. */
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    grd.addColorStop(t, `rgba(255,255,255,${Math.pow(1 - t, falloff).toFixed(4)})`);
  }

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return toTexture(el);
}

/* ---------- nebula cloud, drawn as a few overlapping blobs ---------- */
export function makeNebulaTexture(color, size = 512) {
  const { el, ctx } = canvas(size, size);
  const blobs = 9;

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < blobs; i++) {
    const cx = size * (0.25 + Math.random() * 0.5);
    const cy = size * (0.25 + Math.random() * 0.5);
    const rr = size * (0.12 + Math.random() * 0.26);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    grd.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.30)`);
    grd.addColorStop(0.5, `rgba(${color[0]},${color[1]},${color[2]},0.09)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
  }

  /* Fade the rectangle edges out so the plane never shows as a square. */
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.65, 'rgba(0,0,0,0.85)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);

  return toTexture(el);
}

/* ---------- the card face: index, title, kicker, hairlines ---------- */
export function makeLabelTexture(node, renderer) {
  const W = 1024;
  const H = 640;
  const { el, ctx } = canvas(W, H);
  const accent = node.accent.css;
  const pad = 74;

  ctx.clearRect(0, 0, W, H);

  /* Panel wash. Near-opaque on purpose: it is what keeps the type legible
     against whatever the slab and the halo behind it are doing. */
  const wash = ctx.createLinearGradient(0, 0, W, H);
  wash.addColorStop(0, 'rgba(9,12,24,0.94)');
  wash.addColorStop(1, 'rgba(6,7,15,0.86)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  /* accent bar, top left */
  ctx.fillStyle = accent;
  ctx.fillRect(pad, pad, 96, 5);

  /* index glyph */
  ctx.font = '500 34px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.fillText(node.index, pad, pad + 78);
  ctx.globalAlpha = 1;

  /* Title. The bloom pass goes down first and the glyphs are then redrawn
     clean on top, so the neon never eats its own edges. */
  ctx.font = '600 126px "Instrument", system-ui, sans-serif';
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 34;
  ctx.globalAlpha = 0.55;
  ctx.fillText(node.title, pad, H - pad - 132);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(node.title, pad, H - pad - 132);

  /* kicker */
  ctx.font = '400 40px "Instrument", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(226,232,255,0.68)';
  ctx.fillText(node.kicker, pad, H - pad - 66);

  /* hairline + "open" affordance, bottom right */
  ctx.strokeStyle = 'rgba(226,232,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, H - pad - 28);
  ctx.lineTo(W - pad, H - pad - 28);
  ctx.stroke();

  ctx.font = '500 26px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = accent;
  ctx.textAlign = 'right';
  ctx.fillText('OPEN →', W - pad, H - pad + 8);

  return toTexture(el, renderer);
}

/* ---------- card back: index and name, so the far side still identifies itself ----------
   Drawn mirrored, because the plane it lands on is turned to face the other
   way — flip it here and the geometry stays a straight 180° rotation. */
export function makeBackTexture(node, renderer) {
  const W = 512;
  const H = 320;
  const { el, ctx } = canvas(W, H);

  ctx.fillStyle = 'rgba(7,9,18,0.72)';
  ctx.fillRect(0, 0, W, H);

  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '500 132px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = node.accent.css;
  ctx.globalAlpha = 0.3;
  ctx.fillText(node.index, W / 2, H / 2 - 22);

  ctx.font = '500 30px "Instrument", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.34;
  ctx.fillText(node.title, W / 2, H / 2 + 62);

  return toTexture(el, renderer);
}

/**
 * Webfonts are not guaranteed to be ready when the module runs, and the
 * canvas silently falls back to a system face if we draw too early.
 * Resolve either when the faces are in, or after a short grace period.
 */
export function waitForFonts(timeout = 1200) {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();

  const faces = [
    '600 126px "Instrument"',
    '400 40px "Instrument"',
    '500 34px "JetBrains Mono"'
  ];

  return Promise.race([
    Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null))),
    new Promise((resolve) => setTimeout(resolve, timeout))
  ]);
}
