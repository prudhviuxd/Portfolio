/* Immersive 3D route — scroll-triggered storytelling.
 *
 * Pattern and its constraints come from ui-ux-pro-max --design-system
 * ("Scroll-Triggered Storytelling"): progress indicator, distinct colour per
 * chapter building in intensity, narrative that still works with every effect
 * switched off, and no scroll-jacking.
 *
 * Motion patterns follow the motion-framer skill translated out of React:
 * variants become per-chapter groups, whileInView becomes inView(), and the
 * spring presets are used verbatim (gentle = stiffness 100 / damping 20).
 *
 * The scene is built from the artefacts of product design rather than
 * abstract solids — see buildScene() for what each element is and why.
 *
 * Three.js rules from ui-ux-pro-max --stack threejs: pixel ratio capped at 2,
 * no geometry in the frame loop, merged line geometry instead of many meshes,
 * aspect + projection matrix on resize, explicit dispose on teardown.
 *
 * Fallback order: no JS -> noscript; no Motion -> CSS-visible content;
 * no WebGL / reduced motion -> canvas dropped, everything in final state.
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const M = window.Motion || null;

document.documentElement.setAttribute('data-enhanced', '');

const chapters = Array.from(document.querySelectorAll('.chapter'));
const railLinks = Array.from(document.querySelectorAll('.rail a'));
const navLinks = Array.from(document.querySelectorAll('.bar-nav a[href^="#"]'));
const progbar = document.getElementById('progbar');

let activeAccent = '#FF7A2F';
let scrollProgress = 0;

/* ------------------------------------------------------------------ */
/* Reveals — spring, staggered per chapter                             */
/* ------------------------------------------------------------------ */

function revealAllNow() {
  document.querySelectorAll('.r').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}

if (REDUCED || !M) {
  revealAllNow();
} else {
  const { animate, inView, stagger } = M;
  chapters.forEach((chapter) => {
    const items = Array.from(chapter.querySelectorAll('.r'));
    if (!items.length) return;
    inView(
      chapter,
      () => {
        animate(
          items,
          { opacity: [0, 1], transform: ['translateY(22px)', 'translateY(0px)'] },
          { type: 'spring', stiffness: 100, damping: 20, delay: stagger(0.055, { startDelay: 0.02 }) }
        );
      },
      { amount: 0.12 }
    );
  });
}

/* ------------------------------------------------------------------ */
/* Chapter tracking                                                    */
/* ------------------------------------------------------------------ */

function setActiveChapter(section) {
  const accent = getComputedStyle(section).getPropertyValue('--ch').trim();
  if (accent) {
    activeAccent = accent;
    document.documentElement.style.setProperty('--ch', accent);
  }
  const id = section.id;
  railLinks.forEach((a) => a.setAttribute('aria-current', String(a.dataset.rail === id)));
  navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id)));
}

if ('IntersectionObserver' in window && chapters.length) {
  const chapterIO = new IntersectionObserver(
    (entries) => {
      let best = null;
      entries.forEach((e) => {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
      });
      if (best) setActiveChapter(best.target);
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
  );
  chapters.forEach((c) => chapterIO.observe(c));
  setActiveChapter(chapters[0]);
}

const cases = Array.from(document.querySelectorAll('.case'));
if ('IntersectionObserver' in window && cases.length) {
  const caseIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('active', e.isIntersecting)),
    { rootMargin: '-40% 0px -40% 0px' }
  );
  cases.forEach((el) => caseIO.observe(el));
}

/* ------------------------------------------------------------------ */
/* Scroll progress + parallax                                          */
/* ------------------------------------------------------------------ */

function readScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  if (progbar) progbar.style.width = (scrollProgress * 100).toFixed(2) + '%';
}
readScroll();
window.addEventListener('scroll', readScroll, { passive: true });
window.addEventListener('resize', readScroll);

if (!REDUCED && M && M.scroll) {
  chapters.forEach((chapter) => {
    const numeral = chapter.querySelector('.numeral');
    if (!numeral) return;
    numeral.style.willChange = 'transform';
    M.scroll(
      M.animate(numeral, { transform: ['translateY(36px)', 'translateY(-36px)'] }, { ease: 'linear' }),
      { target: chapter, offset: ['start end', 'end start'] }
    );
  });
}

/* ------------------------------------------------------------------ */
/* WebGL scene                                                         */
/* ------------------------------------------------------------------ */

const canvas = document.getElementById('bg');

function dropCanvas(reason) {
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  document.documentElement.setAttribute('data-scene', reason);
}

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch (err) {
    return false;
  }
}

if (REDUCED) dropCanvas('reduced-motion');
else if (!webglAvailable()) dropCanvas('no-webgl');
else initScene().catch(() => dropCanvas('load-failed'));

/* ---------- 2D primitives, in local XY ------------------------------ */
/* Everything is drawn as line segments so the whole scene merges into a
   handful of draw calls. Each helper returns a flat list of [x,y] pairs,
   two per segment.

   The corridor is zoned: each chapter's stretch of depth carries the
   artefacts that chapter is about, so the background is content rather
   than texture. Zones are listed in buildZones(). */

function pushRect(out, x0, y0, x1, y1) {
  out.push(x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0);
}
function pushLine(out, x0, y0, x1, y1) { out.push(x0, y0, x1, y1); }

/* --- seven-segment digits, so real figures can float in the scene --- */
const SEG = {
  a: [0, 1, 0.6, 1], b: [0.6, 1, 0.6, 0.5], c: [0.6, 0.5, 0.6, 0],
  d: [0, 0, 0.6, 0], e: [0, 0.5, 0, 0], f: [0, 1, 0, 0.5], g: [0, 0.5, 0.6, 0.5],
};
const GLYPH = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgecd', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};
function digitsSegments(text, scale) {
  const out = [];
  let x = 0;
  const adv = 0.85 * scale;
  for (const chRaw of text) {
    const ch = chRaw;
    if (GLYPH[ch]) {
      for (const k of GLYPH[ch]) {
        const s = SEG[k];
        pushLine(out, x + s[0] * scale, s[1] * scale, x + s[2] * scale, s[3] * scale);
      }
      x += adv;
    } else if (ch === '.') {
      pushRect(out, x + 0.05 * scale, 0, x + 0.16 * scale, 0.11 * scale);
      x += 0.34 * scale;
    } else if (ch === '%') {
      pushRect(out, x, 0.66 * scale, x + 0.22 * scale, scale);
      pushRect(out, x + 0.38 * scale, 0, x + 0.6 * scale, 0.34 * scale);
      pushLine(out, x + 0.6 * scale, scale, x, 0);
      x += adv;
    } else if (ch === '+') {
      pushLine(out, x + 0.05 * scale, 0.5 * scale, x + 0.55 * scale, 0.5 * scale);
      pushLine(out, x + 0.3 * scale, 0.25 * scale, x + 0.3 * scale, 0.75 * scale);
      x += adv;
    } else if (ch === 'M') {
      pushLine(out, x, 0, x, scale);
      pushLine(out, x, scale, x + 0.3 * scale, 0.45 * scale);
      pushLine(out, x + 0.3 * scale, 0.45 * scale, x + 0.6 * scale, scale);
      pushLine(out, x + 0.6 * scale, scale, x + 0.6 * scale, 0);
      x += adv;
    } else {
      x += adv * 0.6;
    }
  }
  return out;
}

/* --- charts: single-hue by design ---------------------------------- */
/* The chapter accents fail a categorical-palette check (worst adjacent
   pair ΔE 2.9 deutan), so no chart here encodes a series by hue. Bars are
   identified by position against an axis, never by colour. */
function barChartSegments(values, w, h) {
  const out = [];
  pushLine(out, 0, 0, w, 0);
  pushLine(out, 0, 0, 0, h);
  const bw = (w / values.length) * 0.56;
  const gap = w / values.length;
  values.forEach((v, i) => {
    const x = gap * i + gap * 0.22;
    pushRect(out, x, 0, x + bw, v * h);
  });
  return out;
}
function lineChartSegments(values, w, h) {
  const out = [];
  pushLine(out, 0, 0, w, 0);
  pushLine(out, 0, 0, 0, h);
  const step = w / (values.length - 1);
  for (let i = 0; i < values.length - 1; i++) {
    pushLine(out, step * i, values[i] * h, step * (i + 1), values[i + 1] * h);
  }
  /* endpoint marker — the emphasized last point */
  const lx = w;
  const ly = values[values.length - 1] * h;
  pushRect(out, lx - 0.06, ly - 0.06, lx + 0.06, ly + 0.06);
  return out;
}
/* A meter arc: proportion of a ring, for the single-percentage figures. */
function ringSegments(r, pct, steps) {
  const out = [];
  const total = Math.PI * 2;
  for (let i = 0; i < steps; i++) {
    const a0 = -Math.PI / 2 + (i / steps) * total;
    const a1 = -Math.PI / 2 + ((i + 1) / steps) * total;
    const on = i / steps < pct;
    if (!on && i % 2) continue; /* dashed remainder */
    pushLine(out, Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r);
  }
  return out;
}

/* --- process / flow ------------------------------------------------- */
function flowNodeSegments(w, h) {
  const out = [];
  pushRect(out, -w / 2, -h / 2, w / 2, h / 2);
  pushLine(out, w / 2, 0, w / 2 + 0.4, 0);
  pushLine(out, -w / 2 - 0.4, 0, -w / 2, 0);
  return out;
}
function decisionSegments(s) {
  const out = [];
  pushLine(out, 0, s, s, 0); pushLine(out, s, 0, 0, -s);
  pushLine(out, 0, -s, -s, 0); pushLine(out, -s, 0, 0, s);
  return out;
}

/* --- the tools of the craft ----------------------------------------- */
/* Drawn as the generic vocabulary of design tools — a pen path with
   handles, a cursor, a component symbol, a layer stack, a ruler — rather
   than any named product's logo. Nothing here claims which software is
   used; these are the instruments, not the brands. */
function penToolSegments(s) {
  const out = [];
  const pts = [[-s, -s * 0.3], [-s * 0.3, s * 0.7], [s * 0.3, -s * 0.7], [s, s * 0.3]];
  for (let i = 0; i < pts.length - 1; i++) pushLine(out, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  /* anchor squares + control handles */
  [pts[0], pts[3]].forEach((p) => pushRect(out, p[0] - s * 0.09, p[1] - s * 0.09, p[0] + s * 0.09, p[1] + s * 0.09));
  pushLine(out, pts[1][0], pts[1][1], pts[1][0] + s * 0.5, pts[1][1]);
  pushLine(out, pts[2][0], pts[2][1], pts[2][0] - s * 0.5, pts[2][1]);
  return out;
}
function cursorSegments(s) {
  const out = [];
  const p = [[0, 0], [0, -s], [s * 0.36, -s * 0.68], [s * 0.58, -s * 1.06], [s * 0.3, -s * 1.2], [s * 0.16, -s * 0.8]];
  for (let i = 0; i < p.length - 1; i++) pushLine(out, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
  pushLine(out, p[p.length - 1][0], p[p.length - 1][1], 0, 0);
  return out;
}
function componentSegments(s) {
  /* four diamonds around a centre — the component/variant symbol */
  const out = [];
  const d = (cx, cy, r) => {
    pushLine(out, cx, cy + r, cx + r, cy); pushLine(out, cx + r, cy, cx, cy - r);
    pushLine(out, cx, cy - r, cx - r, cy); pushLine(out, cx - r, cy, cx, cy + r);
  };
  const g = s * 0.55;
  d(0, g, s * 0.3); d(0, -g, s * 0.3); d(g, 0, s * 0.3); d(-g, 0, s * 0.3);
  return out;
}
function layerSegments(s) {
  const out = [];
  for (let i = 0; i < 3; i++) pushRect(out, -s + i * s * 0.22, -s * 0.5 + i * s * 0.26, s * 0.5 + i * s * 0.22, s * 0.1 + i * s * 0.26);
  return out;
}
function rulerSegments(w) {
  const out = [];
  pushLine(out, 0, 0, w, 0);
  for (let i = 0; i <= 8; i++) {
    const x = (w * i) / 8;
    pushLine(out, x, 0, x, i % 2 === 0 ? 0.26 : 0.14);
  }
  return out;
}

/* --- screens & frames ------------------------------------------------ */
function screenSegments(w, h) {
  const out = [];
  const hw = w / 2, hh = h / 2, pad = w * 0.1;
  pushRect(out, -hw, -hh, hw, hh);
  const barH = h * 0.06;
  pushRect(out, -hw + pad, hh - pad - barH, hw - pad, hh - pad);
  for (let i = 0; i < 3; i++) {
    const y = hh - pad - barH - (i + 1) * h * 0.11;
    out.push(-hw + pad, y, hw - pad - (i === 2 ? w * 0.28 : 0), y);
  }
  pushRect(out, -hw + pad, -hh + pad, -hw + pad + w * 0.4, -hh + pad + h * 0.055);
  return out;
}
function frameSegments(w, h, tick) {
  const out = [];
  const hw = w / 2, hh = h / 2;
  [[-hw, -hh, 1, 1], [hw, -hh, -1, 1], [hw, hh, -1, -1], [-hw, hh, 1, -1]].forEach(([x, y, sx, sy]) => {
    out.push(x, y, x + tick * sx, y);
    out.push(x, y, x, y + tick * sy);
  });
  return out;
}

function bezierSegments(x1, y1, x2, y2, w, h, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, mt = 1 - t;
    pts.push((3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t) * w,
             (3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t) * h);
  }
  const out = [];
  for (let i = 0; i < pts.length / 2 - 1; i++) out.push(pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3]);
  return out;
}
function parseBezier(value) {
  const m = value.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return null;
  const n = m[1].split(',').map((s) => parseFloat(s));
  return n.length === 4 && n.every((v) => !Number.isNaN(v)) ? n : null;
}

async function initScene() {
  const THREE = await import('./vendor/three.module.min.js');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08090b, 0.024);
  const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 150);
  camera.position.set(0, 0, 4);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x08090b, 1);

  const DEPTH = 74;
  const ZONE = DEPTH / 6;

  function makeLines(parts, material) {
    const verts = [];
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    parts.forEach(({ seg, pos, rot = [0, 0, 0], scale = 1 }) => {
      m.makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
      m.scale(new THREE.Vector3(scale, scale, scale));
      m.setPosition(pos[0], pos[1], pos[2]);
      for (let i = 0; i < seg.length; i += 2) {
        v.set(seg[i], seg[i + 1], 0).applyMatrix4(m);
        verts.push(v.x, v.y, v.z);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return { mesh: new THREE.LineSegments(geo, material), geo };
  }

  /* Ring placement that keeps the centre of frame clear for the copy. */
  function place(zone, spread, i) {
    const angle = (i * 2.399) % (Math.PI * 2); /* golden angle, avoids clumping */
    const radius = 6.4 + ((i * 37) % 100) / 100 * 5.4;
    const z = -2 - zone * ZONE - ((i * 61) % 100) / 100 * ZONE;
    return {
      pos: [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.58, z],
      rot: [0, Math.cos(angle) * -0.6, (((i * 17) % 100) / 100 - 0.5) * 0.35],
      scale: spread,
    };
  }

  /* Two buffers: structural artefacts sit back as texture, while data
     glyphs — the figures and charts — are the content of their zones and
     get their own brighter material so they actually read. */
  const parts = [];
  const dataParts = [];

  /* ---- Zone 0 · Intro — the headline figures, as readouts ---------- */
  /* Every number is one already published elsewhere on this page. */
  ['12', '100+', '2.1M', '4', '10+', '80%'].forEach((stat, i) => {
    dataParts.push({ seg: digitsSegments(stat, 0.95), ...place(0, 1, i * 2) });
  });
  dataParts.push({ seg: barChartSegments([0.35, 0.55, 0.72, 0.9], 2.4, 1.7), ...place(0, 1.1, 1) });
  dataParts.push({ seg: lineChartSegments([0.2, 0.45, 0.38, 0.7, 0.95], 2.6, 1.6), ...place(0, 1.1, 5) });

  /* ---- Zone 1 · Impact — charts and meters ------------------------- */
  dataParts.push({ seg: ringSegments(1.15, 0.8, 48), ...place(1, 1.1, 0) });   /* 80% churn */
  dataParts.push({ seg: ringSegments(1.15, 0.8, 48), ...place(1, 1.1, 4) });   /* 80% satisfaction */
  dataParts.push({ seg: barChartSegments([0.5, 0.8, 0.62, 1, 0.75], 2.7, 1.8), ...place(1, 1.1, 2) });
  dataParts.push({ seg: barChartSegments([0.9, 0.45, 0.7], 2, 1.5), ...place(1, 1, 6) });
  dataParts.push({ seg: lineChartSegments([0.9, 0.7, 0.55, 0.3, 0.18], 2.6, 1.5), ...place(1, 1.05, 8) }); /* churn falling */
  ['80%', '200+', '100+'].forEach((s, i) => dataParts.push({ seg: digitsSegments(s, 0.8), ...place(1, 1, 10 + i * 3) }));

  /* ---- Zone 2 · Approach — the process, as a flow ------------------ */
  for (let i = 0; i < 7; i++) parts.push({ seg: flowNodeSegments(1.5, 0.7), ...place(2, 1, i * 2) });
  for (let i = 0; i < 3; i++) parts.push({ seg: decisionSegments(0.6), ...place(2, 1, i * 5 + 1) });

  /* ---- Zone 3 · Skill set — the instruments ------------------------ */
  const tools = [penToolSegments(0.9), cursorSegments(1.1), componentSegments(0.9),
                 layerSegments(0.9), rulerSegments(2.2), penToolSegments(0.7),
                 componentSegments(0.7), cursorSegments(0.85), layerSegments(0.7), rulerSegments(1.6)];
  tools.forEach((seg, i) => parts.push({ seg, ...place(3, 1, i * 2) }));

  /* ---- Zone 4 · Work — the screens themselves ---------------------- */
  const ratios = [[0.62, 1.32], [1.1, 0.82], [1.5, 0.95]];
  for (let i = 0; i < 12; i++) {
    const [w, h] = ratios[i % 3];
    parts.push({ seg: screenSegments(w, h), ...place(4, 1.15, i * 2) });
  }

  /* ---- Zone 5 · Clients & contact — the delivered set -------------- */
  for (let i = 0; i < 10; i++) parts.push({ seg: frameSegments(1.5, 1, 0.28), ...place(5, 1, i * 2) });

  const artefactMat = new THREE.LineBasicMaterial({ color: 0x3e4655, transparent: true, opacity: 0.5 });
  const artefacts = makeLines(parts, artefactMat);
  scene.add(artefacts.mesh);

  const dataMat = new THREE.LineBasicMaterial({ color: 0x8a929e, transparent: true, opacity: 0.78 });
  const dataGlyphs = makeLines(dataParts, dataMat);
  scene.add(dataGlyphs.mesh);

  /* ---- Flow connectors between neighbouring artefacts -------------- */
  const flowMat = new THREE.LineBasicMaterial({ color: 0x2b313c, transparent: true, opacity: 0.5 });
  const flowVerts = [];
  const linkable = parts.concat(dataParts);
  for (let i = 0; i < linkable.length - 1; i += 2) {
    const a = linkable[i].pos, b = linkable[i + 1].pos;
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 12) continue;
    flowVerts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.Float32BufferAttribute(flowVerts, 3));
  const flow = new THREE.LineSegments(flowGeo, flowMat);
  scene.add(flow);

  /* ---- Baseline grid: 12 columns, as a floor ----------------------- */
  const gridMat = new THREE.LineBasicMaterial({ color: 0x1e232c, transparent: true, opacity: 0.9 });
  const gridVerts = [];
  for (let c = 0; c <= 12; c++) {
    const x = -9 + (18 * c) / 12;
    gridVerts.push(x, -7, 4, x, -7, -DEPTH - 4);
  }
  for (let z = 0; z <= 40; z++) {
    const zz = 4 - (DEPTH + 8) * (z / 40);
    gridVerts.push(-9, -7, zz, 9, -7, zz);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVerts, 3));
  const grid = new THREE.LineSegments(gridGeo, gridMat);
  scene.add(grid);

  /* ---- Chapter gates as artboard frames ---------------------------- */
  const gates = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.LineBasicMaterial({ color: 0x3e4655, transparent: true, opacity: 0.65 });
    const z = -7 - i * (DEPTH / 6.4);
    const gate = makeLines([
      { seg: frameSegments(15.2, 9.5, 1.5), pos: [0, 0, z] },
      { seg: [-7.6, 5.35, -4.2, 5.35], pos: [0, 0, z] },
    ], mat);
    scene.add(gate.mesh);
    gates.push({ ...gate, mat });
  }

  /* ---- Case-study markers as hero screens -------------------------- */
  const markerMat = new THREE.LineBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.9 });
  const markers = makeLines([-18, -36, -54].map((z, i) => ({
    seg: screenSegments(1.5, 3.2),
    pos: [(i % 2 === 0 ? -1 : 1) * (5.2 + Math.abs(z) * 0.26), 0, z],
    rot: [0, (i % 2 === 0 ? 1 : -1) * 0.5, 0],
    scale: 1.5,
  })), markerMat);
  scene.add(markers.mesh);

  /* ---- Easing curves, read from the project's own tokens ----------- */
  const curveMat = new THREE.LineBasicMaterial({ color: 0x8a929e, transparent: true, opacity: 0.6 });
  const rootStyle = getComputedStyle(document.documentElement);
  const curveParts = [];
  ['--primitive-easing-out-quart', '--primitive-easing-out-expo', '--primitive-easing-in-out-expo']
    .forEach((name, i) => {
      const b = parseBezier(rootStyle.getPropertyValue(name));
      if (!b) return;
      const z = -12 - i * 19;
      curveParts.push({ seg: bezierSegments(b[0], b[1], b[2], b[3], 2.4, 2.4, 26), pos: [5.6, -1.2, z], rot: [0, -0.5, 0] });
      curveParts.push({ seg: [0, 0, 2.4, 0, 0, 0, 0, 2.4], pos: [5.6, -1.2, z], rot: [0, -0.5, 0] });
    });
  const curves = curveParts.length ? makeLines(curveParts, curveMat) : null;
  if (curves) scene.add(curves.mesh);

  /* ---- interaction --------------------------------------------------- */
  const pointer = { x: 0, y: 0 };
  const PARALLAX = 0.3;
  function onPointerMove(e) {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  window.addEventListener('resize', onResize);

  /* ---- loop ---------------------------------------------------------- */
  const clock = new THREE.Clock();
  const target = new THREE.Color(activeAccent);
  const accentNow = new THREE.Color(activeAccent);
  const artefactBase = new THREE.Color(0x3e4655);
  const dataBase = new THREE.Color(0x8a929e);
  const gridBase = new THREE.Color(0x1e232c);
  const tmp = new THREE.Color();
  let rafId = null, camZ = 4, roll = 0;

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);

    try { target.set(activeAccent); } catch (err) { /* keep last good colour */ }
    accentNow.lerp(target, Math.min(dt * 1.6, 1));

    artefactMat.color.copy(tmp.copy(artefactBase).lerp(accentNow, 0.24));
    /* Data glyphs carry the chapter accent strongly — they are the point of
       their zone, not background texture. */
    dataMat.color.copy(tmp.copy(dataBase).lerp(accentNow, 0.72));
    gridMat.color.copy(tmp.copy(gridBase).lerp(accentNow, 0.14));
    flowMat.color.copy(tmp.copy(gridBase).lerp(accentNow, 0.3));
    markerMat.color.copy(accentNow);
    if (curves) curveMat.color.copy(tmp.copy(artefactBase).lerp(accentNow, 0.55));
    gates.forEach((g, i) => g.mat.color.copy(tmp.copy(artefactBase).lerp(accentNow, 0.16 + i * 0.1)));

    const targetZ = 4 - scrollProgress * DEPTH;
    camZ += (targetZ - camZ) * Math.min(dt * 3.2, 1);
    camera.position.z = camZ;
    camera.position.x += (pointer.x * PARALLAX - camera.position.x) * Math.min(dt * 2.4, 1);
    camera.position.y += (-pointer.y * PARALLAX - camera.position.y) * Math.min(dt * 2.4, 1);
    roll += (scrollProgress * 0.16 - roll) * Math.min(dt * 1.5, 1);
    camera.lookAt(0, 0, camZ - 9);
    camera.rotation.z = roll;

    artefacts.mesh.rotation.z += dt * 0.006;
    dataGlyphs.mesh.rotation.z += dt * 0.006;
    markers.mesh.rotation.z += dt * 0.01;
    renderer.render(scene, camera);
  }

  function start() { if (rafId === null) { clock.getDelta(); frame(); } }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();

  function destroy() {
    stop();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', onResize);
    [artefacts.geo, dataGlyphs.geo, flowGeo, gridGeo, markers.geo].forEach((g) => g.dispose());
    if (curves) curves.geo.dispose();
    gates.forEach((g) => { g.geo.dispose(); g.mat.dispose(); });
    [artefactMat, dataMat, flowMat, gridMat, markerMat, curveMat].forEach((m) => m.dispose());
    renderer.dispose();
  }
  window.addEventListener('pagehide', destroy, { once: true });
}
