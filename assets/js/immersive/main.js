/* ============================================================
   MAIN — boot, loop, and the wiring between the 3D scene,
   the HUD and the HTML overlay.

   Boot order matters: detect WebGL, wait for the webfonts the
   card labels are drawn with, build the world, then reveal.
   Any failure at all falls back to the flat HTML view rather
   than showing an empty black page.
   ============================================================ */

import { NODES, nodeById } from './content.js';
import { waitForFonts } from './textures.js';
import { createWorld } from './world.js';
import { createNodes } from './nodes.js';
import { createInteraction } from './interaction.js';
import { createOverlay, renderFallback } from './overlay.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const dom = {
  stage: document.getElementById('stage'),
  canvas: document.getElementById('scene'),
  loader: document.getElementById('loader'),
  hud: document.getElementById('hud'),
  hint: document.getElementById('hint'),
  readout: document.getElementById('readout'),
  reset: document.getElementById('reset'),
  nav: document.getElementById('node-nav'),
  fallback: document.getElementById('fallback')
};

/* ------------------------------------------------------------
   the HUD node list is built from the same data as everything
   else, and is the keyboard route into each card
   ------------------------------------------------------------ */
function buildNav() {
  const frag = document.createDocumentFragment();

  NODES.forEach((node) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-btn';
    btn.dataset.node = node.id;
    btn.style.setProperty('--accent', node.accent.css);

    const idx = document.createElement('span');
    idx.className = 'nav-idx mono';
    idx.textContent = node.index;

    const name = document.createElement('span');
    name.className = 'nav-name';
    name.textContent = node.title;

    btn.append(idx, name);
    li.append(btn);
    frag.append(li);
  });

  dom.nav.replaceChildren(frag);
}

/* ------------------------------------------------------------
   WebGL check — a context that will not create is not an error
   worth throwing, it is just a different portfolio
   ------------------------------------------------------------ */
function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch (err) {
    return false;
  }
}

function useFallback(reason) {
  if (reason) console.warn('[immersive] falling back to flat view:', reason);
  document.body.classList.add('no-webgl');
  document.body.classList.remove('is-loading');
  renderFallback(dom.fallback);
}

/* ------------------------------------------------------------
   boot
   ------------------------------------------------------------ */
async function boot() {
  buildNav();

  if (!webglAvailable()) {
    useFallback('no WebGL context');
    return;
  }

  await waitForFonts();

  let world;
  let nodes;
  try {
    world = createWorld(dom.canvas, { reducedMotion });
    nodes = createNodes(world.scene, world.renderer, { reducedMotion });
  } catch (err) {
    useFallback(err);
    return;
  }

  const overlay = createOverlay({
    onClose: () => {
      interaction.release();
      setActiveNav(null);
      dom.reset.hidden = true;
    },
    onNavigate: (id) => enter(id)
  });

  const interaction = createInteraction({
    world,
    nodes,
    canvas: dom.canvas,
    reducedMotion,
    onHover: (node) => {
      dom.readout.textContent = node ? node.title : '';
      dom.readout.classList.toggle('is-on', !!node);
    },
    onSelect: (node) => enter(node.id),
    onDeselect: () => overlay.close(),
    onFocused: (node) => {
      overlay.open(node);
      dom.reset.hidden = false;
    }
  });

  /* ---------------- entering a card ---------------- */
  function enter(id) {
    const node = nodeById(id);
    if (!node) return;
    if (overlay.isOpen && overlay.node === node) return;

    /* Close first so the panel is not sliding while the camera moves. */
    if (overlay.isOpen) overlay.close(true);

    setActiveNav(id);
    dom.hint.classList.add('is-out');
    interaction.focus(id);
  }

  function setActiveNav(id) {
    dom.nav.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.node === id);
      btn.setAttribute('aria-current', btn.dataset.node === id ? 'true' : 'false');
    });
  }

  dom.nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (btn) enter(btn.dataset.node);
  });

  dom.reset.addEventListener('click', () => overlay.close());

  /* ---------------- keyboard ---------------- */
  document.addEventListener('keydown', (e) => {
    if (overlay.isOpen || e.metaKey || e.ctrlKey || e.altKey) return;

    /* 1–4 jump straight to a card. */
    const n = Number(e.key);
    if (n >= 1 && n <= NODES.length) {
      enter(NODES[n - 1].id);
      return;
    }
    if (e.key === 'Escape') {
      setActiveNav(null);
      interaction.release();
      dom.reset.hidden = true;
    }
  });

  /* ---------------- resize ---------------- */
  let resizeRaf = 0;
  function onResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      world.resize();
      interaction.reframe();
    });
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(onResize).observe(dom.stage);
  } else {
    window.addEventListener('resize', onResize);
  }
  window.addEventListener('orientationchange', onResize);

  /* ---------------- loop ---------------- */
  const clock = { last: performance.now(), elapsed: 0 };
  let running = true;
  let frame = 0;

  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (!running) return;

    /* Clamped so a backgrounded tab does not resume with a huge step.
       Generous enough that a 12fps machine still finishes a flight on time. */
    const dt = Math.min((now - clock.last) / 1000, 0.1);
    clock.last = now;
    clock.elapsed += dt;

    interaction.update(dt);
    world.update(dt, clock.elapsed, interaction.busy);
    nodes.update(dt, clock.elapsed);
    world.renderer.render(world.scene, world.camera);
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    clock.last = performance.now();
  });

  window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });

  /* ---------------- reveal ---------------- */
  world.resize();
  frame = requestAnimationFrame(tick);

  document.body.classList.remove('is-loading');
  document.body.classList.add('is-ready');

  /* Establishing shot: drop in from above and behind, unless the visitor
     asked for less motion or deep-linked straight to a card. */
  const deepLink = nodeById(location.hash.replace('#', ''));

  if (deepLink) {
    interaction.focus(deepLink.id, { instant: true });
    setActiveNav(deepLink.id);
    dom.hint.classList.add('is-out');
  } else if (!reducedMotion) {
    const home = world.homePose();
    interaction.placeAt(
      { x: home.position.x, y: home.position.y + 9, z: home.position.z + 15 },
      home.target
    );
    interaction.flyHome();
  }

  /* Retire the hint once it has been read, or once it is moot. */
  setTimeout(() => dom.hint.classList.add('is-out'), 9000);
}

boot().catch(useFallback);
