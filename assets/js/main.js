// Mobile nav toggle
document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
  });
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.remove('open');
  });
});

// Reveal-on-scroll (also drives .stagger cascades)
const revealEls = document.querySelectorAll('.reveal, .stagger');
if (revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));
}

// ============================================================
// Premium interaction layer
// ============================================================
const prefersFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canAnimate = prefersFinePointer && !prefersReducedMotion;

// ---------- Scroll progress bar ----------
(function scrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  const update = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = max > 0 ? `${(scrolled / max) * 100}%` : '0%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ---------- Scroll-aware nav ----------
(function navScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      nav.classList.toggle('nav-scrolled', y > 24);
      if (y > lastY && y > 140) {
        nav.classList.add('nav-hidden');
      } else {
        nav.classList.remove('nav-hidden');
      }
      lastY = y;
    },
    { passive: true }
  );
})();

// ---------- Custom cursor + magnetic elements + spotlight + tilt ----------
if (canAnimate) {
  document.documentElement.classList.add('has-custom-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener(
    'mousemove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    },
    { passive: true }
  );

  function raf() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  document.addEventListener('mousedown', () => ring.classList.add('press'));
  document.addEventListener('mouseup', () => ring.classList.remove('press'));

  const hoverTargets = 'a, button, .project-card, input, textarea, select, [role="button"]';
  document.querySelectorAll(hoverTargets).forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  // Magnetic pull
  document.querySelectorAll('.btn-primary').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const relX = e.clientX - r.left - r.width / 2;
      const relY = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${relX * 0.28}px, ${relY * 0.4}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  // Spotlight glow following cursor
  document.querySelectorAll('.feature-card, .insight-card, .persona-card, .chart-card').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Subtle 3D tilt on project cards
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-6px) rotateX(${-py * 8}deg) rotateY(${px * 8}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ---------- Animated stat counters ----------
(function countUp() {
  const nums = document.querySelectorAll('.stat-box .num');
  if (!nums.length) return;
  const parse = (text) => {
    const m = text.trim().match(/^(-?[\d.,]+)(.*)$/);
    if (!m) return null;
    return { value: parseFloat(m[1].replace(/,/g, '')), prefix: '', suffix: m[2], decimals: (m[1].split('.')[1] || '').length };
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const parsed = parse(el.textContent);
        if (!parsed || canAnimateCheck() === false) return;
        const { value, suffix, decimals } = parsed;
        const duration = 1100;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const current = value * eased;
          el.textContent = `${current.toFixed(decimals)}${suffix}`;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = `${value.toFixed(decimals)}${suffix}`;
        };
        if (prefersReducedMotion) return;
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.4 }
  );
  function canAnimateCheck() {
    return !prefersReducedMotion;
  }
  nums.forEach((el) => io.observe(el));
})();

// ---------- Marquee auto-clone (clients row) ----------
(function marquee() {
  const row = document.querySelector('.clients-row');
  if (!row || row.dataset.marqueeReady) return;
  row.dataset.marqueeReady = 'true';
  const wrap = document.createElement('div');
  wrap.className = 'marquee';
  row.parentNode.insertBefore(wrap, row);
  const track = document.createElement('div');
  track.className = 'marquee-track';
  track.append(row, row.cloneNode(true));
  wrap.appendChild(track);
})();

// Designer / Leader toggle (home page)
const modeToggle = document.querySelector('[data-mode-toggle]');
if (modeToggle) {
  const buttons = modeToggle.querySelectorAll('[data-mode]');
  const panels = document.querySelectorAll('[data-mode-panel]');
  const thumb = modeToggle.querySelector('.toggle-thumb');

  function setMode(mode) {
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    panels.forEach((p) => p.classList.toggle('active', p.dataset.modePanel === mode));
    if (thumb) {
      thumb.style.transform = mode === 'leader' ? 'translateX(100%)' : 'translateX(0)';
    }
    modeToggle.dataset.current = mode;
  }

  buttons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode(modeToggle.dataset.default || 'leader');
}
