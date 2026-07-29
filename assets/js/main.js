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

// Reveal-on-scroll
const revealEls = document.querySelectorAll('.reveal');
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
