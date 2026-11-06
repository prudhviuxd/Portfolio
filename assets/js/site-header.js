/* Site header and menu, shared by every page. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Letter roll: two stacked copies of the label, swapped on hover.
  $$('.hd [data-roll], .menu [data-roll]').forEach(function (el) {
    if (el.querySelector('.roll')) return;
    var html = el.innerHTML.trim();
    el.innerHTML = '<span class="roll"><span class="roll-a">' + html +
      '</span><span class="roll-b" aria-hidden="true">' + html + '</span></span>';
  });

  var btn = document.getElementById('menuBtn');
  var menu = document.getElementById('menu');
  if (!btn || !menu) return;

  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    // While open, the page behind is inert so focus and screen readers stay in the menu.
    $$('main, footer, .back-btn, .hd-logo, .hd-r > a').forEach(function (el) {
      if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
    if (open) {
      var first = menu.querySelector('.menu-links a');
      if (first) first.focus({ preventScroll: true });
    }
  }
  // Focus trap: Tab cycles between the Menu button and the links in the panel.
  function focusables() {
    return [btn].concat($$('a[href], button, input, select, textarea', menu).filter(function (el) {
      return el.offsetParent !== null;
    }));
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !root.classList.contains('menu-open')) return;
    var f = focusables(), i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  });
  btn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); btn.focus(); }
  });
})();

/* Page transitions between our own pages: stripes rise, then navigate. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function samePage(u) { return u.pathname === location.pathname && u.search === location.search; }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (u.origin !== location.origin || !/\.html$|\/$/.test(u.pathname) || samePage(u)) return;

    e.preventDefault();
    var o = document.createElement('div');
    o.className = 'ptx';
    o.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 5; i++) {
      var s = document.createElement('i');
      s.style.transitionDelay = (4 - i) * 0.02 + 's';
      o.appendChild(s);
    }
    document.body.appendChild(o);
    requestAnimationFrame(function () { requestAnimationFrame(function () { o.classList.add('go'); }); });
    try { sessionStorage.setItem('pt', '1'); } catch (err) {}
    setTimeout(function () { location.href = u.href; }, 420);
  });

  // Coming back through the history cache: clear any leftover cover.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    document.querySelectorAll('.ptx').forEach(function (o) { o.remove(); });
    document.documentElement.classList.remove('pt-in');
  });
})();

/* Shared footer: a live Hyderabad clock (IST), the current year,
   and back to top. */
(function () {
  'use strict';
  var ft = document.querySelector('footer.ft');
  if (!ft) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t = ft.querySelector('.ft-time');
  if (t && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    var show = function () { t.textContent = fmt.format(new Date()) + ' IST'; };
    show(); setInterval(show, 20000);
  }
  var yr = ft.querySelector('.ft-yr');
  if (yr) yr.textContent = new Date().getFullYear();
  var top = ft.querySelector('.ft-top-btn');
  if (top) top.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    var first = document.querySelector('.hd-logo'); if (first) first.focus({ preventScroll: true });
  });
})();
