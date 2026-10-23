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
  /* Walk the four areas on a timer. Long enough to read a branch and its
     evidence before it moves on, and it stops the moment a pointer or a
     focus ring arrives, because nothing is more annoying than a panel
     that changes while you are reading it. */
  var DWELL = 7400, lastStep = 0;
  var activeIdx = [];      /* which nodes are currently on the curve */
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

    /* Derive the room from what a label can actually be, rather than
       guessing: the CSS caps a label at min(26vw, 240px), and the stem
       and a margin sit outside that. A guessed 190 let "Cross-functional
       collaboration" run 34px past the stage, which clips. */
    var labelMax = Math.min(240, W * 0.26);
    var labelRoom = labelMax + 34;
    rMax = Math.max(90, Math.min(W / 2 - labelRoom, H / 2 / 0.5 - 26));
    /* Spend whatever vertical room is left. A fixed flatten wasted it and
       left adjacent nodes on the same line: "Design ops" sat on top of
       "Delivery estimation" at 900. */
    flat = Math.max(0.42, Math.min(0.78, (H / 2 - 26) / rMax));
    /* the inner turn has to clear the hub, which is larger when compact */
    rMin = Math.max(compact ? 74 : 42, rMax * (compact ? 0.34 : 0.26));
  }

  /* k is a position along the active branch, not an index into all 30.
     The branch is spread over the whole spiral, so six capabilities and
     nine both fill the shape instead of leaving most of it empty. */
  function pointAt(k, count) {
    var t = count > 1 ? k / (count - 1) : 0.5;
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
    activeIdx = [];
    nodes.forEach(function (n, k) {
      var on = areaOf[k] === area;
      n.classList.toggle('lit', on);
      /* Off the curve entirely: not drawn, not focusable, but still in
         the document so the text can be found and read. */
      n.toggleAttribute('inert', !on);
      if (on) activeIdx.push(k);
    });
    lastStep = performance.now();
    if (announce && live) live.textContent = btns[area].textContent + ' selected';
  }

  function frame(t) {
    if (!W) measure();
    if (!lastStep) lastStep = t || 0;
    if (!reduce && !paused) {
      spin += 0.0029;
      if (t - lastStep > DWELL) { setArea(area + 1, false); }
    }

    ctx.clearRect(0, 0, W, H);
    var count = activeIdx.length;
    if (!count) { requestAnimationFrame(frame); return; }

    /* --- the spiral, lit, with the glow carried by shadowBlur --- */
    ctx.save();
    ctx.shadowColor = 'rgba(212,255,63,0.55)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (var k = 0; k <= 1.0001; k += 0.004) {
      var th = spin + k * SPAN;
      var rr = rMin + (rMax - rMin) * k;
      var x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * flat;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(212,255,63,0.42)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    var pts = [];
    for (var i = 0; i < count; i++) pts.push(pointAt(i, count));

    /* --- spokes from the hub, also glowing --- */
    ctx.save();
    ctx.shadowColor = 'rgba(212,255,63,0.4)';
    ctx.shadowBlur = 9;
    for (var h = 0; h < count; h++) {
      var p = pts[h];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo((cx + p.x) / 2 + (p.y - cy) * 0.14,
                           (cy + p.y) / 2 - (p.x - cx) * 0.14, p.x, p.y);
      ctx.strokeStyle = 'rgba(212,255,63,0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    /* --- nodes, stems and labels --- */
    for (var n = 0; n < count; n++) {
      var q = pts[n];
      var right = Math.cos(q.th) >= 0;
      var stem = 16;

      ctx.save();
      ctx.shadowColor = 'rgba(212,255,63,0.7)';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(q.x + (right ? stem : -stem), q.y);
      ctx.strokeStyle = 'rgba(212,255,63,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(q.x, q.y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(212,255,63,0.95)';
      ctx.fill();
      ctx.restore();

      var el = nodes[activeIdx[n]];
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
  function setPaused(v) {
    if (paused === v) return;
    paused = v;
    root.classList.toggle('is-paused', v);
    if (!v) lastStep = performance.now();
  }
  ['pointerenter', 'mouseenter', 'focusin'].forEach(function (ev) {
    root.addEventListener(ev, function () { setPaused(true); });
  });
  ['pointerleave', 'mouseleave', 'focusout'].forEach(function (ev) {
    root.addEventListener(ev, function () {
      if (ev === 'focusout' && root.contains(document.activeElement)) return;
      setPaused(false);
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
