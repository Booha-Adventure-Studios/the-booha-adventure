#!/usr/bin/env node
'use strict';

// Oddity fixes, part 2 (Nov 2026):
//  3. The cabinet shows only owned finds: no ??? slots, no "n/12" total, and
//     the special shelf stays hidden until the first special find.
//  4. Duplicates: once a pool is used up, a draw is a second copy of an owned
//     item, picked up in Karasuki and shown as ×2. No counter.
//  5. The clue: a dark popup that has to be closed, and directions instead of
//     room numbers (players never see room numbers).
//  7. Each student draws in their own order (per-student seed in the save),
//     and an item waiting in Karasuki is never drawn a second time.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function harness(seed) {
  let week = { weekStart: '2026-11-08', occurrenceKey: '2026-11-08|november-w2' };
  const listeners = {};
  const data = { collectibles: {}, meta: { checkIn: {}, blitz: {} } };
  if (seed) data.meta.findsSeed = seed;
  const adventure = { save: { load: () => data, save: () => true }, registerSystem() {}, stats: null, unlocks: null };
  const ctx = {
    console, BoohaAdventure: adventure,
    CALENDAR: { getCurrentCurriculumWeek: () => week, getCurriculumWeekOccurrenceKey: c => c.occurrenceKey },
    document: {
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      dispatchEvent: ev => { (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/core/collectibles-data.js'), ctx);
  vm.runInContext(read('js/core/collectible-system.js'), ctx);
  const api = ctx.window.BoohaCollectibleSystem;
  return {
    api, data, items: ctx.window.BoohaCollectiblesData,
    setWeek(start, key) { week = { weekStart: start, occurrenceKey: key }; },
    earnStandard() {
      const start = Date.parse(`${week.weekStart}T00:00:00Z`);
      for (let d = 0; d < 3; d++) data.meta.checkIn[new Date(start + d * 86400000).toISOString().slice(0, 10)] = { st: 'done' };
      data.meta.blitz = { weeklyKey: week.occurrenceKey, weekly: { vocab: { pb: 1 }, sentences: { pb: 1 }, questions: { pb: 1 } } };
      return api.evaluateWeekly();
    },
  };
}

// ── 7. Per-student draws ────────────────────────────────────────────────
const firstItems = new Set();
for (let i = 0; i < 12; i++) {
  const h = harness(`student-${i}`);
  firstItems.add(h.earnStandard()[0].item.id);
}
assert.ok(firstItems.size > 1, 'different students draw different first items');
{
  const a = harness('same-seed').earnStandard()[0].item.id;
  const b = harness('same-seed').earnStandard()[0].item.id;
  assert.strictEqual(a, b, 'the same student (same seed) always gets the same draw');
  const h = harness();
  h.earnStandard();
  assert.ok(typeof h.data.meta.findsSeed === 'string' && h.data.meta.findsSeed.length > 4,
    'a per-student seed is created in the save on the first draw');
}
assert.ok(!/booha_userid|localStorage/.test(read('js/core/collectible-system.js')),
  'the per-student seed lives in the save, not in device storage or the student id');

// An item still waiting in Karasuki is never drawn again.
{
  const h = harness('waiting-test');
  const standardCount = h.items.filter(i => i.pool === 'standard').length;
  const drawn = [];
  for (let w = 0; w < standardCount; w++) {
    const start = new Date(Date.parse('2026-11-08T00:00:00Z') + w * 7 * 86400000).toISOString().slice(0, 10);
    h.setWeek(start, `${start}|w${w}`);
    drawn.push(h.earnStandard()[0].item.id);   // never picked up
  }
  assert.strictEqual(new Set(drawn).size, standardCount, 'unpicked finds are never drawn twice');
  assert.strictEqual(h.api.pendingFinds().length, standardCount, 'every unpicked find stays waiting in Karasuki');
}

// ── 4. Duplicates as a second copy (×2) ─────────────────────────────────
{
  const h = harness('dup-test');
  h.items.filter(i => i.pool === 'standard').forEach(i => { h.data.collectibles[i.id] = { found: true, foundAt: 1 }; });
  const [award] = h.earnStandard();
  assert.ok(award.item && award.record.duplicate === true, 'a used-up pool draws a copy of an owned item');
  const pending = h.api.pendingFinds();
  assert.strictEqual(pending.length, 1, 'the copy waits in Karasuki like any other find');
  assert.strictEqual(pending[0].item.id, award.item.id, 'the waiting copy is the drawn item');
  const result = h.api.collect(award.item.id);
  assert.strictEqual(result.duplicate, true, 'picking up the copy is reported as a duplicate');
  assert.strictEqual(h.data.collectibles[award.item.id].copies, 2, 'the owned item now has 2 copies');
  assert.strictEqual(h.api.pendingFinds().length, 0, 'the picked-up copy leaves Karasuki');
  const shown = h.api.getAll().find(i => i.id === award.item.id);
  assert.strictEqual(shown.copies, 2, 'the cabinet receives the copy count');
  assert.strictEqual(h.api.collect(award.item.id).duplicate, undefined, 'tapping again without a waiting copy adds nothing');
  assert.strictEqual(h.data.collectibles[award.item.id].copies, 2, 'copies only grow from real draws');
}
assert.ok(!/findsDuplicateCount/.test(read('js/core/save-file.js')), 'the old conversion counter is gone from the save schema');

// ── 3. Cabinet: owned only, no total, special hidden until earned ──────
function renderCabinet(all) {
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
  const ctx = {
    console, localStorage: { getItem: () => null },
    document: { getElementById: id => (id === 'adv-collectibles' ? host : null), addEventListener() {} },
    BoohaCollectibleSystem: { getAll: () => all },
    BoohaAdventure: { save: { load: () => ({}) } },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/ui/adventure-game.js'), ctx);
  ctx.window.BoohaAdventureGame.render();
  return host.innerHTML;
}
const catalogue = harness('cab').items;
const std = catalogue.filter(i => i.pool === 'standard');
const spc = catalogue.filter(i => i.pool === 'special');
const asAll = (ownedIds, copies = {}) => catalogue.map(i => ({ ...i, found: ownedIds.includes(i.id), copies: ownedIds.includes(i.id) ? (copies[i.id] || 1) : 0 }));

let html = renderCabinet(asAll([]));
assert.ok(!html.includes('???') && !html.includes('collectible-card'), 'an empty cabinet shows no placeholder slots');
assert.ok(html.includes('まだ なにも ないよ'), 'the empty cabinet has a bilingual message');

html = renderCabinet(asAll([std[0].id, std[1].id], { [std[1].id]: 2 }));
assert.strictEqual((html.match(/collectible-card/g) || []).length, 2, 'only owned finds are shown');
assert.ok(!html.includes('???'), 'no ??? slots');
assert.ok(!new RegExp(`/${catalogue.length}<`).test(html) && !/\d+\/\d+/.test(html), 'no "n of total" count');
assert.ok(html.includes('2 found'), 'the count is just how many were found');
assert.ok(html.includes('×2'), 'a duplicate shows as ×2');
assert.ok(!html.includes('SPECIAL'), 'the special shelf is hidden until the first special find');
assert.ok(!html.includes('missed week'), 'no developer note in the cabinet');

html = renderCabinet(asAll([std[0].id, spc[0].id]));
assert.ok(html.includes('collectible-shelf-title') && html.includes('SPECIAL'), 'the special shelf appears with the first special find');

// ── 5. The clue ─────────────────────────────────────────────────────────
const karasuki = read('js/karasuki.js');
const clueBlock = karasuki.slice(karasuki.indexOf('const ODDITY_DIRECTION'), karasuki.indexOf('function showOddityPickup'));
assert.ok(clueBlock.length > 0, 'the clue code is present');
assert.ok(!/Room \$\{|ばんの へや|replace\('room_'/.test(clueBlock), 'the clue never shows room numbers');
assert.ok(/function oddityFirstStep\(fromRoom, toRoom\)/.test(clueBlock), 'the clue gives a direction along the doors');
assert.ok(/wpopMarkup\('oddity-pop'\)/.test(clueBlock), 'the clue popup uses the shared world-popup frame');
assert.ok(/en: 'Close', jp: 'とじる'/.test(clueBlock), 'the clue popup has to be closed');
assert.ok(/anyDialogOpen\(\)/.test(clueBlock), 'the clue popup waits for a quiet moment');
assert.ok(/oddityPopShown/.test(clueBlock), 'the clue popup shows once per visit');
assert.ok(/maybeShowOddityPopup/.test(karasuki.slice(karasuki.indexOf('initOrbs(); refreshOddityFinds();'))), 'Karasuki shows the clue popup on entry');

// Direction finder: run the real function against Karasuki's door map.
const nppSrc = karasuki.slice(karasuki.indexOf('const NPP = {'), karasuki.indexOf('};', karasuki.indexOf('const NPP = {')) + 2);
const stepSrc = clueBlock.slice(clueBlock.indexOf('function oddityFirstStep'), clueBlock.indexOf('function oddityClueText'));
const dirCtx = {};
vm.createContext(dirCtx);
vm.runInContext(`${nppSrc}\n${stepSrc}\nthis.NPP = NPP; this.step = oddityFirstStep;`, dirCtx);
assert.strictEqual(dirCtx.step('room_01', 'room_02'), 'right', 'room_01 to room_02 starts by going right');
assert.strictEqual(dirCtx.step('room_02', 'room_01'), 'left', 'room_02 to room_01 starts by going left');
assert.strictEqual(dirCtx.step('room_01', 'room_01'), null, 'no direction when already in the room');
Object.keys(dirCtx.NPP).forEach(from => Object.keys(dirCtx.NPP).forEach(to => {
  if (from !== to) assert.ok(dirCtx.step(from, to), `there is a route from ${from} to ${to}`);
}));

console.log('Oddities cabinet, duplicates and clue tests passed.');
