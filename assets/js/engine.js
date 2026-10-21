/* ============================================================
   ENGINE — the interaction layer, on Motion

   Replaces motion.js, reveal.js, rhodium.js and atmos.js. Motion
   is the same animation engine that powers Framer Motion; this is
   its vanilla API, so there is no React in the page.

   Two rules this file holds to:

   1. It never changes markup that carries meaning. Headlines are
      still split into .ln-mask/.ln-in, panels still toggle .on,
      sections still get .in. Every hook the CSS and the HTML
      already rely on is preserved, so this is a new engine under
      the same body, not a new body.

   2. It must never be the reason content is invisible. If Motion
      fails to load, the fallback at the bottom reveals everything
      immediately and the page degrades to plain HTML.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var M = window.Motion;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- no Motion, no problem ---------- */
  if (!M || !M.animate) {
    root.classList.add('js', 'pre-done');
    document.querySelectorAll('.rv, .rv-s, .reveal, [data-fx]')
      .forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var animate = M.animate, inView = M.inView, scroll = M.scroll, stagger = M.stagger;

  /* House springs. One set, used everywhere, so the whole page moves
     with the same hand. Stiffness decides pace, damping decides how
     much it argues with itself on the way. */
  var ENTER = { type: 'spring', stiffness: 170, damping: 26, mass: 0.9 };
  var SNAP  = { type: 'spring', stiffness: 420, damping: 32, mass: 0.6 };
  var SOFT  = { type: 'spring', stiffness: 220, damping: 30, mass: 0.8 };

  root.classList.add('js');

  /* ============================================================
     1. Split headings into masked lines
     Unchanged in output: the CSS and the gradient-text rule both
     key off .ln-mask / .ln-in, so the structure has to match.
     ============================================================ */
  function splitLines(el) {
    if (el.dataset.split === 'done') return;

    var declared = el.querySelectorAll(':scope > .ln');
    if (declared.length) {
      Array.prototype.forEach.call(declared, function (line, i) {
        var mask = document.createElement('span');
        mask.className = 'ln-mask';
        var inner = document.createElement('span');
        while (line.firstChild) inner.appendChild(line.firstChild);
        inner.className = 'ln-in ' + line.className.replace('ln', '').trim();
        inner.style.setProperty('--l', i);
        mask.appendChild(inner);
        line.replaceWith(mask);
      });
      el.dataset.split = 'done';
      return;
    }

    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span');
            s.className = 'w'; s.textContent = p;
            frag.appendChild(s); words.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);

    if (!words.length) { el.dataset.split = 'done'; return; }

    var lines = [], top = null, cur = null;
    words.forEach(function (w) {
      var t = Math.round(w.offsetTop);
      if (top === null || Math.abs(t - top) > 3) { top = t; cur = []; lines.push(cur); }
      cur.push(w);
    });

    var out = document.createDocumentFragment();
    lines.forEach(function (line, i) {
      var mask = document.createElement('span');
      mask.className = 'ln-mask';
      var inner = document.createElement('span');
      inner.className = 'ln-in';
      inner.style.setProperty('--l', i);
      line.forEach(function (w, j) {
        inner.appendChild(document.createTextNode(w.textContent));
        if (j < line.length - 1) inner.appendChild(document.createTextNode(' '));
      });
      mask.appendChild(inner);
      out.appendChild(mask);
    });
    el.textContent = '';
    el.appendChild(out);
    el.dataset.split = 'done';
  }

  function runSplits() {
    document.querySelectorAll('[data-split]').forEach(splitLines);
  }

  /* ============================================================
     2. Entrances

     Motion drives these, so the CSS transition on the same
     properties is switched off first. Leaving both on means two
     engines fighting over one transform, which reads as a stutter.
     ============================================================ */
  /* The stylesheet already owns these entrances, and owns them well:
     masked lines pivoting up on a perspective, cards arriving in Z
     with a per-index delay, rows cascading. All of it was dead
     because 32 cubic-bezier() values had lost their commas, which
     invalidates the whole transition shorthand and makes every one
     of these snap instead of move.

     With those repaired, the right thing for this engine to do is
     trigger the CSS and stay out of its way. Motion is kept for the
     work CSS genuinely cannot do: springs that respond to a pointer,
     anything linked to scroll position, and counting. Running both
     on the same property is what makes a page stutter. */
  function reveal(el) { el.classList.add('in'); }

  function watch(el, amount) {
    if (reduce) { reveal(el); return; }
    inView(el, function () { reveal(el); },
           { amount: amount || 0.15, margin: '0px 0px -8% 0px' });
  }

  /* Armed after the splits, so a heading is already in lines before
     .in lands on it. Arming first means the class arrives before the
     .ln-in elements exist and the headline appears without moving. */
  function armReveals() {
  /* Per-index delay for anything that cascades. */
  document.querySelectorAll('[data-cards], [data-rows], .rv-s').forEach(function (g) {
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); });
  });
  document.querySelectorAll('.sk-panel').forEach(function (c, i) { c.style.setProperty('--i', i); });

  document.querySelectorAll('.rv, .rv-s, .reveal, [data-fx], [data-split], [data-cards], [data-rows]')
    .forEach(function (el) { watch(el, 0.12); });

  /* Case-study pages carry no reveal classes of their own, so give
     every row in a section one. Backdrops and the back link stay put,
     and anything already on screen is shown without a delay so the
     first view is never a page of blanks. */
  (function autoReveal() {
    var main = document.querySelector('main');
    if (!main || document.querySelector('.rv, [data-cards]')) return;
    var skip = /^(w-bgimg|w-hero-bg|w-back|cs-hero-bg)$/;
    var vh = innerHeight;
    main.querySelectorAll('section').forEach(function (section) {
      if (section.classList.contains('w-hero')) return;
      var stage = section.querySelector(':scope > .container') || section;
      var i = 0;
      Array.prototype.forEach.call(stage.children, function (el) {
        if (el.nodeType !== 1) return;
        if (el.getAttribute('aria-hidden') === 'true') return;
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
        if ([].some.call(el.classList, function (c) { return skip.test(c); })) return;
        if (el.classList.contains('reveal')) return;      /* already handled above */
        el.classList.add('reveal');
        el.style.setProperty('--rv-d', Math.min(i, 4) * 90 + 'ms');
        i++;
        if (el.getBoundingClientRect().top < vh * 0.92) {
          el.style.setProperty('--rv-d', '0ms');
          reveal(el);
          return;
        }
        watch(el, 0.08);
      });
    });
  })();
  }

  /* ============================================================
     3. Preloader
     ============================================================ */
  (function preloader() {
    var pre = document.querySelector('.pre');
    if (!pre || reduce) { root.classList.add('pre-done'); return; }

    var bar = pre.querySelector('.pre-bar i');
    var num = pre.querySelector('.pre-num');
    var mark = pre.querySelector('.pre-mark span');
    var done = false;

    if (mark) animate(mark, { transform: 'none' }, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });

    function finish() {
      if (done) return;
      done = true;
      root.classList.add('pre-done');
      /* Left in the DOM deliberately. transitions.css keys its enter
         veil off the absence of .pre, so removing this element plays
         a second full-screen curtain right after this one. */
      setTimeout(function () { pre.style.pointerEvents = 'none'; }, 1100);
    }

    animate(0, 1, {
      duration: 1.15,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: function (v) {
        if (bar) bar.style.transform = 'scaleX(' + v + ')';
        if (num) num.textContent = String(Math.round(v * 100)).padStart(3, '0');
      },
      onComplete: finish
    });
    setTimeout(finish, 3500);          /* never trap the page */
  })();

  /* ============================================================
     4. Counters
     ============================================================ */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (reduce) return;
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var raw = el.textContent;
    var suffix = raw.replace(/[\d.,]/g, '');
    inView(el, function () {
      animate(0, target, {
        duration: 1.3,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: function (v) { el.textContent = Math.round(v) + suffix; },
        onComplete: function () { el.textContent = raw; }
      });
    }, { amount: 0.6 });
  });

  /* ============================================================
     5. Scroll-linked work

     Motion's scroll() drives these off real scroll progress rather
     than a rAF loop reading getBoundingClientRect every frame, so
     they scrub backwards as cleanly as they run forwards.
     ============================================================ */
  if (!reduce) {
    document.querySelectorAll('[data-para]').forEach(function (el) {
      var d = parseFloat(el.dataset.para) || 0;
      if (!d) return;
      scroll(
        animate(el, { transform: ['translateY(' + (-d * 60) + 'px)', 'translateY(' + (d * 60) + 'px)'] },
                { ease: 'linear' }),
        { target: el, offset: ['start end', 'end start'] }
      );
    });

    /* Immersive backdrops: each photograph zooms against the scroll,
       scrubbed off the section's own travel through the viewport
       rather than run on a timer, so it tracks the scroll exactly
       and reverses when you scroll back up.

       Scale never drops below 1. These are cover backgrounds, so
       anything under 1 pulls the element's own edges into frame
       and you see the page behind the photograph. */
    document.querySelectorAll('.shot').forEach(function (el) {
      var host = el.closest('.shot-host') || el.parentElement;
      if (!host) return;
      /* The hero's wash sits behind live type, so it moves less: a
         big zoom there competes with the headline instead of
         sitting under it. */
      var deep = el.classList.contains('shot-ink');
      scroll(
        animate(el, { scale: deep ? [1.04, 1.14] : [1.06, 1.26] }, { ease: 'linear' }),
        { target: host, offset: ['start end', 'end start'] }
      );
    });

    /* The marquee leans into the scroll and settles when it stops.
       Velocity comes from Motion's scroll info, not a hand-rolled
       delta, so it is already smoothed. */
    var mq = document.querySelector('.mq');
    if (mq) {
      var skew = 0, want = 0, running = false;
      scroll(function (p, info) {
        want = Math.max(-7, Math.min((info.y.velocity || 0) * 0.012, 7));
        if (!running) { running = true; requestAnimationFrame(settle); }
      });
      var settle = function () {
        skew += (want - skew) * 0.12;
        mq.style.transform = 'skewY(' + skew.toFixed(3) + 'deg)';
        if (Math.abs(want - skew) > 0.01 || Math.abs(skew) > 0.01) requestAnimationFrame(settle);
        else { running = false; mq.style.transform = ''; }
      };
    }
  }

  /* ============================================================
     6. Pointer physics

     The old magnet wrote a transform straight from the pointer, so
     it tracked exactly and stopped dead. Springing it gives the
     element weight: it lags slightly going out and overshoots home.
     ============================================================ */
  if (fine && !reduce) {
    document.querySelectorAll('.magnet').forEach(function (el) {
      var active = null;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.22;
        var dy = (e.clientY - r.top - r.height / 2) * 0.34;
        if (active) active.stop();
        active = animate(el, { x: dx, y: dy }, SNAP);
      });
      el.addEventListener('pointerleave', function () {
        if (active) active.stop();
        active = animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 240, damping: 18, mass: 0.7 });
      });
    });

    /* The spotlight is a CSS variable, so it is safe on anything. */
    document.querySelectorAll('.card, .case, .lk, .logo').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* The lift is not. scroll3d.js rewrites the transform of
       [data-float] children and [data-carousel] items every frame,
       so springing those same elements means two writers and a
       visible stutter. Lift only what the scrubber does not own. */
    function scrubbed(el) {
      return !!(el.closest('[data-float]') || el.closest('[data-carousel]') || el.hasAttribute('data-s3d'));
    }
    document.querySelectorAll('.card, .case, .lk, .logo').forEach(function (el) {
      if (scrubbed(el)) return;
      el.addEventListener('pointerenter', function () { animate(el, { y: -4 }, SOFT); });
      el.addEventListener('pointerleave', function () { animate(el, { y: 0 }, SOFT); });
    });

    /* Anything clickable gives a little under the press. */
    if (M.press) {
      document.querySelectorAll('.btn, .lens button, .sk-nav button, .dots button').forEach(function (el) {
        M.press(el, function () {
          animate(el, { scale: 0.96 }, { type: 'spring', stiffness: 700, damping: 30 });
          return function () { animate(el, { scale: 1 }, { type: 'spring', stiffness: 500, damping: 18 }); };
        });
      });
    }
  }

  /* ============================================================
     7. Atmosphere — specular highlight and plate parallax
     ============================================================ */
  (function atmos() {
    var layer = document.querySelector('.atmos');
    if (!layer) return;
    var spec = layer.querySelector('.spec');
    var plate = layer.querySelector('.plate');

    if (spec && fine && !reduce) {
      var mx = 50, my = 26, tx = 50, ty = 26, idle = true;
      addEventListener('pointermove', function (e) {
        tx = (e.clientX / innerWidth) * 100;
        ty = (e.clientY / innerHeight) * 100;
        if (idle) { idle = false; requestAnimationFrame(follow); }
      }, { passive: true });
      var follow = function () {
        mx += (tx - mx) * 0.08;
        my += (ty - my) * 0.08;
        layer.style.setProperty('--atmos-mx', mx.toFixed(2) + '%');
        layer.style.setProperty('--atmos-my', my.toFixed(2) + '%');
        if (Math.abs(tx - mx) > 0.05 || Math.abs(ty - my) > 0.05) requestAnimationFrame(follow);
        else idle = true;
      };
    }

    if (plate && !reduce) {
      scroll(function (p) { layer.style.setProperty('--atmos-y', p.toFixed(4)); });
    }
  })();

  /* ============================================================
     8. Designer / leader lens
     ============================================================ */
  (function lens() {
    var lens = document.querySelector('[data-lens]');
    if (!lens) return;
    var btns = lens.querySelectorAll('[data-lens-btn]');
    var panels = document.querySelectorAll('[data-panel]');

    function set(mode) {
      lens.setAttribute('data-lens', mode);
      btns.forEach(function (b) {
        b.setAttribute('aria-selected', String(b.getAttribute('data-lens-btn') === mode));
      });
      panels.forEach(function (p) {
        var on = p.getAttribute('data-panel') === mode;
        p.classList.toggle('on', on);
        if (!on) return;
        /* Freshly shown content has never been in view, so reveal it
           outright rather than waiting for a scroll that will not come. */
        p.querySelectorAll('.rv, .rv-s, [data-cards], [data-rows]').forEach(reveal);
        reveal(p);
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-lens-btn')); });
    });
  })();

  /* ============================================================
     9. Chrome — year, burger, skill nav, section dots
     ============================================================ */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  (function burger() {
    var btn = document.getElementById('burger');
    var nav = document.getElementById('nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      if (open && !reduce) {
        animate(nav.querySelectorAll('a, .pill'),
          { opacity: [0, 1], transform: ['translateY(-10px)', 'translateY(0px)'] },
          Object.assign({}, SOFT, { delay: stagger(0.04) }));
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  })();

  (function skillNav() {
    var nav = document.querySelector('.sk-nav');
    var panels = [].slice.call(document.querySelectorAll('.sk-panel'));
    if (!nav || !panels.length) return;
    var chips = [].slice.call(nav.querySelectorAll('button'));
    chips.forEach(function (b, i) {
      if (!panels[i]) return;
      b.addEventListener('click', function () {
        panels[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    });
    function mark() {
      var best = 0, dist = Infinity;
      panels.forEach(function (p, i) {
        var d = Math.abs(p.getBoundingClientRect().top - innerHeight * 0.2);
        if (d < dist) { dist = d; best = i; }
      });
      chips.forEach(function (b, j) { b.setAttribute('aria-current', String(j === best)); });
    }
    addEventListener('scroll', mark, { passive: true });
    mark();
  })();

  (function dots() {
    var rail = document.querySelector('.dots');
    if (!rail) return;
    var secs = [].slice.call(document.querySelectorAll('main section[id]'));
    if (!secs.length) { rail.remove(); return; }
    secs.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Go to ' + (s.dataset.label || s.id));
      b.addEventListener('click', function () {
        s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      });
      rail.appendChild(b);
    });
    var btns = rail.querySelectorAll('button');
    secs.forEach(function (s, i) {
      inView(s, function () {
        btns.forEach(function (b, j) { b.setAttribute('aria-current', String(j === i)); });
      }, { amount: 0.4 });
    });
  })();

  /* Splits need final line boxes, so they wait for the webfonts, and
     the reveals wait for the splits. A font that never resolves must
     not leave the page blank, so there is a hard deadline too. */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    runSplits();
    armReveals();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot);
  else boot();
  setTimeout(boot, 1500);
})();
