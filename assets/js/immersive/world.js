/* ============================================================
   WORLD — renderer, camera, controls and the cosmic environment
   the cards float in. Everything that is scenery rather than
   content lives here.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeGlowTexture, makeNebulaTexture } from './textures.js';

export const HOME = {
  position: new THREE.Vector3(0, 3.1, 12.2),
  target: new THREE.Vector3(0, 0.2, 0)
};

const BG = 0x05050c;

export function createWorld(canvas, opts = {}) {
  const reduced = !!opts.reducedMotion;

  /* ---------------- renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  /* ---------------- scene ---------------- */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.021);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  camera.position.copy(HOME.position);

  /* ---------------- controls ---------------- */
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.62;
  controls.minDistance = 5.2;
  controls.maxDistance = 19;
  controls.minPolarAngle = 0.62;   /* never look straight down the pole */
  controls.maxPolarAngle = 1.86;   /* nor from under the floor */
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.32;

  /* ---------------- light ---------------- */
  scene.add(new THREE.AmbientLight(0x8ea8ff, 0.42));

  const key = new THREE.DirectionalLight(0xdfe9ff, 1.1);
  key.position.set(4, 8, 7);
  scene.add(key);

  /* Two coloured rim lights well outside the ring — they graze the card
     edges rather than lighting the faces, which is what keeps the slabs
     reading as dark glass instead of glowing blocks. */
  const cyan = new THREE.PointLight(0x22e7f5, 12, 26, 2);
  cyan.position.set(-8, 3.4, 6);
  scene.add(cyan);

  const violet = new THREE.PointLight(0xb85cff, 12, 26, 2);
  violet.position.set(8, -1.4, -6);
  scene.add(violet);

  /* ---------------- starfield ---------------- */
  const starTex = makeGlowTexture(128, 3.2);
  const stars = buildStars(starTex);
  scene.add(stars);

  /* ---------------- nebulae ---------------- */
  const nebulae = new THREE.Group();
  [
    { color: [34, 231, 245],  pos: [-26, 6, -46],  size: 58, rot: 0.4 },
    { color: [184, 92, 255],  pos: [30, -4, -52],  size: 66, rot: -0.7 },
    { color: [86, 122, 255],  pos: [4, 16, -60],   size: 52, rot: 1.2 }
  ].forEach((n) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(n.size, n.size),
      new THREE.MeshBasicMaterial({
        map: makeNebulaTexture(n.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        opacity: 0.42,
        toneMapped: false
      })
    );
    mesh.position.set(...n.pos);
    mesh.rotation.z = n.rot;
    nebulae.add(mesh);
  });
  scene.add(nebulae);

  /* ---------------- floor and ceiling grids ---------------- */
  const floor = new THREE.GridHelper(160, 80, 0x2ad4e6, 0x1e3a72);
  floor.position.y = -3.4;
  tuneGrid(floor, 0.62);
  scene.add(floor);

  const ceiling = new THREE.GridHelper(160, 80, 0x8a5cff, 0x2b1f57);
  ceiling.position.y = 8.2;
  tuneGrid(ceiling, 0.24);
  scene.add(ceiling);

  /* A pool of light under the ring, so the floor is not just wireframe. */
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture(256, 2.2),
      color: 0x2f6bff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      opacity: 0.34,
      toneMapped: false
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -3.36;
  scene.add(pool);

  /* ---------------- resize ---------------- */
  let width = 1;
  let height = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));

    /* Phones get a lower ceiling: DPR 3 on a small GPU is a slideshow. */
    const cap = width < 720 ? 1.75 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    /* A touch wider on portrait, but not so wide that the cards shrink to
       nothing — the rest of the fit is handled by pulling the camera in. */
    camera.fov = camera.aspect < 0.85 ? 60 : camera.aspect < 1.2 ? 56 : 52;
    camera.updateProjectionMatrix();
  }

  /**
   * The resting shot, adapted to the window. A portrait frame is narrow
   * before it is short, so it needs the camera *further* out to hold a
   * 3.4-unit card, and looking slightly down to clear the bottom nav.
   */
  function homePose() {
    const portrait = camera.aspect < 0.85;
    const pull = portrait ? 1.08 : camera.aspect < 1.2 ? 0.95 : 1;
    return {
      position: HOME.position.clone().multiplyScalar(pull),
      target: HOME.target.clone().setY(portrait ? -0.45 : HOME.target.y)
    };
  }

  resize();

  /* ---------------- per-frame scenery ---------------- */
  function update(dt, elapsed, skipControls) {
    if (!reduced) {
      stars.rotation.y += dt * 0.008;
      stars.rotation.x = Math.sin(elapsed * 0.04) * 0.03;
      nebulae.children.forEach((n, i) => {
        n.material.opacity = 0.36 + Math.sin(elapsed * 0.22 + i * 1.7) * 0.09;
      });
      cyan.intensity = 12 + Math.sin(elapsed * 0.9) * 2.5;
      violet.intensity = 12 + Math.cos(elapsed * 0.7) * 2.5;
    }
    /* Skipped mid-flight: the tween owns the camera until it lands. */
    if (!skipControls) controls.update();
  }

  function dispose() {
    controls.dispose();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!m) return;
        if (m.map) m.map.dispose();
        m.dispose();
      });
    });
    renderer.dispose();
  }

  return {
    renderer,
    scene,
    camera,
    controls,
    resize,
    homePose,
    update,
    dispose,
    get size() { return { width, height }; }
  };
}

/* ------------------------------------------------------------ */

function tuneGrid(grid, opacity) {
  const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
  mats.forEach((m) => {
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.fog = true;           /* let the distance dissolve it */
    m.toneMapped = false;
  });
}

function buildStars(map) {
  const group = new THREE.Group();

  /* Two shells: small dense specks far out, larger sparse ones closer. */
  const shells = [
    { count: 1400, radius: 150, spread: 60, size: 0.9, opacity: 0.85 },
    { count: 420,  radius: 70,  spread: 34, size: 1.9, opacity: 0.55 }
  ];

  shells.forEach((shell) => {
    const positions = new Float32Array(shell.count * 3);
    const colors = new Float32Array(shell.count * 3);
    const tint = new THREE.Color();

    for (let i = 0; i < shell.count; i++) {
      /* Even distribution on a sphere, then jittered outward. */
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = shell.radius + (Math.random() - 0.5) * shell.spread;

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      /* Mostly white, occasionally cyan or violet. */
      const roll = Math.random();
      if (roll > 0.88) tint.setHex(0x22e7f5);
      else if (roll > 0.76) tint.setHex(0xb85cff);
      else tint.setHex(0xdfe6ff);

      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    group.add(new THREE.Points(geo, new THREE.PointsMaterial({
      map,
      size: shell.size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: shell.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false
    })));
  });

  return group;
}
