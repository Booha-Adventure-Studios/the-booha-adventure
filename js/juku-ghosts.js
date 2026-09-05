
// js/juku-ghosts.js  (v2 — pop weeks and feed weeks)
// English Juku — ghost waiting room. Load AFTER juku-engine.js,
// BEFORE juku-tests.js.
//
// Waiting states ONLY. Guardrails unchanged: fixed round of 6, counter
// resets per mount, saved NOWHERE, silent, decorative after the cap.
//
// v2: each wait runs ONE mode — pop or feed — seeded by weekId + venue
// so every device in the room agrees, it varies across the lesson, and
// it flips week to week. One verb per screen; the toys never steal each
// other's props.
//   pop  : ghosts at three speeds (floaty / darty / zigzag), tap →
//          confetti in that ghost's palette hue + gold. Counter おばけ.
//   feed : candies fall at varied speeds; tap one → nearest ghost darts
//          over and gobbles. Ghost taps just wiggle. Counter おかし,
//          incremented on the GOBBLE (the payoff), not the tap.
// Speed ceiling: this is a toy for 7-year-olds, not a reflex test —
// "fast" means ~6–8s crossings, never arcade speed.

(function () {
  'use strict';

  const ROUND_SIZE = 6;
  const MAX_GHOSTS = 3;
  const MAX_SNACKS = 2;
  const SPAWN_MIN_MS = 2500, SPAWN_MAX_MS = 4000;
  const SNACK_MIN_MS = 5000, SNACK_MAX_MS = 9000;

  // filename → burst hue (paired with gold/cream so every pop still
  // reads as Juku's palette)
  const GHOSTS = [
    ['blue-boo.webp', '#7db8e8'], ['pink-boo.webp', '#f090c0'],
    ['green-boo.webp', '#9ed879'], ['purple-boo.webp', '#b48ae0'],
    ['extra-boo-aqua.webp', '#7de0d8'], ['extra-boo-candy.webp', '#f0a0d0'],
    ['extra-boo-gold.webp', '#e8c46a'], ['extra-boo-lime.webp', '#c0e070'],
    ['extra-boo-mint.webp', '#90dcb0'], ['extra-boo-orange.webp', '#f0b070'],
    ['extra-boo-peach.webp', '#f0c0a0'], ['extra-boo-rose.webp', '#e890a0'],
    ['extra-boo-sky.webp', '#90c8f0'], ['extra-boo-violet.webp', '#a898e8']
  ];
  const IMG_DIR = 'assets/img/';
  const TREE_IMG = IMG_DIR + 'tree-arch.webp';
  const SNACK_IMG = 'assets/feed/candy.webp';
  const GOLDS = ['#e8c46a', '#fff3c0'];

  const REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CSS = `
.juku-ghost-field { position: fixed; inset: 0; z-index: 1;
  overflow: hidden; pointer-events: none; }
.juku-ghost-tree { position: absolute; left: 50%; bottom: 0;
  transform: translateX(-50%); height: min(52vh, 480px);
  opacity: 0.5; pointer-events: none; }
.juku-ghost, .juku-snack { position: absolute; left: 0; top: 0;
  padding: 16px; margin: -16px; box-sizing: content-box;
  background: none; border: none; cursor: pointer;
  pointer-events: auto; will-change: transform, opacity;
  -webkit-tap-highlight-color: transparent; }
.juku-ghost { width: 72px; height: 72px; }
.juku-snack { width: 44px; height: 44px; }
.juku-ghost img, .juku-snack img { width: 100%; height: 100%;
  display: block; pointer-events: none; }
.juku-ghost.gobble img { animation: jg-gobble 500ms ease-out; }
@keyframes jg-gobble {
  0% { transform: scale(1); } 35% { transform: scale(1.25) rotate(-6deg); }
  70% { transform: scale(0.95) rotate(4deg); } 100% { transform: scale(1); } }
.juku-ghost.wiggle img { animation: jg-wiggle 400ms ease-in-out; }
@keyframes jg-wiggle {
  0%,100% { transform: rotate(0); } 25% { transform: rotate(-8deg); }
  75% { transform: rotate(8deg); } }
.juku-ghost-count { position: fixed; right: 14px; bottom: 12px;
  z-index: 2; font-size: 0.95em; color: #8a8069; pointer-events: none; }
.juku-ghost-plaque { text-align: center; margin: 0 0 6px;
  font-size: 17px; font-weight: 700; color: #e8dfc8; }
.juku-ghost-spark { position: absolute; border-radius: 50%;
  pointer-events: none; animation: jg-spark 700ms ease-out forwards; }
@keyframes jg-spark {
  from { transform: translate(0,0) scale(1); opacity: 1; }
  to { transform: translate(var(--jg-dx), var(--jg-dy)) scale(0.25);
       opacity: 0; } }
.juku-ghost.fadein { animation: jg-fadein 500ms ease-out; }
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

  // ── Mode: seeded by weekId + venue — whole class agrees ──

  function modeFor(venue) {
    try {
      const cw = window.CALENDAR.getCurrentCurriculumWeek();
      const weekKey = window.JUKU.curriculumWeekKey(cw);
      return window.JUKU.rng(`${weekKey}|ghost|${venue}`)() < 0.5
        ? 'pop' : 'feed';
    } catch (e) { return 'pop'; }
  }

  // ── State ────────────────────────────────────────────────

  let _anchor = null, _field = null, _plaque = null;
  let _raf = null, _mode = 'pop';
  let _spawnAt = 0, _snackAt = 0;
  let _ghosts = [], _snacks = [];
  let _count = 0, _countEl = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  function counterText() {
    return `${_mode === 'pop' ? 'おばけ' : 'おかし'} ${_count}`;
  }

  function bumpCount() {
    if (_count >= ROUND_SIZE) return;
    _count++;
    if (_countEl) _countEl.textContent = counterText();
  }

  // ── Ghosts ───────────────────────────────────────────────

  function makeGhost() {
    const W = vw(), H = vh();
    const [img, hue] = pick(GHOSTS);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const size = rand(56, 88);
    const y0 = rand(H * 0.2, H * 0.85);
    const born = performance.now();

    // pop mode: three temperaments. feed mode: everyone floaty —
    // ghosts are diners, not targets.
    const temper = _mode === 'pop'
      ? ['float', 'dart', 'zigzag'][_ghosts.length % 3] : 'float';

    let dur, bobAmp, bobHz;
    if (temper === 'dart') { dur = rand(6000, 8000); bobAmp = rand(6, 14); bobHz = rand(0.2, 0.35); }
    else if (temper === 'zigzag') { dur = rand(10000, 14000); bobAmp = rand(60, 110); bobHz = rand(0.35, 0.5); }
    else { dur = rand(15000, 22000); bobAmp = rand(10, 26); bobHz = rand(0.12, 0.28); }

    const fn = t => {
      const p = t / dur;
      return { x: (dir === 1 ? -size + p * (W + 2 * size)
                             : W - p * (W + 2 * size)),
               y: y0 + Math.sin(t / 1000 * bobHz * 2 * Math.PI) * bobAmp,
               alive: p < 1 };
    };

    const el = document.createElement('button');
    el.className = 'juku-ghost';
    el.setAttribute('aria-label', 'おばけ');
    const im = document.createElement('img');
    im.src = IMG_DIR + img;
    im.alt = '';
    const g = { el, fn, born, size, hue, dead: false, x: 0, y: y0,
                dart: null, wiggling: false,
                breathe: rand(0, Math.PI * 2) };
    im.addEventListener('error', () => { removeGhost(g, false); });
    el.appendChild(im);
    el.style.width = el.style.height = size + 'px';
    el.addEventListener('click', () => tapGhost(g));
    _field.appendChild(el);

    if (REDUCED) {
      el.classList.add('fadein');
      g.x = rand(30, Math.max(31, W - size - 30));
      g.fn = t => ({ x: g.x, y: g.y, alive: t < 6000 });
      el.style.transform = `translate(${g.x}px, ${g.y}px)`;
    }
    return g;
  }

  function tapGhost(g) {
    if (g.dead) return;
    if (_mode === 'feed') {
      // diners wiggle; they don't pop
      if (g.wiggling || g.dart) return;
      g.wiggling = true;
      g.el.classList.add('wiggle');
      setTimeout(() => { g.el.classList.remove('wiggle'); g.wiggling = false; }, 420);
      return;
    }
    g.dead = true;
    bumpCount();
    if (REDUCED) { removeGhost(g, true); return; }
    burst(g.x + g.size / 2, g.y + g.size / 2, g.hue);
    removeGhost(g, false);
  }

  function burst(cx, cy, hue) {
    const colors = hue ? [hue, hue].concat(GOLDS) : GOLDS;
    for (let i = 0; i < 15; i++) {
      const sp = document.createElement('span');
      sp.className = 'juku-ghost-spark';
      const d = rand(32, 70), s = rand(5, 10);
      const ang = (i / 15) * 2 * Math.PI + rand(-0.3, 0.3);
      sp.style.width = sp.style.height = s + 'px';
      sp.style.background = pick(colors);
      sp.style.left = cx + 'px';
      sp.style.top = cy + 'px';
      sp.style.setProperty('--jg-dx', Math.cos(ang) * d + 'px');
      sp.style.setProperty('--jg-dy', Math.sin(ang) * d + 'px');
      _field.appendChild(sp);
      setTimeout(() => sp.remove(), 750);
    }
  }

  function removeGhost(g, fade) {
    g.dead = true;
    const drop = () => { g.el.remove(); _ghosts = _ghosts.filter(x => x !== g); };
    if (fade) { g.el.classList.add('fadeout'); setTimeout(drop, 420); }
    else drop();
  }

  // ── Snacks (feed mode only) ──────────────────────────────

  function makeSnack() {
    const W = vw(), H = vh();
    const x0 = rand(W * 0.12, W * 0.88);
    // lazy drifters and quick droppers — quick is still gentle
    const dur = Math.random() < 0.4 ? rand(7000, 10000) : rand(14000, 20000);
    const swayAmp = rand(15, 55), swayHz = rand(0.08, 0.22);
    const born = performance.now();

    const el = document.createElement('button');
    el.className = 'juku-snack';
    el.setAttribute('aria-label', 'おかし');
    const im = document.createElement('img');
    im.src = SNACK_IMG;
    im.alt = '';
    const sn = { el, born, dead: false, x: x0, y: -50, claimed: false };
    im.addEventListener('error', () => { removeSnack(sn, false); });
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
    if (sn.dead || sn.claimed) return;
    const eater = _ghosts.filter(g => !g.dead && !g.dart)
      .sort((a, b) =>
        Math.hypot(a.x - sn.x, a.y - sn.y) -
        Math.hypot(b.x - sn.x, b.y - sn.y))[0];
    if (REDUCED || !eater) {
      // no free ghost — the candy sparkles away; eaten-counter untouched
      if (!REDUCED) burst(sn.x + 22, sn.y + 22, null);
      removeSnack(sn, true);
      return;
    }
    sn.claimed = true;   // stops falling; the ghost is on its way
    eater.dart = { fromX: eater.x, fromY: eater.y,
                   toX: sn.x - eater.size * 0.15,
                   toY: sn.y - eater.size * 0.2,
                   start: performance.now(), snack: sn };
  }

  function removeSnack(sn, fade) {
    sn.dead = true;
    const drop = () => { sn.el.remove(); _snacks = _snacks.filter(x => x !== sn); };
    if (fade) { sn.el.classList.add('fadeout'); setTimeout(drop, 420); }
    else drop();
  }

  // ── Loop ─────────────────────────────────────────────────

  const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  function frame(nowMs) {
    if (!_anchor || !_anchor.isConnected) { hardStop(); return; }

    if (nowMs >= _spawnAt && _ghosts.length < MAX_GHOSTS) {
      _ghosts.push(makeGhost());
      _spawnAt = nowMs + rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
    }
    if (_mode === 'feed' && nowMs >= _snackAt && _snacks.length < MAX_SNACKS) {
      _snacks.push(makeSnack());
      _snackAt = nowMs + rand(SNACK_MIN_MS, SNACK_MAX_MS);
    }

    _snacks.slice().forEach(sn => {
      if (sn.dead || sn.claimed) return;
      const s = sn.fn(nowMs - sn.born);
      if (!s.alive) { removeSnack(sn, REDUCED); return; }
      sn.x = s.x; sn.y = s.y;
      sn.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    });

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
          g.dead = true;
          bumpCount();               // EATEN — the payoff moment counts
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
      g.el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${br})`;
    });

    _raf = requestAnimationFrame(frame);
  }

  function hardStop() {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = null;
    if (_field && _field.isConnected) _field.remove();
    if (_plaque && _plaque.isConnected) _plaque.remove();
    _field = null; _plaque = null; _anchor = null;
    _ghosts = []; _snacks = []; _countEl = null;
  }

  // ── Public API ───────────────────────────────────────────
  // opts: { name: bool, venue: string } — venue seeds the weekly mode.

  function mount(container, opts) {
    unmount();
    if (!container) return;
    ensureStyles();
    opts = opts || {};
    _count = 0;
    _anchor = container;
    _mode = modeFor(opts.venue || 'wait');

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
    _countEl.textContent = counterText();
    _field.appendChild(_countEl);

    document.body.appendChild(_field);
    const now = performance.now();
    _spawnAt = now + 600;
    _snackAt = now + rand(3000, 6000);
    _raf = requestAnimationFrame(frame);
  }

  function unmount() { hardStop(); }

  window.JUKU_GHOSTS = { mount, unmount };

})();
