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

  /* ---------- land at the top of a page we navigated to ----------
     A fresh link navigation should start at the top. Some embeddings
     (and a browser restoring a position it remembers) can leave the
     new page part-way down, which reads as the case study opening
     wherever the homepage happened to be scrolled to.

     Only "navigate" is corrected: back and forward keep the position
     the reader left, which is what they expect, and a link carrying a
     #hash is left alone so it can reach its anchor. */
  (function landAtTop() {
    if (location.hash) return;
    var type = 'navigate';
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.type) type = nav.type;
    } catch (e) { /* older browsers: treat as a normal navigation */ }
    if (type !== 'navigate') return;

    /* Once the reader has started moving the page themselves, their
       position is theirs. Images can delay "load" well past that, and
       yanking them back to the top would be worse than the bug. */
    var userMoved = false;
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (evt) {
      window.addEventListener(evt, function () { userMoved = true; },
                              { once: true, passive: true });
    });

    function toTop() {
      if (userMoved) return;
      if (!window.scrollY && !window.pageYOffset) return;
      var root = document.documentElement;
      var prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';   /* never animate the correction */
      window.scrollTo(0, 0);
      root.style.scrollBehavior = prev;
    }

    toTop();

    /* Fallback for anything that still applies a position after this
       script runs. Bounded to the window where the enter veil is still
       covering the page, so a correction is never something the reader
       watches happen; past that their position is left alone. */
    window.addEventListener('load', function () {
      var since = 0;
      try { since = performance.now(); } catch (e) { return; }
      if (since < 1200) toTop();
    }, { once: true });
  })();

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

  /* Flag a link-driven navigation for the next page's head script, which
     uses it to stop the browser restoring a scroll position onto a page
     the reader asked for fresh. Capture phase and separate from the
     animation below, so it is recorded even under reduced motion or if
     something downstream stops the event. */
  document.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!isInternalNav(a)) return;
    try { sessionStorage.setItem('pt:top', '1'); } catch (err) { /* private mode */ }
  }, true);

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
