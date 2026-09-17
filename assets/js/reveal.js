/* ============================================================
   Section reveals

   The page already had .reveal on a handful of blocks. This walks
   every section and tags whatever was left untagged, so the whole
   page arrives the same way instead of some blocks animating and
   the rest appearing flat.

   Two rules keep it from ever hiding content for good:
   anything already on screen at load is shown immediately rather
   than animated, and if IntersectionObserver is missing nothing is
   tagged at all, so the page renders as plain HTML.
   ============================================================ */
(function () {
  'use strict';

  var main = document.querySelector('main');
  if (!main || !('IntersectionObserver' in window)) return;

  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var STEP = 90;      /* ms between siblings in one section */
  var MAX_STEP = 4;   /* past this the cascade reads as lag, not rhythm */

  /* Backdrops, the back link and anything decorative stay put. */
  function skip(el) {
    if (el.nodeType !== 1) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    if (el.classList.contains('w-bgimg')) return true;
    if (el.classList.contains('w-hero-bg')) return true;
    if (el.classList.contains('w-back')) return true;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return true;
    return false;
  }

  var targets = [];

  function tag(el, i) {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
    el.style.setProperty('--rv-d', Math.min(i, MAX_STEP) * STEP + 'ms');
    targets.push(el);
  }

  var sections = main.querySelectorAll('section');
  Array.prototype.forEach.call(sections, function (section) {
    /* The hero is above the fold — it should already be there. */
    if (section.classList.contains('w-hero')) return;

    /* Reveal the row inside the container, not the container itself:
       a full-bleed section animating as one slab is heavy, and the
       backdrop sections would drag their photo along with it. */
    var stage = section.querySelector(':scope > .container') || section;
    var kids = stage.children;
    var i = 0;

    for (var k = 0; k < kids.length; k++) {
      var el = kids[k];
      if (skip(el)) continue;
      tag(el, i);
      i++;
    }
  });

  /* Sections that sit outside <main> (the next-project footer). */
  var trailing = document.querySelectorAll('body > section');
  Array.prototype.forEach.call(trailing, function (section) {
    var stage = section.querySelector(':scope > .container') || section;
    Array.prototype.forEach.call(stage.children, function (el, i) {
      if (!skip(el)) tag(el, i);
    });
  });

  if (!targets.length) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

  var vh = window.innerHeight || document.documentElement.clientHeight;
  targets.forEach(function (el) {
    /* Already visible on arrival: show it now, with no delay, so the
       first screen is never a page of blanks waiting on a scroll. */
    if (el.getBoundingClientRect().top < vh * 0.92) {
      el.style.setProperty('--rv-d', '0ms');
      el.classList.add('in');
      return;
    }
    io.observe(el);
  });
})();
