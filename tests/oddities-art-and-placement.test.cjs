#!/usr/bin/env node
'use strict';

// Oddity art and placement (Nov 2026):
//  - Art: 300 px class (max 320 px longest side), lossy WebP, under 48 KiB,
//    zero metadata (only VP8X/ALPH/VP8 chunks), no orphan files, 0.6 MiB dir.
//  - Size: each oddity has its own drawn size; nothing smaller than 48 (the
//    Booha ghost is 52), the big pieces clearly bigger.
//  - Placement: a find always sits fully inside the part of the room every
//    landscape screen shows (the stage is scaled to cover), clear of the
//    top-left HUD. A saved spot that would be cut off is moved once.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const dataCtx = { window: {} };
vm.runInNewContext(read('js/core/collectibles-data.js'), dataCtx);
const items = dataCtx.window.BoohaCollectiblesData;

// ── Art ──────────────────────────────────────────────────────────────────
function webpInfo(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('latin1', 0, 4), 'RIFF', `${file} is RIFF`);
  assert.strictEqual(b.toString('latin1', 8, 12), 'WEBP', `${file} is WebP`);
  const chunks = [];
  let width = 0, height = 0;
  for (let i = 12; i + 8 <= b.length;) {
    const type = b.toString('latin1', i, i + 4);
    const size = b.readUInt32LE(i + 4);
    chunks.push(type);
    if (type === 'VP8X') { width = 1 + b.readUIntLE(i + 12, 3); height = 1 + b.readUIntLE(i + 15, 3); }
    i += 8 + size + (size & 1);
  }
  return { chunks, width, height, bytes: b.length };
}
const DIR = 'assets/img/collectibles';
const referenced = new Set();
for (const item of items) {
  const file = path.join(ROOT, item.asset);
  assert.ok(item.asset.startsWith(`${DIR}/`), `${item.id} art lives in ${DIR}`);
  assert.ok(fs.existsSync(file), `${item.id} art exists`);
  referenced.add(path.basename(item.asset));
  const info = webpInfo(file);
  assert.ok(info.bytes <= 48 * 1024, `${item.id} art is under 48 KiB (${info.bytes})`);
  assert.ok(Math.max(info.width, info.height) <= 320, `${item.id} art is at most 320 px (${info.width}x${info.height})`);
  assert.ok(Math.max(info.width, info.height) >= 200, `${item.id} art is big enough to stay sharp (${info.width}x${info.height})`);
  assert.ok(info.chunks.includes('VP8 ') && !info.chunks.includes('VP8L'), `${item.id} art is lossy`);
  info.chunks.forEach(c => assert.ok(['VP8X', 'ALPH', 'VP8 '].includes(c), `${item.id} art carries no metadata (found ${c})`));
}
const files = fs.readdirSync(path.join(ROOT, DIR)).filter(f => !f.startsWith('.'));
files.forEach(f => assert.ok(referenced.has(f), `${DIR}/${f} is used by an oddity (no orphan art)`));
const dirBytes = files.reduce((n, f) => n + fs.statSync(path.join(ROOT, DIR, f)).size, 0);
assert.ok(dirBytes <= 0.6 * 1024 * 1024, `${DIR} stays within 0.6 MiB (${dirBytes})`);
assert.match(read('PERFORMANCE-BUDGETS.md'), /assets\/img\/collectibles\//, 'the art budget is documented');

// ── Sizes ────────────────────────────────────────────────────────────────
const AGREED = {
  'brass-horn-medicine-spoons': 48, 'nesting-brass-cup-weights': 48, 'victorian-ceramic-ointment-pots': 50,
  'lithographed-tin-remedy-boxes': 52, 'handwritten-pharmacy-prescription-ledger': 60,
  'wooden-pill-roller-dividing-board': 62, 'cobalt-ribbed-poison-bottles': 64, 'bronze-mortar-double-pestles': 66,
  'label-under-glass-apothecary-jar': 70, 'apothecary-balance-scale': 72,
  'cast-iron-crocodile-cork-press': 96, 'apothecary-herb-drawer-cabinet': 112,
};
for (const item of items) {
  assert.ok(Number.isFinite(item.size) && item.size >= 48 && item.size <= 140, `${item.id} has a drawn size of 48 to 140`);
  assert.ok(!('scale' in item), `${item.id} uses its own size, not the old three buckets`);
  if (AGREED[item.id] != null) assert.strictEqual(item.size, AGREED[item.id], `${item.id} uses the agreed size`);
}

// ── Placement (runs the real placement code) ─────────────────────────────
const k = read('js/karasuki.js');
const block = k.slice(k.indexOf('/* oddity-placement:start'), k.indexOf('/* oddity-placement:end */'));
const rngSrc = k.slice(k.indexOf('function seededRng(seed)'), k.indexOf('}', k.indexOf('return ((s >>> 0)')) + 1) + '\n  }';
const nppSrc = k.slice(k.indexOf('const NPP = {'), k.indexOf('};', k.indexOf('const NPP = {')) + 2);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${rngSrc}\n${nppSrc}\n${block}\nthis.pick = pickOddityPlacement; this.fits = oddityFits; this.SAFE = ODDITY_SAFE; this.HUD = ODDITY_HUD; this.NPP = NPP;`, ctx);
const WORLD_W = 1536, WORLD_H = 1024;
// Landscape screens the app supports: 4:3 iPad, iPad Air, 16:10, 16:9, wide phones.
const ASPECTS = [4 / 3, 1180 / 820, 1.6, 16 / 9, 844 / 390, 932 / 430];
function visibleRect(aspect) {
  const sw = 1000 * aspect, sh = 1000;
  const scale = Math.max(sw / WORLD_W, sh / WORLD_H);   // the stage covers the screen
  const vw = sw / scale, vh = sh / scale;
  return { left: (WORLD_W - vw) / 2, right: (WORLD_W + vw) / 2, top: (WORLD_H - vh) / 2, bottom: (WORLD_H + vh) / 2 };
}
const rooms = Object.keys(ctx.NPP);
let checked = 0;
for (const item of items) {
  for (let seed = 1; seed <= 60; seed++) {
    // A room obstacle check that rejects about a third of spots.
    const isClear = (x, y) => ((x * 7 + y * 13 + seed) % 3) !== 0;
    const spot = ctx.pick(rooms, item.size, seed * 2654435761 >>> 0, seed % 3, [], isClear);
    assert.ok(spot, `${item.id} always gets a spot (seed ${seed})`);
    const half = item.size / 2 + 8;
    for (const aspect of ASPECTS) {
      const v = visibleRect(aspect);
      assert.ok(spot.x - half >= v.left && spot.x + half <= v.right && spot.y - half >= v.top && spot.y + half <= v.bottom,
        `${item.id} at ${spot.x},${spot.y} is fully on screen at aspect ${aspect.toFixed(2)}`);
    }
    assert.ok(!(spot.x - half < ctx.HUD.right && spot.y - half < ctx.HUD.bottom), `${item.id} stays clear of the top-left HUD`);
    checked++;
  }
}
assert.ok(checked === items.length * 60);
// Spots near an edge are rejected for big pieces but fine for small ones.
assert.strictEqual(ctx.fits(1380, 600, 112), false, 'a cabinet hard against the right edge would be cut off');
assert.strictEqual(ctx.fits(700, 600, 112), true, 'a cabinet in the middle area fits');

// Saved spots that would be cut off move once; good saved spots never move.
assert.match(k, /const savedFits = saved && DATA\.rooms\[saved\.room\] && oddityFits\(saved\.x, saved\.y, odditySize\(find\.item\)\)/,
  'a saved spot is kept only if it fits');
assert.match(k, /recordPlacement\(find\.item\.id, placement, \{ replace: !!saved \}\)/, 'a cut-off saved spot is replaced');

// recordPlacement: replace only when asked, never for a found item.
{
  const data = { collectibles: {}, meta: { findsLog: { '2026-11-08|w2': { standard: { itemId: items[0].id, earnedAt: 1, foundAt: null, room: 'room_01', x: 1400, y: 900 }, special: null } } } };
  const sctx = {
    console,
    BoohaAdventure: { save: { load: () => data, save: () => true }, registerSystem() {} },
    document: { addEventListener() {}, dispatchEvent() { return true; } },
    CustomEvent: function () {},
  };
  sctx.window = sctx;
  vm.createContext(sctx);
  vm.runInContext(read('js/core/collectibles-data.js'), sctx);
  vm.runInContext(read('js/core/collectible-system.js'), sctx);
  const api = sctx.window.BoohaCollectibleSystem;
  assert.strictEqual(api.recordPlacement(items[0].id, { room: 'room_02', x: 700, y: 500 }), false, 'a saved spot is not replaced by default');
  assert.strictEqual(api.recordPlacement(items[0].id, { room: 'room_02', x: 700, y: 500 }, { replace: true }), true, 'a cut-off spot can be replaced');
  assert.strictEqual(data.meta.findsLog['2026-11-08|w2'].standard.room, 'room_02', 'the new spot is saved');
  data.meta.findsLog['2026-11-08|w2'].standard.foundAt = 5;
  assert.strictEqual(api.recordPlacement(items[0].id, { room: 'room_03', x: 700, y: 500 }, { replace: true }), false, 'a found item never moves');
}

console.log('Oddities art and placement tests passed.');
