/* ============================================================
   SKILLS, a 3D ring

   Four cards on a circle in the XZ plane, turning around Y.
   Position is computed per frame and written as one transform
   per card, so nothing here fights a CSS animation: the whole
   reason the stage carries no data-cards attribute is that its
   transform transition would restart on every write and freeze
   the ring solid.

   Three decisions worth stating:

   1. It turns on its own clock, not on scroll. This page is
      sometimes embedded in a frame sized to the full height of
      its content, where nothing ever scrolls; a scroll-driven
      carousel is a dead carousel there.

   2. It steps and dwells rather than spinning continuously. A
      ring in constant motion cannot be read, and this card
      carries a paragraph and a tag list, not a photograph.

   3. Cards turn with the ring but only partly, about four tenths
      of their angle. A true cylinder puts its side cards exactly
      edge-on, which is to say invisible; this keeps them legible
      while the ring still reads as a ring.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-skc]');
  if (!root) return;

  var stage = root.querySelector('.skc-stage');
  var cards = [].slice.call(root.querySelectorAll('.skc-card'));
  var dots  = [].slice.call(root.querySelectorAll('[data-skc-go]'));
  var live  = root.querySelector('.skc-live');
  if (!stage || cards.length < 2) return;

  var N = cards.length;
  var STEP = 360 / N;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- state ---------- */
  var index = 0;             /* which card should face front   */
  var target = 0;            /* target ring angle, degrees     */
  var angle = 0;             /* current ring angle, eased      */
  var paused = false;
  var lastStep = 0;
  var DWELL = 4200;          /* how long a card holds the front */

  /* Below this the ring cannot fit. A card wide enough to read on a
     phone leaves no room either side of it, so there is nothing a
     smaller radius can buy: at 390 the flanks ran 121px off the page.
     Narrow screens get one card at a time instead, same controls. */
  function narrow() { return innerWidth < 780; }

  function radius() {
    if (narrow()) return 0;
    return Math.max(210, Math.min(stage.clientWidth * 0.30, 330));
  }

  /* The stage is absolutely positioned content, so it has no height of
     its own. Measuring the tallest card beats guessing a clamp: the
     guess left 162px of dead air at 1440 and clipped nothing at 390
     only by luck. */
  function sizeStage() {
    var tallest = 0;
    for (var i = 0; i < N; i++) {
      var h = cards[i].scrollHeight;
      if (h > tallest) tallest = h;
    }
    if (tallest) stage.style.height = (tallest + 10) + 'px';
  }

  function setIndex(i, announce) {
    var d = i - index;
    /* always turn the short way round */
    while (d > N / 2) d -= N;
    while (d < -N / 2) d += N;
    index = (i % N + N) % N;
    target += d * STEP;
    lastStep = performance.now();
    dots.forEach(function (b, k) {
      b.setAttribute('aria-current', String(k === index));
    });
    cards.forEach(function (c, k) {
      /* Only the front card is reachable by tab; the others are
         still in the DOM and still findable, they are simply not
         focus stops while they are turned away. */
      c.toggleAttribute('inert', k !== index);
    });
    if (announce && live) {
      live.textContent = cards[index].getAttribute('aria-label') || '';
    }
  }

  function place(now) {
    var R = radius();
    var P = 1250;                       /* must match the CSS perspective */

    if (!reduce && !paused && now - lastStep > DWELL) setIndex(index + 1, false);

    /* ease toward the target rather than snapping */
    angle += (target - angle) * (reduce ? 1 : 0.085);

    var flat = narrow();

    for (var i = 0; i < N; i++) {
      var a = (i * STEP - angle) * Math.PI / 180;
      var x = Math.sin(a) * R;
      var z = Math.cos(a) * R - R;      /* front card sits at z = 0 */

      /* signed angle in degrees, -180..180, for the partial turn */
      var deg = ((i * STEP - angle) % 360 + 540) % 360 - 180;
      var rot = flat ? 0 : Math.max(-52, Math.min(52, -deg * 0.42));

      var depth = R ? (z + 2 * R) / (2 * R) : 1;  /* 0 at the back, 1 at the front */
      var c = cards[i];
      /* translateY(-50%) rides along to centre the card against
         top:50%; a rotation about Y leaves Y untouched, so appending
         it here is safe whatever the card is doing. */
      c.style.transform =
        'translate3d(' + x.toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg)'
        + ' translateY(-50%)';
      c.style.zIndex = String(100 + Math.round(z));
      /* stacked on a phone, so the one being read is the only one lit */
      var near = Math.max(0, 1 - Math.abs(deg) / (STEP * 0.9));
      c.style.opacity = flat ? near.toFixed(3) : (0.26 + depth * 0.74).toFixed(3);
      c.style.pointerEvents = (flat && near < 0.5) ? 'none' : '';
      /* perspective already shrinks the far cards; blur sells the distance */
      var blur = flat ? 0 : (1 - depth) * 3.2;
      c.style.filter = blur > 0.08 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
      c.classList.toggle('is-front', Math.abs(deg) < STEP / 2);
    }

    requestAnimationFrame(place);
  }

  /* ---------- controls ---------- */
  var prev = root.querySelector('[data-skc-prev]');
  var next = root.querySelector('[data-skc-next]');
  if (prev) prev.addEventListener('click', function () { setIndex(index - 1, true); });
  if (next) next.addEventListener('click', function () { setIndex(index + 1, true); });
  dots.forEach(function (b, k) {
    b.addEventListener('click', function () { setIndex(k, true); });
  });

  /* Arrow keys, when the carousel has focus inside it. */
  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')  { setIndex(index - 1, true); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setIndex(index + 1, true); e.preventDefault(); }
  });

  /* Auto-advance stops while someone is reading or tabbing through. */
  ['pointerenter', 'focusin'].forEach(function (ev) {
    root.addEventListener(ev, function () { paused = true; });
  });
  ['pointerleave', 'focusout'].forEach(function (ev) {
    root.addEventListener(ev, function () {
      if (ev === 'focusout' && root.contains(document.activeElement)) return;
      paused = false; lastStep = performance.now();
    });
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) lastStep = performance.now();
  });

  sizeStage();
  addEventListener('resize', sizeStage, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeStage);
  setTimeout(sizeStage, 1200);

  setIndex(0, false);
  root.classList.add('skc-ready');
  lastStep = performance.now();
  requestAnimationFrame(place);
})();
