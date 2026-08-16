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
 * The vanilla `motion` package provides the same engine the React API sits on.
 *
 * Three.js rules from ui-ux-pro-max --stack threejs: pixel ratio capped at 2,
 * no geometry in the frame loop, aspect + projection matrix on resize,
 * explicit dispose on teardown.
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

/* Accent of the chapter currently in view. The 3D scene lerps toward it, and
   the fixed wash/progress bar inherit it off :root. */
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
  /* No Motion bundle, or the reader asked for stillness: show the final
     readable state immediately. The narrative never depends on the effect. */
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
          {
            type: 'spring',
            stiffness: 100,
            damping: 20,
            /* Capped at ~8 children before the tail starts to feel laggy,
               per the stagger guidance in the motion presets. */
            delay: stagger(0.055, { startDelay: 0.02 }),
          }
        );
      },
      { amount: 0.12 }
    );
  });
}

/* ------------------------------------------------------------------ */
/* Chapter tracking — accent, rail, nav                                */
/* ------------------------------------------------------------------ */

function setActiveChapter(section) {
  const accent = getComputedStyle(section).getPropertyValue('--ch').trim();
  if (accent) {
    activeAccent = accent;
    document.documentElement.style.setProperty('--ch', accent);
  }
  const id = section.id;
  railLinks.forEach((a) =>
    a.setAttribute('aria-current', String(a.dataset.rail === id))
  );
  navLinks.forEach((a) =>
    a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id))
  );
}

if ('IntersectionObserver' in window && chapters.length) {
  const chapterIO = new IntersectionObserver(
    (entries) => {
      /* Whichever chapter owns the most of the middle band wins, so a short
         chapter between two long ones still gets its turn. */
      let best = null;
      entries.forEach((e) => {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
          best = e;
        }
      });
      if (best) setActiveChapter(best.target);
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
  );
  chapters.forEach((c) => chapterIO.observe(c));
  setActiveChapter(chapters[0]);
}

/* Case cards light up as they pass centre-frame. */
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
  /* Parallax is applied to the oversized chapter numerals only. Body copy is
     never parallaxed — it hurts reading comfort and can trigger motion
     sickness (ui-ux-pro-max, severity High). Offsets stay small so the
     layers never visibly desync. */
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
    return !!(
      window.WebGLRenderingContext &&
      (probe.getContext('webgl2') || probe.getContext('webgl'))
    );
  } catch (err) {
    return false;
  }
}

if (REDUCED) dropCanvas('reduced-motion');
else if (!webglAvailable()) dropCanvas('no-webgl');
else initScene().catch(() => dropCanvas('load-failed'));

async function initScene() {
  const THREE = await import('./vendor/three.module.min.js');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08090b, 0.026);

  const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 140);
  camera.position.set(0, 0, 4);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x08090b, 1);

  /* ---- geometry: constructed once ---------------------------------- */

  const COUNT = 520;
  const DEPTH = 74;

  const cellGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
  const cellMat = new THREE.MeshBasicMaterial({
    color: 0x3e4655, wireframe: true, transparent: true, opacity: 0.34,
  });

  const field = new THREE.InstancedMesh(cellGeo, cellMat, COUNT);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6.2 + Math.random() * 6.5;
    dummy.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.6,
      -1 - Math.random() * DEPTH
    );
    dummy.rotation.set(Math.random() * 3.14, Math.random() * 3.14, 0);
    const s = 0.4 + Math.random() * 1.1;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    field.setMatrixAt(i, dummy.matrix);
  }
  field.instanceMatrix.needsUpdate = true;
  scene.add(field);

  /* Chapter gates: one ring per chapter, tinted by that chapter's accent.
     They give the dolly something to pass through, so depth is legible. */
  const gateGeo = new THREE.TorusGeometry(7.4, 0.02, 8, 96);
  const gates = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x3e4655, transparent: true, opacity: 0.5 });
    const gate = new THREE.Mesh(gateGeo, mat);
    gate.position.z = -6 - i * (DEPTH / 6.6);
    gate.rotation.z = i * 0.4;
    scene.add(gate);
    gates.push({ mesh: gate, mat, spin: 0.05 + i * 0.02 });
  }

  const markerGeo = new THREE.BoxGeometry(0.45, 3.6, 0.45);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xff7a2f, wireframe: true, transparent: true, opacity: 0.8 });
  const markers = [-18, -36, -54].map((z, i) => {
    const m = new THREE.Mesh(markerGeo, markerMat);
    const x = 4.5 + Math.abs(z) * 0.3;
    m.position.set(i % 2 === 0 ? -x : x, 0, z);
    scene.add(m);
    return m;
  });

  /* ---- interaction -------------------------------------------------- */

  const pointer = { x: 0, y: 0 };
  const PARALLAX = 0.3; /* clamped, per the magnetic-hover preset */

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

  /* ---- loop --------------------------------------------------------- */

  const clock = new THREE.Clock();
  const target = new THREE.Color(activeAccent);
  const accentNow = new THREE.Color(activeAccent);
  const fieldBase = new THREE.Color(0x3e4655);
  const fieldNow = new THREE.Color(0x3e4655);
  let rafId = null;
  let camZ = 4;
  let roll = 0;

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);

    /* Colour follows the chapter, eased rather than snapped — the visible
       half of "each chapter has a distinct colour, building intensity". */
    try { target.set(activeAccent); } catch (err) { /* keep last good colour */ }
    accentNow.lerp(target, Math.min(dt * 1.6, 1));
    fieldNow.copy(fieldBase).lerp(accentNow, 0.22);
    cellMat.color.copy(fieldNow);
    markerMat.color.copy(accentNow);
    gates.forEach((g, i) => {
      g.mat.color.copy(fieldBase).lerp(accentNow, 0.15 + i * 0.11);
    });

    const targetZ = 4 - scrollProgress * DEPTH;
    camZ += (targetZ - camZ) * Math.min(dt * 3.2, 1);
    camera.position.z = camZ;

    camera.position.x += (pointer.x * PARALLAX - camera.position.x) * Math.min(dt * 2.4, 1);
    camera.position.y += (-pointer.y * PARALLAX - camera.position.y) * Math.min(dt * 2.4, 1);

    /* A slow roll tied to depth. Small enough to read as drift, not spin. */
    roll += (scrollProgress * 0.22 - roll) * Math.min(dt * 1.5, 1);
    camera.rotation.z = roll;
    camera.lookAt(0, 0, camZ - 9);
    camera.rotation.z = roll;

    field.rotation.z += dt * 0.01;
    gates.forEach((g) => { g.mesh.rotation.z += dt * g.spin * 0.3; });
    markers.forEach((m, i) => { m.rotation.y += dt * (0.1 + i * 0.05); });

    renderer.render(scene, camera);
  }

  function start() { if (rafId === null) { clock.getDelta(); frame(); } }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();

  /* ---- teardown ----------------------------------------------------- */
  /* Three.js frees no GPU memory on its own. No textures in this scene, so
     geometry and materials are the whole list. */
  function destroy() {
    stop();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', onResize);
    cellGeo.dispose(); cellMat.dispose();
    gateGeo.dispose(); gates.forEach((g) => g.mat.dispose());
    markerGeo.dispose(); markerMat.dispose();
    field.dispose();
    renderer.dispose();
  }
  window.addEventListener('pagehide', destroy, { once: true });
}
