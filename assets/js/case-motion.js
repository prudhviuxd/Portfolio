/* Case-study motion: the homepage's vocabulary on every case study.
   Vanilla, no dependencies. See case-motion.css for the states. */
(function () {
  'use strict';

  var root = document.documentElement;
  var main = document.querySelector('main');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  if (!main) { root.classList.add('cm-ready'); return; }
  window.__cm = true;

  // Retire the older reveal classes so two systems never fight.
  $$('.reveal, .stagger', main).forEach(function (el) { el.classList.remove('reveal', 'stagger', 'in'); });

  if (reduced) { root.classList.add('cm-ready'); return; }

  var CARDS = [
    '.stat-box', '.persona-card', '.feature-card', '.insight-card', '.chart-card',
    '.learn-grid > li', '.glance-in > div', '.skill-grid > li', '.resp-list > li',
    '.flow-box', '.phone-col', '.swatch', '.results-band',
    '.w-stat', '.w-metric', '.w-panel', '.w-insight', '.w-finding', '.w-ksf', '.w-decision', '.w-node'
  ].join(',');
  var HEADS = 'h1, h2, h3, .w-serif, .next-title, .w-next a, .mtn-wordmark';
  var COPY = 'p, blockquote, .cs-kicker, .cs-label, .w-kicker, .w-label, .eyebrow, .cs-tags, ' +
             '.cs-table-wrap, .w-tablewrap, .map-row, .chart-legend, .q-list, .resp-h, figcaption, .w-quote';

  var targets = [];
  var inCard = function (el) { return el.closest(CARDS); };
  var skip = function (el) {
    return el.closest('.phone, .mock-screen, [aria-hidden="true"], .hd, .menu, .back-btn');
  };

  /* ---- headings: wrap each word in a mask, keeping inline markup ---- */
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          // text-clipped gradients (e.g. WHO's teal line) cannot reach a
          // transformed child, so each word carries the gradient itself
          var cs = getComputedStyle(n.parentNode);
          var clip = (cs.webkitBackgroundClip || cs.backgroundClip) === 'text' && cs.backgroundImage !== 'none';
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var mw = document.createElement('span'); mw.className = 'cm-mw';
            var mi = document.createElement('span'); mi.className = 'cm-mi'; mi.textContent = part;
            mi.style.setProperty('--d', Math.min(i++ * 28, 700) + 'ms');
            if (clip) {
              mi.style.backgroundImage = cs.backgroundImage;
              mi.style.webkitBackgroundClip = 'text'; mi.style.backgroundClip = 'text';
              mi.style.color = 'transparent'; mi.style.webkitTextFillColor = 'transparent';
            }
            mw.appendChild(mi); frag.appendChild(mw);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(SVG|IMG|BR)$/i.test(n.tagName)) walk(n);
      });
    })(el);
  }

  $$(HEADS, main).concat($$('.w-next a, .cs-next a.next-title')).forEach(function (el) {
    if (skip(el) || inCard(el) || el.dataset.cm) return;
    el.dataset.cm = 'h';
    splitWords(el);
    targets.push(el);
  });

  /* ---- cards: staggered by position among their siblings ---- */
  $$(CARDS, main).forEach(function (el) {
    if (skip(el) || el.parentNode.closest(CARDS)) return;
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.matches(CARDS); });
    el.classList.add('cm-card');
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 90 + 'ms');
    targets.push(el);
  });

  /* ---- copy ---- */
  $$(COPY, main).forEach(function (el) {
    if (skip(el) || inCard(el) || el.dataset.cm || el.closest('[data-cm="h"]')) return;
    if (el.parentNode.closest('.cm-fade')) return;
    el.dataset.cm = 'f';
    el.classList.add('cm-fade');
    targets.push(el);
  });

  /* ---- images (decorative backdrops drift instead) ---- */
  $$('img', main).forEach(function (img) {
    if (img.closest('.w-hero-bg, .w-bgimg, .cs-hero-bg')) return;
    if (skip(img) && !img.closest('.phone-col')) return;
    if (img.closest('.cm-card') && !img.closest('.shot')) return;
    img.classList.add('cm-img');
    // A fully clipped element never registers as on screen, so the
    // image is opened when its container comes into view instead.
    var box = img.parentNode;
    (box.cmImgs = box.cmImgs || []).push(img);
    if (targets.indexOf(box) < 0) targets.push(box);
  });

  /* ---- reveal on view ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('cm-in');
      (el.cmImgs || []).forEach(function (img, i) {
        img.style.setProperty('--d', i * 90 + 'ms');
        img.classList.add('cm-in');
      });
      io.unobserve(el);
      countIn(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
  targets.forEach(function (el) { io.observe(el); });

  /* ---- counters: "2.1M+", "68%", "50M+", "4 wks" count up from zero ---- */
  function countIn(scope) {
    var nums = scope.matches && scope.matches('.cm-card') ? $$('.num, .v, .k, b, strong, .w-num', scope) : [];
    nums.forEach(function (n) {
      if (n.children.length || n.dataset.counted) return;
      var m = n.textContent.trim().match(/^([^\d]{0,2})(\d+(?:\.\d+)?)(.{0,8})$/);
      if (!m) return;
      n.dataset.counted = '1';
      var pre = m[1], end = parseFloat(m[2]), post = m[3];
      var dec = (m[2].split('.')[1] || '').length, t0 = performance.now(), dur = 1400;
      (function tick(t) {
        var k = Math.min((t - t0) / dur, 1), v = end * (1 - Math.pow(1 - k, 3));
        n.textContent = pre + v.toFixed(dec) + post;
        if (k < 1) requestAnimationFrame(tick);
        else n.textContent = pre + m[2] + post;
      })(t0);
    });
  }

  /* ---- backdrops drift with scroll ---- */
  var drift = $$('.w-hero-bg img, .w-bgimg img, .cs-hero-bg');
  drift.forEach(function (d) { d.classList.add('cm-drift'); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    drift.forEach(function (d) {
      var r = d.parentNode.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;   // -1 .. 1 across the screen
      d.style.transform = 'translate3d(0,' + (p * -60).toFixed(1) + 'px,0) scale(1.12)';
    });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  requestAnimationFrame(function () { root.classList.add('cm-ready'); });
})();
