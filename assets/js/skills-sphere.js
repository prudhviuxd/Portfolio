/* ============================================================
   SKILLS, a sphere of capabilities

   Thirty labels distributed over a sphere, turning on their own
   clock and draggable by hand. The prose that used to crowd the
   cards now lives beside the sphere instead of on it, because a
   sphere tilts its contents in two axes and a paragraph cannot
   survive that. Short labels can.

   Decisions worth stating:

   1. Fibonacci distribution, not latitude bands. Even bands
      bunch hard at the poles; the golden angle gives thirty
      points that look scattered rather than gridded.

   2. Every label faces the viewer. A true tag sphere rotates
      its labels with the surface, which is handsome and
      unreadable. These travel on the sphere but stay square to
      the camera, so the front of the cloud is always legible.

   3. It turns on rAF, never on scroll. This page is sometimes
      framed at its own content height, where nothing scrolls at
      all, and a scroll-driven sphere would simply sit there.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-sph]');
  if (!root) return;

  var stage = root.querySelector('.sph-stage');
  var chips = [].slice.call(root.querySelectorAll('.sph-cloud li'));
  var cards = [].slice.call(root.querySelectorAll('[data-card]'));
  var sec   = root.closest('section');
  var btns  = [].slice.call(sec.querySelectorAll('[data-sph-go]'));
  var live  = sec.querySelector('.sph-live');
  if (!stage || !chips.length) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = chips.length;

  /* ---------- fixed points on the sphere ---------- */
  var pts = [];
  (function distribute() {
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2;          /* +1 at the top, -1 at the bottom */
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var t = golden * i;
      pts.push({ x: Math.cos(t) * r, y: y, z: Math.sin(t) * r });
    }
  })();

  /* ---------- state ---------- */
  var rotX = -0.22, rotY = 0;
  var velX = 0, velY = reduce ? 0 : 0.0029;    /* idle drift */
  var dragging = false, moved = false, lastX = 0, lastY = 0, lastT = 0;
  var area = 0;

  function radius() {
    var w = stage.clientWidth, h = stage.clientHeight;
    return Math.max(96, Math.min(w, h) * 0.40);
  }

  function setArea(i, announce) {
    area = (i % cards.length + cards.length) % cards.length;
    cards.forEach(function (c, k) {
      var on = k === area;
      c.classList.toggle('is-on', on);
      c.toggleAttribute('inert', !on);
    });
    btns.forEach(function (b, k) { b.setAttribute('aria-current', String(k === area)); });
    chips.forEach(function (c) {
      c.classList.toggle('lit', +c.dataset.area === area);
    });
    if (announce && live) live.textContent = btns[area].textContent + ' selected';
  }

  /* ---------- the loop ---------- */
  function frame() {
    var R = radius();
    var P = 760;                                /* must match the CSS perspective */
    var cx = Math.cos(rotX), sx = Math.sin(rotX);
    var cy = Math.cos(rotY), sy = Math.sin(rotY);

    if (!dragging) {
      rotY += velY;
      rotX += velX;
      /* bleed off a throw, then settle back to the idle drift */
      velY += ((reduce ? 0 : 0.0029) - velY) * 0.035;
      velX *= 0.92;
      /* never let a drag tip the sphere past its poles */
      rotX = Math.max(-1.0, Math.min(1.0, rotX));
    }

    for (var i = 0; i < N; i++) {
      var p = pts[i];
      /* rotate about Y, then about X */
      var x1 =  p.x * cy + p.z * sy;
      var z1 = -p.x * sy + p.z * cy;
      var y2 =  p.y * cx - z1 * sx;
      var z2 =  p.y * sx + z1 * cx;

      var scale = P / (P + (1 - z2) * R);       /* far side shrinks */
      var el = chips[i];
      el.style.transform =
        'translate3d(' + (x1 * R).toFixed(1) + 'px,' + (y2 * R).toFixed(1) + 'px,0)' +
        ' scale(' + scale.toFixed(3) + ')';
      /* z2 runs -1 at the back to +1 at the front */
      var depth = (z2 + 1) / 2;
      el.style.opacity = (0.12 + depth * 0.88).toFixed(3);
      el.style.zIndex = String(100 + Math.round(z2 * 100));
      el.style.filter = depth < 0.55 ? 'blur(' + ((0.55 - depth) * 3.4).toFixed(2) + 'px)' : 'none';
      /* The li is a full-stage layer so its centred span can be moved by
         transform alone. That means the li must never take pointer events
         or it would blanket the stage and swallow every drag; the span is
         the only thing that is ever interactive. */
      if (el.firstElementChild) {
        el.firstElementChild.style.pointerEvents = depth > 0.62 ? 'auto' : 'none';
      }
    }

    requestAnimationFrame(frame);
  }

  /* ---------- drag ----------
     Pointer events cover mouse, pen and touch in one path. The
     stage claims the pointer so a drag that wanders off it still
     tracks, and touch-action:none in the CSS stops a horizontal
     drag turning into a page scroll on a phone. */
  stage.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });

  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    var now = performance.now(), dt = Math.max(1, now - lastT);
    rotY += dx * 0.0062;
    rotX = Math.max(-1.0, Math.min(1.0, rotX + dy * 0.0045));
    /* carry the throw into the release */
    velY = (dx * 0.0062) * (16 / dt);
    velX = (dy * 0.0045) * (16 / dt);
    lastX = e.clientX; lastY = e.clientY; lastT = now;
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    try { stage.releasePointerCapture(e.pointerId); } catch (err) {}
    /* keep a throw sane */
    velY = Math.max(-0.085, Math.min(0.085, velY));
    velX = Math.max(-0.05, Math.min(0.05, velX));
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* A chip click selects its area, but not when the click was the
     end of a drag. */
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      if (moved) return;
      setArea(+c.dataset.area, true);
    });
  });

  /* ---------- keyboard ----------
     Dragging is pointer-only, so the sphere is also turnable from
     the keyboard once focused, and every area is reachable from
     the buttons below regardless. */
  stage.addEventListener('keydown', function (e) {
    var k = e.key, step = 0.26;
    if (k === 'ArrowLeft')  { rotY -= step; velY = 0; e.preventDefault(); }
    if (k === 'ArrowRight') { rotY += step; velY = 0; e.preventDefault(); }
    if (k === 'ArrowUp')    { rotX = Math.max(-1, rotX - step * 0.6); e.preventDefault(); }
    if (k === 'ArrowDown')  { rotX = Math.min(1, rotX + step * 0.6); e.preventDefault(); }
  });

  btns.forEach(function (b, k) {
    b.addEventListener('click', function () { setArea(k, true); });
  });

  setArea(0, false);
  root.classList.add('sph-ready');
  requestAnimationFrame(frame);
})();
