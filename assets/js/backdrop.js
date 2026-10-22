/* ============================================================
   BACKDROP — a generated ambient ground for the homepage

   Reference point: trionn.com, which runs a real-time scene on
   near-black rather than any kind of image. Faint wireframe
   geometry, a dust field, and a few small warm glints. The
   approach is what is borrowed, not the artwork: everything here
   is generated from scratch.

   Three decisions worth stating:

   1. Plain 2D canvas, not WebGL. There is one moving light and
      some line-work; a GL context and a shader pipeline would be
      cost without benefit, and it is one more thing to fail.

   2. The drawing buffer is a fixed small size and the element is
      stretched over it. This page is sometimes embedded in a
      frame sized to the full height of its content, where a
      viewport-sized canvas would mean a buffer tens of thousands
      of pixels tall. Rendering small and scaling up keeps the
      cost constant, and nothing here has an edge sharp enough
      for the upscale to show.

   3. It animates on its own clock, not on scroll. In that same
      framed case the document never scrolls, and a background
      that depends on scrolling is a background that is dead.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.querySelector('canvas.bd');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Small on purpose. See note 2 above. */
  var W = 960, H = 600;
  canvas.width = W;
  canvas.height = H;

  /* ---------- the scene ----------
     Shards are open polylines rather than closed shapes: an
     unclosed figure reads as structure caught mid-build, which is
     the feeling wanted, where a closed polygon reads as an object
     sitting in the frame. */
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* A large faceted mass, low in the frame. Filled rather than
     stroked, at an alpha barely above the ground, with one edge
     caught slightly brighter: enough to read as a form occupying
     space rather than a shape drawn on top of it. This is what
     carries the sense of depth; the shards alone read as a
     diagram. */
  var facets = [];
  (function buildMass() {
    var ox = 0.62 * W, oy = 1.02 * H, R = 540;
    for (var f = 0; f < 5; f++) {
      var a0 = -Math.PI * 0.95 + f * 0.30;
      facets.push({
        pts: [
          [ox + Math.cos(a0) * R * rnd(.7, 1.05), oy + Math.sin(a0) * R * rnd(.7, 1.05)],
          [ox + Math.cos(a0 + 0.34) * R * rnd(.6, 1.0), oy + Math.sin(a0 + 0.34) * R * rnd(.6, 1.0)],
          [ox, oy]
        ],
        fill: rnd(0.010, 0.026),
        edge: rnd(0.018, 0.052),
        phase: rnd(0, Math.PI * 2)
      });
    }
  })();

  var shards = [];
  for (var i = 0; i < 7; i++) {
    var cx = rnd(-0.1, 1.1) * W, cy = rnd(-0.1, 1.1) * H;
    var r = rnd(140, 460);
    var pts = [], n = 3 + ((Math.random() * 3) | 0);
    for (var k = 0; k < n; k++) {
      var a = rnd(0, Math.PI * 2);
      pts.push([cx + Math.cos(a) * r * rnd(.4, 1), cy + Math.sin(a) * r * rnd(.4, 1)]);
    }
    shards.push({
      pts: pts,
      drift: rnd(0.004, 0.016),
      phase: rnd(0, Math.PI * 2),
      amp: rnd(8, 30),
      alpha: rnd(0.030, 0.075)
    });
  }

  var dust = [];
  for (var d = 0; d < 110; d++) {
    dust.push({
      x: Math.random() * W, y: Math.random() * H,
      r: rnd(0.4, 1.5),
      sp: rnd(0.012, 0.07),
      a: rnd(0.05, 0.30),
      tw: rnd(0, Math.PI * 2)
    });
  }

  /* The only colour in the whole layer. Sparse and small, so it
     reads as a glint rather than a gradient. */
  var embers = [];
  for (var e = 0; e < 4; e++) {
    embers.push({
      x: rnd(0.15, 0.85) * W, y: rnd(0.2, 0.85) * H,
      r: rnd(70, 190),
      sp: rnd(0.08, 0.22),
      phase: rnd(0, Math.PI * 2),
      hue: e % 2 ? [255, 150, 60] : [120, 165, 255]
    });
  }

  function frame(t) {
    var time = t / 1000;

    ctx.clearRect(0, 0, W, H);

    /* embers first, so the line-work reads on top of the glow */
    for (var i = 0; i < embers.length; i++) {
      var em = embers[i];
      var pulse = 0.5 + 0.5 * Math.sin(time * em.sp + em.phase);
      var x = em.x + Math.sin(time * em.sp * 0.7 + em.phase) * 40;
      var y = em.y + Math.cos(time * em.sp * 0.5 + em.phase) * 26;
      var g = ctx.createRadialGradient(x, y, 0, x, y, em.r);
      var c = em.hue;
      g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.052 * (0.45 + pulse * 0.55)).toFixed(4) + ')');
      g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - em.r, y - em.r, em.r * 2, em.r * 2);
    }

    /* the faceted mass, under the line-work */
    for (var m = 0; m < facets.length; m++) {
      var fa = facets[m];
      var sway = Math.sin(time * 0.045 + fa.phase) * 7;
      ctx.beginPath();
      ctx.moveTo(fa.pts[0][0] + sway, fa.pts[0][1]);
      ctx.lineTo(fa.pts[1][0] + sway, fa.pts[1][1]);
      ctx.lineTo(fa.pts[2][0] + sway, fa.pts[2][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(150,170,205,' + fa.fill.toFixed(4) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(198,212,240,' + fa.edge.toFixed(4) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* wireframe shards */
    ctx.lineWidth = 1;
    for (var s = 0; s < shards.length; s++) {
      var sh = shards[s];
      var off = Math.sin(time * sh.drift * 6 + sh.phase) * sh.amp;
      ctx.beginPath();
      for (var p = 0; p < sh.pts.length; p++) {
        var px = sh.pts[p][0] + off;
        var py = sh.pts[p][1] + off * 0.6;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(214,220,235,' + sh.alpha.toFixed(4) + ')';
      ctx.stroke();
    }

    /* dust */
    for (var u = 0; u < dust.length; u++) {
      var dp = dust[u];
      dp.y -= dp.sp;
      if (dp.y < -2) { dp.y = H + 2; dp.x = Math.random() * W; }
      var tw = 0.55 + 0.45 * Math.sin(time * 0.6 + dp.tw);
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(226,232,244,' + (dp.a * tw).toFixed(4) + ')';
      ctx.fill();
    }

    if (running) requestAnimationFrame(frame);
  }

  var running = !reduce;
  requestAnimationFrame(frame);

  /* Nothing to animate for a tab nobody is looking at. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; return; }
    if (!reduce && !running) { running = true; requestAnimationFrame(frame); }
  });
})();
