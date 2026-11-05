#!/usr/bin/env node
'use strict';

// Hub Pass 3: the weekly ornament banner above the hub title.
//   · Art by Tokyo month (Nov round, Dec bulb, Jan shimenawa, Feb oni).
//   · Base strand (wire + beads) always; one ornament per earned day; gold
//     for a Daily Check; no empty slots.
//   · Wire is built once per art; ornaments update in place (no rebuild),
//     so a new ornament shows without the strand flashing.
//   · Only transform/opacity animate, and motion/power settings stop it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

// Browser scripts are loaded the way the page loads them (a VM with a
// window), never with require(): a parent package.json with
// "type": "module" makes Node treat js/*.js as ES modules.
function loadBrowserScript(file, globalName) {
  const sandbox = { console, Date, Math, JSON };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read(file), sandbox, { filename: file });
  assert.ok(sandbox[globalName], `${file} must define window.${globalName}`);
  return sandbox[globalName];
}
const Banner = loadBrowserScript('js/ui/hub-ornament-banner.js', 'BoohaOrnamentBanner');

// ── Art by month ─────────────────────────────────────────────────────────
const expectArt = [
  ['2026-10-31', 'october-pumpkin'],
  ['2026-11-01', 'november-tree'],
  ['2026-11-30', 'november-tree'],
  ['2026-12-01', 'december-stocking'],
  ['2026-12-31', 'december-stocking'],
  ['2027-01-01', 'january-shimenawa'],   // New Year art even inside the Christmas season
  ['2027-02-28', 'february-oni'],
  ['2027-03-01', 'march-hinamatsuri'],
  ['2027-04-15', 'april-sakura'],
  ['2027-07-07', 'july-tanabata'],
  ['garbage', null],
];
for (let m = 1; m <= 12; m++) {
  const mm = String(m).padStart(2, '0');
  assert.ok(Banner.artForDay(`2027-${mm}-15`), `month ${mm} has ornament art`);
}
expectArt.forEach(([day, id]) => {
  const art = Banner.artForDay(day);
  assert.strictEqual(art ? art.id : null, id, `${day} art`);
});
Object.values(Banner.ART_BY_MONTH).forEach(art => {
  const file = path.join(ROOT, art.src);
  assert.ok(fs.existsSync(file), `${art.src} exists`);
  assert.ok(/\.webp$/.test(art.src), `${art.src} is WebP`);
  const buf = fs.readFileSync(file);
  assert.strictEqual(buf.toString('ascii', 0, 4), 'RIFF');
  assert.strictEqual(buf.toString('ascii', 8, 12), 'WEBP');
  assert.ok(buf.length < 25 * 1024, `${art.src} stays small (optimised)`);
  assert.ok(/-r\d+\.webp$/.test(art.src), `${art.src} carries a revision so replaced art busts the iPad cache`);
  assert.ok(art.loop >= 0 && art.loop <= 0.2, `${art.id} loop height is measured`);
  assert.ok(art.glowY >= 0.3 && art.glowY <= 0.8, `${art.id} glow centre is measured`);
  // VP8X header carries the canvas size: every ornament shares 192×288.
  if (buf.toString('ascii', 12, 16) === 'VP8X') {
    const w = 1 + buf.readUIntLE(24, 3);
    const h = 1 + buf.readUIntLE(27, 3);
    assert.deepStrictEqual([w, h], [192, 288], `${art.src} uses the shared 192×288 canvas`);
  }
});
assert.ok(Object.values(Banner.ART_BY_MONTH).every(a => !a.tints && !a.glass),
  'no glass-bulb tints remain (December is a stocking now)');

// ── Geometry ─────────────────────────────────────────────────────────────
assert.deepStrictEqual(plain(Banner.positions(0)), []);
assert.deepStrictEqual(plain(Banner.positions(1)).map(p => p.x), [50], 'one ornament hangs in the middle');
const seven = Banner.positions(7);
assert.strictEqual(seven.length, 7);
assert.strictEqual(Banner.positions(12).length, 7, 'never more than a week of ornaments');
for (let i = 1; i < seven.length; i++) {
  assert.ok(Math.abs((seven[i].x - seven[i - 1].x) - 7.5) < 0.01, 'even spacing, no gaps');
}
assert.ok(Math.abs(seven[0].x + seven[6].x - 100) < 0.01, 'gathered around the centre');
seven.forEach(p => {
  assert.ok(p.x > 0 && p.x < 100, 'inside the banner');
  assert.ok(Math.abs(p.y - Banner.wireY(p.x / 100)) < 0.01, 'each ornament hangs on the wire');
});
assert.strictEqual(Banner.beadPositions().length, 11, 'base strand beads');
assert.deepStrictEqual(['2026-11-01', '2026-11-03', '2026-11-07', 'bad'].map(Banner.weekday), [0, 2, 6, 0],
  'weekday from the Tokyo day key (Sun = 0)');

// ── Fake DOM ─────────────────────────────────────────────────────────────
class FakeNode {
  constructor(doc, tag) {
    this.ownerDocument = doc; this.tagName = tag; this.children = []; this.parent = null;
    this.style = { setProperty(k, v) { this[k] = v; } }; this.dataset = {}; this.attrs = {}; this.hidden = false; this.className = '';
    const self = this;
    this.classList = {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, on) { if (on) this._s.add(c); else this._s.delete(c); return on; },
    };
    this.offsetWidth = 10;
    void self;
  }
  get firstChild() { return this.children[0] || null; }
  appendChild(n) { n.parent = this; this.children.push(n); return n; }
  removeChild(n) { this.children = this.children.filter(c => c !== n); n.parent = null; return n; }
  remove() { if (this.parent) this.parent.removeChild(this); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
}
const doc = {
  created: 0,
  createElement(tag) { this.created++; return new FakeNode(doc, tag); },
  createElementNS(ns, tag) { this.created++; return new FakeNode(doc, tag); },
};
const el = new FakeNode(doc, 'div');
el.hidden = true;
const ornaments = () => el._ob.wrap.children;
const nov = Banner.artForDay('2026-11-05');

// Before identity: base strand only.
Banner.render(el, nov, null, {});
assert.strictEqual(el.hidden, false);
assert.strictEqual(el.dataset.art, 'november-tree');
assert.strictEqual(el.style['--ob-loop'], '0.118', 'the strand knows where November\'s loop is');
assert.strictEqual(el.style['--ob-glow-y'], '64%');
const wire = el.children[0];
assert.strictEqual(wire.attrs.class, 'obWire');
assert.strictEqual(el.children.filter(c => c.className === 'obBead').length, 11, 'beads show from the start');
assert.strictEqual(ornaments().length, 0, 'no ornaments before the save is ready');
assert.strictEqual(el.dataset.visits, '0');

// Class-day student: one plain ornament.
const sum = (...days) => ({
  visits: days.length,
  checks: days.filter(d => d[1]).length,
  days: days.map(([day, gold]) => ({ day, gold: !!gold })),
});
Banner.render(el, nov, sum(['2026-11-03']), {});
assert.strictEqual(ornaments().length, 1);
const tue = ornaments()[0];
assert.strictEqual(tue.dataset.day, '2026-11-03');
assert.strictEqual(tue.children[0].className, 'obArt', 'art sits in a tilt/tint wrapper');
assert.strictEqual(tue.children[0].children[0].src, 'assets/img/hub/ornaments/ornament-november-tree-r2.webp');
assert.strictEqual(tue.children[0].children[0].alt, '');
assert.strictEqual(tue.dataset.wd, '2', 'Tuesday hangs with Tuesday\'s tilt');
assert.strictEqual(tue.style.left, '50%');
assert.ok(!tue.classList.contains('gold'));
assert.ok(!tue.classList.contains('is-new'), 'no animation unless asked');
assert.match(el.getAttribute('aria-label'), /This week: 1 visit, 0 Daily Checks/);
assert.match(el.getAttribute('aria-label'), /今週 1回/);

// Thursday visit then Daily Check: reuse nodes, update in place, pop only the changed day.
const createdBefore = doc.created;
Banner.render(el, nov, sum(['2026-11-03'], ['2026-11-05']), { pop: new Set(['2026-11-05']) });
assert.strictEqual(el.children[0], wire, 'wire is not rebuilt for a new ornament');
assert.strictEqual(ornaments()[0], tue, 'existing ornament is reused');
assert.strictEqual(doc.created - createdBefore, 3, 'only the new ornament (span + art + img) is created');
const thu = ornaments()[1];
assert.ok(thu.classList.contains('is-new'), 'the newly earned ornament hangs itself');
assert.ok(!tue.classList.contains('is-new'));
assert.deepStrictEqual([tue.style.left, thu.style.left], ['46.25%', '53.75%'], 'two ornaments share the centre');
assert.strictEqual(thu.dataset.wd, '4', 'tilt follows the weekday, not insertion order');

Banner.render(el, nov, sum(['2026-11-03'], ['2026-11-05', true]), { pop: new Set(['2026-11-05']) });
assert.ok(thu.classList.contains('gold'), 'Daily Check turns the day gold');
assert.ok(!tue.classList.contains('gold'));
assert.strictEqual(el.dataset.checks, '1');
assert.match(el.getAttribute('aria-label'), /2 visits, 1 Daily Check /);

// Sunday reset: fresh strand, wire kept.
Banner.render(el, nov, sum(), {});
assert.strictEqual(ornaments().length, 0, 'new week starts with the base strand');
assert.strictEqual(el.children[0], wire);

// December: art changes → rebuild with bulbs in Christmas colours.
const dec = Banner.artForDay('2026-12-02');
Banner.render(el, dec, sum(['2026-11-29'], ['2026-11-30'], ['2026-12-01', true], ['2026-12-02']), {});
assert.notStrictEqual(el.children[0], wire, 'new month art rebuilds the strand');
assert.strictEqual(el.dataset.art, 'december-stocking');
assert.strictEqual(el.style['--ob-loop'], '0.028', 'per-art loop updates with the month');
assert.ok(ornaments().every(o => o.dataset.tint === undefined), 'no colour tints');
assert.ok(ornaments().every(o => o.children[0].children[0].src.endsWith('ornament-december-stocking-r2.webp')),
  'the whole week shows this month\'s art');

// No art (e.g. March): hidden and empty.
Banner.render(el, null, sum(['2027-03-02']), {});
assert.strictEqual(el.hidden, true);
assert.strictEqual(el.children.length, 0);

// ── index.html wiring and CSS ────────────────────────────────────────────
const index = read('index.html');
const v = index.indexOf('<script src="js/core/visit-days.js"></script>');
const b = index.indexOf('<script src="js/ui/hub-ornament-banner.js"></script>');
assert.ok(v > 0 && b > v, 'banner loads after the visit record');
assert.ok(/id="hubOrnamentBanner" class="ornamentBanner" role="img"[^>]*hidden/.test(index),
  'banner starts hidden and is labelled for screen readers');
['booha:visitRecorded', 'booha:checkIn', 'booha:weeklyReset', 'DOMContentLoaded'].forEach(ev => {
  assert.ok(new RegExp(`addEventListener\\('${ev}',[^\\n]*`).test(index), `banner listens for ${ev}`);
});
assert.ok(/BoohaOrnamentBanner\.render\(el, art, summary, \{ pop: onScreen \? ornamentPopDays : null \}\)/.test(index),
  'pop animations only play while the hub is on screen');
assert.ok(index.indexOf('let ornamentPopDays') < index.indexOf("if (window.BOOHA_READY) recordHubVisit();"),
  'banner state exists before the first visit can render');

const css = index.slice(index.indexOf('.ornamentBanner {'), index.indexOf('/* Grubb greets students'));
assert.ok(css.length > 200, 'banner CSS block found');
function keyframeBlocks(src) {
  const out = [];
  const re = /@keyframes ob\w+\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = re.lastIndex;
    while (i < src.length && depth) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
    out.push(src.slice(m.index, i));
  }
  return out;
}
const keyframes = keyframeBlocks(css);
assert.strictEqual(keyframes.length, 3, 'banner keyframes found');
keyframes.forEach(k => {
  const props = (k.match(/([a-z-]+)\s*:/g) || []).map(p => p.replace(/\s*:$/, ''));
  props.forEach(p => assert.ok(p === 'opacity' || p === 'transform', `banner animations only use transform/opacity (found ${p})`));
});
[
  'html.hub-reduced-motion .ornamentBanner .obOrn',
  'html.hub-low-power .ornamentBanner .obOrn',
  'html[data-motion="reduced"] .ornamentBanner .obOrn',
  'html[data-power="minimal"] .ornamentBanner .obOrn',
].forEach(sel => assert.ok(css.includes(sel), `${sel} stops banner motion`));
assert.ok(/@media \(prefers-reduced-motion: reduce\) \{\s*\.ornamentBanner \.obOrn,\s*\.ornamentBanner \.obOrn::before \{ animation: none; \}/.test(css),
  'prefers-reduced-motion stops banner motion');
assert.ok(!/\.hubTitle > \.stringLights/.test(index), 'the old hub strand rules are gone');
// Pass 3b: quiet strand, smaller December bulbs, masked tint, no filters.
assert.ok(!/(^|[\s;{])filter\s*:/.test(css), 'no CSS filters in the banner (cheap on older iPads)');
assert.ok(/--ob-oh: calc\(var\(--ob-h\) \* var\(--ob-art\)\)/.test(css),
  'the whole ornament box (glow and loop included) follows the size factor');
assert.ok(/margin: calc\(var\(--ob-oh\) \* var\(--ob-loop\) \* -1\)/.test(css),
  'each ornament is lifted by its own loop height so the loop meets the wire');
assert.ok(!/mask-image|data-tint|data-art="/.test(css), 'no per-art CSS rules or glass tints left (art data lives in the module)');
for (let wd = 0; wd < 7; wd++) {
  assert.ok(new RegExp(`\\.obOrn\\[data-wd="${wd}"\\] \\{ --ob-tilt: -?\\.?\\d`).test(css), `weekday ${wd} has a fixed tilt`);
}
assert.ok(!/nth-child/.test(css), 'variation is keyed to the weekday, not DOM order');

console.log('hub ornament banner: ok');
