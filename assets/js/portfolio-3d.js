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
 * The scene is a starfield: three parallax layers of points the camera flies
 * into as the reader scrolls, with a soft glow at each chapter depth.
 *
 * Three.js rules from ui-ux-pro-max --stack threejs: pixel ratio capped at 2,
 * no geometry in the frame loop, Points plus BufferGeometry for particles,
 * aspect + projection matrix on resize, and geometry, material and texture all
 * disposed on teardown.
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

/* ---------- Starfield ------------------------------------------------ */
/* The corridor is now open space. Three depth layers of points give real
   parallax as the camera dollies: near stars sweep past, far ones barely
   move. Six soft glows sit at the chapter depths so passing from one
   chapter to the next reads as travelling through something, and three
   brighter beacons mark the deep case studies.

   Per ui-ux-pro-max --stack threejs: Points plus BufferGeometry for every
   particle system (severity High), a particle budget starting at 3000
   (High), and geometry, material AND texture disposed on teardown
   (Critical). Nothing is constructed inside the frame loop — the drift
   mutates the existing position buffer in place. */

/* One soft round sprite, generated once and shared by every layer.
   Without it, Points render as hard squares. */
function makeStarTexture(THREE) {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

async function initScene() {
  const THREE = await import('./vendor/three.module.min.js');

  const scene = new THREE.Scene();
  /* Thinner fog than a corridor wants — in space the far stars should still
     register rather than being swallowed. */
  scene.fog = new THREE.FogExp2(0x08090b, 0.012);

  const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 0, 4);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x08090b, 1);

  const DEPTH = 74;
  const SPAN = DEPTH + 30;      /* stars run past both ends of the travel */
  const starTex = makeStarTexture(THREE);

  /* Build one layer of stars. `inner` keeps the very centre of frame a
     little clearer so headline copy never sits on a bright point. */
  function makeLayer({ count, size, opacity, inner, outer, speed, accentMix }) {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = inner + Math.pow(Math.random(), 0.7) * (outer - inner);
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = Math.sin(angle) * radius * 0.72;
      arr[i * 3 + 2] = 10 - Math.random() * SPAN;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      size,
      map: starTex,
      transparent: true,
      opacity,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    return { points, geo, mat, arr, speed, accentMix, base: new THREE.Color(0xdfe6f2) };
  }

  const layers = [
    /* far: the dust that gives depth                       */
    makeLayer({ count: 2000, size: 0.075, opacity: 0.5, inner: 2.5, outer: 26, speed: 0.35, accentMix: 0.18 }),
    /* mid: the readable starfield                          */
    makeLayer({ count: 800, size: 0.16, opacity: 0.62, inner: 3.2, outer: 20, speed: 0.9, accentMix: 0.3 }),
    /* near: the few that sweep past and sell the motion    */
    makeLayer({ count: 200, size: 0.34, opacity: 0.72, inner: 4.5, outer: 15, speed: 2.1, accentMix: 0.55 }),
  ];

  /* Chapter glows — soft nebulae at each chapter's depth, so a chapter
     change is something you pass through rather than only a colour shift. */
  const glowGeo = new THREE.BufferGeometry();
  const glowPos = new Float32Array(6 * 3);
  for (let i = 0; i < 6; i++) {
    glowPos[i * 3] = (i % 2 === 0 ? -1 : 1) * 3.4;
    glowPos[i * 3 + 1] = (i % 3 - 1) * 2.2;
    glowPos[i * 3 + 2] = -6 - i * (DEPTH / 6.2);
  }
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  const glowMat = new THREE.PointsMaterial({
    size: 9, map: starTex, transparent: true, opacity: 0.30,
    depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending,
  });
  const glows = new THREE.Points(glowGeo, glowMat);
  glows.frustumCulled = false;
  scene.add(glows);

  /* Case-study beacons at the three deep write-ups. */
  const beaconGeo = new THREE.BufferGeometry();
  const beaconPos = new Float32Array(3 * 3);
  [-18, -36, -54].forEach((z, i) => {
    beaconPos[i * 3] = (i % 2 === 0 ? -1 : 1) * 5.4;
    beaconPos[i * 3 + 1] = 0.6;
    beaconPos[i * 3 + 2] = z;
  });
  beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute(beaconPos, 3));
  const beaconMat = new THREE.PointsMaterial({
    size: 1.5, map: starTex, transparent: true, opacity: 0.95,
    depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending,
  });
  const beacons = new THREE.Points(beaconGeo, beaconMat);
  beacons.frustumCulled = false;
  scene.add(beacons);

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
  const tmp = new THREE.Color();
  let rafId = null, camZ = 4, roll = 0;

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);

    try { target.set(activeAccent); } catch (err) { /* keep last good colour */ }
    accentNow.lerp(target, Math.min(dt * 1.6, 1));

    const targetZ = 4 - scrollProgress * DEPTH;
    camZ += (targetZ - camZ) * Math.min(dt * 3.2, 1);
    camera.position.z = camZ;
    camera.position.x += (pointer.x * PARALLAX - camera.position.x) * Math.min(dt * 2.4, 1);
    camera.position.y += (-pointer.y * PARALLAX - camera.position.y) * Math.min(dt * 2.4, 1);
    roll += (scrollProgress * 0.16 - roll) * Math.min(dt * 1.5, 1);
    camera.lookAt(0, 0, camZ - 9);
    camera.rotation.z = roll;

    /* Ambient drift toward the viewer, wrapped. Each layer moves at its own
       rate, which is what reads as depth. Positions are mutated in place —
       no geometry is created here. */
    layers.forEach((layer) => {
      const a = layer.arr;
      const front = camZ + 6;
      for (let i = 2; i < a.length; i += 3) {
        a[i] += dt * layer.speed;
        if (a[i] > front) a[i] -= SPAN;
      }
      layer.geo.attributes.position.needsUpdate = true;
      layer.mat.color.copy(tmp.copy(layer.base).lerp(accentNow, layer.accentMix));
    });

    glowMat.color.copy(accentNow);
    beaconMat.color.copy(accentNow);

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
    layers.forEach((l) => { l.geo.dispose(); l.mat.dispose(); });
    glowGeo.dispose(); glowMat.dispose();
    beaconGeo.dispose(); beaconMat.dispose();
    starTex.dispose();   /* the one texture in the scene */
    renderer.dispose();
  }
  window.addEventListener('pagehide', destroy, { once: true });
}
