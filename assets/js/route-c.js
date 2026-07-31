/* Route C — the ambient field and the cursor-following work preview. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ambient bloom field ---------- */
  var cv = document.getElementById('field');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2);
    var blobs = [
      { x: .26, y: .30, r: .52, c: [169, 139, 255], a: .17, sx: .00013, sy: .00009 },
      { x: .74, y: .58, r: .44, c: [120, 100, 190], a: .12, sx: -.00010, sy: .00012 },
      { x: .50, y: .86, r: .40, c: [230, 225, 255], a: .05, sx: .00008, sy: -.00007 }
    ];

    function size() {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      var m = Math.max(w, h);
      blobs.forEach(function (b) {
        var x = (b.x + Math.sin(t * b.sx) * .07) * w;
        var y = (b.y + Math.cos(t * b.sy) * .07) * h;
        var r = b.r * m;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(' + b.c.join(',') + ',' + b.a + ')');
        g.addColorStop(1, 'rgba(' + b.c.join(',') + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    size(); draw(0);
    addEventListener('resize', function () { size(); draw(reduce ? 0 : performance.now()); });
    if (!reduce) (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
  }

  /* ---------- masthead solidifies once you leave the hero ---------- */
  var mast = document.querySelector('.masthead');
  if (mast) {
    var onScroll = function () { mast.classList.toggle('stuck', scrollY > innerHeight * .7); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- work preview follows the cursor ---------- */
  var peek = document.querySelector('.c-peek');
  var rows = document.querySelectorAll('.c-row[data-peek]');
  if (peek && rows.length && !reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var tx = 0, ty = 0, cx = 0, cy = 0, on = false;

    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        peek.querySelector('div').style.background = row.dataset.peek;
        peek.querySelector('span').textContent = row.dataset.label || '';
        peek.classList.add('on'); on = true;
      });
      row.addEventListener('mouseleave', function () {
        peek.classList.remove('on'); on = false;
      });
    });

    addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function follow() {
      cx += (tx - cx) * .13; cy += (ty - cy) * .13;
      if (on) peek.style.left = cx + 'px', peek.style.top = cy + 'px';
      requestAnimationFrame(follow);
    })();
  }
})();
