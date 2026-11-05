#!/usr/bin/env node
'use strict';

// Pass 8: the path from the unlocking Blitz to the Maze reveal.
//   · The unlocking Blitz result card gets "Meet ___ in the Maze →" until the
//     reveal has been seen; it asks the hub to navigate (booha:openMaze) and
//     falls back to maze.html if nothing handles the event.
//   · The hub's Maze button carries the new Booha's face + a gold ring from
//     unlock until the reveal is seen (this student's save only).
//   · The Maze reveal is restyled in Christmas colours during the season.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const engine = read('js/blitz-engine.js');
const index = read('index.html');
const maze = read('maze.html');

// ── Blitz result card button ─────────────────────────────────────────────
const rowFn = engine.slice(engine.indexOf('function renderFinalWeekRow('), engine.indexOf('function ensureFinalCard('));
assert.ok(rowFn.length > 200, 'renderFinalWeekRow found');
assert.match(rowFn, /if \(!left && skin && !skins\.isRevealSeen\?\.\(skinId\)\) \{/,
  'the button appears only on an unlocked week whose reveal is unseen');
assert.match(rowFn, /go\.className = 'booha-blitz-maze-cta';/);
assert.match(rowFn, /Meet \$\{name\} in the Maze/, 'English label uses the (escaped) Booha name');
assert.match(rowFn, /めいろ で \$\{nameJp\} に あいに いこう！/, 'Japanese label');
assert.match(rowFn, /new CustomEvent\('booha:openMaze', \{ cancelable: true, detail: \{ skinId \} \}\)/);
assert.match(rowFn, /if \(document\.dispatchEvent\(ev\)\) window\.location\.href = 'maze\.html';/,
  'falls back to the Maze when no page handles the event');
assert.match(rowFn, /go\.disabled = true;/, 'one tap only');
assert.match(engine, /\.booha-blitz-maze-cta \{[^}]*min-height: 44px;/, 'touch-sized');
assert.match(engine, /\.booha-blitz-maze-cta \{[^}]*grid-column: 1 \/ -1;/, 'spans the result row');

// ── Hub: navigation + new-friend cue (real code from index.html) ────────
const start = index.indexOf("const mazeBtn = document.getElementById('mazeBtn');");
const listenerAt = index.indexOf("document.addEventListener('booha:openMaze'", start);
const end = index.indexOf('});', listenerAt) + 3;
assert.ok(start > 0 && listenerAt > start, 'hub Maze block found');
const hubSrc = index.slice(start, end);
assert.doesNotMatch(hubSrc, /localStorage/, 'the cue reads the student save, not device storage');

function harness({ ready = true, id = 'thumpkin', unlocked = true, seen = false } = {}) {
  const listeners = {};
  const attrs = {};
  const classes = new Set();
  const btn = {
    classList: { toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); }, contains: c => classes.has(c) },
    setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: k => { delete attrs[k]; },
    addEventListener(type, fn) { (listeners['btn:' + type] = listeners['btn:' + type] || []).push(fn); },
  };
  const face = { hidden: true, src: '', getAttribute(k) { return k === 'src' ? this.src : null; } };
  const nav = { href: null, fades: 0, timers: [], session: {} };
  const ctx = {
    console,
    document: {
      getElementById: x => (x === 'mazeBtn' ? btn : x === 'mazeCtaFriend' ? face : null),
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    },
    window: {
      BOOHA_READY: ready,
      location: { set href(v) { nav.href = v; }, get href() { return nav.href; } },
      BoohaSkins: {
        rotationCharacterId: () => id,
        isUnlocked: () => unlocked,
        isRevealSeen: () => seen,
        get: x => ({ id: x, name: 'Thumpkin Booha', nameJp: 'ソンプキン・ブーハー', assets: { maze: `assets/skins/${x}_booha/static.webp` } }),
      },
    },
    sessionStorage: { setItem: (k, v) => { nav.session[k] = v; } },
    playIndexSfx() {},
    fadeToBlack() { nav.fades++; },
    setTimeout: fn => { nav.timers.push(fn); return 1; },
  };
  vm.createContext(ctx);
  vm.runInContext(hubSrc, ctx, { filename: 'index-maze-block.js' });
  return { ctx, btn, face, attrs, classes, listeners, nav };
}

{
  const h = harness();
  h.ctx.updateMazeFriendCue();
  assert.strictEqual(h.face.hidden, false, 'unlocked + unseen: the face shows');
  assert.strictEqual(h.face.src, 'assets/skins/thumpkin_booha/static.webp');
  assert.ok(h.classes.has('has-new-friend'), 'gold ring on');
  assert.match(h.attrs['aria-label'], /meet Thumpkin Booha/);
}
{
  const h = harness({ seen: true });
  h.ctx.updateMazeFriendCue();
  assert.strictEqual(h.face.hidden, true, 'once the reveal is seen, the cue goes away');
  assert.ok(!h.classes.has('has-new-friend'));
  assert.strictEqual(h.attrs['aria-label'], undefined, 'the button keeps its own label');
}
assert.strictEqual((() => { const h = harness({ unlocked: false }); h.ctx.updateMazeFriendCue(); return h.face.hidden; })(), true,
  'not unlocked yet: no cue');
assert.strictEqual((() => { const h = harness({ ready: false }); h.ctx.updateMazeFriendCue(); return h.face.hidden; })(), true,
  'before identity is ready: no cue');
{
  // booha:openMaze → the hub's own fade + navigation, and the fallback is cancelled.
  const h = harness();
  let prevented = false;
  h.listeners['booha:openMaze'].forEach(fn => fn({ preventDefault() { prevented = true; } }));
  assert.ok(prevented, 'the hub claims the event so the engine does not also navigate');
  assert.strictEqual(h.nav.fades, 1, 'same fade as the Maze button');
  assert.strictEqual(h.nav.session.booha_return_to_hub, '1');
  h.nav.timers.forEach(fn => fn());
  assert.strictEqual(h.nav.href, 'maze.html');
  // A second request (double tap, or the button + event) does nothing more.
  h.listeners['booha:openMaze'].forEach(fn => fn({ preventDefault() {} }));
  h.listeners['btn:click'].forEach(fn => fn());
  assert.strictEqual(h.nav.fades, 1, 'navigation starts once');
}
['booha:ready', 'booha:gameEnd', 'booha:weeklyReset'].forEach(ev =>
  assert.ok(new RegExp(`addEventListener\\('${ev}', (\\(\\) => setTimeout\\()?updateMazeFriendCue`).test(index), `cue refreshes on ${ev}`));
// Pass 13: the same close hook also re-renders the ornament banner (Blitz centerpiece).
assert.match(index, /const relight = \(\) => \{ renderPills\(\); updateMazeFriendCue\(\); renderOrnamentBanner\(\); \};/, 'cue refreshes when a Blitz closes');
assert.match(index, /mazeButton\.classList\.toggle\('is-complete', !mazeAvailable\);\s*\}\s*updateMazeFriendCue\(\);/, 'cue refreshes with the hub');
assert.match(index, /<img id="mazeCtaFriend" class="mazeCtaFriend" alt="" decoding="async" hidden>/, 'face starts hidden');

// Cue CSS: ring on a pseudo-element (the glow animates box-shadow), motion gated.
assert.match(index, /\.mazeCta\.has-new-friend::after \{[^}]*border: 3px solid/);
assert.match(index, /@keyframes mazeFriendBob \{\s*0%, 100% \{ transform: [^}]*\}\s*50% +\{ transform: [^}]*\}\s*\}/, 'bob uses transform only');
assert.match(index, /html\.hub-reduced-motion \.mazeCtaFriend,\s*html\.hub-low-power \.mazeCtaFriend \{ animation: none; \}/);
assert.match(index, /@media \(prefers-reduced-motion: reduce\) \{ \.mazeCtaFriend \{ animation: none; \} \}/);

// ── Maze reveal in Christmas colours ─────────────────────────────────────
const xmas = maze.split('\n').filter(l => l.includes('html[data-season="christmas"] #battyUnlock'));
assert.ok(xmas.length >= 8, 'the reveal has a Christmas restyle');
assert.ok(xmas.some(l => /#battyUnlockPopup\{[^}]*#267448|rgba\(14,42,27/.test(l)), 'green card');
assert.ok(xmas.some(l => /\.batty-equip\{[^}]*#f2c95c/.test(l)), 'gold button');
assert.ok(xmas.every(l => !/animation|transition/.test(l)), 'colours only, no new motion');

console.log('blitz → maze path: ok');
