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
/* Everything in the scene is drawn as line segments so the whole set can be
   merged into a handful of draw calls. Each helper returns a flat list of
   [x,y] pairs, two per segment. */

function pushRect(out, x0, y0, x1, y1) {
  out.push(x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0);
}

/* A wireframe screen: frame, header bar, a few content lines, and a CTA.
   The vocabulary of a UI mock, reduced to the smallest thing still
   recognisable as one at distance. */
function screenSegments(w, h) {
  const out = [];
  const hw = w / 2;
  const hh = h / 2;
  const pad = w * 0.1;
  pushRect(out, -hw, -hh, hw, hh);
  const barH = h * 0.06;
  pushRect(out, -hw + pad, hh - pad - barH, hw - pad, hh - pad);
  for (let i = 0; i < 3; i++) {
    const y = hh - pad - barH - (i + 1) * h * 0.11;
    const short = i === 2 ? w * 0.28 : 0;
    out.push(-hw + pad, y, hw - pad - short, y);
  }
  pushRect(out, -hw + pad, -hh + pad, -hw + pad + w * 0.4, -hh + pad + h * 0.055);
  return out;
}

/* Corner ticks — the crop marks that read instantly as "artboard". */
function frameSegments(w, h, tick) {
  const out = [];
  const hw = w / 2;
  const hh = h / 2;
  const c = [
    [-hw, -hh, 1, 1],
    [hw, -hh, -1, 1],
    [hw, hh, -1, -1],
    [-hw, hh, 1, -1],
  ];
  c.forEach(([x, y, sx, sy]) => {
    out.push(x, y, x + tick * sx, y);
    out.push(x, y, x, y + tick * sy);
  });
  return out;
}

/* Sample a CSS cubic-bezier into a polyline. The scene plots the project's
   real easing tokens, so the motion system is literally on the wall. */
function bezierSegments(x1, y1, x2, y2, w, h, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t;
    const y = 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t;
    pts.push(x * w, y * h);
  }
  const out = [];
  for (let i = 0; i < pts.length / 2 - 1; i++) {
    out.push(pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3]);
  }
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

  /* Collects 2D segment lists, transforms them into world space, and merges
     everything into one buffer. Built entirely before the loop starts. */
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

  /* ---- 1. Wireframe screens ---------------------------------------- */
  /* Mobile, tablet and desktop aspect ratios, scattered through the tube
     and angled as if pinned on a wall. */
  const screenMat = new THREE.LineBasicMaterial({ color: 0x3e4655, transparent: true, opacity: 0.5 });
  const ratios = [[0.62, 1.32], [1.1, 0.82], [1.5, 0.95]];
  const screenParts = [];
  for (let i = 0; i < 46; i++) {
    const [w, h] = ratios[i % ratios.length];
    const angle = Math.random() * Math.PI * 2;
    const radius = 6.6 + Math.random() * 6.2;
    screenParts.push({
      seg: screenSegments(w, h),
      pos: [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.6, -2 - Math.random() * DEPTH],
      rot: [0, (Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 0.5],
      scale: 0.85 + Math.random() * 1.5,
    });
  }
  const screens = makeLines(screenParts, screenMat);
  scene.add(screens.mesh);

  /* ---- 2. Flow connectors ------------------------------------------ */
  /* Short links between neighbouring screens: a user flow, drawn in space. */
  const flowMat = new THREE.LineBasicMaterial({ color: 0x2b313c, transparent: true, opacity: 0.55 });
  const flowVerts = [];
  for (let i = 0; i < screenParts.length - 1; i += 3) {
    const a = screenParts[i].pos;
    const b = screenParts[i + 1].pos;
    const dist = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (dist > 14) continue;
    flowVerts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.Float32BufferAttribute(flowVerts, 3));
  const flow = new THREE.LineSegments(flowGeo, flowMat);
  scene.add(flow);

  /* ---- 3. Baseline grid -------------------------------------------- */
  /* The layout grid every screen above is measured against, laid out as a
     floor the camera travels over. */
  const gridMat = new THREE.LineBasicMaterial({ color: 0x1e232c, transparent: true, opacity: 0.9 });
  const gridVerts = [];
  const COLS = 12; /* a 12-column grid, because of course it is */
  for (let c = 0; c <= COLS; c++) {
    const x = -9 + (18 * c) / COLS;
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

  /* ---- 4. Chapter gates as artboard frames -------------------------- */
  /* Six frames, one per chapter, sized 16:10. The reader flies through the
     artboards rather than past abstract rings. */
  const gates = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.LineBasicMaterial({ color: 0x3e4655, transparent: true, opacity: 0.65 });
    const z = -7 - i * (DEPTH / 6.4);
    const part = [
      { seg: frameSegments(15.2, 9.5, 1.5), pos: [0, 0, z] },
      { seg: [-7.6, 5.35, -4.2, 5.35], pos: [0, 0, z] }, /* frame label rule */
    ];
    const gate = makeLines(part, mat);
    scene.add(gate.mesh);
    gates.push({ ...gate, mat });
  }

  /* ---- 5. Case-study markers as hero screens ------------------------ */
  const markerMat = new THREE.LineBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.9 });
  const markerParts = [-18, -36, -54].map((z, i) => ({
    seg: screenSegments(1.5, 3.2),
    pos: [(i % 2 === 0 ? -1 : 1) * (5.2 + Math.abs(z) * 0.26), 0, z],
    rot: [0, (i % 2 === 0 ? 1 : -1) * 0.5, 0],
    scale: 1.5,
  }));
  const markers = makeLines(markerParts, markerMat);
  scene.add(markers.mesh);

  /* ---- 6. Easing curve plots ---------------------------------------- */
  /* Read from the project's own design tokens at runtime, so these are the
     actual curves governing every transition on the page. */
  const curveMat = new THREE.LineBasicMaterial({ color: 0x8a929e, transparent: true, opacity: 0.6 });
  const rootStyle = getComputedStyle(document.documentElement);
  const curveNames = ['--primitive-easing-out-quart', '--primitive-easing-out-expo', '--primitive-easing-in-out-expo'];
  const curveParts = [];
  curveNames.forEach((name, i) => {
    const b = parseBezier(rootStyle.getPropertyValue(name));
    if (!b) return;
    const z = -12 - i * 19;
    curveParts.push({ seg: bezierSegments(b[0], b[1], b[2], b[3], 2.4, 2.4, 26), pos: [5.6, -1.2, z], rot: [0, -0.5, 0] });
    /* axes, so it reads as a plot rather than a stray squiggle */
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
  const screenBase = new THREE.Color(0x3e4655);
  const gridBase = new THREE.Color(0x1e232c);
  const tmp = new THREE.Color();
  let rafId = null;
  let camZ = 4;
  let roll = 0;

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);

    try { target.set(activeAccent); } catch (err) { /* keep last good colour */ }
    accentNow.lerp(target, Math.min(dt * 1.6, 1));

    screenMat.color.copy(tmp.copy(screenBase).lerp(accentNow, 0.2));
    gridMat.color.copy(tmp.copy(gridBase).lerp(accentNow, 0.14));
    flowMat.color.copy(tmp.copy(gridBase).lerp(accentNow, 0.3));
    markerMat.color.copy(accentNow);
    if (curves) curveMat.color.copy(tmp.copy(screenBase).lerp(accentNow, 0.55));
    gates.forEach((g, i) => {
      g.mat.color.copy(tmp.copy(screenBase).lerp(accentNow, 0.16 + i * 0.1));
    });

    const targetZ = 4 - scrollProgress * DEPTH;
    camZ += (targetZ - camZ) * Math.min(dt * 3.2, 1);
    camera.position.z = camZ;

    camera.position.x += (pointer.x * PARALLAX - camera.position.x) * Math.min(dt * 2.4, 1);
    camera.position.y += (-pointer.y * PARALLAX - camera.position.y) * Math.min(dt * 2.4, 1);

    roll += (scrollProgress * 0.16 - roll) * Math.min(dt * 1.5, 1);
    camera.lookAt(0, 0, camZ - 9);
    camera.rotation.z = roll;

    screens.mesh.rotation.z += dt * 0.008;
    markers.mesh.rotation.z += dt * 0.01;

    renderer.render(scene, camera);
  }

  function start() { if (rafId === null) { clock.getDelta(); frame(); } }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();

  /* ---- teardown ------------------------------------------------------ */
  function destroy() {
    stop();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', onResize);
    [screens.geo, flowGeo, gridGeo, markers.geo].forEach((g) => g.dispose());
    if (curves) curves.geo.dispose();
    gates.forEach((g) => { g.geo.dispose(); g.mat.dispose(); });
    [screenMat, flowMat, gridMat, markerMat, curveMat].forEach((m) => m.dispose());
    renderer.dispose();
  }
  window.addEventListener('pagehide', destroy, { once: true });
}
