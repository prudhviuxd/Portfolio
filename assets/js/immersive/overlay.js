/* ============================================================
   OVERLAY — the HTML panel that opens when a card is entered.

   Kept as real DOM rather than a texture: it is selectable,
   searchable, translatable and reachable by a screen reader,
   which none of the WebGL text is. Content comes from
   content.js so the fallback view renders from the same data.
   ============================================================ */

import { NODES, PROFILE } from './content.js';

/* ---------------- tiny DOM helpers ---------------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function link(href, text, external) {
  const a = el('a', null, text);
  a.href = href;
  if (external) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  return a;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/* ============================================================
   block renderers — one per `kind` in content.js
   ============================================================ */
const BLOCKS = {
  lede(block) {
    return el('p', 'ov-lede', block.text);
  },

  note(block) {
    return el('p', 'ov-note', block.text);
  },

  label(block) {
    return el('p', 'ov-label mono', block.text);
  },

  stats(block) {
    const wrap = el('ul', 'ov-stats');
    block.items.forEach((item) => {
      const li = el('li');
      li.append(el('b', null, item.value), el('span', null, item.label));
      wrap.append(li);
    });
    return wrap;
  },

  rows(block) {
    const wrap = el('ul', block.dense ? 'ov-rows is-dense' : 'ov-rows');
    block.items.forEach((item) => {
      const li = el('li');
      li.append(el('h4', null, item.title), el('p', null, item.text));
      if (item.tag) li.append(el('em', 'mono', item.tag));
      wrap.append(li);
    });
    return wrap;
  },

  cases(block) {
    const wrap = el('div', 'ov-cases');
    block.items.forEach((item) => {
      const card = el('article', 'ov-case');
      card.append(el('span', 'ov-case-org mono', item.org));

      const h = el('h4');
      h.append(link(item.href, item.title));
      card.append(h);

      const dl = el('dl');
      item.meta.forEach(([term, value]) => {
        const row = el('div');
        row.append(el('dt', null, term), el('dd', null, value));
        dl.append(row);
      });
      card.append(dl);
      wrap.append(card);
    });
    return wrap;
  },

  tagGroups(block) {
    const wrap = el('div', 'ov-groups');
    block.items.forEach((item) => {
      const group = el('section', 'ov-group');
      group.append(el('h4', null, item.title), el('p', null, item.text));

      const tags = el('ul', 'ov-tags');
      item.tags.forEach((t) => tags.append(el('li', null, t)));
      group.append(tags);
      wrap.append(group);
    });
    return wrap;
  },

  links(block) {
    const wrap = el('ul', 'ov-links');
    block.items.forEach((item) => {
      const li = el('li');
      const a = link(item.href, null, item.external);
      const text = el('span', 'ov-link-text');
      text.append(el('span', 'ov-link-label mono', item.label),
                  el('span', 'ov-link-value', item.value));
      a.append(text, el('span', 'ov-link-arrow', '→'));
      li.append(a);
      wrap.append(li);
    });
    return wrap;
  }
};

function renderBlocks(target, blocks) {
  blocks.forEach((block) => {
    const render = BLOCKS[block.kind];
    if (render) target.append(render(block));
  });
}

/* ============================================================
   the overlay controller
   ============================================================ */
export function createOverlay({ onClose, onNavigate } = {}) {
  const root = document.getElementById('overlay');
  const panel = root.querySelector('.ov-panel');
  const idxEl = root.querySelector('.ov-index');
  const titleEl = root.querySelector('.ov-title');
  const kickerEl = root.querySelector('.ov-kicker');
  const bodyEl = root.querySelector('.ov-body');
  const prevBtn = root.querySelector('[data-nav="prev"]');
  const nextBtn = root.querySelector('[data-nav="next"]');

  let current = null;
  let lastFocus = null;

  /* ---------------- open ---------------- */
  function open(node) {
    current = node;
    lastFocus = document.activeElement;

    panel.style.setProperty('--accent', node.accent.css);
    idxEl.textContent = node.index;
    titleEl.textContent = node.title;
    kickerEl.textContent = node.kicker;

    bodyEl.replaceChildren();
    renderBlocks(bodyEl, node.blocks);
    bodyEl.scrollTop = 0;

    const i = NODES.indexOf(node);
    const prev = NODES[(i - 1 + NODES.length) % NODES.length];
    const next = NODES[(i + 1) % NODES.length];
    prevBtn.dataset.target = prev.id;
    prevBtn.querySelector('.ov-nav-name').textContent = prev.title;
    nextBtn.dataset.target = next.id;
    nextBtn.querySelector('.ov-nav-name').textContent = next.title;

    root.hidden = false;
    /* next frame, so the transition has a start state to run from */
    requestAnimationFrame(() => root.classList.add('is-open'));

    document.body.classList.add('overlay-open');
    if (history.replaceState) history.replaceState(null, '', '#' + node.id);

    /* Move focus in, but land on the panel rather than the close button
       so a screen reader reads the heading first. */
    panel.focus({ preventScroll: true });
  }

  /* ---------------- close ---------------- */
  function close(silent) {
    if (!current) return;
    current = null;

    root.classList.remove('is-open');
    document.body.classList.remove('overlay-open');
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);

    const done = () => { if (!current) root.hidden = true; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else setTimeout(done, 340);

    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;

    if (!silent && onClose) onClose();
  }

  /* ---------------- wiring ---------------- */
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) {
      close();
      return;
    }
    const nav = e.target.closest('[data-nav]');
    if (nav && onNavigate) onNavigate(nav.dataset.target);
  });

  /* Escape closes; Tab is trapped inside the panel while open. */
  document.addEventListener('keydown', (e) => {
    if (!current) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key !== 'Tab') return;

    const items = [...panel.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return {
    open,
    close,
    get isOpen() { return current !== null; },
    get node() { return current; }
  };
}

/* ============================================================
   fallback — same content, no WebGL, plain document flow
   ============================================================ */
export function renderFallback(container) {
  container.replaceChildren();

  /* The 3D view carried the identity; without it the page has to say who
     this is on its own. */
  const intro = el('header', 'fb-intro');
  intro.append(
    el('span', 'mono', PROFILE.role),
    el('h1', null, PROFILE.name),
    el('p', null, PROFILE.base)
  );

  const back = el('p');
  back.append(link(PROFILE.home, 'Open the full portfolio →'));
  intro.append(back);
  container.append(intro);

  NODES.forEach((node) => {
    const section = el('section', 'fb-section');
    section.id = 'fb-' + node.id;
    section.style.setProperty('--accent', node.accent.css);

    const head = el('header', 'fb-head');
    head.append(
      el('span', 'fb-index mono', node.index),
      el('h2', null, node.title),
      el('p', 'fb-kicker', node.kicker)
    );
    section.append(head);

    const body = el('div', 'ov-body is-static');
    renderBlocks(body, node.blocks);
    section.append(body);

    container.append(section);
  });
}
