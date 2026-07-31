/* Rhodium Specimen — homepage behaviour */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- year ---------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- mobile nav ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- masthead hide on scroll down ---------- */
  var mast = document.querySelector('.masthead');
  if (mast) {
    var last = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y > last && y > 220 && !nav.classList.contains('open')) mast.classList.add('up');
      else mast.classList.remove('up');
      last = y;
    }, { passive: true });
  }

  /* ---------- reveal ---------- */
  var targets = document.querySelectorAll('.rv, .rv-s');
  if (targets.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- counters ---------- */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var raw = el.textContent;
        var suffix = raw.replace(/[\d.,]/g, '');
        var t0 = performance.now();
        var dur = 1200;
        (function tick(now) {
          var p = Math.min((now - t0) / dur, 1);
          var e = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(target * e) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = raw;
        })(t0);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { cio.observe(n); });
  }

  /* ---------- designer / leader lens ---------- */
  var lens = document.querySelector('[data-lens]');
  if (lens) {
    var btns = lens.querySelectorAll('[data-lens-btn]');
    var panels = document.querySelectorAll('[data-panel]');
    var set = function (mode) {
      lens.setAttribute('data-lens', mode);
      btns.forEach(function (b) {
        b.setAttribute('aria-selected', String(b.getAttribute('data-lens-btn') === mode));
      });
      panels.forEach(function (p) {
        var on = p.getAttribute('data-panel') === mode;
        p.classList.toggle('on', on);
        if (on) {
          // re-run reveal for freshly shown content
          p.querySelectorAll('.rv, .rv-s').forEach(function (el) { el.classList.add('in'); });
        }
      });
    };
    btns.forEach(function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-lens-btn')); });
    });
  }

  /* ---------- magnetic buttons + card spotlight (fine pointer) ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.magnet').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - r.left - r.width / 2;
        var dy = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + dx * 0.18 + 'px,' + dy * 0.3 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });

    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* work index preview removed: case studies now show their own visuals */
})();
