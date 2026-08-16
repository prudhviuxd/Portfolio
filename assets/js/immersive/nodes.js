/* ============================================================
   NODES — the four interactive cards.

   Each card is a group: a bevelled glass slab, a label plane,
   two neon outlines, an additive halo, a wireframe satellite,
   a light pool on the floor, and an oversized invisible plane
   that the raycaster actually hits (forgiving on touch).
   ============================================================ */

import * as THREE from 'three';
import { NODES } from './content.js';
import { makeLabelTexture, makeBackTexture, makeGlowTexture } from './textures.js';

const CARD = { w: 3.4, h: 2.15, d: 0.16, r: 0.16, bevel: 0.03 };
const RING_RADIUS = 4.7;

/* The bevel grows the extrusion on both faces, so the slab is thicker than
   CARD.d. Anything meant to sit on the surface has to clear this, or the
   depth test quietly swallows it. */
const SURFACE = CARD.d / 2 + CARD.bevel;

export function createNodes(scene, renderer, opts = {}) {
  const reduced = !!opts.reducedMotion;
  const glowTex = makeGlowTexture(256, 2.4);
  const slabGeo = roundedSlabGeometry();
  const outlineGeo = outlineGeometry();

  const items = NODES.map((data, i) => buildNode(data, i, {
    glowTex, slabGeo, outlineGeo, renderer
  }));

  const group = new THREE.Group();
  items.forEach((item) => group.add(item.group));
  scene.add(group);

  let hoveredId = null;
  let focusedId = null;

  function setHover(id) { hoveredId = id; }
  function setFocus(id) { focusedId = id; }
  function get(id) { return items.find((n) => n.data.id === id); }

  /* ---------------- per-frame ---------------- */
  function update(dt, elapsed) {
    const k = 1 - Math.pow(0.001, dt);   /* frame-rate independent lerp */

    items.forEach((item) => {
      const hovered = item.data.id === hoveredId;
      const focused = item.data.id === focusedId;
      const dimmed = focusedId !== null && !focused;
      const lit = hovered || focused;

      /* targets — the emissive stays low on purpose. Neon reads as neon
         because the slab around it is dark, not because it is bright. */
      const tScale = focused ? 1.04 : hovered ? 1.05 : 1;
      const tGlow = dimmed ? 0.04 : lit ? 0.34 : 0.16;
      const tLine = dimmed ? 0.18 : lit ? 1 : 0.55;
      const tFace = dimmed ? 0.3 : 1;
      const tEmissive = dimmed ? 0.02 : lit ? 0.14 : 0.06;

      item.scale = THREE.MathUtils.lerp(item.scale, tScale, k);
      item.group.scale.setScalar(item.scale);

      item.halo.material.opacity = THREE.MathUtils.lerp(item.halo.material.opacity, tGlow, k);
      item.pool.material.opacity = THREE.MathUtils.lerp(item.pool.material.opacity, tGlow * 0.9, k);
      item.outlines.forEach((o, idx) => {
        o.material.opacity = THREE.MathUtils.lerp(o.material.opacity, idx === 0 ? tLine : tLine * 0.45, k);
      });
      item.face.material.opacity = THREE.MathUtils.lerp(item.face.material.opacity, tFace, k);
      item.slab.material.emissiveIntensity =
        THREE.MathUtils.lerp(item.slab.material.emissiveIntensity, tEmissive, k);

      if (reduced) return;

      /* idle float — each card on its own phase so the ring breathes */
      const bob = Math.sin(elapsed * 0.55 + item.phase) * 0.13;
      const tilt = Math.sin(elapsed * 0.34 + item.phase) * 0.022;
      item.group.position.y = item.baseY + bob;
      item.group.rotation.z = tilt;

      /* satellite */
      const spin = lit ? 1.8 : 0.6;
      item.satellite.rotation.y += dt * spin;
      item.satellite.rotation.x += dt * spin * 0.6;
      item.satellite.position.y = item.satelliteY + Math.sin(elapsed * 0.9 + item.phase) * 0.09;
    });
  }

  function dispose() {
    scene.remove(group);
    glowTex.dispose();
    slabGeo.dispose();
    outlineGeo.dispose();
  }

  return {
    items,
    group,
    hitTargets: items.map((n) => n.hit),
    setHover,
    setFocus,
    get,
    update,
    dispose,
    radius: RING_RADIUS,
    cardHeight: CARD.h
  };
}

/* ------------------------------------------------------------
   one card
   ------------------------------------------------------------ */
function buildNode(data, i, shared) {
  const { glowTex, slabGeo, outlineGeo, renderer } = shared;
  const accent = new THREE.Color(data.accent.hex);
  const angle = (i / NODES.length) * Math.PI * 2;

  const group = new THREE.Group();
  const baseY = 0.35;
  group.position.set(
    Math.sin(angle) * RING_RADIUS,
    baseY,
    Math.cos(angle) * RING_RADIUS
  );

  /* Front of the card points away from the centre of the ring, so the card
     nearest the orbiting camera is always the one facing it.

     Set as a plain Y rotation rather than lookAt(): a Y rotation of `angle`
     maps local +Z onto the outward normal by construction, and every card
     ends up with the same handedness. lookAt() picks its own basis, and the
     card at 180° comes out flipped relative to the other three. */
  group.rotation.y = angle;

  const normal = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();

  /* ---- slab ----
     Explicit renderOrder throughout: every part of a card is transparent,
     and distance sorting alone puts the label at the mercy of a 0.09-unit
     gap that a camera roll can flip. */
  const slab = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({
    color: 0x060912,
    metalness: 0.5,
    roughness: 0.34,
    emissive: accent,
    emissiveIntensity: 0.06,
    transparent: true,
    opacity: 0.96
  }));
  slab.renderOrder = 1;
  group.add(slab);

  /* ---- label ---- */
  const faceH = CARD.h - 0.34;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(faceH * 1.6, faceH),
    new THREE.MeshBasicMaterial({
      map: makeLabelTexture(data, renderer),
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  face.position.z = SURFACE + 0.014;
  face.renderOrder = 3;
  group.add(face);

  /* ---- back plate ----
     Deliberately not rotated. It shares the front plane's orientation and
     is drawn with BackSide, so the handedness is identical on all four
     cards — rotating each plate instead makes the 180° card disagree with
     the two at 90°. The canvas is pre-mirrored to match. */
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(faceH * 1.6, faceH),
    new THREE.MeshBasicMaterial({
      map: makeBackTexture(data, renderer),
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      opacity: 0.9,
      toneMapped: false
    })
  );
  back.position.z = -SURFACE - 0.014;
  back.renderOrder = 3;
  group.add(back);

  /* ---- neon outlines, front and back ---- */
  const outlines = [SURFACE + 0.026, -SURFACE - 0.026].map((z, idx) => {
    const line = new THREE.LineLoop(outlineGeo, new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: idx === 0 ? 0.6 : 0.27,
      depthWrite: false,
      toneMapped: false
    }));
    line.position.z = z;
    line.renderOrder = 4;
    group.add(line);
    return line;
  });

  /* ---- halo ---- */
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD.w * 1.75, CARD.h * 2),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: accent,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false
    })
  );
  halo.position.z = -SURFACE - 0.08;
  halo.renderOrder = 0;
  group.add(halo);

  /* ---- floor pool ---- */
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 6.4),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: accent,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, -3.4 - baseY, 0.6);
  pool.renderOrder = 0;
  group.add(pool);

  /* ---- satellite ---- */
  const satelliteY = CARD.h / 2 + 0.62;
  const satellite = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.24, 0),
    new THREE.MeshBasicMaterial({
      color: accent,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      toneMapped: false
    })
  );
  satellite.position.set(CARD.w / 2 - 0.34, satelliteY, 0.1);
  group.add(satellite);

  /* ---- hit plane: invisible to the eye, solid to the raycaster ---- */
  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD.w + 0.5, CARD.h + 0.5),
    new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
  );
  hit.position.z = SURFACE + 0.06;
  hit.renderOrder = -1;
  hit.userData.nodeId = data.id;
  group.add(hit);

  return {
    data,
    group,
    slab,
    face,
    back,
    outlines,
    halo,
    pool,
    satellite,
    satelliteY,
    hit,
    normal,
    baseY,
    phase: i * 1.35,
    scale: 1,
    /** World-space centre of the card, ignoring the idle bob. */
    center: new THREE.Vector3(group.position.x, baseY, group.position.z)
  };
}

/* ------------------------------------------------------------
   geometry helpers
   ------------------------------------------------------------ */

/** Rounded rectangle, centred on the origin. */
function roundedRectShape(w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
}

function roundedSlabGeometry() {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(CARD.w, CARD.h, CARD.r), {
    depth: CARD.d,
    bevelEnabled: true,
    bevelThickness: CARD.bevel,
    bevelSize: CARD.bevel,
    bevelSegments: 3,
    curveSegments: 10
  });
  geo.translate(0, 0, -CARD.d / 2);   /* extrusion runs 0..depth, recentre it */
  geo.computeVertexNormals();
  return geo;
}

function outlineGeometry() {
  const points = roundedRectShape(CARD.w, CARD.h, CARD.r).getPoints(56);
  return new THREE.BufferGeometry().setFromPoints(points);
}
