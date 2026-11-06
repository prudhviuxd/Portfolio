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
  // Words inside a .hl span keep that wrapper, so a highlighted phrase
  // survives the split; punctuation that touches it ("AI.") stays glued.
  function splitLines(el) {
    var units = [], prev = '';
    Array.prototype.forEach.call(el.childNodes, function (node) {
      var hl = node.nodeType === 1 && node.classList.contains('hl');
      var text = node.textContent;
      var glue = units.length && !/\s$/.test(prev) && !/^\s/.test(text);
      prev = text;
      text.trim().split(/\s+/).forEach(function (w, i) {
        if (!w) return;
        var piece = { t: w, hl: hl };
        if (i === 0 && glue) units[units.length - 1].push(piece);
        else units.push([piece]);
      });
    });
    var html = function (u) {
      return u.map(function (p) { return p.hl ? '<span class="hl">' + p.t + '</span>' : p.t; }).join('');
    };
    el.innerHTML = units.map(function (u) { return '<span class="wd">' + html(u) + '</span>'; }).join(' ');
    var lines = [], top = null;
    $$('.wd', el).forEach(function (w, i) {
      if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(html(units[i]));
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

  /* ---------- entrance (no preloader: content animates in straight away) ---------- */

  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('ready'); }); });

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
  var work = $('.work'), wTrack = $('.work-track'), wFront = $('.work-front');
  var wBack = $('.work-back .wrap'), wCards = $$('.wcard');
  var wEnd = $('.wend i'), wPlus = $('.wend svg');
  var hs = false;

  // Desktop pins the section and scrolls the track sideways; phones and
  // reduced motion get a plain vertical stack.
  function setWorkMode() {
    hs = !!work && window.innerWidth >= 768 && !reduced;
    if (work) work.classList.toggle('hs', hs);
    if (!hs) {
      [wTrack, wFront, wBack].forEach(function (el) { if (el) { el.style.transform = ''; el.style.opacity = ''; } });
      $$('.wcard-in').forEach(function (el) { el.style.transform = ''; });
    }
  }
  setWorkMode();

  function reveal(card, i) {
    if (!card.classList.contains('play')) card.classList.add('play');
    if (!card.classList.contains('lit')) {
      $('.wline', card).style.transitionDelay = (0.1 * i) + 's';
      card.classList.add('lit');
    }
  }
  var mqDrift = 0;

  function progress(el) {
    var r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - vh()), 0, 1);
  }

  var hero = $('.hero'), heroIn = $('.hero-in');
  function onScroll() {
    var h = vh();

    // Hero recedes (drifts down, shrinks, dims) while the sand Work panel
    // rises over it; the panel's rounded shoulders flatten as it docks.
    if (hero && heroIn && !reduced) {
      var hp = clamp(window.scrollY / h, 0, 1);
      if (hp < 1) {
        heroIn.style.transform = 'translate3d(0,' + (hp * h * 0.34).toFixed(1) + 'px,0) scale(' + (1 - hp * 0.06).toFixed(4) + ')';
        heroIn.style.opacity = (1 - hp * 0.8).toFixed(3);
      }
    }

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

    // Work: vertical scroll drives the track sideways (1.5 screens), then the
    // whole light layer slides off left (0.9 screens) over the dark one.
    if (hs && work) {
      var w = window.innerWidth;
      var y = clamp(-work.getBoundingClientRect().top, 0, work.offsetHeight - h);
      var k = clamp(y / (1.5 * h), 0, 1), m = clamp((y - 1.5 * h) / (0.9 * h), 0, 1);
      var S = k * Math.max(0, wTrack.scrollWidth - w);
      wTrack.style.transform = 'translate3d(' + (-S) + 'px,0,0)';
      wFront.style.transform = 'translate3d(' + (-w * m) + 'px,0,0)';
      wBack.style.transform = 'translate3d(' + ((1 - m) * 18) + 'vw,0,0)';
      wBack.style.opacity = 0.2 + 0.8 * m;

      // Each card rises from 550px below as it travels in from the right.
      wCards.forEach(function (card, i) {
        var r = (0.5 * w + i * 0.5 * w + 0.25 * w - S) / w;
        var off = r > 1.2 ? 550 : r > 0.5 ? 550 * Math.pow(1 - (1.2 - r) / 0.7, 3) : 0;
        $('.wcard-in', card).style.transform = 'translate3d(0,' + off + 'px,0)';
        if (r < 1.05) card.classList.add('play');
        if (r < 1) reveal(card, i);
      });

      // Right-edge rule grows and its plus spins as the layer leaves.
      var right = wCards[wCards.length - 1].getBoundingClientRect().right;
      var n = right <= w ? clamp((w - right) / w, 0, 1) : 0;
      wEnd.style.transform = 'scaleY(' + n + ')';
      wPlus.style.transform = 'translate(-50%,-50%) rotate(' + (360 * n) + 'deg)';
      wPlus.style.opacity = n > 0.01 && right >= 0 ? 1 : 0;
    }
  }

  var ticking = false;
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', function () { setWorkMode(); req(); });
  onScroll();

  // Slow constant drift on the marquee so it never sits still.
  if (mqTrack && !reduced) (function drift() {
    mqDrift = (mqDrift + 0.012) % 50;
    req();
    requestAnimationFrame(drift);
  })();

  /* ---------- hero: typewriter on the last line only ----------
     "Design leader / advancing" stay put; the last line types a word,
     holds, deletes it and types the next (UX maturity, Innovation, AI)
     on repeat. The HTML carries the first word, so without JS or with
     reduced motion the headline still reads in full. */

  var rotLine = $('.hero-title .rot');
  if (rotLine && !reduced) (function () {
    var words = rotLine.getAttribute('data-type').split('|');
    var slot = rotLine.firstElementChild;
    var caret = document.createElement('span');
    caret.className = 'caret';
    slot.textContent = '';
    rotLine.appendChild(caret);

    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    function run(step, speed) {
      caret.classList.add('typing');
      return new Promise(function (done) {
        (function tick() {
          if (!step()) { caret.classList.remove('typing'); return done(); }
          setTimeout(tick, speed + Math.random() * speed * 0.5);
        })();
      });
    }
    function type(text) {
      return run(function () {
        var n = slot.textContent.length;
        if (n >= text.length) return false;
        slot.textContent = text.slice(0, n + 1); return true;
      }, 75);
    }
    function erase() {
      return run(function () {
        var t = slot.textContent;
        if (!t.length) return false;
        slot.textContent = t.slice(0, -1); return true;
      }, 34);
    }

    var w = 0;
    (function loop() {
      type(words[w])
        .then(function () { return wait(1800); })
        .then(erase)
        .then(function () { w = (w + 1) % words.length; return wait(300); })
        .then(loop);
    })();
  })();

  /* ---------- AI cards: a light that follows the pointer ---------- */
  $$('.ai-card').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- workshops entrance ---------- */

  $$('.ws-steps').forEach(function (ul) {
    $$('li', ul).forEach(function (li, i) { li.style.setProperty('--i', i); });
  });
  $$('[data-ws], [data-ws-yt], .lead-grid, .ai-grid').forEach(function (el) {
    if (!io || reduced) { el.classList.add('on'); return; }
    new IntersectionObserver(function (e, obs) {
      if (!e[0].isIntersecting) return;
      el.classList.add('on'); obs.disconnect();
    }, { rootMargin: '0px 0px -15% 0px' }).observe(el);
  });

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

  // Stacked layout: reveal each card as it scrolls into view.
  if (io) {
    var wio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !hs) { reveal(e.target, 0); wio.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    wCards.forEach(function (c) { wio.observe(c); });
  } else wCards.forEach(function (c) { reveal(c, 0); });

  /* ---------- enquiry form ----------
     Posts to contact.php, which emails the enquiry. Where PHP is not
     available (a static preview, or the request fails) it falls back
     to opening the visitor's email app with the message filled in. */

  var form = $('#enquiry');
  if (form) {
    var note = $('.form-note', form);
    var sendBtn = $('button[type="submit"]', form);
    var started = form.querySelector('input[name="t"]');
    if (started) started.value = Date.now();

    function mailtoFallback(d) {
      var subject = 'Portfolio enquiry: ' + d.get('topic');
      var body = d.get('message') + '\n\n' + d.get('name') + '\n' + d.get('email');
      window.location.href = 'mailto:prudhviuxd@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      note.textContent = 'Opening your email app. If nothing happens, write to prudhviuxd@gmail.com.';
    }

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
      form.classList.add('sending'); sendBtn.disabled = true;
      note.classList.remove('is-ok', 'is-err');
      note.textContent = 'Sending\u2026';

      fetch(form.getAttribute('action'), { method: 'POST', body: d, headers: { 'X-Requested-With': 'fetch' } })
        .then(function (r) {
          var type = r.headers.get('content-type') || '';
          if (type.indexOf('application/json') < 0) throw new Error('no-php');
          return r.json();
        })
        .then(function (res) {
          note.textContent = res.message;
          note.classList.add(res.ok ? 'is-ok' : 'is-err');
          if (res.ok) {
            form.reset();
            if (started) started.value = Date.now();
          }
        })
        .catch(function () { mailtoFallback(d); })
        .then(function () { form.classList.remove('sending'); sendBtn.disabled = false; });
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

/* Sections reveal as the pointer enters them. Each section below the hero
   waits with its content blocks hidden; entering it with the mouse (or
   moving focus into it) brings them in, one after another. Safety net: a
   section that has sat across the middle of the screen for a moment opens
   anyway, so content is never stuck hidden. Touch devices and reduced
   motion skip the effect entirely. */
(function () {
  'use strict';
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduced || !('IntersectionObserver' in window)) return;

  // The blocks that animate in each section, top to bottom.
  var PARTS = {
    about: '.about-lbl, .about-big, .about-tag, .about-mission',
    impact: '.facts-head, .fcards, .impact-row, .partners',
    leadership: '.sec-head, .lead-grid, .ai-head, .ai-grid',
    expertise: '.exp-row',
    workshops: '.sec-head, .ws-grid > *, .yt',
    contact: '.contact-l > *, .form',
    footer: '.ft-top > *, .ft-name, .ft-base'
  };

  Object.keys(PARTS).forEach(function (id) {
    var sec = id === 'footer' ? document.querySelector('body > footer.ft') : document.getElementById(id);
    if (!sec) return;
    var parts = Array.prototype.slice.call(sec.querySelectorAll(PARTS[id]));
    if (!parts.length) return;

    // Already on screen when the page loads (a reload mid-page, a #link):
    // show it straight away rather than hiding what the reader is looking at.
    var r = sec.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.85 && r.bottom > 0) return;

    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';
    parts.forEach(function (el, i) { el.classList.add('rv'); el.style.setProperty('--i', i); });
    sec.classList.add('rv-wait');

    var timer = null;
    function open() {
      if (sec.classList.contains('rv-in')) return;
      // Inner entrances that already played while hidden replay in view.
      var played = Array.prototype.slice.call(sec.querySelectorAll('[data-lines].on, .lead-grid.on, .ai-grid.on, [data-ws].on, [data-ws-yt].on'));
      played.forEach(function (el) { el.classList.remove('on'); });
      void sec.offsetWidth;
      sec.classList.add('rv-in');
      setTimeout(function () { played.forEach(function (el) { el.classList.add('on'); }); }, 140);
      clearTimeout(timer);
      io.disconnect();
    }
    sec.addEventListener('pointerenter', open);
    sec.addEventListener('pointermove', open, { passive: true });
    sec.addEventListener('focusin', open);

    // Fallback: the section crosses the middle band of the screen and the
    // pointer has not come to it within 900ms.
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { clearTimeout(timer); timer = setTimeout(open, 900); }
      else clearTimeout(timer);
    }, { rootMargin: '-40% 0px -40% 0px' });
    io.observe(sec);
  });

  // Stars turn while the pointer is inside any section.
  Array.prototype.slice.call(document.querySelectorAll('main > section, body > footer.ft')).forEach(function (sec) {
    sec.addEventListener('pointerenter', function () { sec.classList.add('is-hot'); });
    sec.addEventListener('pointerleave', function () { sec.classList.remove('is-hot'); });
  });
})();

/* Hero night sky: faint twinkling stars, and every few seconds a falling
   star (the site's four-point star with a fading tail). Runs only while the
   hero is on screen and the tab is visible; reduced motion draws the still
   field once and lets nothing fall. */
(function () {
  'use strict';
  var cvs = document.querySelector('.hero .stars');
  if (!cvs || !cvs.getContext) return;
  var ctx = cvs.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, field = [], falling = [], clouds = [], running = false, next = 0, raf = 0;

  // One soft cloud, pre-rendered once: overlapping radial puffs along a
  // gentle arc, so it reads as a rounded cumulus rather than a streak.
  function makeCloud(w) {
    var h = Math.round(w * 0.6), c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d'), puffs = 9 + Math.floor(Math.random() * 6);
    for (var i = 0; i < puffs; i++) {
      var t = i / (puffs - 1);
      var px = w * (0.14 + t * 0.72) + (Math.random() - 0.5) * w * 0.06;
      var arch = Math.sin(t * Math.PI);
      var r = w * (0.1 + arch * 0.1 + Math.random() * 0.03);
      var py = h * (0.62 - arch * 0.16) + (Math.random() - 0.5) * h * 0.06;
      r = Math.min(r, px, w - px, py, h - py);   // never past the edge, so no hard cut
      var rg = g.createRadialGradient(px, py, 0, px, py, r);
      rg.addColorStop(0, 'rgba(226,224,230,.55)');
      rg.addColorStop(0.45, 'rgba(226,224,230,.28)');
      rg.addColorStop(1, 'rgba(226,224,230,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(px, py, r, 0, 6.283); g.fill();
    }
    return c;
  }
  function seedClouds() {
    clouds = [];
    var n = W < 768 ? 4 : 7;
    for (var i = 0; i < n; i++) {
      var w = (W < 768 ? 260 : 380) + Math.random() * (W < 768 ? 160 : 320);
      clouds.push({
        img: makeCloud(Math.round(w)), w: w,
        x: (i / n) * (W + w) - w * 0.5 + Math.random() * 120,
        y: H * (0.04 + Math.random() * 0.78),
        v: 0.008 + Math.random() * 0.012,          // px per ms: about 8 to 20 px a second
        a: 0.07 + Math.random() * 0.06
      });
    }
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = W * dpr; cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(W * H / 9000);
    field = [];
    for (var i = 0; i < n; i++) field.push({
      x: Math.random() * W, y: Math.random() * H * 0.9,
      r: Math.random() < 0.08 ? 1.3 : 0.4 + Math.random() * 0.6,
      a: 0.15 + Math.random() * 0.45, t: Math.random() * 6.28, s: 0.4 + Math.random() * 1.2
    });
    seedClouds();
    if (reduced) draw(0);
  }

  function sparkle(x, y, r, a) {
    // four-point star, the site's ornament
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
      ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
      ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
      ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
    }
    ctx.fillStyle = '#f4ece0'; ctx.fill();
    ctx.restore();
  }

  function spawn() {
    var tilt = (22 + Math.random() * 18) * Math.PI / 180;  // degrees below the horizon
    var speed = 0.5 + Math.random() * 0.35;                // px per ms
    falling.push({
      x: W * (0.2 + Math.random() * 0.55), y: -10 + Math.random() * H * 0.3,
      vx: -Math.cos(tilt) * speed, vy: Math.sin(tilt) * speed,
      life: 0, max: 1100 + Math.random() * 900, len: 160 + Math.random() * 140
    });
  }

  var last = 0;
  function draw(now) {
    var dt = last ? Math.min(now - last, 50) : 16; last = now;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < field.length; i++) {
      var s = field[i];
      var tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(s.t + now * 0.001 * s.s);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#e9e4dc';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    // clouds drift right to left over the stars and wrap around
    for (var c = 0; c < clouds.length; c++) {
      var cl = clouds[c];
      if (!reduced) { cl.x -= cl.v * dt; if (cl.x < -cl.w) { cl.x = W + Math.random() * 120; cl.y = H * (0.04 + Math.random() * 0.78); } }
      ctx.globalAlpha = cl.a;
      ctx.drawImage(cl.img, cl.x, cl.y - cl.w * 0.3, cl.w, cl.w * 0.6);
    }
    ctx.globalAlpha = 1;
    if (reduced) return;
    if (now > next) { spawn(); next = now + 2200 + Math.random() * 3600; }
    for (var j = falling.length - 1; j >= 0; j--) {
      var f = falling[j];
      f.life += dt; f.x += f.vx * dt; f.y += f.vy * dt;
      var k = f.life / f.max;
      if (k >= 1) { falling.splice(j, 1); continue; }
      var a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;   // fade in fast, out slow
      var m = Math.hypot(f.vx, f.vy), ux = f.vx / m, uy = f.vy / m;
      var g = ctx.createLinearGradient(f.x, f.y, f.x - ux * f.len, f.y - uy * f.len);
      g.addColorStop(0, 'rgba(244,236,224,' + (0.85 * a) + ')');
      g.addColorStop(1, 'rgba(244,236,224,0)');
      ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - ux * f.len, f.y - uy * f.len); ctx.stroke();
      ctx.shadowColor = 'rgba(244,236,224,.8)'; ctx.shadowBlur = 10;
      sparkle(f.x, f.y, 7, a);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    if (running) raf = requestAnimationFrame(draw);
  }

  function start() { if (running || reduced) return; running = true; last = 0; next = performance.now() + 900; raf = requestAnimationFrame(draw); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  size();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
  var onScreen = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
    onScreen = e[0].isIntersecting; if (onScreen && !document.hidden) start(); else stop();
  }).observe(cvs);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (onScreen) start(); });
  start();
})();

/* Footer: the name fills with amber as the page reaches its end, and a
   live Hyderabad clock (IST) sits beside the identity. */
(function () {
  'use strict';
  var name = document.querySelector('.ft-name');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (name && !reduced) {
    var tick = false;
    var fill = function () {
      tick = false;
      var r = name.getBoundingClientRect(), h = window.innerHeight;
      var p = Math.min(1, Math.max(0, (h - r.top) / (r.height + 30)));
      name.style.setProperty('--fill', (p * 100).toFixed(1) + '%');
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(fill); } }, { passive: true });
    window.addEventListener('resize', fill);
    fill();
  }
  var t = document.getElementById('ftTime');
  if (t && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    var show = function () { t.textContent = fmt.format(new Date()) + ' IST'; };
    show(); setInterval(show, 20000);
  }
})();
