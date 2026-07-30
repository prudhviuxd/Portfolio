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

  /* ---------- ticker: duplicate track so the loop is seamless ---------- */
  var track = document.querySelector('.ticker-track');
  if (track && !reduce) {
    // content is already doubled in markup; nothing to do
  }

  /* ---------- floating work preview (fine pointer only) ---------- */
  var work = document.getElementById('workList');
  var peek = document.getElementById('peek');
  if (work && peek && fine && !reduce) {
    work.setAttribute('data-hover', '');
    var imgs = {};
    peek.querySelectorAll('[data-img]').forEach(function (n) { imgs[n.getAttribute('data-img')] = n; });

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null, active = false;

    function loop() {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      peek.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%) scale(' + (active ? 1 : 0.94) + ')';
      raf = requestAnimationFrame(loop);
    }

    work.querySelectorAll('.item.live').forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        var key = item.getAttribute('data-peek');
        Object.keys(imgs).forEach(function (k) { imgs[k].classList.toggle('on', k === key); });
        active = true;
        peek.classList.add('on');
        if (!raf) raf = requestAnimationFrame(loop);
      });
      item.addEventListener('mouseleave', function () {
        active = false;
        peek.classList.remove('on');
      });
    });

    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!cx && !cy) { cx = tx; cy = ty; }
    }, { passive: true });

    work.addEventListener('mouseleave', function () {
      active = false;
      peek.classList.remove('on');
    });
  }
})();
