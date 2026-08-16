/* Immersive 3D route - scene + reveal.
 *
 * Progressive enhancement, in strict order of fallback:
 *   no JS      -> <noscript> shows all content, hides the canvas
 *   JS, no WebGL -> canvas removed, CSS gradient carries the backdrop
 *   reduced motion -> canvas removed, content rendered in final state
 *   full       -> scroll-driven camera dolly + clamped pointer parallax
 *
 * Three.js rules applied from ui-ux-pro-max --stack threejs:
 *   - setPixelRatio capped at 2                       (severity: High)
 *   - no geometry constructed inside the frame loop   (severity: Critical)
 *   - camera.aspect + updateProjectionMatrix on resize(severity: High)
 *   - explicit geometry/material dispose on teardown  (severity: Critical)
 */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Mark the document as enhanced so CSS may hide .r elements. Without this
   attribute every .r stays visible, which is what a no-JS visitor gets. */
document.documentElement.setAttribute('data-enhanced', '');

/* ------------------------------------------------------------------ */
/* Reveal + scroll progress. Runs whether or not WebGL is available.   */
/* ------------------------------------------------------------------ */

const revealables = document.querySelectorAll('.r');

if (REDUCED || !('IntersectionObserver' in window)) {
  revealables.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    },
    /* Mirrors the ui-ux-pro-max "Scroll Reveal / Subtle" preset: fire a
       little before the element lands, and only once. */
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
  );
  revealables.forEach((el) => io.observe(el));
}

const progbar = document.getElementById('progbar');
const cases = Array.from(document.querySelectorAll('.case'));

let scrollProgress = 0;

function readScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  if (progbar) progbar.style.width = (scrollProgress * 100).toFixed(2) + '%';
}

readScroll();
window.addEventListener('scroll', readScroll, { passive: true });
window.addEventListener('resize', readScroll);

/* Highlight the case study nearest the viewport centre. Cheap, and it gives
   the 3D markers something to stay in sync with. */
if ('IntersectionObserver' in window && cases.length) {
  const caseIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('active', entry.isIntersecting);
      });
    },
    { rootMargin: '-35% 0px -35% 0px' }
  );
  cases.forEach((el) => caseIO.observe(el));
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

if (REDUCED) {
  /* ui-ux-pro-max UX guideline "Motion Sensitivity" (High): honour the
     preference and present the final readable state - no scene at all. */
  dropCanvas('reduced-motion');
} else if (!webglAvailable()) {
  dropCanvas('no-webgl');
} else {
  initScene().catch(() => dropCanvas('load-failed'));
}

async function initScene() {
  /* Self-hosted rather than pulled from a CDN: keeps the page working
     offline and behind restrictive networks, and avoids a third-party
     runtime request. three@0.180.0, MIT, vendored verbatim. */
  const THREE = await import('./vendor/three.module.min.js');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0b0d, 0.028);

  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    120
  );
  camera.position.set(0, 0, 4);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  /* Cap at 2, not 3 - retina phones otherwise render 9x the pixels. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x0a0b0d, 1);

  /* ---- geometry: built once, before the loop ---------------------- */

  const COUNT = 420;
  const DEPTH = 56;

  const cellGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
  const cellMat = new THREE.MeshBasicMaterial({
    color: 0x3d434c,
    wireframe: true,
    transparent: true,
    /* Kept low deliberately. The headline has to win: this is a design
       leader's portfolio, and the moodboard is explicit that structure
       beats spectacle. The field is texture, not subject. */
    opacity: 0.38,
  });

  const field = new THREE.InstancedMesh(cellGeo, cellMat, COUNT);
  const dummy = new THREE.Object3D();
  const spins = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    /* Hollow tube with a wide bore. The inner radius is what keeps the
       centre of frame clear, so the headline never competes with geometry;
       the field starts behind the camera plane too, so nothing large drifts
       across the hero. */
    const angle = Math.random() * Math.PI * 2;
    const radius = 5.8 + Math.random() * 5.4;
    dummy.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.62,
      -1 - Math.random() * DEPTH
    );
    dummy.rotation.set(Math.random() * 3.14, Math.random() * 3.14, 0);
    const s = 0.4 + Math.random() * 1.1;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    field.setMatrixAt(i, dummy.matrix);
    spins[i] = 0.08 + Math.random() * 0.22;
  }
  field.instanceMatrix.needsUpdate = true;
  scene.add(field);

  /* Three accent monoliths, one per case study. */
  const markerGeo = new THREE.BoxGeometry(0.5, 3.4, 0.5);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xea580c,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });
  /* Held well outside the text column so an accent bar never reads as a
     glitch behind a headline. */
  const markerDepths = [-13, -27, -41];
  const markers = markerDepths.map((z, i) => {
    const m = new THREE.Mesh(markerGeo, markerMat);
    /* Offset scales with depth. A fixed x drifts toward frame centre under
       perspective, which reads as an accent bar struck through the
       headline; widening with distance keeps every marker out at the edge. */
    const x = 4 + Math.abs(z) * 0.3;
    m.position.set(i % 2 === 0 ? -x : x, 0, z);
    scene.add(m);
    return m;
  });

  /* Horizon line - a single flat ring for depth reference. */
  const ringGeo = new THREE.RingGeometry(9, 9.06, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x2a2e35,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.z = -DEPTH + 6;
  scene.add(ring);

  /* ---- interaction ------------------------------------------------ */

  const pointer = { x: 0, y: 0 };
  /* Clamped to 0.3 per the ui-ux-pro-max magnetic-hover preset: enough to
     feel alive, never enough to throw the composition off-axis. */
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

  /* ---- loop ------------------------------------------------------- */

  const clock = new THREE.Clock();
  let rafId = null;
  let camZ = 4;

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05); // clamp after tab switches

    /* Dolly the camera along the corridor with scroll. Eased toward the
       target rather than snapped, so a flung scroll still reads smoothly. */
    const targetZ = 4 - scrollProgress * DEPTH;
    camZ += (targetZ - camZ) * Math.min(dt * 3.2, 1);
    camera.position.z = camZ;

    camera.position.x += (pointer.x * PARALLAX - camera.position.x) * Math.min(dt * 2.4, 1);
    camera.position.y += (-pointer.y * PARALLAX - camera.position.y) * Math.min(dt * 2.4, 1);
    camera.lookAt(0, 0, camZ - 8);

    field.rotation.z += dt * 0.012;

    for (let i = 0; i < markers.length; i++) {
      markers[i].rotation.y += dt * spins[i];
    }
    ring.rotation.z -= dt * 0.05;

    renderer.render(scene, camera);
  }

  function start() {
    if (rafId === null) {
      clock.getDelta();
      frame();
    }
  }
  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* Don't burn GPU on a background tab. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();

  /* ---- teardown --------------------------------------------------- */
  /* Three.js never frees GPU memory on its own. Dispose every geometry and
     material explicitly; this scene uses no textures, so there are none to
     release. */
  function destroy() {
    stop();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', onResize);
    cellGeo.dispose();
    cellMat.dispose();
    markerGeo.dispose();
    markerMat.dispose();
    ringGeo.dispose();
    ringMat.dispose();
    field.dispose();
    renderer.dispose();
  }
  window.addEventListener('pagehide', destroy, { once: true });
}
