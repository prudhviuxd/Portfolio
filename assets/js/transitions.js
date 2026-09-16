/* ============================================================
   Page transitions — the exit half.

   Intercepts same-origin navigations, floods the screen with the
   colour of whatever was clicked, then navigates. The enter half
   is pure CSS (see transitions.css) so a page can never be left
   covered by a curtain this file failed to remove.
   ============================================================ */
(function () {
  'use strict';

  if (!document.querySelector || !window.matchMedia) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DURATION = 580;          /* must match pt-cover in transitions.css */
  var veil = null;
  var leaving = false;

  function getVeil() {
    if (!veil) {
      veil = document.createElement('div');
      veil.className = 'pt';
      veil.setAttribute('aria-hidden', 'true');
      document.body.appendChild(veil);
    }
    return veil;
  }

  /* A link we should animate away from: same origin, plain left
     click, not a download, not a jump within this same page. */
  function isInternalNav(a) {
    if (!a || !a.getAttribute('href')) return false;
    if (a.hasAttribute('download')) return false;
    if (a.target && a.target !== '_self') return false;

    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return false; }

    if (url.origin !== location.origin) return false;
    if (/^(mailto|tel|javascript):/i.test(a.getAttribute('href'))) return false;
    /* an in-page anchor should scroll, not navigate */
    if (url.pathname === location.pathname && url.search === location.search) return false;

    return true;
  }

  /* Carry the clicked card's own colour into the flood. The project
     cards paint their crest with an inline gradient, so reusing it
     makes the wipe read as that project continuing rather than as a
     generic page change. */
  function accentFor(a) {
    var card = a.classList.contains('case') ? a : (a.closest ? a.closest('.case') : null);
    if (!card) return '';
    var crest = card.querySelector('.case-vis');
    return (crest && crest.style && crest.style.background) || '';
  }

  document.addEventListener('click', function (e) {
    if (leaving) { e.preventDefault(); return; }
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (reduce.matches) return;

    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!isInternalNav(a)) return;

    e.preventDefault();
    leaving = true;

    var href = a.href;
    var accent = accentFor(a);
    var v = getVeil();
    if (accent) v.style.background = accent;

    document.documentElement.classList.add('pt-out');

    var navigated = false;
    function go() {
      if (navigated) return;
      navigated = true;
      location.href = href;
    }

    /* Prefer the real animation end; the timer is the guarantee. */
    v.addEventListener('animationend', go, { once: true });
    setTimeout(go, DURATION + 90);
  }, false);

  /* Returning via the back button can restore this page from the
     bfcache mid-transition. Put it back the way we found it. */
  window.addEventListener('pageshow', function () {
    leaving = false;
    document.documentElement.classList.remove('pt-out');
    if (veil) veil.style.background = '';
  });
})();
