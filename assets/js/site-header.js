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
    if (open) {
      var first = menu.querySelector('.menu-links a');
      if (first) first.focus({ preventScroll: true });
    }
  }
  btn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); btn.focus(); }
  });
})();
