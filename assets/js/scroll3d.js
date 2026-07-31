/* ============================================================
   SCROLL3D — the scrub engine
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

  s3ds.forEach(function (el) { el._o = parseOpts(el.dataset.s3d); });

  /* pointer, only used to add a little life to the floating panels */
  var px = 0, py = 0, tpx = 0, tpy = 0;
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    addEventListener('mousemove', function (e) {
      tpx = (e.clientX / innerWidth - 0.5) * 2;
      tpy = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
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

    /* 1 — layered parallax -------------------------------------- */
    layers.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      var d = parseFloat(el.dataset.layer) || 0;
      // -1..1 across the viewport, 0 when centred
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      var y = -c * d * 190;
      var z = d * 60;
      el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,' + z.toFixed(1) + 'px)';
    });

    /* 2 — scroll-driven 3D -------------------------------------- */
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

    /* 3 — floating panel UI ------------------------------------- */
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

    /* 4 — perspective carousel ---------------------------------- */
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

    /* 5 — scroll narrative -------------------------------------- */
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
