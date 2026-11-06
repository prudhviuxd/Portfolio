/* =========================================================
   InkReveal: a plain-JavaScript port of the React <InkReveal>
   component (ink-reveal.tsx). A canvas is filled with a solid mask
   colour; moving the pointer stamps wobbly, soft-edged "ink" holes
   along the stroke that expand and fade, revealing what sits
   underneath. Same options and defaults as the React props.

   Differences from the React version, for this site:
   - listens on a host element (the hero) rather than the canvas, so
     the headline and buttons above it stay clickable;
   - keeps the normal cursor (cursor:none hid it over the hero copy);
   - touch drags reveal too;
   - pauses when off screen and redraws on resize.
   ========================================================= */
(function (global) {
  'use strict';

  var DEFAULTS = {
    maskColor: [252, 250, 248],   // RGB of the mask overlay
    brushSize: 128,               // radius of each ink stamp, px
    lifetime: 600,                // how long each stamp lives, ms
    rStart: 10,                   // initial radius before the stamp expands
    rVary: 0.45,                  // random variation of stamp radius (0-1)
    stampStep: 10,                // min px between stamps along a stroke
    maxStamps: 200,               // max stamps alive at once
    segments: 36,                 // segments on the wobble circle
    wobble: [0.14, 0.08, 0.05],   // wobble amplitude weights
    gradientInnerRadius: 0.2,     // gradient inner radius factor
    gradientStops: [0.95, 0.88, 0]// gradient opacity stops [centre, mid, edge]
  };

  function InkReveal(canvas, host, options) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in options || {}) o[k] = options[k];
    var ctx = canvas.getContext('2d');
    var stamps = [], running = false, last = null, w = 0, h = 0;
    var fill = 'rgb(' + o.maskColor.join(',') + ')';

    function paintMask() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
    }

    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintMask();
    }

    function carveInk(x, y, r, seed, alpha) {
      var g = ctx.createRadialGradient(x, y, r * o.gradientInnerRadius, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + o.gradientStops[0] * alpha + ')');
      g.addColorStop(0.5, 'rgba(0,0,0,' + o.gradientStops[1] * alpha + ')');
      g.addColorStop(1, 'rgba(0,0,0,' + o.gradientStops[2] * alpha + ')');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (var i = 0; i <= o.segments; i++) {
        var a = (i / o.segments) * Math.PI * 2;
        var wob = 0.78 +
          o.wobble[0] * Math.sin(a * 3 + seed) +
          o.wobble[1] * Math.sin(a * 5 + seed * 2.1) +
          o.wobble[2] * Math.sin(a * 7 + seed * 0.7);
        var px = x + Math.cos(a) * r * wob, py = y + Math.sin(a) * r * wob;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    function addStamp(x, y) {
      if (stamps.length >= o.maxStamps) stamps.shift();
      stamps.push({ x: x, y: y, born: performance.now(), seed: Math.random() * Math.PI * 2,
        rmax: o.brushSize * (1 - o.rVary + Math.random() * o.rVary) });
    }

    function stampAlong(x, y) {
      if (!last) addStamp(x, y);
      else {
        var dx = x - last.x, dy = y - last.y;
        var steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / o.stampStep));
        for (var i = 1; i <= steps; i++) addStamp(last.x + dx * i / steps, last.y + dy * i / steps);
      }
      last = { x: x, y: y };
    }

    function loop() {
      var now = performance.now();
      paintMask();
      ctx.globalCompositeOperation = 'destination-out';
      for (var i = stamps.length - 1; i >= 0; i--) {
        var t = (now - stamps[i].born) / o.lifetime;
        if (t >= 1) { stamps.splice(i, 1); continue; }
        var ease = 1 - Math.pow(1 - t, 3);
        var r = o.rStart + (stamps[i].rmax - o.rStart) * ease;
        carveInk(stamps[i].x, stamps[i].y, r, stamps[i].seed, 1 - t * t);
      }
      if (stamps.length) requestAnimationFrame(loop);
      else { running = false; paintMask(); }
    }

    function startLoop() { if (!running) { running = true; requestAnimationFrame(loop); } }

    function pos(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    host.addEventListener('pointerenter', function (e) { var p = pos(e); last = p; stampAlong(p.x, p.y); startLoop(); });
    host.addEventListener('pointermove', function (e) { var p = pos(e); stampAlong(p.x, p.y); startLoop(); }, { passive: true });
    host.addEventListener('pointerleave', function () { last = null; });
    host.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') last = null; });

    resize();
    var rt;
    global.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
    return { resize: resize };
  }

  global.InkReveal = InkReveal;
})(window);
