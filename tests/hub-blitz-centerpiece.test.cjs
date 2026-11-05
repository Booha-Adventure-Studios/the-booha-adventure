#!/usr/bin/env node
'use strict';

// Hub Pass 13: the Blitz centerpiece.
//   · All three Blitz games done this week (BoohaSkins.hasCurrentBlitzTriple,
//     the same rule that unlocks the week's Booha skin) → one bigger month
//     ornament hangs in the middle of the strand with the red bow on the wire.
//   · Only ever added: no slot, outline or hint while Blitz is unfinished.
//   · The day ornaments keep their order and move aside; gold stays gold.
//   · It hangs itself only when earned while the page is open, once the hub
//     is on screen and no Blitz game covers it. Earlier earnings show quietly.
//   · Resets with the week. Transform/opacity only; motion settings stop it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));

function load(file, name, extra = {}) {
  const sb = Object.assign({ console, Date, Math, JSON }, extra);
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(read(file), sb, { filename: file });
  assert.ok(sb[name], `${file} defines ${name}`);
  return sb[name];
}
const Banner = load('js/ui/hub-ornament-banner.js', 'BoohaOrnamentBanner');

// ── The bow asset ────────────────────────────────────────────────────────
{
  const bow = Banner.CENTERPIECE_BOW;
  assert.strictEqual(bow.src, 'assets/img/hub/ornaments/ornament-centerpiece-bow-r1.webp');
  const buf = fs.readFileSync(path.join(ROOT, bow.src));
  assert.strictEqual(buf.toString('ascii', 0, 4), 'RIFF');
  assert.strictEqual(buf.toString('ascii', 8, 12), 'WEBP');
  assert.ok(buf.length < 25 * 1024, 'bow stays small');
  if (buf.toString('ascii', 12, 16) === 'VP8X') {
    assert.deepStrictEqual([1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)], [192, 288], 'same canvas as the month art');
  }
  assert.ok(bow.knotY > 0.4 && bow.knotY < 0.55, 'knot centre is measured');
}

// ── Geometry: days split around the middle, order kept ──────────────────
for (let n = 0; n <= 7; n++) {
  const p = plain(Banner.positions(n, true));
  assert.strictEqual(p.length, n);
  for (let i = 1; i < n; i++) assert.ok(p[i].x > p[i - 1].x, `${n}: days stay in order left to right`);
  p.forEach(o => {
    assert.ok(Math.abs(o.x - 50) >= 10.5 - 1e-9, `${n}: nothing under the centerpiece`);
    assert.ok(o.x > 0 && o.x < 100, `${n}: inside the banner`);
    assert.ok(Math.abs(o.y - Banner.wireY(o.x / 100)) < 0.01, `${n}: on the wire`);
  });
  assert.strictEqual(p.filter(o => o.x < 50).length, Math.ceil(n / 2), `${n}: first half (rounded up) on the left`);
}
assert.deepStrictEqual(plain(Banner.positions(2, true)).map(p => p.x), [39.5, 60.5]);
assert.deepStrictEqual(plain(Banner.positions(3)), plain(Banner.positions(3, false)), 'without it, nothing moves');
assert.deepStrictEqual(plain(Banner.positions(1)).map(p => p.x), [50]);

// ── Render (fake DOM) ────────────────────────────────────────────────────
class Node {
  constructor(doc, tag) {
    this.ownerDocument = doc; this.tagName = tag; this.children = []; this.parent = null;
    this.style = { setProperty(k, v) { this[k] = v; } }; this.dataset = {}; this.attrs = {}; this.hidden = false; this.className = '';
    const set = new Set();
    Object.defineProperty(this, 'className', {
      get: () => Array.from(set).join(' '),
      set: v => { set.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => set.add(c)); },
    });
    this.classList = { add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c), toggle: (c, on) => { if (on) set.add(c); else set.delete(c); return on; } };
    this.offsetWidth = 10;
  }
  get firstChild() { return this.children[0] || null; }
  appendChild(n) { n.parent = this; this.children.push(n); return n; }
  removeChild(n) { this.children = this.children.filter(c => c !== n); n.parent = null; return n; }
  remove() { if (this.parent) this.parent.removeChild(this); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
}
const doc = { createElement: t => new Node(doc, t), createElementNS: (ns, t) => new Node(doc, t) };
const el = new Node(doc, 'div');
const nov = Banner.artForDay('2026-11-05');
const sum = (...days) => ({ visits: days.length, checks: days.filter(d => d.gold).length, days });
const week = sum({ day: '2026-11-02', gold: true }, { day: '2026-11-03', gold: false }, { day: '2026-11-04', gold: true });
const center = () => el._ob.wrap.children.find(c => c.dataset.center === '1') || null;
const dayNodes = () => el._ob.wrap.children.filter(c => c.dataset.day);

Banner.render(el, nov, week, {});
assert.strictEqual(center(), null, 'Blitz unfinished: no centerpiece, no placeholder');
assert.strictEqual(el.dataset.centerpiece, '0');
const wire = el.children[0];
const before = dayNodes().slice();

Banner.render(el, nov, week, { centerpiece: true });
const c = center();
assert.ok(c, 'Blitz 3/3: the centerpiece hangs');
assert.strictEqual(el.children[0], wire, 'the strand is not rebuilt');
assert.deepStrictEqual(dayNodes(), before, 'day ornaments are reused');
assert.ok(c.classList.contains('obCenter') && c.classList.contains('gold') && c.classList.contains('obOrn'));
assert.strictEqual(c.style.left, '50%');
assert.strictEqual(c.style.top, Banner.wireY(0.5) + '%', 'hangs at the middle of the wire');
assert.deepStrictEqual(c.children.map(n => n.className), ['obRays', 'obArt', 'obBow'], 'rays, art, bow');
assert.ok(c.children[1].children[0].src.endsWith('ornament-november-tree-r2.webp'), 'the month art, bigger');
assert.ok(c.children[2].src.endsWith('ornament-centerpiece-bow-r1.webp'));
assert.strictEqual(c.children[2].alt, '');
assert.ok(!c.classList.contains('is-new'), 'no animation unless asked');
assert.deepStrictEqual(dayNodes().map(n => n.style.left), ['39.5%', '32%', '60.5%'].map(String).sort((a, b) => 0) && plain(Banner.positions(3, true)).map(p => p.x + '%'),
  'days move aside');
assert.deepStrictEqual(dayNodes().map(n => n.classList.contains('gold')), [true, false, true], 'gold stays gold');
assert.strictEqual(el.dataset.centerpiece, '1');
assert.match(el.attrs['aria-label'], /Blitz 3\/3 · .*ブリッツ 3\/3$/, 'screen readers hear it');
assert.match(el.style['--ob-bow-knot'], /^0\.4\d+$/, 'knot height reaches the CSS');

Banner.render(el, nov, week, { centerpiece: true, popCenter: true });
assert.strictEqual(center(), c, 'same node, not a second one');
assert.ok(c.classList.contains('is-new'), 'just earned: it hangs itself');
assert.strictEqual(el._ob.wrap.children.filter(n => n.dataset.center).length, 1);

// New month mid-week: the strand rebuilds with the new art, centerpiece too.
const dec = Banner.artForDay('2026-12-01');
Banner.render(el, dec, week, { centerpiece: true });
assert.ok(center().children[1].children[0].src.endsWith('ornament-december-stocking-r2.webp'), 'December stocking takes the middle');

// Sunday reset: gone with the week.
Banner.render(el, dec, sum(), { centerpiece: false });
assert.strictEqual(center(), null, 'resets with the week');
assert.strictEqual(el.dataset.centerpiece, '0');

// Centerpiece with no visit days yet (e.g. a Blitz before the visit write).
Banner.render(el, dec, sum(), { centerpiece: true });
assert.ok(center(), 'it can hang on its own');

// ── The earning rule: BoohaSkins.hasCurrentBlitzTriple ───────────────────
{
  const Skins = load('js/core/booha-skins.js', 'BoohaSkins', {
    CALENDAR: {
      getTodayKey: () => '2026-11-05',
      getCurrentCurriculumWeek: () => ({ weekStart: '2026-11-01', occurrenceKey: '2026-11-01|november-w1' }),
      getCurriculumWeekOccurrenceKey: cw => cw.occurrenceKey,
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { addEventListener() {}, querySelector: () => null, documentElement: { dataset: {}, style: { setProperty() {}, removeProperty() {} }, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, removeAttribute() {} } },
  });
  const save = weekly => ({ meta: { blitz: { weeklyKey: '2026-11-01|november-w1', weekly } } });
  const done = { ms: 30000 };
  assert.strictEqual(Skins.hasCurrentBlitzTriple(save({ vocab: { pb: done }, sentences: { pb: done } })), false, '2 of 3: no');
  assert.strictEqual(Skins.hasCurrentBlitzTriple(save({ vocab: { pb: done }, sentences: { pb: done }, questions: { pb: done } })), true, '3 of 3: yes');
  assert.strictEqual(Skins.hasCurrentBlitzTriple({ meta: { blitz: { weeklyKey: '2026-10-25|october-w4', weekly: { vocab: { pb: done }, sentences: { pb: done }, questions: { pb: done } } } } }), false, 'last week\'s three do not count');
}

// ── Hub wiring (index.html) ──────────────────────────────────────────────
const index = read('index.html');
function slice(a, b) { const s = index.indexOf(a); const e = index.indexOf(b, s); assert.ok(s >= 0 && e > s, `${a} extractable`); return index.slice(s, e); }
const src = slice('let centerpieceShown = null;', "document.addEventListener('booha:visitRecorded'");
assert.match(src, /window\.BoohaSkins\?\.hasCurrentBlitzTriple\?\.\(window\.BoohaAdventure\?\.save\?\.load\?\.\(\)\)/, 'same rule as the skin unlock, read from the student\'s save');

function hub() {
  const state = { ready: false, triple: false, active: true, hidden: false, blitzOpen: false, calls: [] };
  const ctx = {
    console,
    window: null,
    ornamentPopDays: new Set(),
    seasonTodayKey: () => '2026-11-05',
    document: {
      get hidden() { return state.hidden; },
      getElementById: id => (id === 'hubOrnamentBanner' ? {} : id === 'hubScene' ? { classList: { contains: c => c === 'active' && state.active } } : null),
      querySelector: sel => (state.blitzOpen && /#vb-overlay/.test(sel) ? {} : null),
    },
    BoohaOrnamentBanner: { artForDay: () => ({ id: 'november-tree' }), render: (el, art, sum, opts) => state.calls.push(opts) },
    BoohaVisitDays: { current: () => ({ visits: 1, checks: 0, days: [] }) },
    BoohaSkins: { hasCurrentBlitzTriple: () => state.triple },
    BoohaAdventure: { save: { load: () => ({}) } },
  };
  ctx.window = ctx;
  Object.defineProperty(ctx, 'BOOHA_READY', { get: () => state.ready });
  vm.createContext(ctx);
  vm.runInContext(src.replace('let ornamentPopDays', 'var _x'), ctx, { filename: 'index-centerpiece.js' });
  return { state, render: () => { ctx.renderOrnamentBanner(); return state.calls[state.calls.length - 1]; } };
}
{
  const h = hub();
  let o = h.render();
  assert.deepStrictEqual([o.centerpiece, o.popCenter], [false, false], 'before identity: nothing');
  h.state.ready = true; h.state.triple = true;
  o = h.render();
  assert.deepStrictEqual([o.centerpiece, o.popCenter], [true, false], 'already earned when the hub opens: shown quietly');
}
{
  const h = hub();
  h.state.ready = true;
  assert.deepStrictEqual(plain(h.render()), plain({ pop: h.render().pop, centerpiece: false, popCenter: false }));
  // Third Blitz finishes while its game still covers the hub (booha:gameEnd).
  h.state.triple = true; h.state.blitzOpen = true;
  let o = h.render();
  assert.deepStrictEqual([o.centerpiece, o.popCenter], [true, false], 'no animation under the Blitz game');
  // Blitz closes (the close hook re-renders): it hangs itself, once.
  h.state.blitzOpen = false;
  o = h.render();
  assert.deepStrictEqual([o.centerpiece, o.popCenter], [true, true], 'hangs itself when the hub is seen');
  o = h.render();
  assert.strictEqual(o.popCenter, false, 'only once');
  // Weekly reset, then earned again while the tab is hidden: waits for the hub.
  h.state.triple = false; h.render();
  h.state.triple = true; h.state.hidden = true;
  assert.strictEqual(h.render().popCenter, false, 'hidden tab: waits');
  h.state.hidden = false;
  assert.strictEqual(h.render().popCenter, true, 'then hangs when visible');
}
assert.match(index, /const relight = \(\) => \{ renderPills\(\); updateMazeFriendCue\(\); renderOrnamentBanner\(\); \};/, 'Blitz close re-renders the banner');
assert.match(index, /addEventListener\('booha:gameEnd', e => \{\s*if \(String\(e\.detail\?\.saveId \|\| ''\)\.startsWith\('blitz:'\)\) setTimeout\(renderOrnamentBanner, 0\);/, 'a finished Blitz updates the banner');

// ── CSS ──────────────────────────────────────────────────────────────────
const css = index.slice(index.indexOf('.ornamentBanner {'), index.indexOf('/* Grubb greets students'));
assert.match(css, /\.ornamentBanner \.obOrn\.obCenter \{ --ob-art: 1\.32; z-index: 2; \}/, 'bigger, sized to clear the title');
assert.match(css, /top: calc\(var\(--ob-oh\) \* var\(--ob-loop\) - var\(--ob-oh\) \* \.6 \* var\(--ob-bow-knot, \.467\)\);/, 'bow knot sits on the wire');
const rays = css.slice(css.indexOf('.ornamentBanner .obRays {'), css.indexOf('}', css.indexOf('.ornamentBanner .obRays {')));
assert.match(rays, /background: radial-gradient\([^;]*\);\s*background:\s*radial-gradient/, 'plain glow first for browsers without conic gradients');
assert.match(rays, /animation: obRaysTurn 30s linear infinite;/);
const turn = css.slice(css.indexOf('@keyframes obRaysTurn'), css.indexOf('}', css.indexOf('@keyframes obRaysTurn')));
assert.match(turn, /transform: rotate\(360deg\)/);
assert.doesNotMatch(css, /(^|[\s;{])filter\s*:/, 'no CSS filters');
[
  'html.hub-reduced-motion .ornamentBanner .obRays',
  'html.hub-low-power .ornamentBanner .obRays',
  'html[data-motion="reduced"] .ornamentBanner .obRays',
  'html[data-power="reduced"] .ornamentBanner .obRays',
  'html[data-power="minimal"] .ornamentBanner .obRays',
].forEach(sel => assert.ok(css.includes(sel), `${sel} stops the rays`));
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.ornamentBanner \.obRays \{ animation: none; \}/);

console.log('hub blitz centerpiece: ok');
