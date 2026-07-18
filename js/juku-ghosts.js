
// js/juku-ghosts.js
// English Juku — ghost waiting room. Load AFTER juku-engine.js,
// BEFORE juku-tests.js.
//
// Purpose: waiting states only (lobby post-submit, test done-screens,
// dictation end tail, interval). NEVER over an active question.
// Guardrails: fixed round of 6 per wait, counter resets every mount,
// saved NOWHERE, never shown on results. Silent — no audio, ever.
// The message is "something pleasant while waiting," not "finish
// faster to earn more."
//
// All motion is transform/opacity via one rAF loop. No canvas, no
// shadowBlur, no filters — budget-device rules apply even to ghosts.

(function () {
  'use strict';

  const ROUND_SIZE = 6;
  const MAX_ONSCREEN = 3;
  const SPAWN_MIN_MS = 2500, SPAWN_MAX_MS = 4000;

  const GHOST_IMGS = [
    'blue-boo.png', 'pink-boo.png', 'green-boo.png', 'purple-boo.png',
    'extra-boo-aqua.png', 'extra-boo-candy.png', 'extra-boo-gold.png',
    'extra-boo-lime.png', 'extra-boo-mint.png', 'extra-boo-orange.png',
    'extra-boo-peach.png', 'extra-boo-rose.png', 'extra-boo-sky.png',
    'extra-boo-violet.png'
  ];
  const IMG_DIR = 'assets/img/';
  const TREE_IMG = IMG_DIR + 'tree-arch.png';

  const REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Injected styles (self-contained; no external CSS patch) ──

  const CSS = `
.juku-ghost-field { position: relative; width: 100%; min-height: 240px;
  overflow: hidden; }
.juku-ghost-tree { position: absolute; left: 50%; bottom: 0;
  transform: translateX(-50%); height: 85%; max-height: 220px;
  opacity: 0.35; pointer-events: none; }
.juku-ghost { position: absolute; width: 72px; height: 72px;
  padding: 14px; margin: -14px; box-sizing: content-box;
  background: none; border: none; cursor: pointer;
  will-change: transform, opacity; -webkit-tap-highlight-color: transparent; }
.juku-ghost img { width: 100%; height: 100%; display: block;
  pointer-events: none; }
.juku-ghost-count { position: absolute; right: 10px; bottom: 8px;
  font-size: 0.95em; opacity: 0.85; pointer-events: none; }
.juku-ghost-plaque { text-align: center; margin: 0 0 6px; }
.juku-ghost-spark { position: absolute; width: 7px; height: 7px;
  border-radius: 50%; background: #d9b45b; pointer-events: none;
  animation: jg-spark 600ms ease-out forwards; }
@keyframes jg-spark {
  from { transform: translate(0, 0) scale(1); opacity: 1; }
  to   { transform: translate(var(--jg-dx), var(--jg-dy)) scale(0.3);
         opacity: 0; }
}
.juku-ghost.fadein  { animation: jg-fadein 500ms ease-out; }
@keyframes jg-fadein { from { opacity: 0; } to { opacity: 1; } }
.juku-ghost.fadeout { animation: jg-fadeout 400ms ease-in forwards; }
@keyframes jg-fadeout { from { opacity: 1; } to { opacity: 0; } }`;

  function ensureStyles() {
    if (document.getElementById('juku-ghost-css')) return;
    const s = document.createElement('style');
    s.id = 'juku-ghost-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Name (reuses the platform's login keys; never innerHTML) ──

  function firstName() {
    const direct =
      localStorage.getItem('booha_first_name') ||
      localStorage.getItem('boohaFirstName') || '';
    const full =
      localStorage.getItem('booha_user_name') ||
      localStorage.getItem('boohaUserName') ||
      localStorage.getItem('booha_display_name') || '';
    const raw = (direct || full.split(' ')[0] || '').trim();
    if (!raw) return null;
    const capped = raw.length > 12 ? raw.slice(0, 12) : raw;
    return capped.charAt(0).toUpperCase() + capped.slice(1).toLowerCase();
  }

  // ── State ────────────────────────────────────────────────

  let _field = null;      // .juku-ghost-field element
  let _raf = null;
  let _spawnAt = 0;       // next spawn time (performance.now ms)
  let _ghosts = [];       // live ghost records
  let _count = 0;         // taps this round (dies with unmount)
  let _countEl = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ── Ghost behaviors ──────────────────────────────────────
  // Personality is behavior, not sprite: any PNG can be any type.
  // Each behavior returns {x, y, alpha, alive} given elapsed ms and
  // field size. Curver arcs below the upper band where plaque/timer
  // live; shy peeks from an edge and retreats.

  function makeGhost(fieldW, fieldH) {
    const img = pick(GHOST_IMGS);
    const type = ['drift', 'shy', 'curve'][_ghosts.length % 3];
    const dir = Math.random() < 0.5 ? 1 : -1;   // 1 = L→R
    const size = rand(56, 84);
    const dur = rand(12000, 18000);
    const y0 = rand(fieldH * 0.25, fieldH * 0.8);
    const bobAmp = rand(8, 20), bobHz = rand(0.15, 0.3);
    const born = performance.now();

    let fn;
    if (type === 'drift') {
      fn = t => {
        const p = t / dur;
        return { x: (dir === 1 ? -size + p * (fieldW + 2 * size)
                               : fieldW - p * (fieldW + 2 * size)),
                 y: y0 + Math.sin(t / 1000 * bobHz * 2 * Math.PI) * bobAmp,
                 alpha: 1, alive: p < 1 };
      };
    } else if (type === 'curve') {
      fn = t => {
        const p = t / dur;
        const x = dir === 1 ? -size + p * (fieldW + 2 * size)
                            : fieldW - p * (fieldW + 2 * size);
        // arc: dips low mid-crossing, stays out of the upper band
        const y = fieldH * 0.3 + Math.sin(p * Math.PI) * fieldH * 0.45;
        return { x, y, alpha: 1, alive: p < 1 };
      };
    } else { // shy: peek from an edge, hold, retreat — tappable while out
      const edgeX = dir === 1 ? -size * 0.6 : fieldW - size * 0.4;
      const outX = dir === 1 ? size * 0.25 : fieldW - size * 1.25;
      const peekMs = 2600, holdMs = 2200;
      const total = peekMs + holdMs + peekMs;
      fn = t => {
        let x;
        if (t < peekMs) x = edgeX + (outX - edgeX) * (t / peekMs);
        else if (t < peekMs + holdMs) x = outX;
        else x = outX + (edgeX - outX) * ((t - peekMs - holdMs) / peekMs);
        return { x, y: y0, alpha: 1, alive: t < total };
      };
    }

    const el = document.createElement('button');
    el.className = 'juku-ghost';
    el.setAttribute('aria-label', 'おばけ');
    const im = document.createElement('img');
    im.src = IMG_DIR + img;
    im.alt = '';
    im.addEventListener('error', () => { removeGhost(g, false); });
    el.appendChild(im);
    el.style.width = el.style.height = size + 'px';

    const g = { el, fn, born, dead: false };
    el.addEventListener('click', () => tapGhost(g), { once: true });
    _field.appendChild(el);
    if (REDUCED) {
      // fixed position, fade in/out — no travel
      el.classList.add('fadein');
      el.style.transform =
        `translate(${rand(0, Math.max(1, fieldW - size))}px, ${y0}px)`;
      g.fn = t => ({ x: null, y: null, alpha: 1, alive: t < 6000 });
    }
    return g;
  }

  function tapGhost(g) {
    if (g.dead) return;
    g.dead = true;
    if (_count < ROUND_SIZE) {
      _count++;
      if (_countEl) _countEl.textContent = `おばけ ${_count}`;
    }
    if (REDUCED) { removeGhost(g, true); return; }
    // glitter: 8 CSS particles from the ghost's center
    const r = g.el.getBoundingClientRect();
    const fr = _field.getBoundingClientRect();
    const cx = r.left - fr.left + r.width / 2;
    const cy = r.top - fr.top + r.height / 2;
    for (let i = 0; i < 8; i++) {
      const sp = document.createElement('span');
      sp.className = 'juku-ghost-spark';
      const ang = (i / 8) * 2 * Math.PI + rand(-0.3, 0.3);
      const d = rand(28, 52);
      sp.style.left = cx + 'px';
      sp.style.top = cy + 'px';
      sp.style.setProperty('--jg-dx', Math.cos(ang) * d + 'px');
      sp.style.setProperty('--jg-dy', Math.sin(ang) * d + 'px');
      _field.appendChild(sp);
      setTimeout(() => sp.remove(), 650);
    }
    removeGhost(g, false);
  }

  function removeGhost(g, fade) {
    g.dead = true;
    const drop = () => { g.el.remove(); _ghosts = _ghosts.filter(x => x !== g); };
    if (fade) { g.el.classList.add('fadeout'); setTimeout(drop, 420); }
    else drop();
  }

  // ── Loop ─────────────────────────────────────────────────

  function frame(nowMs) {
    // self-healing: an innerHTML wipe kills the loop on its own
    if (!_field || !_field.isConnected) { hardStop(); return; }

    if (nowMs >= _spawnAt && _ghosts.length < MAX_ONSCREEN) {
      const w = _field.clientWidth, h = _field.clientHeight;
      if (w > 0 && h > 0) _ghosts.push(makeGhost(w, h));
      _spawnAt = nowMs + rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
    }

    _ghosts.slice().forEach(g => {
      if (g.dead) return;
      const s = g.fn(nowMs - g.born);
      if (!s.alive) { removeGhost(g, REDUCED); return; }
      if (s.x !== null) g.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    });

    _raf = requestAnimationFrame(frame);
  }

  function hardStop() {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = null;
    _ghosts = [];
    _field = null;
    _countEl = null;
  }

  // ── Public API ───────────────────────────────────────────

  function mount(container, opts) {
    unmount();
    if (!container) return;
    ensureStyles();
    opts = opts || {};
    _count = 0;

    if (opts.name) {
      const name = firstName();
      const plaque = document.createElement('p');
      plaque.className = 'juku-ghost-plaque';
      // textContent only — the name is user-supplied, the one string in
      // Juku that is. Never assembled via innerHTML.
      plaque.textContent = name ? `${name}さん、じゅんび OK！` : 'じゅんび OK！';
      container.appendChild(plaque);
    }

    _field = document.createElement('div');
    _field.className = 'juku-ghost-field';

    const tree = document.createElement('img');
    tree.className = 'juku-ghost-tree';
    tree.src = TREE_IMG;
    tree.alt = '';
    tree.addEventListener('error', () => tree.remove());
    _field.appendChild(tree);

    _countEl = document.createElement('span');
    _countEl.className = 'juku-ghost-count';
    _countEl.textContent = 'おばけ 0';
    _field.appendChild(_countEl);

    container.appendChild(_field);
    _spawnAt = performance.now() + 600;
    _raf = requestAnimationFrame(frame);
  }

  function unmount() {
    if (_field && _field.isConnected) {
      const plaque = _field.parentNode.querySelector('.juku-ghost-plaque');
      if (plaque) plaque.remove();
      _field.remove();
    }
    hardStop();
  }

  window.JUKU_GHOSTS = { mount, unmount };

})();
