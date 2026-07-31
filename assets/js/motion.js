/* ============================================================
   MOTION — the interaction engine
   Line splitting, scroll-driven reveals, inertia scrolling,
   a pinned work stack and velocity skew. No dependencies.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ------------------------------------------------------------
     1. Split headings into masked lines
     Measured after fonts load, otherwise the line breaks are wrong.
     ------------------------------------------------------------ */
  function splitLines(el) {
    if (el.dataset.split === 'done') return;

    // Existing <span class="ln"> markup already declares the lines.
    var declared = el.querySelectorAll(':scope > .ln');
    if (declared.length) {
      Array.prototype.forEach.call(declared, function (line, i) {
        var mask = document.createElement('span');
        mask.className = 'ln-mask';
        var inner = document.createElement('span');
        inner.className = 'ln-in';
        inner.style.setProperty('--l', i);
        while (line.firstChild) inner.appendChild(line.firstChild);
        // carry the original line's own classes onto the moving element
        inner.className = 'ln-in ' + line.className.replace('ln', '').trim();
        mask.appendChild(inner);
        line.replaceWith(mask);
      });
      el.dataset.split = 'done';
      return;
    }

    // Otherwise measure real line boxes by wrapping each word.
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
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
        // unwrap the word span, keep the text
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

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(runSplits);
  } else {
    runSplits();
  }
  // re-measure on width change, line breaks move
  var lastW = innerWidth;
  addEventListener('resize', function () {
    if (Math.abs(innerWidth - lastW) < 60) return;
    lastW = innerWidth;
  });

  /* ------------------------------------------------------------
     2. Reveal observer, drives every entrance
     ------------------------------------------------------------ */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function observeAll() {
    document.querySelectorAll('[data-split],[data-fx],[data-cards]').forEach(function (el) {
      io.observe(el);
    });
    document.querySelectorAll('[data-cards]').forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (c, i) {
        c.style.setProperty('--i', i);
      });
    });
    document.querySelectorAll('.stack .case').forEach(function (c, i) {
      c.style.setProperty('--i', i);
    });
  }
  observeAll();

  /* ------------------------------------------------------------
     3. Preloader
     ------------------------------------------------------------ */
  (function preloader() {
    var pre = document.querySelector('.pre');
    if (!pre || reduce) { root.classList.add('pre-done'); return; }

    var bar = pre.querySelector('.pre-bar i');
    var num = pre.querySelector('.pre-num');
    var mark = pre.querySelector('.pre-mark span');
    var start = performance.now(), dur = 1150, done = false;

    if (mark) {
      requestAnimationFrame(function () {
        mark.style.transition = 'transform .9s cubic-bezier(.16,1,.3,1)';
        mark.style.transform = 'none';
      });
    }

    function finish() {
      if (done) return;
      done = true;
      root.classList.add('pre-done');
      setTimeout(function () { pre.remove(); }, 1100);
    }

    (function tick(t) {
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (bar) bar.style.transform = 'scaleX(' + eased + ')';
      if (num) num.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick); else finish();
    })(start);

    // never trap the page if something above throws
    setTimeout(finish, 3500);
  })();

  /* ------------------------------------------------------------
     4. Inertia scrolling
     Lerps the real scroll position, so sticky and fixed keep working.
     ------------------------------------------------------------ */
  var velocity = 0;
  (function smooth() {
    if (reduce || !fine) {
      // still track velocity for the marquee skew
      var prev = scrollY;
      addEventListener('scroll', function () {
        velocity = scrollY - prev; prev = scrollY;
      }, { passive: true });
      return;
    }

    var target = scrollY, current = scrollY, running = false;

    function max() {
      return document.documentElement.scrollHeight - innerHeight;
    }

    function loop() {
      var d = target - current;
      current += d * 0.11;
      velocity = d * 0.11;
      if (Math.abs(d) < 0.4) { current = target; running = false; }
      scrollTo(0, current);
      if (running) requestAnimationFrame(loop);
      else velocity = 0;
    }

    addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;                       // pinch zoom
      if (e.target.closest('[data-native-scroll]')) return;
      e.preventDefault();
      target = Math.max(0, Math.min(target + e.deltaY, max()));
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: false });

    // keyboard, anchors and programmatic scrolls stay native
    ['keydown', 'mousedown', 'touchstart'].forEach(function (ev) {
      addEventListener(ev, function () { target = current = scrollY; }, { passive: true });
    });
    addEventListener('resize', function () { target = current = scrollY; });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (a) setTimeout(function () { target = current = scrollY; }, 700);
    });
  })();

  /* ------------------------------------------------------------
     5. Scroll-driven work, one rAF for everything
     ------------------------------------------------------------ */
  var paras = [].slice.call(document.querySelectorAll('[data-para]'));
  var marquee = document.querySelector('.mq');   // the track already owns translateX
  var stackCards = [].slice.call(document.querySelectorAll('.stack .case'));
  var skew = 0;

  function frame() {
    var vh = innerHeight;

    if (!reduce) {
      // parallax
      paras.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = 'translate3d(0,' + (p * parseFloat(el.dataset.para) * 100).toFixed(2) + 'px,0)';
      });

      // marquee skew tracks scroll velocity
      if (marquee) {
        skew += (Math.max(-9, Math.min(velocity * 0.32, 9)) - skew) * 0.1;
        marquee.style.transform = 'skewY(' + skew.toFixed(2) + 'deg)';
      }

      // pinned stack, each card recedes as the next arrives
      if (innerWidth >= 900) {
        stackCards.forEach(function (card, i) {
          if (i === stackCards.length - 1) { card.style.transform = ''; card.style.filter = ''; return; }
          var next = stackCards[i + 1].getBoundingClientRect();
          var own = card.getBoundingClientRect();
          var gap = next.top - own.top;
          var p = 1 - Math.max(0, Math.min(gap / (own.height + 60), 1));
          card.style.transform = 'scale(' + (1 - p * 0.07).toFixed(4) + ')';
          card.style.filter = 'brightness(' + (1 - p * 0.32).toFixed(3) + ')';
        });
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ------------------------------------------------------------
     6. Section dots
     ------------------------------------------------------------ */
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
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = secs.indexOf(e.target);
        btns.forEach(function (b, j) { b.setAttribute('aria-current', String(j === i)); });
      });
    }, { threshold: 0.4 });
    secs.forEach(function (s) { spy.observe(s); });
  })();
})();
