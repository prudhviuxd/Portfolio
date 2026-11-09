/* =========================================================
   Hero 3D stage. Loaded as a module after the page has painted;
   the headline and CTAs never wait for it.

   The aligning lattice: 25 rounded copper, ember, sand and amber-glass
   blocks drift as a loose cloud and settle into a precise grid when you
   hover them or scroll to the summary (order out of ambiguity); a warm
   light follows the pointer.

   Rests off screen and in hidden tabs, caps device pixel ratio, and
   falls back to the poster on failure.
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const stage = document.querySelector('.hero-stage');
const host = stage && stage.querySelector('.hero-stage-gl');
if (host) start().catch(() => stage.classList.add('is-fallback'));

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  // light: a warm key that follows the pointer, a cool faint rim, amber fill
  const key = new THREE.PointLight(0xffb36b, 60, 30, 1.6);
  key.position.set(3, 2, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9c6ff, 0.6);
  rim.position.set(-6, 4, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe8a165, 0.9);
  fill.position.set(-2, -3, 5);
  scene.add(fill);

  const obj = buildLattice(scene);

  // sizing
  function size() {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
    obj.fit && obj.fit(camera);
  }
  size();
  new ResizeObserver(size).observe(host);

  // inputs: a warm light follows the pointer; hovering the lattice
  // pulls it into its grid, and so does scrolling to the summary line
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let hover = false;
  const hit = (e) => {
    const r = host.getBoundingClientRect();
    // the left edge fades under the copy, so only the visible lattice counts
    hover = e.clientX > r.left + r.width * 0.18 && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
  };
  window.addEventListener('pointermove', (e) => {
    ptr.tx = (e.clientX / innerWidth) * 2 - 1;
    ptr.ty = -((e.clientY / innerHeight) * 2 - 1);
    if (e.pointerType === 'mouse') hit(e);
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') hit(e); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { hover = false; });

  // the grid is complete by the time the summary ("UX Leader with 12
  // years...") sits in the middle of the screen, while the lattice is in view
  const sum = document.querySelector('.hero-sum');
  let gridAt = 200;
  function measure() {
    const top = sum ? sum.getBoundingClientRect().top + scrollY : innerHeight;
    // ...but never later than the lattice leaving view (phones, where it sits above the copy)
    const r = host.getBoundingClientRect();
    const mid = r.top + scrollY + r.height * 0.5;
    gridAt = Math.max(80, Math.min(top - innerHeight * 0.55, mid - innerHeight * 0.12));
  }
  measure();
  window.addEventListener('resize', measure, { passive: true });
  const scrollP = () => Math.min(1, Math.max(0, scrollY / gridAt));

  let k = reduced ? 1 : 0;
  let visible = true, running = false, last = performance.now(), t = 0;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) loop(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt;
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    key.position.set(2.2 + ptr.x * 4.5, 1.2 + ptr.y * 3.2, 6);
    const target = reduced ? 1 : Math.max(scrollP(), hover ? 1 : 0);
    k += (target - k) * Math.min(1, dt * (hover ? 3.2 : 6));
    obj.update(t, ptr, k);
    renderer.render(scene, camera);
  }
  function loop() {
    if (running) return;
    running = true;
    last = performance.now();
    const step = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      frame(now);
      if (reduced) { running = false; return; }   // one still frame, then rest
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  frame(performance.now());
  stage.classList.add('is-live');
  loop();
}

/* ---------------- the aligning lattice ---------------- */
function buildLattice(scene) {
  const COLS = 5, ROWS = 5, N = COLS * ROWS, GAP = 0.66;
  const geo = new RoundedBoxGeometry(0.5, 0.5, 0.5, 4, 0.1);
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xb8653a, metalness: 0.95, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const ember = new THREE.MeshPhysicalMaterial({ color: 0x6e2f14, metalness: 0.7, roughness: 0.45 });
  const sand = new THREE.MeshPhysicalMaterial({ color: 0xe3d4bf, metalness: 0.1, roughness: 0.55, sheen: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffc58f, metalness: 0, roughness: 0.08, transmission: 1, thickness: 0.6,
    ior: 1.45, attenuationColor: new THREE.Color(0xe8a165), attenuationDistance: 0.9, clearcoat: 1 });
  const mats = [copper, copper, copper, copper, ember, ember, sand, glass, glass];
  const group = new THREE.Group();
  group.rotation.set(-0.5, 0.62, 0.12);
  scene.add(group);

  // stable pseudo-random so the composition is the same on every load
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cubes = [];
  for (let i = 0; i < N; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    const grid = new THREE.Vector3((c - (COLS - 1) / 2) * GAP, (r - (ROWS - 1) / 2) * GAP, 0);
    // loose cloud: same neighbourhood, pushed out in depth and scattered
    const a = rnd() * Math.PI * 2, rad = 0.3 + rnd() * 0.9;
    const cloud = new THREE.Vector3(grid.x * 1.3 + Math.cos(a) * rad * 0.45, grid.y * 1.3 + Math.sin(a) * rad * 0.45, (rnd() - 0.5) * 2.6);
    const mat = mats[Math.floor(rnd() * mats.length)];
    const m = new THREE.Mesh(geo, mat);
    m.userData = { grid, cloud, spin: new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).multiplyScalar(1.2), ph: rnd() * 6.28, sc: 0.75 + rnd() * 0.35 };
    group.add(m); cubes.push(m);
  }
  const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const tmp = new THREE.Vector3();
  return {
    fit(camera) { group.position.x = camera.aspect < 1 ? 0 : 0.35; group.scale.setScalar(camera.aspect < 0.8 ? 0.72 : 0.84); },
    update(t, ptr, p) {
      // p: 0 = loose cloud, 1 = grid (scroll or hover)
      const k = ease(Math.min(1, Math.max(0, p)));
      for (const m of cubes) {
        const u = m.userData;
        tmp.lerpVectors(u.cloud, u.grid, k);
        tmp.y += Math.sin(t * 0.6 + u.ph) * 0.08 * (1 - k);
        m.position.copy(tmp);
        m.rotation.set(u.spin.x * (1 - k) + t * 0.05 * (1 - k), u.spin.y * (1 - k) + t * 0.07 * (1 - k), u.spin.z * (1 - k));
        m.scale.setScalar(THREE.MathUtils.lerp(u.sc, 1, k));
      }
      group.rotation.y = 0.62 + ptr.x * 0.16 + Math.sin(t * 0.15) * 0.05 * (1 - k);
      group.rotation.x = -0.5 + ptr.y * 0.1;
    }
  };
}
