/* ============================================================
   SKILLS, a spiral mind map

   Thirty capabilities on one Archimedean spiral, in area order,
   wired back to a hub at the centre. The wires are drawn on a
   canvas underneath; the labels are ordinary list items on top,
   so the picture is generated while the content stays text.

   Decisions worth stating:

   1. The spiral is flattened into an ellipse. A circular spiral
      in a wide stage wastes the sides and overflows the top and
      bottom; squashing it vertically fits the shape to the space
      it actually has.

   2. Labels sit outside the curve and flip side at the vertical
      axis, so they always radiate away from the centre and never
      lie across the wires.

   3. The spiral turns slowly and the labels stay horizontal. A
      mind map you have to tilt your head to read is a diagram
      that has forgotten what it is for.

   4. It turns on rAF, never on scroll, because this page is
      sometimes framed at its own content height where nothing
      scrolls at all.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-spm]');
  if (!root) return;

  var stage = root.querySelector('.spm-stage');
  var cv    = root.querySelector('.spm-wires');
  var nodes = [].slice.call(root.querySelectorAll('.spm-nodes li'));
  var hubs  = [].slice.call(root.querySelectorAll('[data-hub]'));
  var cards = [].slice.call(root.querySelectorAll('[data-card]'));
  var sec   = root.closest('section');
  var btns  = [].slice.call(sec.querySelectorAll('[data-spm-go]'));
  var live  = sec.querySelector('.spm-live');
  if (!stage || !cv || !nodes.length) return;

  var ctx = cv.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = nodes.length;

  /* which area each node belongs to, and where each run starts */
  var areaOf = nodes.map(function (n) { return +n.dataset.area; });
  var AREAS = cards.length;

  var spin = 0, area = 0, paused = false;
  var W = 0, H = 0, cx = 0, cy = 0, rMin = 0, rMax = 0, flat = 0.60, compact = false;
  var TURNS = 2.45, SPAN = TURNS * Math.PI * 2;

  function measure() {
    var r = stage.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = W / 2; cy = H / 2;

    /* Thirty labels need a wide stage. Narrower than this they collide
       badly: 4 overlapping pairs at 1100, 51 at 390, with labels landing
       on the hub itself. So below the threshold only the selected
       branch is labelled and the rest stay as points on the curve,
       which is also what the section tells you to do: pick an area to
       trace its branch. */
    compact = W < 1200;
    root.classList.toggle('spm-compact', compact);

    var labelRoom = compact ? (W < 700 ? 86 : 150) : 190;
    rMax = Math.max(90, Math.min(W / 2 - labelRoom, H / 2 / 0.5 - 26));
    /* Spend whatever vertical room is left. A fixed flatten wasted it and
       left adjacent nodes on the same line: "Design ops" sat on top of
       "Delivery estimation" at 900. */
    flat = Math.max(0.42, Math.min(0.78, (H / 2 - 26) / rMax));
    /* the inner turn has to clear the hub, which is larger when compact */
    rMin = Math.max(compact ? 74 : 42, rMax * (compact ? 0.34 : 0.26));
  }

  function pointAt(i) {
    var t = i / (N - 1);
    var th = spin + t * SPAN;
    var rr = rMin + (rMax - rMin) * t;
    return { x: cx + Math.cos(th) * rr, y: cy + Math.sin(th) * rr * flat, th: th, r: rr };
  }

  function setArea(i, announce) {
    area = (i % AREAS + AREAS) % AREAS;
    hubs.forEach(function (h, k) { h.classList.toggle('is-on', k === area); });
    cards.forEach(function (c, k) {
      c.classList.toggle('is-on', k === area);
      c.toggleAttribute('inert', k !== area);
    });
    btns.forEach(function (b, k) { b.setAttribute('aria-current', String(k === area)); });
    nodes.forEach(function (n, k) { n.classList.toggle('lit', areaOf[k] === area); });
    if (announce && live) live.textContent = btns[area].textContent + ' selected';
  }

  function frame() {
    if (!W) measure();
    if (!reduce && !paused) spin += 0.00085;

    ctx.clearRect(0, 0, W, H);

    /* --- the spiral itself, drawn as one continuous curve --- */
    var pts = [];
    for (var i = 0; i < N; i++) pts.push(pointAt(i));

    function strokeRun(from, to, style, width) {
      ctx.beginPath();
      /* sample between the nodes so the curve is smooth, not a polygon */
      for (var k = from; k <= to; k += 0.12) {
        var t = k / (N - 1);
        var th = spin + t * SPAN;
        var rr = rMin + (rMax - rMin) * t;
        var x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * flat;
        if (k === from) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    strokeRun(0, N - 1, 'rgba(244,241,235,0.085)', 1);

    /* the selected area's stretch of the spiral, lit */
    var first = -1, last = -1;
    for (var a = 0; a < N; a++) {
      if (areaOf[a] === area) { if (first < 0) first = a; last = a; }
    }
    if (first >= 0) strokeRun(first, last, 'rgba(212,255,63,0.52)', 1.6);

    /* --- hub spokes: one wire from the centre to each lit node --- */
    for (var h = 0; h < N; h++) {
      if (areaOf[h] !== area) continue;
      var p = pts[h];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      /* bend the spoke so it reads as drawn rather than ruled */
      ctx.quadraticCurveTo((cx + p.x) / 2 + (p.y - cy) * 0.14,
                           (cy + p.y) / 2 - (p.x - cx) * 0.14, p.x, p.y);
      ctx.strokeStyle = 'rgba(212,255,63,0.13)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* --- nodes and their stems --- */
    for (var n = 0; n < N; n++) {
      var q = pts[n];
      var lit = areaOf[n] === area;
      var right = Math.cos(q.th) >= 0;
      var stem = lit ? 16 : 11;

      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(q.x + (right ? stem : -stem), q.y);
      ctx.strokeStyle = lit ? 'rgba(212,255,63,0.45)' : 'rgba(244,241,235,0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(q.x, q.y, lit ? 3.2 : 2, 0, Math.PI * 2);
      ctx.fillStyle = lit ? 'rgba(212,255,63,0.95)' : 'rgba(244,241,235,0.3)';
      ctx.fill();

      var el = nodes[n];
      el.style.transform =
        'translate3d(' + (q.x + (right ? stem + 6 : -stem - 6)).toFixed(1) + 'px,' +
        q.y.toFixed(1) + 'px,0)' + (right ? '' : ' translateX(-100%)') + ' translateY(-50%)';
      el.classList.toggle('to-left', !right);
    }

    requestAnimationFrame(frame);
  }

  /* ---------- controls ---------- */
  btns.forEach(function (b, k) {
    b.addEventListener('click', function () { setArea(k, true); });
  });
  nodes.forEach(function (n) {
    n.addEventListener('click', function () { setArea(+n.dataset.area, true); });
  });
  ['pointerenter', 'focusin'].forEach(function (ev) {
    root.addEventListener(ev, function () { paused = true; });
  });
  ['pointerleave', 'focusout'].forEach(function (ev) {
    root.addEventListener(ev, function () {
      if (ev === 'focusout' && root.contains(document.activeElement)) return;
      paused = false;
    });
  });

  var rt;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(measure, 120);
  }, { passive: true });

  measure();
  setArea(0, false);
  root.classList.add('spm-ready');
  requestAnimationFrame(frame);
})();
