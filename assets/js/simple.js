/* Simple version: the interaction layer. Vanilla, no dependencies.
   Everything here is progressive: without JS the page reads in full,
   and reduced motion turns the movement off but keeps the content. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- entrance ---------- */
  var ready = function () { document.documentElement.classList.add('ready'); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(ready); });
  else window.addEventListener('load', ready);
  setTimeout(ready, 1500);

  /* ---------- hero: the last line swaps whole phrases ---------- */
  var rot = $('.rot');
  if (rot && !reduced) (function () {
    var words = rot.getAttribute('data-words').split('|'), w = 0;
    function next() {
      if (document.hidden) { setTimeout(next, 1000); return; }
      rot.classList.add('out');
      setTimeout(function () {
        w = (w + 1) % words.length; rot.textContent = words[w];
        rot.classList.remove('out'); rot.classList.add('in'); void rot.offsetWidth; rot.classList.remove('in');
        setTimeout(next, 3000);
      }, 460);
    }
    setTimeout(next, 3800);
  })();

  /* ---------- headings reveal word by word ---------- */
  $$('[data-reveal]').forEach(function (h) {
    var i = 0;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var o = document.createElement('span'); o.className = 'w';
            var inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
            o.appendChild(inner); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) wrap(n);
      });
    })(h);
  });
  var io = 'IntersectionObserver' in window;
  $$('[data-reveal]').forEach(function (h) {
    if (!io || reduced) { h.classList.add('is-in'); return; }
    new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { h.classList.add('is-in'); o.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' }).observe(h);
  });

  /* ---------- numbers count up once, the final value is in the HTML ---------- */
  $$('[data-count]').forEach(function (el) {
    var end = +el.getAttribute('data-count');
    if (!io || reduced) return;
    new IntersectionObserver(function (e, o) {
      if (!e[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function step(t) { var k = clamp((t - t0) / 1400, 0, 1); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
    }, { threshold: 0.6 }).observe(el);
  });

  /* ---------- scroll: progress line and the stacking film cards ---------- */
  var bar = $('.progress i');
  var cards = $$('.film-card');
  cards.forEach(function (c, k) { c.style.setProperty('--k', k); });
  function onScroll() {
    var h = document.documentElement;
    if (bar) bar.style.setProperty('--p', (h.scrollTop / Math.max(1, h.scrollHeight - innerHeight)).toFixed(4));
    if (reduced) return;
    // a card sinks back as the next one slides over it
    cards.forEach(function (c, i) {
      var next = cards[i + 1], inner = c.firstElementChild;
      if (!next) { inner.style.removeProperty('--s'); inner.style.removeProperty('--b'); return; }
      var r = c.getBoundingClientRect(), n = next.getBoundingClientRect();
      var k = clamp(1 - (n.top - r.top) / Math.max(1, r.height), 0, 1);
      inner.style.setProperty('--s', (1 - k * 0.07).toFixed(4));
      inner.style.setProperty('--b', (1 - k * 0.45).toFixed(3));
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- cursor: a dot that grows into a label over things to play or view ---------- */
  var cur = $('.cursor'), label = $('.cursor-label');
  if (cur && fine && !reduced) {
    var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    window.addEventListener('pointermove', function (e) { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.remove('is-on'); });
    (function loop() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; requestAnimationFrame(loop); })();
    $$('[data-cursor]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { label.textContent = el.getAttribute('data-cursor'); cur.classList.add('is-big'); });
      el.addEventListener('pointerleave', function () { cur.classList.remove('is-big'); });
    });
  }

  /* ---------- magnetic buttons and links ---------- */
  if (fine && !reduced) $$('[data-magnet]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = 'translate(' + (dx * 10).toFixed(1) + 'px,' + (dy * 8).toFixed(1) + 'px)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });

  /* ---------- roles: one panel open at a time ---------- */
  var panels = $$('.panel');
  function openPanel(p) {
    panels.forEach(function (q) { var on = q === p; q.classList.toggle('is-open', on); q.setAttribute('aria-expanded', String(on)); });
  }
  panels.forEach(function (p) {
    if (fine) p.addEventListener('pointerenter', function () { openPanel(p); });
    p.addEventListener('click', function () { openPanel(p); });
    p.addEventListener('focus', function () { openPanel(p); });
    p.addEventListener('keydown', function (e) {
      var i = panels.indexOf(p);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); panels[(i + 1) % panels.length].focus(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); panels[(i + panels.length - 1) % panels.length].focus(); }
    });
  });

  /* ---------- words: one recommendation at a time ---------- */
  var root = $('[data-words-slider]');
  if (root) (function () {
    var slides = $$('.word', root), bars = $$('.wbar', root), pause = $('.words-pause', root);
    var dur = slides.map(function (s) { return Math.max(7000, s.querySelector('blockquote').textContent.trim().split(/\s+/).length * 260 + 2500); });
    var cur = 0, elapsed = 0, last = 0, userPaused = reduced, hover = false, seen = false;
    function go(n) {
      n = (n + slides.length) % slides.length; if (n === cur) return;
      var prev = slides[cur];
      prev.classList.remove('is-on'); prev.classList.add('is-out'); prev.setAttribute('aria-hidden', 'true');
      setTimeout(function () { prev.classList.remove('is-out'); }, 700);
      bars[cur].classList.remove('is-on'); bars[cur].style.removeProperty('--p');
      cur = n; slides[cur].classList.add('is-on'); slides[cur].removeAttribute('aria-hidden'); bars[cur].classList.add('is-on');
      elapsed = 0;
    }
    function tick(t) {
      var dt = last ? Math.min(100, t - last) : 0; last = t;
      if (!userPaused && !hover && seen && !document.hidden) { elapsed += dt; if (elapsed >= dur[cur]) go(cur + 1); }
      bars[cur].style.setProperty('--p', Math.min(1, elapsed / dur[cur]).toFixed(4));
      requestAnimationFrame(tick);
    }
    bars.forEach(function (b, i) { b.addEventListener('click', function () { go(i); }); });
    function syncPause() { pause.setAttribute('aria-pressed', String(userPaused)); pause.setAttribute('aria-label', userPaused ? 'Play recommendations' : 'Pause recommendations'); }
    pause.addEventListener('click', function () { userPaused = !userPaused; syncPause(); });
    syncPause();
    slides.forEach(function (s) { s.addEventListener('pointerenter', function () { hover = true; }); s.addEventListener('pointerleave', function () { hover = false; }); });
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); });
    // swipe or drag sideways
    var sx = null;
    root.addEventListener('pointerdown', function (e) { if (e.target.closest('button, a')) return; sx = e.clientX; });
    window.addEventListener('pointerup', function (e) { if (sx === null) return; var d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) go(cur + (d < 0 ? 1 : -1)); });
    if (io) new IntersectionObserver(function (e) { seen = e[0].isIntersecting; }, { threshold: 0.3 }).observe(root); else seen = true;
    requestAnimationFrame(tick);
  })();

  /* ---------- contact: "Let's talk." leans towards the pointer ---------- */
  var talk = $('[data-talk]');
  if (talk && fine && !reduced) {
    var parts = $$('span', talk), sec = talk.closest('section');
    sec.addEventListener('pointermove', function (e) {
      parts.forEach(function (p, i) {
        var r = p.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        p.style.transform = 'translate(' + (dx * (40 + i * 30)).toFixed(1) + 'px,' + (dy * (30 + i * 20)).toFixed(1) + 'px)';
      });
    });
    sec.addEventListener('pointerleave', function () { parts.forEach(function (p) { p.style.transform = ''; }); });
  }

  /* ---------- films: play opens one full-view player ---------- */
  var dlg = $('#filmModal');
  if (dlg) (function () {
    var video = $('.fm-video', dlg), title = $('.fm-title', dlg), link = $('.fm-link', dlg), closeBtn = $('.fm-close', dlg);
    var phone = window.matchMedia('(max-width: 767px)'), opener = null, current = null;
    var src = function (b) { return phone.matches ? b.dataset.srcPortrait : b.dataset.src; };
    function open(b) {
      opener = b; current = b;
      title.textContent = b.dataset.title + ' · case study film';
      link.href = b.dataset.href;
      dlg.classList.toggle('is-portrait', phone.matches);
      video.src = src(b);
      document.documentElement.classList.add('fm-lock');
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      requestAnimationFrame(function () { dlg.classList.add('is-in'); });
      video.muted = false;
      var pr = video.play(); if (pr && pr.catch) pr.catch(function () {});
      closeBtn.focus({ preventScroll: true });
    }
    function close() {
      if (!dlg.open) return;
      video.pause(); video.removeAttribute('src'); video.load();
      dlg.classList.remove('is-in');
      document.documentElement.classList.remove('fm-lock');
      if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
      if (opener) opener.focus({ preventScroll: true });
      current = null;
    }
    $$('[data-film-play]').forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
    closeBtn.addEventListener('click', close);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    var onBp = function () {
      if (!current) return;
      var t = video.currentTime, playing = !video.paused;
      dlg.classList.toggle('is-portrait', phone.matches); video.src = src(current);
      video.addEventListener('loadedmetadata', function once() { video.removeEventListener('loadedmetadata', once); try { video.currentTime = t; } catch (e) {} if (playing) video.play(); });
    };
    phone.addEventListener ? phone.addEventListener('change', onBp) : phone.addListener(onBp);
    document.addEventListener('visibilitychange', function () { if (document.hidden && dlg.open) video.pause(); });
  })();
})();
