/* Studio homepage behaviour. Vanilla, no dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var vh = function () { return window.innerHeight; };

  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- text splitting ---------- */

  // Letter roll: two stacked copies of the label, swapped on hover.
  $$('[data-roll]').forEach(function (el) {
    var html = el.innerHTML.trim();
    el.innerHTML = '<span class="roll"><span class="roll-a">' + html +
      '</span><span class="roll-b" aria-hidden="true">' + html + '</span></span>';
  });

  // Mono underline button: per-letter spans, twin arrows, two-part underline.
  var arrow = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M0 7h12.5M8 2.5 12.5 7 8 11.5"/></svg>';
  $$('[data-btn]').forEach(function (el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    var letters = text.split('').map(function (ch, i) {
      return '<i style="--i:' + i + '">' + (ch === ' ' ? ' ' : ch) + '</i>';
    }).join('');
    el.innerHTML = '<span class="t" aria-hidden="true">' + letters + '</span>' +
      '<span class="ar" aria-hidden="true">' + arrow + arrow + '</span><span class="u"></span>';
  });

  // Masked line reveal: wrap words, then group them by rendered line.
  function splitLines(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="wd">' + w + '</span>'; }).join(' ');
    var lines = [], top = null;
    $$('.wd', el).forEach(function (w) {
      if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = lines.map(function (l) {
      return '<span class="ln"><span>' + l.join(' ') + '</span></span>';
    }).join('');
  }

  // About copy: one span per word, lit as the reader scrolls through it.
  var aboutWords = [];
  var about = $('[data-words]');
  if (about) {
    about.innerHTML = about.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="w">' + w + '</span>';
    }).join(' ');
    aboutWords = $$('.w', about);
  }

  $$('.exp-body li').forEach(function (li) {
    li.style.setProperty('--i', Array.prototype.indexOf.call(li.parentNode.children, li));
  });

  /* ---------- reveal on view ---------- */

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('on');
      if (e.target.hasAttribute('data-count')) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;

  function countUp(el) {
    var end = +el.getAttribute('data-count');
    if (reduced) { el.textContent = end; return; }
    var t0 = performance.now(), dur = 1400;
    (function tick(t) {
      var k = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function watch() {
    $$('[data-lines]').forEach(splitLines);
    $$('[data-lines], [data-count]').forEach(function (el) {
      if (io) io.observe(el); else el.classList.add('on');
    });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(watch);

  /* ---------- preloader ---------- */

  var pl = $('.pl');
  function ready() { root.classList.add('ready'); }

  if (!pl || reduced) {
    ready();
  } else {
    var seen = false;
    try { seen = sessionStorage.getItem('pl-seen') === '1'; sessionStorage.setItem('pl-seen', '1'); } catch (e) {}
    var reels = $$('.reel', pl);
    reels.forEach(function (r) {
      var s = '';
      for (var d = 0; d <= 9; d++) s += '<i>' + d + '</i>';
      r.innerHTML = s;
      $$('i', r).forEach(function (i) { i.style.transition = 'transform .25s cubic-bezier(.16,1,.3,1)'; });
    });
    function setCount(n) {
      var digits = ('00' + n).slice(-3).split('');
      reels.forEach(function (r, idx) {
        $$('i', r).forEach(function (i) { i.style.transform = 'translateY(' + (-digits[idx] * 100) + '%)'; });
      });
    }
    var dur = seen ? 500 : 1700, t0 = null;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { pl.classList.add('go'); });
    requestAnimationFrame(function step(t) {
      if (t0 === null) t0 = t;
      var k = clamp((t - t0) / dur, 0, 1);
      setCount(Math.round(100 * (1 - Math.pow(1 - k, 2))));
      if (k < 1) return requestAnimationFrame(step);
      setTimeout(function () {
        pl.classList.add('out');
        $$('.pl-belts i', pl).forEach(function (b, i) { b.style.transitionDelay = (i * 0.045) + 's'; });
        document.body.style.overflow = '';
        setTimeout(ready, 350);
        setTimeout(function () { pl.classList.add('done'); }, 1500);
      }, 180);
    });
  }

  /* ---------- menu ---------- */

  var menuBtn = $('#menuBtn'), menu = $('#menu');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    if (open) { var first = $('.menu-links a', menu); first && first.focus({ preventScroll: true }); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]') || e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
  }

  /* ---------- hero line field ---------- */

  var cvs = $('.lines');
  if (cvs && cvs.getContext) (function () {
    var ctx = cvs.getContext('2d');
    var W, H, dpr, rows = [], GAP_Y = 22, GAP_X = 24;
    var mouse = { x: -9999, y: -9999, down: false, charge: 0 };
    var visible = true, t = 0;

    function build() {
      var r = cvs.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cvs.width = W * dpr; cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rows = [];
      var gy = W < 768 ? 26 : GAP_Y;
      for (var y = gy; y < H; y += gy) {
        var pts = [];
        for (var x = -GAP_X; x <= W + GAP_X; x += GAP_X) pts.push({ x: x, oy: y, dy: 0, v: 0 });
        rows.push(pts);
      }
    }

    function blast(power) {
      rows.forEach(function (pts) {
        pts.forEach(function (p) {
          var dx = p.x - mouse.x, dy = p.oy - mouse.y, d = Math.sqrt(dx * dx + dy * dy) + 30;
          p.v += (dy >= 0 ? 1 : -1) * power * 5200 / d;
        });
      });
    }

    function frame() {
      if (!visible) return;
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      var R = 150;
      if (mouse.down) mouse.charge = Math.min(mouse.charge + 0.016, 1.4);

      for (var i = 0; i < rows.length; i++) {
        var pts = rows[i];
        ctx.beginPath();
        var near = 0;
        for (var j = 0; j < pts.length; j++) {
          var p = pts[j];
          var dx = p.x - mouse.x, dy = (p.oy + p.dy) - mouse.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < R) {
            var f = (1 - d / R);
            p.v += (dy >= 0 ? 1 : -1) * f * f * (mouse.down ? -2.2 : 3.2);
            near = Math.max(near, f);
          }
          if (!reduced) p.v += Math.sin(t * 1.3 + p.x * 0.008 + i * 0.35) * 0.012;
          p.v += -p.dy * 0.06;
          p.v *= 0.86;
          p.dy += p.v;
          var y = p.oy + p.dy;
          if (j === 0) ctx.moveTo(p.x, y);
          else {
            var q = pts[j - 1], qy = q.oy + q.dy;
            ctx.quadraticCurveTo(q.x, qy, (q.x + p.x) / 2, (qy + y) / 2);
          }
        }
        ctx.strokeStyle = 'rgba(216,216,216,' + (0.07 + near * 0.35) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (mouse.down) {
        var c = mouse.charge / 1.4;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 10 + c * 60, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(232,161,58,' + (0.25 + c * 0.5) + ')';
        ctx.stroke();
      }
      requestAnimationFrame(frame);
    }

    function pos(e) {
      var r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }
    cvs.addEventListener('pointermove', pos);
    cvs.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; mouse.down = false; mouse.charge = 0; });
    cvs.addEventListener('pointerdown', function (e) { pos(e); mouse.down = true; mouse.charge = 0; });
    window.addEventListener('pointerup', function () {
      if (!mouse.down) return;
      mouse.down = false;
      blast(0.35 + mouse.charge);
      mouse.charge = 0;
    });

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
    build();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        var was = visible; visible = e[0].isIntersecting;
        if (visible && !was) requestAnimationFrame(frame);
      }).observe(cvs);
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- scroll-bound effects ---------- */

  var vision = $('.vision'), mqTrack = $('.mq-track'), stripes = $$('.stripes i');
  var fades = $$('.vision [data-fade]');
  var fcards = $$('.fcard');
  var projs = $$('.proj');
  var mqDrift = 0;

  function progress(el) {
    var r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - vh()), 0, 1);
  }

  function onScroll() {
    var h = vh();

    // About: light words as the paragraph passes through the viewport.
    if (aboutWords.length) {
      var ar = about.getBoundingClientRect();
      var p = clamp((h * 0.85 - ar.top) / (ar.height + h * 0.35), 0, 1);
      var n = Math.round(p * aboutWords.length);
      for (var i = 0; i < aboutWords.length; i++) aboutWords[i].classList.toggle('on', i < n);
    }

    // Vision: headline, marquee, then five stripes wipe up into the light section.
    if (vision && !reduced) {
      var vp = progress(vision);
      if (fades[0]) fades[0].classList.toggle('on', vp > 0.01 || vision.getBoundingClientRect().top < h * 0.5);
      if (fades[1]) fades[1].classList.toggle('on', vp > 0.22);
      if (mqTrack) mqTrack.style.transform = 'translate3d(' + (-(vp * 35) - mqDrift) + '%,0,0)';
      stripes.forEach(function (s, idx) {
        var k = stripes.length - 1 - idx;
        var local = clamp((vp - 0.55 - k * 0.05) / 0.22, 0, 1);
        s.style.transform = 'scaleY(' + local + ')';
      });
    } else fades.forEach(function (f) { f.classList.add('on'); });

    // Key facts: the side cards fan out from behind the centre card.
    if (fcards.length === 3 && window.innerWidth > 767 && !reduced) {
      var fr = fcards[1].getBoundingClientRect();
      var q = clamp((h - fr.top) / (h * 0.75), 0, 1);
      var e = 1 - Math.pow(1 - q, 3), inv = 1 - e;
      fcards[0].style.transform = 'translate3d(' + (inv * 104) + '%,' + (inv * 30) + 'px,' + (-inv * 120) + 'px) rotate(' + (-inv * 9) + 'deg)';
      fcards[2].style.transform = 'translate3d(' + (-inv * 104) + '%,' + (inv * 30) + 'px,' + (-inv * 120) + 'px) rotate(' + (inv * 9) + 'deg)';
      fcards[1].style.transform = 'translate3d(0,' + (inv * 60) + 'px,0)';
      fcards[1].style.zIndex = 2;
    } else fcards.forEach(function (c) { c.style.transform = ''; });

    // Work: each case recedes as the next one slides over it.
    if (window.innerWidth > 1024 && !reduced) {
      for (var j = 0; j < projs.length - 1; j++) {
        var cur = projs[j].getBoundingClientRect(), nxt = projs[j + 1].getBoundingClientRect();
        var k2 = clamp(1 - (nxt.top - cur.top) / cur.height, 0, 1);
        projs[j].style.transform = 'scale(' + (1 - k2 * 0.07) + ')';
        projs[j].style.filter = 'brightness(' + (1 - k2 * 0.55) + ')';
      }
    } else projs.forEach(function (p) { p.style.transform = ''; p.style.filter = ''; });
  }

  var ticking = false;
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  onScroll();

  // Slow constant drift on the marquee so it never sits still.
  if (mqTrack && !reduced) (function drift() {
    mqDrift = (mqDrift + 0.012) % 50;
    req();
    requestAnimationFrame(drift);
  })();

  /* ---------- key-fact card details ---------- */

  var rotor = $$('.fc-rotor span');
  if (rotor.length) {
    var ri = 0;
    rotor[0].classList.add('on');
    if (!reduced) setInterval(function () {
      rotor[ri].classList.remove('on'); rotor[ri].classList.add('off');
      var prev = rotor[ri];
      setTimeout(function () { prev.classList.remove('off'); }, 800);
      ri = (ri + 1) % rotor.length;
      rotor[ri].classList.add('on');
    }, 1800);
  }

  var dots = $$('.fc-dots i');
  if (dots.length && io) {
    new IntersectionObserver(function (e, obs) {
      if (!e[0].isIntersecting) return;
      obs.disconnect();
      dots.forEach(function (d, i) { setTimeout(function () { d.classList.add('on'); }, reduced ? 0 : 120 * i); });
    }, { threshold: 0.5 }).observe(dots[0].parentNode);
  } else dots.forEach(function (d) { d.classList.add('on'); });

  // Case cards: the round "View" badge follows the pointer.
  $$('.proj-vis').forEach(function (v) {
    v.addEventListener('pointermove', function (e) {
      var r = v.getBoundingClientRect();
      v.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      v.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- enquiry form (static site: hands off to the mail client) ---------- */

  var form = $('#enquiry');
  if (form) {
    var note = $('.form-note', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('.f', form).forEach(function (f) {
        var input = $('input,select,textarea', f);
        var bad = !input.checkValidity() || (input.name === 'message' && input.value.trim().length < 20);
        f.classList.toggle('bad', bad);
        if (bad) ok = false;
      });
      if (!ok) { note.textContent = 'A couple of fields need another look.'; return; }
      var d = new FormData(form);
      var subject = 'Portfolio enquiry: ' + d.get('topic');
      var body = d.get('message') + '\n\n' + d.get('name') + '\n' + d.get('email');
      window.location.href = 'mailto:prudhviuxd@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      note.textContent = 'Opening your email app. If nothing happens, write to prudhviuxd@gmail.com.';
    });
    form.addEventListener('input', function (e) {
      var f = e.target.closest('.f');
      if (f && f.classList.contains('bad') && e.target.checkValidity()) f.classList.remove('bad');
    });
  }

  // "Let's talk" lands on the form with the first field ready.
  $$('a[href="#contact"]').forEach(function (a) {
    a.addEventListener('click', function () {
      setTimeout(function () { var n = form && form.querySelector('input'); n && n.focus({ preventScroll: true }); }, 700);
    });
  });
})();
