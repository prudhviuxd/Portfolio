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
  var CLOUD_W  = [150, 126, 110];  /* the warm side, near the light        */

  /* ---------- buffer ----------
     Sized to the band's own aspect so nothing is cropped, and capped
     so the cost does not follow the viewport. */
  var W = 1000, H = 620;
  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    /* Cap the pixel budget by shrinking the long side, never by
       clamping one axis: clamping H broke the aspect match on a tall
       narrow screen, and object-fit:cover then zoomed the bright half
       of the sky straight over the body text. */
    var aspect = r.height / r.width;
    if (aspect <= 1) { W = 1000; H = Math.max(240, Math.round(1000 * aspect)); }
    else             { H = 900;  W = Math.max(240, Math.round(900 / aspect)); }
    canvas.width = W;
    canvas.height = H;
    buildClouds();
    place();
  }

  /* ---------- tileable value-noise fBm ---------- */
  function lattice(gw, gh) {
    var a = new Float32Array(gw * gh);
    for (var i = 0; i < a.length; i++) a[i] = Math.random();
    return a;
  }
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
      [320, 200, 3, 5, 0.30, 1.25, 0.0085, 0.55],
      [288, 180, 4, 5, 0.38, 0.95, 0.0145, 0.35],
      [256, 160, 6, 4, 0.47, 0.66, 0.0235, 0.18]
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

      var off = document.createElement('canvas');
      off.width = lw; off.height = lh;
      var octx = off.getContext('2d');
      var img = octx.createImageData(lw, lh);
      var d = img.data;

      for (var y = 0; y < lh; y++) {
        for (var x = 0; x < lw; x++) {
          var nx = x / lw, ny = y / lh;
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
          a *= 1 - Math.pow(ny, 2.2) * 0.58;

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

    moon.r = Math.max(9, Math.min(15, W * 0.0132));
    /* Right of centre rather than hard into the corner: the corner
       belongs to the credential card, and a bright disc behind a
       translucent card is a legibility problem, not a mood. */
    var bw = box.width || 1440;
    lightScale = Math.max(0.34, Math.min(1, (bw - 480) / (1100 - 480)));

    moon.x = W * (bw < 980 ? 0.78 : 0.705);
    var minY = (hh + 34) * scale + moon.r * 3.2;   /* clear of the header */
    moon.y = Math.max(minY, H * 0.20);
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

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function draw(t) {
    var time = t / 1000;

    /* --- sky --- */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,    rgba(SKY_TOP, 1));
    g.addColorStop(0.46, rgba(SKY_MID, 1));
    g.addColorStop(1,    rgba(SKY_LOW, 1));
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* the reference is darkest in its far corners; that fall-off is
       most of why it reads as sky rather than as a gradient */
    var vg = ctx.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, Math.max(W, H) * 0.92);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.55, 'rgba(0,0,0,0.16)');
    vg.addColorStop(1, 'rgba(3,5,8,0.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    /* --- stars, behind the cloud --- */
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.55 + 0.45 * Math.sin(time * 0.5 + s.tw);
      ctx.beginPath();
      ctx.arc(s.nx * W, s.ny * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214,226,244,' + (s.a * tw).toFixed(3) + ')';
      ctx.fill();
    }

    /* --- the glow the moon casts into the cloud ---
       Drawn before the cloud so the cloud sits inside the halo. */
    var halo = ctx.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, W * 0.38);
    halo.addColorStop(0,    'rgba(226,234,248,' + (0.38 * lightScale).toFixed(3) + ')');
    halo.addColorStop(0.16, 'rgba(188,200,222,' + (0.21 * lightScale).toFixed(3) + ')');
    halo.addColorStop(0.45, 'rgba(150,146,150,' + (0.09 * lightScale).toFixed(3) + ')');
    halo.addColorStop(1,    'rgba(120,110,108,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    /* --- cloud layers --- */
    for (var L = 0; L < layers.length; L++) {
      var la = layers[L];
      if (!reduce) la.x += la.speed;
      var lw = la.c.width;
      var span = W * 1.18;                       /* drawn a little oversize */
      var sh = H * 1.0;
      var ox = -((la.x * (span / lw)) % span);

      ctx.globalAlpha = Math.min(1, 0.14 + 0.88 * lightScale);
      ctx.drawImage(la.c, ox, 0, span, sh);
      ctx.drawImage(la.c, ox + span, 0, span, sh);
    }
    ctx.globalAlpha = 1;

    /* --- fall-off ---
       The vignette above runs before the cloud, so it never touched
       it: cloud was coming out equally bright across the whole band
       and the headline was landing on it at 2.19:1, the eyebrow at
       1.35:1. Light falls away from the moon, so the cloud has to
       as well. This is both why the reference looks calm and how the
       type stays readable over it. */
    var fall = ctx.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, W * 0.58);
    fall.addColorStop(0,    'rgba(6,8,12,0)');
    fall.addColorStop(0.34, 'rgba(6,8,12,' + (0.16 + (1 - lightScale) * 0.24).toFixed(3) + ')');
    fall.addColorStop(0.66, 'rgba(6,8,12,' + (0.46 + (1 - lightScale) * 0.22).toFixed(3) + ')');
    fall.addColorStop(1,    'rgba(5,7,10,0.80)');
    ctx.fillStyle = fall;
    ctx.fillRect(0, 0, W, H);

    /* Hold the sky down where the words are, not across the whole left
       side. A flat left-hand wash killed the cloud everywhere and the
       band went back to being a dark rectangle with a moon in it. This
       sits over the headline, lede and buttons specifically, so the top
       strip and the gap between the headline and the card stay lit. */
    /* Stacked, the text runs the full width, so the guard has to as
       well: centred at 0.24W with a 0.70W reach it left the right-hand
       end of the eyebrow outside it, at 3.68:1. */
    var wide = lightScale < 0.7;
    var gx = W * (wide ? 0.46 : 0.24);
    var gy = H * (wide ? 0.52 : 0.62);
    var guard = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * (wide ? 1.10 : 0.70));
    guard.addColorStop(0,    'rgba(5,7,10,0.93)');
    guard.addColorStop(0.42, 'rgba(5,7,10,0.72)');
    guard.addColorStop(0.75, 'rgba(5,7,10,0.30)');
    guard.addColorStop(1,    'rgba(5,7,10,0)');
    ctx.fillStyle = guard;
    ctx.fillRect(0, 0, W, H);

    /* --- moonlight on the cloud ---
       Screened over the top so whatever cloud happens to be near the
       disc brightens, and warms, exactly as it does in the reference. */
    ctx.globalCompositeOperation = 'screen';
    var lit = ctx.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, W * 0.27);
    lit.addColorStop(0,    'rgba(255,250,242,' + (0.60 * lightScale).toFixed(3) + ')');
    lit.addColorStop(0.22, 'rgba(210,206,204,' + (0.30 * lightScale).toFixed(3) + ')');
    lit.addColorStop(0.55, rgba(CLOUD_W, (0.16 * lightScale).toFixed(3)));
    lit.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = lit;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    /* --- the disc ---
       A warm rim just outside a hard white centre, which is the one
       detail that makes it read as moon rather than as a dot. */
    var corona = ctx.createRadialGradient(moon.x, moon.y, moon.r * 0.6, moon.x, moon.y, moon.r * 2.9);
    corona.addColorStop(0,   'rgba(255,214,166,0.52)');
    corona.addColorStop(0.3, 'rgba(228,150,88,0.26)');
    corona.addColorStop(1,   'rgba(214,122,70,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.r * 2.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    /* the faintest terminator, so the disc is not a flat sticker */
    var sh2 = ctx.createRadialGradient(
      moon.x - moon.r * 0.35, moon.y - moon.r * 0.35, 0,
      moon.x, moon.y, moon.r);
    sh2.addColorStop(0, 'rgba(255,255,255,0)');
    sh2.addColorStop(1, 'rgba(226,216,206,0.5)');
    ctx.fillStyle = sh2;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
    ctx.fill();

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
