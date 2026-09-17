/* Case-study page behaviour: reading progress + mobile nav. */
(function () {
  var bar = document.getElementById('prog');
  if (bar) {
    var tick = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
    };
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', tick);
    tick();
  }

  /* The nav toggle lives in main.js, which loads on these pages too.
     Handling it here as well toggled .open twice per click. */
})();
