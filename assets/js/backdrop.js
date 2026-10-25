/* ============================================================
   BACKDROP — a moonlit sky behind the hero

   Reference was a photograph of the moon through thin cloud:
   desaturated blue sky around #293446, clouds that run warm
   (#82706E) where the light catches them and cold (#3B4254)
   where it does not, and only three per cent of the frame
   brighter than 140.

   The moon itself is gone now, by request. What it stood for
   stays: the sky is still lit from one point off to the right,
   so the cloud has a side that catches and a side that does not,
   and the light reads as coming from somewhere out of frame.

   That ratio is the whole look. The temptation with a night sky
   is to light it up; the photograph earns its calm by keeping
   almost everything dim and spending all its brightness on one
   small disc.

   Pitched darker than the reference on purpose, so the band
   dissolves into this page's near-black ground rather than
   sitting on it as a lighter rectangle.

   Four decisions worth stating:

   1. The clouds are value-noise fBm rendered once to offscreen
      layers, then drifted. Per-pixel noise every frame would be
      the honest way and far too slow; drifting pre-rendered
      layers at different speeds reads the same and costs a few
      drawImage calls.

   2. The noise tiles horizontally. Its lattice wraps modulo the
      grid, so a layer can drift forever without a seam.

   3. The light's position is computed from the masthead's real
      height, not guessed, so the brightest part of the sky is
      never the part sitting under the header
      at any viewport.

   4. It drifts on its own clock, never on scroll. This page is
      sometimes framed at its own content height where nothing
      scrolls at all.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.querySelector('canvas.bd');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- palette, taken from the reference and darkened ---------- */
  var SKY_TOP  = [35, 47, 67];     /* the reference hue, pitched deeper    */
  var SKY_MID  = [22, 31, 45];
  var SKY_LOW  = [7, 9, 13];       /* meets the page ground                */
  var CLOUD    = [122, 134, 152];  /* cold cloud                           */
  var CLOUD_W  = [146, 158, 180];  /* the lit side: silver, not sodium     */

  /* ---------- buffer ----------
     Sized to the band's own aspect so nothing is cropped, and capped
     so the cost does not follow the viewport. */
  var W = 1000, H = 620;
  /* The sky gradient, the vignette, the halo, the fall-off, the text
     guard and the moonlight are all static: they depend on the layout,
     not on time, yet they were six full-canvas gradient fills every
     frame. At a 1400px buffer that cost dropped the page to 14fps. They
     are baked into two layers here instead, one that sits under the
     cloud and one over it, and rebuilt only when the size changes. */
  var underCv = null, overCv = null;
  /* The cloud is six scaled draws a frame, and at full buffer size that
     is nearly seven million blended pixels. It is also the softest thing
     on the canvas, so it is composited at half resolution and scaled up
     once; at this blur the difference is invisible and the cost is a
     quarter. */
  var cloudCv = null, cloudCtx = null, fadeCv = null;
  /* ---------- dither ----------
     Eight bits per channel cannot carry a long, dark gradient. The steps
     land as straight horizontal contours across the sky -- the lines in
     the hero. A little noise per pixel scatters each step edge, and the
     eye integrates the scatter back into a smooth ramp. Baked once, never
     animated, so it can never shimmer. */
  function dither(cv, amt, withAlpha) {
    var g = cv.getContext('2d');
    var im = g.getImageData(0, 0, cv.width, cv.height);
    var d = im.data;                       /* clamped, so no range checks */
    for (var i = 0; i < d.length; i += 4) {
      var nz = (Math.random() - 0.5) * amt;
      d[i] += nz; d[i + 1] += nz; d[i + 2] += nz;
      if (withAlpha) d[i + 3] += nz;
    }
    g.putImageData(im, 0, 0);
  }

  function bakeLayers() {
    underCv = document.createElement('canvas');
    underCv.width = W; underCv.height = H;
    var u = underCv.getContext('2d');

    var g = u.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,    rgba(SKY_TOP, 1));
    g.addColorStop(0.46, rgba(SKY_MID, 1));
    g.addColorStop(1,    rgba(SKY_LOW, 1));
    u.fillStyle = g; u.fillRect(0, 0, W, H);

    var vg = u.createRadialGradient(light.x, light.y, 0, light.x, light.y, Math.max(W, H) * 0.92);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.55, 'rgba(0,0,0,0.16)');
    vg.addColorStop(1, 'rgba(3,5,8,0.62)');
    u.fillStyle = vg; u.fillRect(0, 0, W, H);

    /* Opened out rather than dimmed. Taking the core from .38 to .19 when
       the disc went stopped it reading as a hole, but it also pulled about
       seven levels of light off the whole right-hand side, which is where
       the portrait and the credential card live: measured on the composited
       page, the card's surface went 33.4 to 25.8 and the sky beside it 28.4
       to 21.1. The card is 94.5% transparent, so it has no tone of its own
       to fall back on and simply went flat with everything else.

       So the light comes back up, and the width does the work the disc used
       to: spread over .46 of the frame there is no edge sharp enough to read
       as a missing object, but there is still a lit side and an unlit one.
       Tuned until the card's surface reads at the level it did with the
       moon present, averaged over six frames because both skies drift. */
    var halo = u.createRadialGradient(light.x, light.y, 0, light.x, light.y, W * 0.46);
    halo.addColorStop(0,    'rgba(226,234,248,' + (0.285 * lightScale).toFixed(3) + ')');
    halo.addColorStop(0.16, 'rgba(188,200,222,' + (0.195 * lightScale).toFixed(3) + ')');
    halo.addColorStop(0.45, 'rgba(140,152,178,' + (0.09 * lightScale).toFixed(3) + ')');
    halo.addColorStop(1,    'rgba(104,120,150,0)');
    u.fillStyle = halo; u.fillRect(0, 0, W, H);

    cloudCv = document.createElement('canvas');
    cloudCv.width = Math.max(2, Math.round(W / 2));
    cloudCv.height = Math.max(2, Math.round(H / 2));
    cloudCtx = cloudCv.getContext('2d');

    overCv = document.createElement('canvas');
    overCv.width = W; overCv.height = H;
    var o = overCv.getContext('2d');

    var fall = o.createRadialGradient(light.x, light.y, 0, light.x, light.y, W * 0.58);
    fall.addColorStop(0,    'rgba(6,8,12,0)');
    fall.addColorStop(0.34, 'rgba(6,8,12,' + (0.16 + (1 - lightScale) * 0.24).toFixed(3) + ')');
    fall.addColorStop(0.66, 'rgba(6,8,12,' + (0.46 + (1 - lightScale) * 0.22).toFixed(3) + ')');
    fall.addColorStop(1,    'rgba(5,7,10,0.80)');
    o.fillStyle = fall; o.fillRect(0, 0, W, H);

    var wide = lightScale < 0.7;
    var gx = W * (wide ? 0.46 : 0.24);
    var gy = H * (wide ? 0.40 : 0.62);
    var guard = o.createRadialGradient(gx, gy, 0, gx, gy, W * (wide ? 1.10 : 0.70));
    guard.addColorStop(0,    'rgba(5,7,10,0.93)');
    guard.addColorStop(0.42, 'rgba(5,7,10,0.72)');
    guard.addColorStop(0.75, 'rgba(5,7,10,0.30)');
    guard.addColorStop(1,    'rgba(5,7,10,0)');
    o.fillStyle = guard; o.fillRect(0, 0, W, H);

    o.globalCompositeOperation = 'screen';
    var lit = o.createRadialGradient(light.x, light.y, 0, light.x, light.y, W * 0.27);
    lit.addColorStop(0,    'rgba(232,242,255,' + (0.60 * lightScale).toFixed(3) + ')');
    lit.addColorStop(0.22, 'rgba(196,210,232,' + (0.30 * lightScale).toFixed(3) + ')');
    lit.addColorStop(0.55, rgba(CLOUD_W, (0.16 * lightScale).toFixed(3)));
    lit.addColorStop(1,    'rgba(0,0,0,0)');
    o.fillStyle = lit; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'source-over';

    dither(underCv, 4.5, false);   /* opaque, so RGB only */
    dither(overCv, 4.5, true);     /* its gradients live in the alpha too */

    /* The band used to fade out with a CSS mask-image. A mask is a
       gradient like any other, and its 255 alpha steps posterised into
       straight lines down the lower hero: measured at 20 contours with
       the mask and 1 without it. Same ramp, built here instead so it can
       be dithered, and applied with destination-out at the end of the
       frame. */
    fadeCv = document.createElement('canvas');
    fadeCv.width = W; fadeCv.height = H;
    var fg = fadeCv.getContext('2d');
    var fim = fg.createImageData(W, H);
    var fd = fim.data;
    var fStart = H * 0.54, fSpan = Math.max(1, H - fStart);
    for (var fy = 0; fy < H; fy++) {
      /* Nothing above the ramp: leave those rows at a hard zero. Dithering
         them erased a percent or so at random across the whole upper sky,
         which put grain on the moon -- its measured roughness went 2.21
         to 3.04. The clamp also made the noise one-sided there, so it was
         a slight constant erase rather than nothing. */
      if (fy <= fStart) continue;
      var base = ((fy - fStart) / fSpan) * 255;
      for (var fx = 0; fx < W; fx++) {
        fd[(fy * W + fx) * 4 + 3] = base + (Math.random() - 0.5) * 7;
      }
    }
    fg.putImageData(fim, 0, 0);
  }

  function resize() {
    /* The band is the hero's background, so it ends where the hero ends.
       Sized by a viewport clamp it had no idea how tall the hero actually
       was: once the orbit column went in, the hero came down to 796 while
       the band stayed at 893 and spilled 97px past it, straight over the
       marquee below -- whose 1px border-top then read as a hard straight
       line across a soft sky. Measuring the section fixes that at every
       width instead of trimming the clamp until it happens to fit.

       The CSS clamp stays as the fallback, and it still matters: this page
       is sometimes framed at its whole content height, and a section that
       has not laid out yet reports nothing worth using. */
    var hero = document.querySelector('.hero');
    if (hero) {
      var hh = hero.getBoundingClientRect().height;
      if (hh > 200) canvas.style.height = Math.round(hh) + 'px';
    }
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    /* Cap the pixel budget by shrinking the long side, never by
       clamping one axis: clamping H broke the aspect match on a tall
       narrow screen, and object-fit:cover then zoomed the bright half
       of the sky straight over the body text. */
    var aspect = r.height / r.width;
    /* Back down to 1000. The buffer was raised to 1400 only so the moon's
       craters had pixels to resolve; with no disc to draw, the sky is all
       soft gradient and cloud, which does not need them. Fewer pixels to
       composite every frame. */
    if (aspect <= 1) { W = 1000; H = Math.max(240, Math.round(1000 * aspect)); }
    else             { H = 860;  W = Math.max(240, Math.round(860 / aspect)); }
    canvas.width = W;
    canvas.height = H;
    buildClouds();
    place();
    bakeLayers();
  }

  /* ---------- tileable value-noise fBm ---------- */
  function lattice(gw, gh) {
    var a = new Float32Array(gw * gh);
    for (var i = 0; i < a.length; i++) a[i] = Math.random();
    return a;
  }
  /* Domain warping: sample the noise at coordinates that are themselves
     displaced by noise. Plain fBm gives soft wool; warping drags it into
     filaments and curls, which is the difference between cloud and smoke. */
  function octave(nx, ny, gw, gh, g) {
    var x = nx * gw, y = ny * gh;
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = x - x0, fy = y - y0;
    var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    var xa = ((x0 % gw) + gw) % gw, xb = ((x0 + 1) % gw + gw) % gw;
    var ya = ((y0 % gh) + gh) % gh, yb = ((y0 + 1) % gh + gh) % gh;
    var v00 = g[ya * gw + xa], v10 = g[ya * gw + xb];
    var v01 = g[yb * gw + xa], v11 = g[yb * gw + xb];
    return (v00 * (1 - sx) + v10 * sx) * (1 - sy) + (v01 * (1 - sx) + v11 * sx) * sy;
  }

  /* ---------- cloud layers ---------- */
  var layers = [];
  function buildClouds() {
    layers = [];
    var specs = [
      /* w,   h,   base grid, octaves, cut,  gain, speed,  warm */
      /* w,  h,  grid, oct, cut, gain, speed,  warm, warp */
      [320, 200, 3, 5, 0.30, 1.25, 0.0150, 0.55, 0.26],
      [288, 180, 4, 5, 0.38, 0.95, 0.0255, 0.35, 0.20],
      [256, 160, 6, 4, 0.47, 0.66, 0.0410, 0.18, 0.14]
    ];
    for (var s = 0; s < specs.length; s++) {
      var sp = specs[s];
      var lw = sp[0], lh = sp[1], base = sp[2], oct = sp[3];
      var cut = sp[4], gain = sp[5];

      var grids = [], gws = [], ghs = [];
      for (var o = 0; o < oct; o++) {
        var gw = base * (1 << o), gh = Math.max(2, Math.round(gw * lh / lw));
        grids.push(lattice(gw, gh)); gws.push(gw); ghs.push(gh);
      }
      /* two extra fields that do nothing but bend the sample coordinates */
      var wgw = base * 2, wgh = Math.max(2, Math.round(wgw * lh / lw));
      var warpA = lattice(wgw, wgh), warpB = lattice(wgw, wgh);
      var WARP = sp[8];

      var off = document.createElement('canvas');
      off.width = lw; off.height = lh;
      var octx = off.getContext('2d');
      var img = octx.createImageData(lw, lh);
      var d = img.data;

      for (var y = 0; y < lh; y++) {
        for (var x = 0; x < lw; x++) {
          var nx0 = x / lw, ny0 = y / lh;
          var dx = octave(nx0, ny0, wgw, wgh, warpA) - 0.5;
          var dy = octave(nx0 + 0.41, ny0 + 0.17, wgw, wgh, warpB) - 0.5;
          var nx = nx0 + dx * WARP;
          var ny = Math.max(0, Math.min(0.999, ny0 + dy * WARP));
          var amp = 1, sum = 0, norm = 0;
          for (var k = 0; k < oct; k++) {
            sum += octave(nx, ny, gws[k], ghs[k], grids[k]) * amp;
            norm += amp; amp *= 0.5;
          }
          var v = sum / norm;
          /* soft threshold: open sky below the cut, cloud above it */
          var a = (v - cut) / (1 - cut);
          a = a <= 0 ? 0 : a * a * (3 - 2 * a);

          /* thin the clouds out toward the foot of the band so the
             section below can stay flat */
          a *= 1 - Math.pow(ny0, 2.2) * 0.58;

          var i = (y * lw + x) * 4;
          d[i]     = CLOUD[0];
          d[i + 1] = CLOUD[1];
          d[i + 2] = CLOUD[2];
          d[i + 3] = Math.max(0, Math.min(255, a * gain * 255)) | 0;
        }
      }
      octx.putImageData(img, 0, 0);
      layers.push({ c: off, speed: sp[6], warm: sp[7], x: Math.random() * lw });
    }
  }

  /* ---------- the light ----------
     There is no moon any more, but the sky still needs somewhere to be
     lit from: the halo, the fall-off and the lit edge on the cloud all
     radiate from this point. `r` is no longer a disc, only the scale the
     clearances are expressed in. Still placed off the masthead's measured
     height so the brightest part of the sky never sits under the header. */
  var light = { x: 0, y: 0, r: 0 };
  /* How much lit sky the layout can afford. Wide, the text sits in the
     left column and the moon has the right half to itself. Once the hero
     stacks, the headline and eyebrow run the full width and pass straight
     under the halo, which took the eyebrow to 1.07:1. So the scene dims
     as the column narrows: same sky, less light in it. */
  var lightScale = 1;
  function place() {
    var box = canvas.getBoundingClientRect();
    var scale = W / Math.max(1, box.width);     /* screen px -> buffer px */
    /* The header's BOTTOM edge in the band's own space, not its height.
       The masthead floats 50px down now, so its height alone understates
       where it actually ends and the moon would ride up behind it. */
    var header = document.querySelector('.masthead');
    var hr = header ? header.getBoundingClientRect() : null;
    var hh = hr ? Math.max(0, hr.bottom - box.top) : 70;

    /* Big enough to read as a body with a surface. At 13px it was a
       dot, and no amount of crater detail survives a dot. */
    /* Smaller on a narrow screen: there the hero stacks, the eyebrow
       runs the full width under it, and a big bright disc took that
       line to 4.44:1. */
    light.r = Math.max(16, Math.min(46, W * (W < 560 ? 0.028 : 0.034)));
    /* Right of centre rather than hard into the corner: the corner
       belongs to the credential card, and a bright disc behind a
       translucent card is a legibility problem, not a mood. */
    var bw = box.width || 1440;
    lightScale = Math.max(0.34, Math.min(1, (bw - 480) / (1100 - 480)));

    /* As far right as it can actually go. The right edge of the hero
       belongs to the credential card, whose top is an opaque portrait:
       a moon placed over it is not a moon behind glass, it is a moon
       that has been deleted. So it sits as far across as it can while
       keeping its disc, and a little air, clear of that card. */
    var want = bw * (bw < 980 ? 0.82 : 0.78);
    var plate = document.querySelector('.hero-plate');
    if (plate && bw >= 980) {
      var pl = plate.getBoundingClientRect().left - box.left;
      var rpx = light.r / scale;                  /* disc radius in screen px */
      want = Math.min(want, pl - rpx * 1.12 - 14);
    }
    light.x = Math.max(W * 0.46, want * scale);
    /* Clearance enough for the disc and a little air, not for the whole
       corona: reserving 3.2 radii pushed the moon down to the middle of
       the band, which is the opposite of a corner. The corona is soft
       and may pass behind the header. */
    var minY = (hh + 14) * scale + light.r * 1.02;
    /* The floor, not the header, was holding the moon down: at 1440 the
       header allowed y=90 and the old clamp forced 118.

       It only lifts where the text is not underneath. Once the hero
       stacks, the eyebrow runs the full width just below the header, so
       raising the moon drops its corona straight onto that line: it
       measured 2.32:1 at 390 before this was conditional. */
    /* The floor has to travel with the header. On a narrow screen the
       moon sits BELOW the eyebrow, so when the floating header pushed
       that line 15px down the text walked into the moon while the moon
       stayed put: the eyebrow went 6.85 -> 4.89. Everything under the
       header moves with it, so the floor does too, measured against the
       70px the flush bar used to be. */
    var floor = H * (bw < 980 ? 0.20 : 0.12) + Math.max(0, hh - 70) * scale;
    light.y = Math.max(minY, floor);
  }

  /* ---------- stars ---------- */
  var stars = [];
  (function seedStars() {
    for (var i = 0; i < 70; i++) {
      stars.push({
        nx: Math.random(), ny: Math.random() * 0.82,
        r: 0.4 + Math.random() * 1.0,
        a: 0.06 + Math.random() * 0.3,
        tw: Math.random() * Math.PI * 2
      });
    }
  })();

  /* ---------- falling stars ----------
     Rare on purpose. A sky with a meteor every second is a screensaver;
     the pleasure of the real thing is that you have to be looking. */
  var falls = [], nextFall = 2200;
  function spawnFall(now) {
    /* always right to left */
    var fromRight = true;
    falls.push({
      x: (fromRight ? 0.55 + Math.random() * 0.5 : Math.random() * 0.35),
      /* Kept to the upper sky. A streak that runs down into the copy
         is a bright object crossing text, which both looks wrong and
         momentarily costs contrast where it lands. */
      y: Math.random() * 0.17,
      vx: (fromRight ? -1 : 1) * (0.34 + Math.random() * 0.26),
      vy: 0.11 + Math.random() * 0.12,
      len: 0.07 + Math.random() * 0.09,
      life: 0, dur: 900 + Math.random() * 700,
      born: now
    });
    nextFall = 3200 + Math.random() * 7000;
  }

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function draw(t) {
    var time = t / 1000;

    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(underCv, 0, 0);

    /* --- stars, behind the cloud --- */
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      /* Barely breathing, not blinking. At 0.45 amplitude every star
         pulsed to half brightness twice a second and the whole sky
         flickered; real stars scintillate far more finely than that. */
      var tw = 0.90 + 0.10 * Math.sin(time * 0.22 + s.tw);
      ctx.beginPath();
      ctx.arc(s.nx * W, s.ny * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214,226,244,' + (s.a * tw).toFixed(3) + ')';
      ctx.fill();
    }

    /* --- cloud layers, composited at half size --- */
    var cw = cloudCv.width, ch = cloudCv.height;
    cloudCtx.clearRect(0, 0, cw, ch);
    for (var L = 0; L < layers.length; L++) {
      var la = layers[L];
      if (!reduce) la.x += la.speed;
      var lw = la.c.width;
      var span = cw * 1.18;
      var ox = -((la.x * (span / lw)) % span);
      /* The layer bobs vertically, so it must be drawn TALLER than the
         canvas or it uncovers a strip at whichever end it has drifted
         away from. Drawn at exactly ch, the gap was up to ch*0.022 and
         its edge slid up and down with the bob: that was the moving
         line across the top of the sky. Overdraw by the bob's own
         amplitude at both ends and the layer always covers. */
      var bob = ch * 0.022;
      var oy = Math.sin(time * (0.055 + L * 0.021) + L * 2.1) * bob;
      cloudCtx.globalAlpha = Math.min(1, 0.14 + 0.88 * lightScale);
      cloudCtx.drawImage(la.c, ox, oy - bob, span, ch + bob * 2);
      cloudCtx.drawImage(la.c, ox + span, oy - bob, span, ch + bob * 2);
    }
    cloudCtx.globalAlpha = 1;
    ctx.drawImage(cloudCv, 0, 0, W, H);

    ctx.drawImage(overCv, 0, 0);

    /* --- falling stars ---
       Drawn after the cloud and the fall-off, not before. Behind them
       the darkening passes, which run up to 0.8 alpha, took the streak
       down below visible: it was being rendered and then buried. */
    if (!reduce) {
      if (t > nextFall) { spawnFall(t); nextFall = t + 3200 + Math.random() * 7000; }
      for (var f = falls.length - 1; f >= 0; f--) {
        var fs = falls[f];
        var k = (t - fs.born) / fs.dur;
        if (k >= 1) { falls.splice(f, 1); continue; }
        /* ease out, so it arrives fast and settles rather than stopping dead */
        var e = 1 - Math.pow(1 - k, 2.6);
        var hx = (fs.x + fs.vx * e) * W;
        var hy = (fs.y + fs.vy * e) * H;
        var tx = hx - fs.vx * fs.len * W;
        var ty = hy - fs.vy * fs.len * H;
        var fade = Math.sin(Math.PI * k);          /* in and out */
        var tail = ctx.createLinearGradient(tx, ty, hx, hy);
        tail.addColorStop(0, 'rgba(206,222,248,0)');
        tail.addColorStop(1, 'rgba(240,247,255,' + (0.85 * fade).toFixed(3) + ')');
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        /* The head used to carry a 7px white halo at 0.95 alpha, which
           made each one flare like a camera flash. A streak that simply
           ends bright is what a meteor looks like; the glint is the
           thing that looked cheap. */
        var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 3.4);
        hg.addColorStop(0, 'rgba(236,244,255,' + (0.5 * fade).toFixed(3) + ')');
        hg.addColorStop(1, 'rgba(206,222,248,0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* The moon is gone: no disc, no corona. What stays is the light it
       stood for -- the halo, the fall-off and the lit edge on the cloud
       are all still anchored to `light`, so the sky keeps a direction to
       be lit from and reads as moonlight from somewhere off-frame. */

    /* The fade out to the page, dithered. Last, so it takes the moon and
       the meteors with it exactly as the CSS mask used to. */
    if (fadeCv) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(fadeCv, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (running) requestAnimationFrame(draw);
  }

  var running = true;
  resize();
  addEventListener('resize', function () { resize(); }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; return; }
    if (!running) { running = true; requestAnimationFrame(draw); }
  });
  requestAnimationFrame(draw);
})();
