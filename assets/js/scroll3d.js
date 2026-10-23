/* ============================================================
   SCROLL3D, the scrub engine
   One rAF loop. Each registered element gets a 0..1 progress
   derived from its position in the viewport, and its transform
   is rewritten every frame. Nothing here is a one-shot trigger,
   so every effect runs backwards when you scroll up.
   ============================================================ */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  // smoothstep, keeps the ends from snapping
  var ease = function (t) { return t * t * (3 - 2 * t); };

  /* progress 0 as the element's top reaches the bottom of the viewport,
     1 as its bottom leaves the top */
  function through(r, vh) {
    return clamp((vh - r.top) / (vh + r.height), 0, 1);
  }
  /* progress across a pinned block: 0 at its top, 1 when its last
     viewport-worth has been scrolled */
  function pinned(r, vh) {
    return clamp(-r.top / (r.height - vh), 0, 1);
  }

  function parseOpts(str) {
    var o = {};
    (str || '').split(',').forEach(function (pair) {
      var kv = pair.split(':');
      if (kv.length === 2) o[kv[0].trim()] = parseFloat(kv[1]);
    });
    return o;
  }

  /* ---------------- registries ---------------- */
  var layers    = [].slice.call(document.querySelectorAll('[data-layer]'));
  var s3ds      = [].slice.call(document.querySelectorAll('[data-s3d]'));
  var floats    = [].slice.call(document.querySelectorAll('[data-float]'));
  var carousels = [].slice.call(document.querySelectorAll('[data-carousel]'));
  var narrs     = [].slice.call(document.querySelectorAll('[data-narrative]'));
  var portraits = [].slice.call(document.querySelectorAll('[data-portrait]'));

  s3ds.forEach(function (el) { el._o = parseOpts(el.dataset.s3d); });
  layers.forEach(function (el) { if (el.dataset.orb) el._flee = { x: 0, y: 0 }; });

  /* pointer, only used to add a little life to the floating panels */
  var px = 0, py = 0, tpx = 0, tpy = 0;
  var mx = -1e4, my = -1e4, finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (finePointer) {
    addEventListener('mousemove', function (e) {
      tpx = (e.clientX / innerWidth - 0.5) * 2;
      tpy = (e.clientY / innerHeight - 0.5) * 2;
      mx = e.clientX; my = e.clientY;          /* raw, for the orbit's evasion */
    }, { passive: true });
    /* pointer gone: let everything settle back */
    addEventListener('mouseleave', function () { mx = my = -1e4; }, { passive: true });
  }

  /* carousels and narratives need scroll length to travel through */
  function sizePinned() {
    carousels.forEach(function (c) {
      var n = c.querySelectorAll('.pcar-item').length;
      c.style.height = innerWidth < 900 ? '' : (n * 92 + 40) + 'svh';
    });
    narrs.forEach(function (c) {
      var n = c.querySelectorAll('.narr-step').length;
      c.style.height = (n * 88 + 30) + 'svh';
    });
  }
  sizePinned();
  addEventListener('resize', sizePinned);

  /* ---------------- the loop ---------------- */
  function frame() {
    var vh = innerHeight;
    px = lerp(px, tpx, 0.06);
    py = lerp(py, tpy, 0.06);

    /* 1, layered parallax --------------------------------------
       Off once the layout stacks. A layer can travel ±104px, which is
       depth between columns but a collision between rows: the hero
       plate was riding up into the buttons above it. */
    var stacked = innerWidth <= 980;   /* matches the CSS breakpoint exactly */
    layers.forEach(function (el) {
      if (stacked) {
        if (el.style.transform) el.style.transform = '';
        return;
      }
      var r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      var d = parseFloat(el.dataset.layer) || 0;
      // -1..1 across the viewport, 0 when centred
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      var y = -c * d * 190;
      var z = d * 60;
      /* An orbit field's shapes also drift with the pointer. That has to
         be folded into this one transform rather than written to the
         element separately: the inner node already carries the float
         keyframe, and a second inline transform here would simply
         replace this one. Displacement goes as 1/depth, so the shape
         nearest the front travels most and the ones read as distant,
         the small dim satellites, barely move at all. */
      var ox = 0, od = parseFloat(el.dataset.orb);
      if (od) { ox = px * od * 7; y += py * od * 5; }

      /* ---- evasion ----------------------------------------------
         The orbit field is pointer-events:none, so there is nothing
         to land on and no :hover to fire. That is the point: the
         shapes are driven by proximity alone, so the closer the
         cursor gets the harder they leave, and they cannot be
         caught because there was never a target.

         Measured from offsetLeft/offsetTop rather than the rect this
         loop already has, because the rect includes the transform
         written on the previous frame and feeding that back turns a
         dodge into a runaway.

         Easing is deliberately asymmetric. It leaves quickly and
         returns slowly, which reads as something alive avoiding
         you; symmetric easing just reads as a spring. */
      if (od && el._flee) {
        var f = el._flee, host = el.offsetParent;
        var tx = 0, ty = 0;
        if (host && mx > -1e3) {
          var hr = host.getBoundingClientRect();
          var bw = el.offsetWidth, bh = el.offsetHeight;
          var bx = hr.left + el.offsetLeft + bw / 2;
          var by = hr.top + el.offsetTop + bh / 2;
          var dx = bx - mx, dy = by - my;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var reach = bw / 2 + 190;
          if (dist < reach) {
            /* Squared falloff, so it is calm far out and urgent up close.
               Scaled by the shape's own radius: staying uncatchable means
               keeping the centre further from the cursor than the radius,
               so a large circle has to travel further than a small one to
               achieve the same escape. A fixed magnitude leaves the
               biggest shape catchable. */
            var k = (1 - dist / reach);
            var push = k * k * (bw / 2 * 1.15 + 72);
            tx = (dx / dist) * push;
            ty = (dy / dist) * push;
          }
        }
        var rate = (Math.abs(tx) + Math.abs(ty)) > (Math.abs(f.x) + Math.abs(f.y)) ? 0.30 : 0.055;
        f.x += (tx - f.x) * rate;
        f.y += (ty - f.y) * rate;

        /* keep the playground: a fleeing shape must not land on the
           headline or leave the field it belongs to */
        if (host) {
          var hw = host.clientWidth, hh = host.clientHeight;
          var lx = el.offsetLeft + f.x, ly = el.offsetTop + f.y;
          /* The field is the playground, but the hero's own padding
             above it is free space and the largest shape needs it: a
             circle this size, cornered against the top of the field,
             cannot put its radius between itself and the cursor and so
             becomes catchable. Left stays tight, because that is the
             direction the headline is in. */
          if (lx < -10) f.x = -10 - el.offsetLeft;
          if (lx + el.offsetWidth > hw + 24) f.x = hw + 24 - el.offsetWidth - el.offsetLeft;
          if (ly < -80) f.y = -80 - el.offsetTop;
          if (ly + el.offsetHeight > hh + 30) f.y = hh + 30 - el.offsetHeight - el.offsetTop;
        }
        ox += f.x; y += f.y;
      }

      el.style.transform =
        'translate3d(' + ox.toFixed(2) + 'px,' + y.toFixed(2) + 'px,' + z.toFixed(1) + 'px)';
    });

    /* 2, scroll-driven 3D -------------------------------------- */
    s3ds.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      var o = el._o;
      var p = through(r, vh);
      // remap so the element sits neutral while it is centred
      var t = ease(clamp(p * 1.9, 0, 1));      // 0..1 on the way in
      var rx = lerp(o.rx || 0, 0, t);
      var ry = lerp(o.ry || 0, 0, t);
      var tz = lerp(o.tz || 0, 0, t);
      var ty = lerp(o.ty || 0, 0, t);
      var sc = lerp(o.sc != null ? o.sc : 1, 1, t);
      el.style.transform =
        'translate3d(0,' + ty.toFixed(1) + 'px,' + tz.toFixed(1) + 'px)' +
        ' rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)' +
        ' scale(' + sc.toFixed(4) + ')';
      if (o.fade) el.style.opacity = t.toFixed(3);
    });

    /* 3, floating panel UI ------------------------------------- */
    floats.forEach(function (group) {
      var gr = group.getBoundingClientRect();
      if (gr.bottom < -300 || gr.top > vh + 300) return;
      var p = through(gr, vh);
      var s = (p - 0.5) * 2;                    // -1..1
      Array.prototype.forEach.call(group.children, function (panel, i) {
        var depth = (i - (group.children.length - 1) / 2);   // -1,0,1 …
        var y  = s * depth * -26 - s * 14;
        var z  = -Math.abs(depth) * 60 + (1 - Math.abs(s)) * 40;
        var rx = s * 7;
        var ry = depth * 5 + px * 4;
        panel.style.transform =
          'translate3d(0,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px)' +
          ' rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        panel.classList.toggle('lit', Math.abs(s) < 0.42);
      });
    });

    /* 3b, the portrait inside the credential card ---------------
       data-layer already gives the card its scroll parallax, but a page
       framed at its own content height never scrolls and that parallax
       is then a constant offset. The pointer is live either way, so the
       drift rides the image inside its crop, which also reads as real
       depth: the face moves against the frame holding it. One transform
       per node, so the card keeps its own. */
    portraits.forEach(function (el) {
      /* scaled up a touch so the drift never pulls an edge into the
         frame it is cropped by */
      el.style.transform =
        'translate3d(' + (px * 9).toFixed(2) + 'px,' + (py * 7).toFixed(2) + 'px,0)'
        + ' scale(1.07)';
    });

    /* 4, perspective carousel ---------------------------------- */
    if (innerWidth >= 900) carousels.forEach(function (car) {
      var r = car.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var items = car.querySelectorAll('.pcar-item');
      var p = pinned(r, vh);
      var active = p * (items.length - 1);      // float index

      Array.prototype.forEach.call(items, function (it, i) {
        var off = i - active;                   // negative = already passed
        var a = Math.abs(off);
        var x  = off * 74;                      // percent of stage width
        var ry = -off * 38;
        var z  = -a * 340;
        var sc = 1 - a * 0.08;
        // fall off hard, a neighbouring card must not compete for the eye
        var op = a > 1.05 ? 0 : 1 - a * 0.95;
        it.style.transform =
          'translate3d(' + x.toFixed(2) + '%,0,' + z.toFixed(1) + 'px)' +
          ' rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
        it.style.opacity = clamp(op, 0, 1).toFixed(3);
        // depth of field, an off-axis card must not be readable
        it.style.filter = a > 0.02 ? 'blur(' + (a * 4).toFixed(1) + 'px)' : 'none';
        it.style.zIndex = String(100 - Math.round(a * 10));
        it.style.pointerEvents = a < 0.4 ? 'auto' : 'none';
      });

      var bar = car.querySelector('.pcar-track i');
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
      var num = car.querySelector('.pcar-n');
      if (num) num.textContent = String(Math.round(active) + 1).padStart(2, '0');
    });

    /* 5, scroll narrative -------------------------------------- */
    narrs.forEach(function (narr) {
      var r = narr.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var steps = narr.querySelectorAll('.narr-step');
      var chaps = narr.querySelectorAll('.narr-chapters li');
      var p = pinned(r, vh);
      var active = p * (steps.length - 1);

      Array.prototype.forEach.call(steps, function (st, i) {
        var off = i - active;
        var a = Math.abs(off);
        st.style.transform =
          'translate3d(0,' + (off * 46).toFixed(1) + 'px,' + (-a * 190).toFixed(1) + 'px)' +
          ' rotateX(' + (off * -13).toFixed(2) + 'deg)';
        st.style.opacity = clamp(1 - a * 1.75, 0, 1).toFixed(3);
        st.style.filter = a > 0.02 ? 'blur(' + (a * 5).toFixed(1) + 'px)' : 'none';
        st.style.zIndex = String(50 - Math.round(a * 10));
      });

      var cur = Math.round(active);
      Array.prototype.forEach.call(chaps, function (c, i) { c.classList.toggle('on', i === cur); });
      var bar = narr.querySelector('.narr-bar i');
      if (bar) bar.style.height = (p * 100).toFixed(2) + '%';
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
