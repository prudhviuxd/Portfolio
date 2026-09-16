/* ============================================================
   Atmosphere — drives the two values the CSS can't compute:
   the specular highlight's position and the plate's scroll
   parallax. Everything else in the layer animates in CSS.
   ============================================================ */
(function () {
  'use strict';

  var layer = document.querySelector('.atmos');
  if (!layer) return;

  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var fine = window.matchMedia &&
             window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var mx = 50, my = 26, sy = 0;
  var queued = false;

  function paint() {
    queued = false;
    layer.style.setProperty('--atmos-mx', mx.toFixed(2) + '%');
    layer.style.setProperty('--atmos-my', my.toFixed(2) + '%');
    layer.style.setProperty('--atmos-y', sy.toFixed(4));
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  if (fine) {
    window.addEventListener('pointermove', function (e) {
      mx = (e.clientX / window.innerWidth) * 100;
      my = (e.clientY / window.innerHeight) * 100;
      schedule();
    }, { passive: true });
  }

  window.addEventListener('scroll', function () {
    var span = document.documentElement.scrollHeight - window.innerHeight;
    sy = span > 0 ? Math.min(window.scrollY / span, 1) : 0;
    schedule();
  }, { passive: true });

  schedule();
})();
