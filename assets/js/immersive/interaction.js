/* ============================================================
   INTERACTION — raycasting, hover, and the camera flight.

   Pointer rules that matter:
   · hover only for fine pointers, a touch "hover" is a lie
   · a click is a press that moved less than 8px in under 600ms,
     otherwise it was an orbit drag and must not open anything
   · the raycaster hits oversized invisible planes, not the card
     geometry, so a fat finger still lands on the target
   ============================================================ */

import * as THREE from 'three';

const CLICK_SLOP = 8;      /* px of travel still counted as a click */
const CLICK_TIME = 600;    /* ms */
const IDLE_RESUME = 5000;  /* ms before the ring starts drifting again */

export function createInteraction(ctx) {
  const { world, nodes, canvas, reducedMotion } = ctx;
  const { camera, controls } = world;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const cursor = { x: 0, y: 0 };   /* last client coords, cast on the next frame */
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let hovered = null;
  let focused = null;
  let pointerInside = false;
  let needsCast = false;
  let press = null;
  let idleTimer = 0;

  const flight = createFlight(world, { reducedMotion });

  /* ------------------------------------------------------------
     framing
     ------------------------------------------------------------ */

  /** Where the camera should sit to hold one card in frame. */
  function poseFor(item) {
    const wide = window.innerWidth >= 900;

    /* Fraction of the viewport height the card should occupy. The panel
       eats the left half on desktop and the lower half on handhelds, so
       the card is nudged clear of it in each case. */
    /* Portrait has to clear a sheet covering the bottom 64%, so the card is
       both smaller and pushed well up; landscape only has to dodge a panel
       on the left. */
    const fill = wide ? 0.46 : 0.24;
    const lateral = wide ? 1.35 : 0;
    const vertical = wide ? 0.15 : -2.85;

    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const dist = THREE.MathUtils.clamp(
      (nodes.cardHeight / 2 / fill) / Math.tan(halfFov),
      3.1,
      9
    );

    /* Camera-space right, derived the same way OrbitControls does it.
       Shifting camera and target together translates the view, which
       slides the card across the screen without skewing it. */
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), item.normal).normalize();
    const shift = right.multiplyScalar(-lateral).add(new THREE.Vector3(0, vertical, 0));

    const target = item.center.clone().add(shift);
    const position = item.center
      .clone()
      .add(item.normal.clone().multiplyScalar(dist))
      .add(shift);

    return { position, target };
  }

  /* ------------------------------------------------------------
     focus / release
     ------------------------------------------------------------ */
  function focus(id, opts = {}) {
    const item = nodes.get(id);
    if (!item) return;

    focused = item;
    nodes.setFocus(id);
    setHovered(null);
    controls.autoRotate = false;

    const pose = poseFor(item);

    /* A deep link has no previous shot to fly from — land on it. */
    if (opts.instant) {
      flight.jump(pose.position, pose.target);
      if (ctx.onFocused) ctx.onFocused(item.data);
      return;
    }

    flight.to(pose.position, pose.target, 0.95, () => {
      if (ctx.onFocused) ctx.onFocused(item.data);
    });
  }

  function release() {
    if (!focused) return;
    focused = null;
    nodes.setFocus(null);

    const home = world.homePose();
    flight.to(home.position, home.target, 1.05, () => {
      if (!reducedMotion) controls.autoRotate = true;
    });
  }

  /* Re-frame if the window changed shape while a card is held. */
  function reframe() {
    if (!focused || flight.active) return;
    const pose = poseFor(focused);
    flight.to(pose.position, pose.target, 0.4);
  }

  /* ------------------------------------------------------------
     raycasting
     ------------------------------------------------------------ */
  function castAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(nodes.hitTargets, false);
    return hits.length ? nodes.get(hits[0].object.userData.nodeId) : null;
  }

  function setHovered(item) {
    if (hovered === item) return;
    hovered = item;
    nodes.setHover(item ? item.data.id : null);
    canvas.style.cursor = item ? 'pointer' : '';
    if (ctx.onHover) ctx.onHover(item ? item.data : null);
  }

  /* ------------------------------------------------------------
     events
     ------------------------------------------------------------ */
  function onPointerMove(e) {
    pointerInside = true;
    if (!fine || flight.active) return;
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    needsCast = true;
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    press = { x: e.clientX, y: e.clientY, t: performance.now() };
    controls.autoRotate = false;
    idleTimer = 0;
  }

  function onPointerUp(e) {
    if (!press) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    const moved = Math.hypot(dx, dy);
    const elapsed = performance.now() - press.t;
    press = null;

    if (moved > CLICK_SLOP || elapsed > CLICK_TIME || flight.active) return;

    const item = castAt(e.clientX, e.clientY);
    if (item) {
      if (ctx.onSelect) ctx.onSelect(item.data);
    } else if (focused && ctx.onDeselect) {
      ctx.onDeselect();
    }
  }

  function onPointerLeave() {
    pointerInside = false;
    setHovered(null);
  }

  function onWheel() {
    controls.autoRotate = false;
    idleTimer = 0;
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
  canvas.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('blur', onPointerLeave);

  /* ------------------------------------------------------------
     frame
     ------------------------------------------------------------ */
  function update(dt) {
    flight.update(dt);

    if (needsCast && pointerInside && !flight.active) {
      needsCast = false;
      setHovered(castAt(cursor.x, cursor.y));
    }

    /* Drift back in once the visitor has left it alone for a while. */
    if (!reducedMotion && !controls.autoRotate && !focused && !press) {
      idleTimer += dt * 1000;
      if (idleTimer > IDLE_RESUME) controls.autoRotate = true;
    }
  }

  function dispose() {
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('wheel', onWheel);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('blur', onPointerLeave);
  }

  return {
    update,
    focus,
    release,
    reframe,
    dispose,
    flyHome: (onDone) => {
      const home = world.homePose();
      flight.to(home.position, home.target, 1.5, onDone);
    },
    placeAt: (position, target) => flight.jump(position, target),
    get busy() { return flight.active; },
    get focused() { return focused ? focused.data : null; }
  };
}

/* ============================================================
   FLIGHT — quadratic-bezier camera move with eased time.
   A straight lerp between two orbit positions cuts through the
   middle of the ring; the arc keeps the camera outside it.
   ============================================================ */
function createFlight(world, { reducedMotion }) {
  const { camera, controls } = world;

  const fromPos = new THREE.Vector3();
  const fromTgt = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  const toTgt = new THREE.Vector3();
  const ctrl = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  let t = 0;
  let dur = 1;
  let active = false;
  let done = null;

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function finish() {
    active = false;
    camera.position.copy(toPos);
    controls.target.copy(toTgt);
    controls.enabled = true;
    controls.update();
    const cb = done;
    done = null;
    if (cb) cb();
  }

  function jump(position, target) {
    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
  }

  function to(position, target, seconds, onDone) {
    done = onDone || null;

    if (reducedMotion) {
      toPos.copy(position);
      toTgt.copy(target);
      finish();
      return;
    }

    /* Clear any damping the controls were still applying, so it does not
       fight the tween when we hand the camera back. */
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    controls.enabled = false;

    fromPos.copy(camera.position);
    fromTgt.copy(controls.target);
    toPos.copy(position);
    toTgt.copy(target);

    /* Control point: midway, pushed outward from the ring axis and lifted,
       which is what turns a cut-through into a swing-around. */
    ctrl.addVectors(fromPos, toPos).multiplyScalar(0.5);
    tmpA.set(ctrl.x, 0, ctrl.z);
    if (tmpA.lengthSq() > 1e-4) ctrl.add(tmpA.normalize().multiplyScalar(2.2));
    ctrl.y += 1.5;

    t = 0;
    dur = Math.max(0.1, seconds);
    active = true;
  }

  function update(dt) {
    if (!active) return;

    t += dt / dur;
    if (t >= 1) {
      finish();
      return;
    }

    const e = easeInOutCubic(t);
    const inv = 1 - e;

    /* B(e) = (1-e)²·P0 + 2(1-e)e·C + e²·P1 */
    camera.position
      .copy(tmpA.copy(fromPos).multiplyScalar(inv * inv))
      .add(tmpB.copy(ctrl).multiplyScalar(2 * inv * e))
      .add(tmpA.copy(toPos).multiplyScalar(e * e));

    controls.target.lerpVectors(fromTgt, toTgt, e);
    camera.lookAt(controls.target);
  }

  return {
    to,
    jump,
    update,
    get active() { return active; }
  };
}
