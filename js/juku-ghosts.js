
// js/juku-ghosts.js  (v1.5 — full-screen haunting)
// English Juku — ghost waiting room. Load AFTER juku-engine.js,
// BEFORE juku-tests.js.
//
// Waiting states ONLY (lobby post-submit, done-screens, dictation end
// tail, interval). NEVER over an active question.
// Guardrails unchanged: fixed round of 6, counter resets per mount,
// saved NOWHERE, silent. Snacks are a toy, not a game — no counter,
// no score, nothing accrues.
//
// v1.5: the field is a fixed full-viewport layer BEHIND the panel.
// Ghosts drift the whole screen; the tree anchors bottom-center at
// real presence. The mount container is only an anchor (plaque +
// liveness check) — if a re-render wipes it, the loop self-kills.
//
// All motion is transform/opacity in one rAF loop. No canvas, no
// shadowBlur, no filters.

(function () {
  'use strict';

  const ROUND_SIZE = 6;
  const MAX_ONSCREEN = 3;
  const SPAWN_MIN_MS = 2500, SPAWN_MAX_MS = 4000;
  const SNACK_MIN_MS = 12000, SNACK_MAX_MS = 18000;

  const GHOST_IMGS = [
    'blue-boo.png', 'pink-boo.png', 'green-boo.png', 'purple-boo.png',
    'extra-boo-aqua.png', 'extra-boo-candy.png', 'extra-boo-gold.png',
    'extra-boo-lime.png', 'extra-boo-mint.png', 'extra-boo-orange.png',
    'extra-boo-peach.png', 'extra-boo-rose.png', 'extra-boo-sky.png',
    'extra-boo-violet.png'
  ];
  const IMG_DIR = 'assets/img/';
  const TREE_IMG = IMG_DIR + 'tree-arch.png';
  const SNACK_IMG = 'assets/feed/candy.png';
  const SPARK_COLORS = ['#e8c46a', '#fff3c0', '#d9b45b'];

  const REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Injected styles ──────────────────────────────────────

  const CSS = `
.juku-ghost-field { position: fixed; inset: 0; z-index: 1;
  overflow: hidden; pointer-events: none; }
.juku-ghost-tree { position: absolute; left: 50%; bottom: 0;
  transform: translateX(-50%); height: min(52vh, 480px);
  opacity: 0.5; pointer-events: none; }
.juku-ghost { position: absolute; left: 0; top: 0;
  width: 72px; height: 72px;
  padding: 16px; margin: -16px; box-sizing: content-box;
  background: none; border: none; cursor: pointer;
  pointer-events: auto; will-change: transform, opacity;
  -webkit-tap-highlight-color: transparent; }
.juku-ghost img { width: 100%; height: 100%; display: block;
  pointer-events: none; }
.juku-ghost.gobble img { animation: jg-gobble 500ms ease-out; }
@keyframes jg-gobble {
  0% { transform: scale(1); } 35% { transform: scale(1.25) rotate(-6deg); }
  70% { transform: scale(0.95) rotate(4deg); } 100% { transform: scale(1); } }
.juku-snack { position: absolute; left: 0; top: 0;
  width: 44px; height: 44px;
  padding: 16px; margin: -16px; box-sizing: content-box;
  background: none; border: none; cursor: pointer;
  pointer-events: auto; will-change: transform, opacity;
  -webkit-tap-highlight-color: transparent; }
.juku-snack img { width: 100%; height: 100%; display: block;
  pointer-events: none; }
.juku-ghost-count { position: fixed; right: 14px; bottom: 12px;
  z-index: 2; font-size: 0.95em; color: #8a8069;
  pointer-events: none; }
.juku-ghost-plaque { text-align: center; margin: 0 0 6px;
  font-size: 17px; font-weight: 700; color: #e8dfc8; }
.juku-ghost-spark { position: absolute; border-radius: 50%;
  pointer-events: none;
  animation: jg-spark 650ms ease-out forwards; }
@keyframes jg-spark {
  from { transform: translate(0, 0) scale(1); opacity: 1; }
  to   { transform: translate(var(--jg-dx), var(--jg-dy)) scale(0.25);
         opacity: 0; } }
.juku-ghost.fadein  { animation: jg-fadein 500ms ease-out; }
@keyframes jg-fadein { from { opacity: 0; } to { opacity: 1; } }
.juku-ghost.fadeout, .juku-snack.fadeout {
  animation: jg-fadeout 400ms ease-in forwards; }
@keyframes jg-fadeout { from { opacity: 1; } to { opacity: 0; } }`;

  function ensureStyles() {
    if (document.getElementById('juku-ghost-css')) return;
    const s = document.createElement('style');
    s.id = 'juku-ghost-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Name (login keys; textContent only — user-supplied) ──

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

  let _anchor = null;     // mount container: liveness sentinel + plaque home
  let _field = null;      // fixed full-screen layer (on document.body)
  let _plaque = null;
  let _raf = null;
  let _spawnAt = 0, _snackAt = 0;
  let _ghosts = [];
  let _snack = null;      // at most one
  let _count = 0;
  let _countEl = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  // ── Ghosts ───────────────────────────────────────────────
  // Personality is behavior, not sprite. Paths run in viewport space.
  // Breathing: a gentle scale pulse layered onto every transform.

  function makeGhost() {
    const W = vw(), H = vh();
    const type = ['drift', 'shy', 'curve'][_ghosts.length % 3];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const size = rand(56, 88);
    const dur = rand(14000, 22000);
    const y0 = rand(H * 0.2, H * 0.85);
    const bobAmp = rand(10, 26), bobHz = rand(0.12, 0.28);
    const born = performance.now();

    let fn;
    if (type === 'drift') {
      fn = t => {
        const p = t / dur;
        return { x: (dir === 1 ? -size + p * (W + 2 * size)
                               : W - p * (W + 2 * size)),
                 y: y0 + Math.sin(t / 1000 * bobHz * 2 * Math.PI) * bobAmp,
                 alive: p < 1 };
      };
    } else if (type === 'curve') {
      fn = t => {
        const p = t / dur;
        return { x: (dir === 1 ? -size + p * (W + 2 * size)
                               : W - p * (W + 2 * size)),
                 y: H * 0.25 + Math.sin(p * Math.PI) * H * 0.5,
                 alive: p < 1 };
      };
    } else { // shy: peek from a real screen edge, hold, retreat
      const edgeX = dir === 1 ? -size * 0.6 : W - size * 0.4;
      const outX = dir === 1 ? size * 0.3 : W - size * 1.3;
      const peekMs = 2600, holdMs = 2400;
      const total = peekMs + holdMs + peekMs;
      fn = t => {
        let x;
        if (t < peekMs) x = edgeX + (outX - edgeX) * (t / peekMs);
        else if (t < peekMs + holdMs) x = outX;
        else x = outX + (edgeX - outX) * ((t - peekMs - holdMs) / peekMs);
        return { x, y: y0, alive: t < total };
      };
    }

    const el = document.createElement('button');
    el.className = 'juku-ghost';
    el.setAttribute('aria-label', 'おばけ');
    const im = document.createElement('img');
    im.src = IMG_DIR + pick(GHOST_IMGS);
    im.alt = '';
    const g = { el, fn, born, size, dead: false, x: 0, y: y0, dart: null,
                breathe: rand(0, Math.PI * 2) };
    im.addEventListener('error', () => { removeGhost(g, false); });
    el.appendChild(im);
    el.style.width = el.style.height = size + 'px';
    el.addEventListener('click', () => tapGhost(g), { once: true });
    _field.appendChild(el);

    if (REDUCED) {
      el.classList.add('fadein');
      g.x = rand(30, Math.max(31, W - size - 30));
      g.y = y0;
      el.style.transform = `translate(${g.x}px, ${g.y}px)`;
      g.fn = t => ({ x: g.x, y: g.y, alive: t < 6000 });
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
    burst(g.x + g.size / 2, g.y + g.size / 2);
    removeGhost(g, false);
  }

  function burst(cx, cy) {
    for (let i = 0; i < 12; i++) {
      const sp = document.createElement('span');
      sp.className = 'juku-ghost-spark';
      const d = rand(30, 64), s = rand(5, 9);
      const ang = (i / 12) * 2 * Math.PI + rand(-0.3, 0.3);
      sp.style.width = sp.style.height = s + 'px';
      sp.style.background = pick(SPARK_COLORS);
      sp.style.left = cx + 'px';
      sp.style.top = cy + 'px';
      sp.style.setProperty('--jg-dx', Math.cos(ang) * d + 'px');
      sp.style.setProperty('--jg-dy', Math.sin(ang) * d + 'px');
      _field.appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    }
  }

  function removeGhost(g, fade) {
    g.dead = true;
    const drop = () => { g.el.remove(); _ghosts = _ghosts.filter(x => x !== g); };
    if (fade) { g.el.classList.add('fadeout'); setTimeout(drop, 420); }
    else drop();
  }

  // ── Snacks (a toy, not a game — nothing counts) ──────────

  function makeSnack() {
    const W = vw(), H = vh();
    const x0 = rand(W * 0.12, W * 0.88);
    const swayAmp = rand(20, 50), swayHz = rand(0.1, 0.2);
    const dur = rand(14000, 20000);
    const born = performance.now();

    const el = document.createElement('button');
    el.className = 'juku-snack';
    el.setAttribute('aria-label', 'おかし');
    const im = document.createElement('img');
    im.src = SNACK_IMG;
    im.alt = '';
    const sn = { el, born, dead: false, x: x0, y: -50 };
    im.addEventListener('error', () => { removeSnack(sn); });
    el.appendChild(im);
    el.addEventListener('click', () => tapSnack(sn), { once: true });
    _field.appendChild(el);

    sn.fn = t => ({
      x: x0 + Math.sin(t / 1000 * swayHz * 2 * Math.PI) * swayAmp,
      y: -50 + (t / dur) * (H + 100),
      alive: t < dur
    });
    if (REDUCED) {
      sn.x = x0; sn.y = rand(H * 0.3, H * 0.7);
      el.classList.add('fadein');
      el.style.transform = `translate(${sn.x}px, ${sn.y}px)`;
      sn.fn = t => ({ x: sn.x, y: sn.y, alive: t < 9000 });
    }
    return sn;
  }

  function tapSnack(sn) {
    if (sn.dead) return;
    sn.dead = true;
    const eater = _ghosts.filter(g => !g.dead && !g.dart)
      .sort((a, b) =>
        (Math.hypot(a.x - sn.x, a.y - sn.y)) -
        (Math.hypot(b.x - sn.x, b.y - sn.y)))[0];
    if (REDUCED || !eater) {
      // no available ghost: the snack just sparkles away
      if (!REDUCED) burst(sn.x + 22, sn.y + 22);
      removeSnack(sn, true);
      return;
    }
    // nearest ghost darts to the snack, gobbles, bounces, drifts off
    eater.dart = { fromX: eater.x, fromY: eater.y,
                   toX: sn.x - eater.size * 0.15, toY: sn.y - eater.size * 0.2,
                   start: performance.now(), snack: sn };
  }

  function removeSnack(sn, fade) {
    sn.dead = true;
    const drop = () => { sn.el.remove(); if (_snack === sn) _snack = null; };
    if (fade) { sn.el.classList.add('fadeout'); setTimeout(drop, 420); }
    else drop();
  }

  // ── Loop ─────────────────────────────────────────────────

  const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  function frame(nowMs) {
    if (!_anchor || !_anchor.isConnected) { hardStop(); return; }

    if (nowMs >= _spawnAt && _ghosts.length < MAX_ONSCREEN) {
      _ghosts.push(makeGhost());
      _spawnAt = nowMs + rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
    }
    if (nowMs >= _snackAt && !_snack) {
      _snack = makeSnack();
      _snackAt = nowMs + rand(SNACK_MIN_MS, SNACK_MAX_MS);
    }

    if (_snack && !_snack.dead) {
      const s = _snack.fn(nowMs - _snack.born);
      if (!s.alive) removeSnack(_snack, REDUCED);
      else {
        _snack.x = s.x; _snack.y = s.y;
        _snack.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
    }

    _ghosts.slice().forEach(g => {
      if (g.dead) return;

      if (g.dart) {
        const p = (nowMs - g.dart.start) / 500;
        if (p >= 1) {
          g.x = g.dart.toX; g.y = g.dart.toY;
          g.el.style.transform = `translate(${g.x}px, ${g.y}px)`;
          removeSnack(g.dart.snack, false);
          g.el.classList.add('gobble');
          g.dart = null;
          g.dead = true;                 // full and content — drifts away
          setTimeout(() => removeGhost(g, true), 700);
        } else {
          const e = ease(p);
          g.x = g.dart.fromX + (g.dart.toX - g.dart.fromX) * e;
          g.y = g.dart.fromY + (g.dart.toY - g.dart.fromY) * e;
          g.el.style.transform = `translate(${g.x}px, ${g.y}px)`;
        }
        return;
      }

      const s = g.fn(nowMs - g.born);
      if (!s.alive) { removeGhost(g, REDUCED); return; }
      g.x = s.x; g.y = s.y;
      const br = REDUCED ? 1
        : 1 + 0.045 * Math.sin(nowMs / 1000 * 1.4 + g.breathe);
      g.el.style.transform =
        `translate(${s.x}px, ${s.y}px) scale(${br})`;
    });

    _raf = requestAnimationFrame(frame);
  }

  function hardStop() {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = null;
    if (_field && _field.isConnected) _field.remove();
    if (_plaque && _plaque.isConnected) _plaque.remove();
    _field = null; _plaque = null; _anchor = null;
    _ghosts = []; _snack = null; _countEl = null;
  }

  // ── Public API ───────────────────────────────────────────

  function mount(container, opts) {
    unmount();
    if (!container) return;
    ensureStyles();
    opts = opts || {};
    _count = 0;
    _anchor = container;

    if (opts.name) {
      const name = firstName();
      _plaque = document.createElement('p');
      _plaque.className = 'juku-ghost-plaque';
      _plaque.textContent = name ? `${name}さん、じゅんび OK！` : 'じゅんび OK！';
      container.appendChild(_plaque);
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

    document.body.appendChild(_field);
    const now = performance.now();
    _spawnAt = now + 600;
    _snackAt = now + rand(6000, 10000);
    _raf = requestAnimationFrame(frame);
  }

  function unmount() { hardStop(); }

  window.JUKU_GHOSTS = { mount, unmount };

})();
