/* ============================================================
   BACKDROP — a moonlit sky behind the hero

   Reference was a photograph of the moon through thin cloud:
   desaturated blue sky around #293446, clouds that run warm
   (#82706E) where the light catches them and cold (#3B4254)
   where it does not, and only three per cent of the frame
   brighter than 140. A small hard moon in a large soft dark.

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

   3. The moon's position is computed from the masthead's real
      height, not guessed, so it can never sit under the header
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
  var cloudCv = null, cloudCtx = null;
  function bakeLayers() {
    underCv = document.createElement('canvas');
    underCv.width = W; underCv.height = H;
    var u = underCv.getContext('2d');

    var g = u.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,    rgba(SKY_TOP, 1));
    g.addColorStop(0.46, rgba(SKY_MID, 1));
    g.addColorStop(1,    rgba(SKY_LOW, 1));
    u.fillStyle = g; u.fillRect(0, 0, W, H);

    var vg = u.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, Math.max(W, H) * 0.92);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.55, 'rgba(0,0,0,0.16)');
    vg.addColorStop(1, 'rgba(3,5,8,0.62)');
    u.fillStyle = vg; u.fillRect(0, 0, W, H);

    var halo = u.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, W * 0.38);
    halo.addColorStop(0,    'rgba(226,234,248,' + (0.38 * lightScale).toFixed(3) + ')');
    halo.addColorStop(0.16, 'rgba(188,200,222,' + (0.21 * lightScale).toFixed(3) + ')');
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

    var fall = o.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, W * 0.58);
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
    var lit = o.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, W * 0.27);
    lit.addColorStop(0,    'rgba(232,242,255,' + (0.60 * lightScale).toFixed(3) + ')');
    lit.addColorStop(0.22, 'rgba(196,210,232,' + (0.30 * lightScale).toFixed(3) + ')');
    lit.addColorStop(0.55, rgba(CLOUD_W, (0.16 * lightScale).toFixed(3)));
    lit.addColorStop(1,    'rgba(0,0,0,0)');
    o.fillStyle = lit; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'source-over';
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    /* Cap the pixel budget by shrinking the long side, never by
       clamping one axis: clamping H broke the aspect match on a tall
       narrow screen, and object-fit:cover then zoomed the bright half
       of the sky straight over the body text. */
    var aspect = r.height / r.width;
    /* Raised from 1000. The moon is the one thing here with detail worth
       resolving, and at a 1000px buffer on a 1440px band it was being
       drawn at 68px and then stretched, which is where the blockiness
       came from. */
    if (aspect <= 1) { W = 1400; H = Math.max(240, Math.round(1400 * aspect)); }
    else             { H = 1150; W = Math.max(240, Math.round(1150 / aspect)); }
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

  /* ---------- the moon's surface ----------
     An equirectangular map of the sphere, derived from the reference
     photograph rather than invented. The generated version before this
     scattered maria evenly over the whole globe, and evenly-spotted is
     exactly what a football looks like: the real moon is asymmetric,
     a few large connected seas on one face and cratered highland
     elsewhere, and no amount of tuning random blobs produces that.

     The map is built offline from the photograph by un-projecting its
     near face, folding the usable inner band back over the far face,
     and lifting the far side's seas toward highland, because the real
     far side has almost none.
     ------------------------------------------------------------- */
  var TEX = null, TW = 1024, TH = 512;
  (function loadMoonMap() {
    var img = new Image();
    img.onload = function () {
      TW = img.naturalWidth; TH = img.naturalHeight;
      var c = document.createElement('canvas');
      c.width = TW; c.height = TH;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      /* A file:// page taints the canvas and this throws; the sphere
         falls back to a plain disc rather than failing outright. */
      try { TEX = g.getImageData(0, 0, TW, TH).data; } catch (e) { TEX = null; }
    };
    img.src = 'assets/img/sky/moon-map.webp';
  })();

  /* ---------- the moon ----------
     Placed from the masthead's measured height, so it clears the
     header whatever the viewport does. */
  var moon = { x: 0, y: 0, r: 0 };
  /* How much lit sky the layout can afford. Wide, the text sits in the
     left column and the moon has the right half to itself. Once the hero
     stacks, the headline and eyebrow run the full width and pass straight
     under the halo, which took the eyebrow to 1.07:1. So the scene dims
     as the column narrows: same sky, less light in it. */
  var lightScale = 1;
  function place() {
    var box = canvas.getBoundingClientRect();
    var scale = W / Math.max(1, box.width);     /* screen px -> buffer px */
    var header = document.querySelector('.masthead');
    var hh = header ? header.getBoundingClientRect().height : 70;

    /* Big enough to read as a body with a surface. At 13px it was a
       dot, and no amount of crater detail survives a dot. */
    /* Smaller on a narrow screen: there the hero stacks, the eyebrow
       runs the full width under it, and a big bright disc took that
       line to 4.44:1. */
    moon.r = Math.max(16, Math.min(46, W * (W < 560 ? 0.028 : 0.034)));
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
      var rpx = moon.r / scale;                  /* disc radius in screen px */
      want = Math.min(want, pl - rpx * 1.12 - 14);
    }
    moon.x = Math.max(W * 0.46, want * scale);
    /* Clearance enough for the disc and a little air, not for the whole
       corona: reserving 3.2 radii pushed the moon down to the middle of
       the band, which is the opposite of a corner. The corona is soft
       and may pass behind the header. */
    var minY = (hh + 14) * scale + moon.r * 1.02;
    /* The floor, not the header, was holding the moon down: at 1440 the
       header allowed y=90 and the old clamp forced 118.

       It only lifts where the text is not underneath. Once the hero
       stacks, the eyebrow runs the full width just below the header, so
       raising the moon drops its corona straight onto that line: it
       measured 2.32:1 at 390 before this was conditional. */
    moon.y = Math.max(minY, H * (bw < 980 ? 0.20 : 0.12));
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

  /* Project the sphere for this frame. For every pixel inside the disc
     we go backwards: screen point to a point on the unit sphere, rotate
     it about the polar axis, convert to latitude and longitude, and read
     the map. A hundred-pixel moon is only a few thousand pixels, so the
     whole thing costs less than one of the cloud layers. */
  var sphereCv = null, sphereCtx = null, sphereImg = null, sphereR = 0;
  function drawSphere(angle) {
    if (!TEX) {
      var g2 = ctx.createRadialGradient(
        moon.x - moon.r * 0.3, moon.y - moon.r * 0.3, moon.r * 0.1,
        moon.x, moon.y, moon.r);
      g2.addColorStop(0, '#FBF9F5');
      g2.addColorStop(1, '#D7D3CB');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2); ctx.fill();
      return;
    }
    var R = Math.round(moon.r);
    var D = R * 2 + 2;
    if (!sphereCv || sphereR !== R) {
      sphereCv = document.createElement('canvas');
      sphereCv.width = D; sphereCv.height = D;
      sphereCtx = sphereCv.getContext('2d');
      sphereImg = sphereCtx.createImageData(D, D);
      sphereR = R;
    }
    var out = sphereImg.data;
    var ca = Math.cos(angle), sa = Math.sin(angle);
    /* a slight axial tilt, so the rotation is legible rather than a
       featureless band sliding sideways */
    var TILT = 0.26, ct = Math.cos(TILT), st = Math.sin(TILT);

    for (var y = 0; y < D; y++) {
      var ny = (y - R) / R;
      for (var x = 0; x < D; x++) {
        var nx = (x - R) / R;
        var d2 = nx * nx + ny * ny;
        var o = (y * D + x) * 4;
        if (d2 >= 1) { out[o + 3] = 0; continue; }
        var nz = Math.sqrt(1 - d2);

        /* tilt about X, then spin about Y */
        var y1 = ny * ct - nz * st;
        var z1 = ny * st + nz * ct;
        var x2 = nx * ca + z1 * sa;
        var z2 = -nx * sa + z1 * ca;

        var lat = Math.asin(Math.max(-1, Math.min(1, y1)));
        var lon = Math.atan2(x2, z2);

        /* Bilinear, not nearest. Rounding to the nearest texel was the
           whole glitter: a 1024px map on a 90px disc means every screen
           pixel spans about ten texels, so as the sphere turns each one
           snaps from texel to texel and the surface crawls with
           sparkles. Interpolating makes the moon slide smoothly under
           its own detail instead. Longitude wraps at the seam,
           latitude clamps at the poles.

           One channel is enough: the map is built grey, so the slight
           warmth is reapplied here as a multiplier rather than carried
           through three more texel reads. */
        var fu = (lon / (Math.PI * 2) + 0.5) * TW - 0.5;
        var fv = (0.5 - lat / Math.PI) * TH - 0.5;
        var u0 = Math.floor(fu), v0 = Math.floor(fv);
        var du = fu - u0, dv = fv - v0;
        var u1 = ((u0 + 1) % TW + TW) % TW;
        u0 = (u0 % TW + TW) % TW;
        var v1 = v0 + 1;
        if (v0 < 0) v0 = 0; else if (v0 >= TH) v0 = TH - 1;
        if (v1 < 0) v1 = 0; else if (v1 >= TH) v1 = TH - 1;
        var r0 = v0 * TW, r1 = v1 * TW;
        var ta = TEX[(r0 + u0) * 4], tb = TEX[(r0 + u1) * 4];
        var tc = TEX[(r1 + u0) * 4], td = TEX[(r1 + u1) * 4];
        var top = ta + (tb - ta) * du;
        var bot = tc + (td - tc) * du;
        var g = top + (bot - top) * dv;

        /* lunar limb darkening is mild until the very edge */
        var lim = 0.86 + 0.14 * nz;
        var edge = d2 > 0.965 ? Math.max(0, 1 - (d2 - 0.965) / 0.035) : 1;

        out[o]     = g * lim;
        out[o + 1] = g * lim * 0.997;
        out[o + 2] = g * lim * 0.985;
        out[o + 3] = 255 * edge;
      }
    }
    sphereCtx.putImageData(sphereImg, 0, 0);
    ctx.drawImage(sphereCv, moon.x - R, moon.y - R);
  }

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
      var oy = Math.sin(time * (0.055 + L * 0.021) + L * 2.1) * (ch * 0.022);
      cloudCtx.globalAlpha = Math.min(1, 0.14 + 0.88 * lightScale);
      cloudCtx.drawImage(la.c, ox, oy, span, ch);
      cloudCtx.drawImage(la.c, ox + span, oy, span, ch);
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

    /* --- the disc ---
       A warm rim just outside a hard white centre, which is the one
       detail that makes it read as moon rather than as a dot. */
    var corona = ctx.createRadialGradient(moon.x, moon.y, moon.r * 1.0, moon.x, moon.y, moon.r * 3.1);
    /* Cool, because the sky is cool. These stops were amber, carried
       over from a reference photograph shot through warm haze, and on a
       blue-black sky an orange ring around a white disc reads as a
       sticker rather than as light. Matched to SKY_TOP instead, and
       faded out on a near-sky hue so the gradient has no visible rim. */
    corona.addColorStop(0,   'rgba(198,216,246,0.30)');
    corona.addColorStop(0.3, 'rgba(146,170,210,0.14)');
    corona.addColorStop(1,   'rgba(104,130,170,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.r * 2.9, 0, Math.PI * 2);
    ctx.fill();

    /* One turn in about eighty seconds. The old rate, 0.016 rad/s, was
       one turn per six and a half minutes: arithmetically rotating and
       humanly static, which is the same thing as not rotating. Slow
       enough to stay calm, fast enough to be seen moving. */
    drawSphere(reduce ? 0.6 : time * 0.078);

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
