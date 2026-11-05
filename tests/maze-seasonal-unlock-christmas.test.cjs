#!/usr/bin/env node
'use strict';

// Pass 7: the Maze "You Unlocked … Booha!" reveal for the Christmas season.
//   · Every character in every season gets reveal copy (hand-written, or a
//     fallback built from the character's own names) — Christmas Boohas used
//     to have none, so the reveal silently never showed.
//   · Thumpkin (week of Nov 1) renders with its own art and copy.
//   · The reveal is marked seen only when the student acts on it (equip).
//     Leaving or reloading before tapping shows it again next visit.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// A popup whose sub-elements remember what was written to them.
function popupElement() {
  const classes = new Set();
  const nodes = {};
  const node = sel => (nodes[sel] = nodes[sel] || {
    textContent: '', html: '',
    querySelector(inner) { return node(sel + ' ' + inner); },
    appendChild() {},
    set innerHTML(v) { this.html = v; },
    get innerHTML() { return this.html; },
  });
  return {
    nodes, dataset: {}, attrs: {},
    classList: {
      add(...n) { n.forEach(x => classes.add(x)); },
      remove(...n) { n.forEach(x => classes.delete(x)); },
      contains(x) { return classes.has(x); },
    },
    querySelector: node,
    setAttribute(k, v) { this.attrs[k] = v; },
  };
}

function makeHarness(stored, { today, occurrenceKey }) {
  const popup = popupElement();
  const scrim = popupElement();
  const art = {};
  const equipButton = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const adventure = {
    save: {
      load() { return JSON.parse(JSON.stringify(stored)); },
      save(next) { Object.keys(stored).forEach(k => delete stored[k]); Object.assign(stored, JSON.parse(JSON.stringify(next))); return true; },
      patch(section, patch) { stored[section] = Object.assign(stored[section] || {}, patch); return true; },
    },
  };
  const calendar = {
    getTodayKey: () => today,
    getCurrentCurriculumWeek: () => ({ occurrenceKey, weekStart: occurrenceKey.slice(0, 10) }),
    getCurriculumWeekOccurrenceKey: w => w.occurrenceKey,
  };
  const context = {
    console, Date, Math, JSON,
    window: {
      BoohaAdventure: adventure, CALENDAR: calendar,
      setTimeout(cb) { cb(); }, requestAnimationFrame(cb) { cb(); },
    },
    localStorage: { getItem() { return 'pb'; } },
    document: { dispatchEvent() {}, documentElement: { dataset: {}, style: { setProperty() {} } } },
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  };
  Object.assign(context.window, { localStorage: context.localStorage, document: context.document, CustomEvent: context.CustomEvent });
  context.BoohaAdventure = adventure;
  context.CALENDAR = calendar;
  vm.createContext(context);
  vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });
  context.BoohaSkins = context.window.BoohaSkins;
  vm.runInContext(read('js/maze-seasonal-unlock.js'), context, { filename: 'js/maze-seasonal-unlock.js' });
  let applied = 0;
  const controller = context.window.MazeSeasonalUnlock.create({
    calendar,
    getCurrentWeek: () => calendar.getCurrentCurriculumWeek(),
    storage: context.localStorage,
    skins: context.BoohaSkins,
    getSave: () => adventure.save.load(),
    applyEquippedMazeSkin() { applied++; },
    ui: { popup, scrim, art, equipButton },
    requestAnimationFrame(cb) { cb(); },
    setTimeout(cb) { cb(); },
  });
  return { context, controller, popup, scrim, art, equipButton, stored, skins: context.BoohaSkins, Unlock: context.window.MazeSeasonalUnlock, applied: () => applied };
}

const NOV = { today: '2026-11-05', occurrenceKey: '2026-11-01|november-w1' };
const trio = { vocab: { pb: { ms: 1 } }, sentences: { pb: { ms: 1 } }, questions: { pb: { ms: 1 } } };
const saveWithTrio = () => ({
  meta: { blitz: { weeklyKey: NOV.occurrenceKey, weekly: JSON.parse(JSON.stringify(trio)) } },
  weekly: { unlockedBoohaSkins: {} },
});

// ── Every character in every season has reveal copy ─────────────────────
{
  const h = makeHarness(saveWithTrio(), NOV);
  const { skins, Unlock } = h;
  const seasonIds = Object.keys(skins.SEASONS);
  assert.ok(seasonIds.includes('christmas-2026') && seasonIds.includes('halloween-2026'));
  seasonIds.forEach(seasonId => {
    const season = skins.getSeason(seasonId);
    (season.characterIds || []).forEach(id => {
      const copy = Unlock.copyFor(id, skins.get(id));
      assert.ok(copy, `${seasonId}/${id} has reveal copy`);
      ['kickerEn', 'kickerJp', 'titleEn', 'titleJp', 'copyEn', 'copyJp', 'buttonEn', 'buttonJp'].forEach(k =>
        assert.ok(String(copy[k] || '').trim(), `${seasonId}/${id} ${k} is filled`));
    });
  });

  // All eight Christmas Boohas have hand-written copy.
  const xmas = Array.from(skins.getSeason('christmas-2026').characterIds);
  assert.deepStrictEqual(xmas, ['thumpkin', 'crumbly', 'gnasher', 'waddlesworth', 'snaggle', 'tinkerplunk', 'oats', 'quillock']);
  xmas.forEach(id => {
    const c = Unlock.COPY[id];
    const skin = skins.get(id);
    assert.ok(c, `${id} has hand-written copy`);
    assert.strictEqual(c.titleEn, `You Unlocked ${skin.name}!`, `${id} title matches its name`);
    assert.strictEqual(c.titleJp, `${skin.nameJp}を <ruby>解放<rt>かいほう</rt></ruby>したよ！`, `${id} Japanese title matches its name`);
    assert.strictEqual(c.buttonEn, `EQUIP ${skin.name.toUpperCase()}`);
    assert.match(c.copyEn, /Tap to /, `${id} copy tells the student what to do`);
    assert.match(c.copyJp, /タップして/);
    // Ruby markup is balanced.
    ['kickerJp', 'titleJp', 'copyJp', 'buttonJp'].forEach(k => {
      const v = c[k];
      assert.strictEqual((v.match(/<ruby>/g) || []).length, (v.match(/<\/ruby>/g) || []).length, `${id} ${k} ruby balanced`);
      assert.strictEqual((v.match(/<rt>/g) || []).length, (v.match(/<\/rt>/g) || []).length);
    });
  });

  // Fallback for a character without copy, with the Japanese name escaped.
  const fb = Unlock.copyFor('future_friend', { name: 'Future <Friend> Booha', nameJp: 'フューチャー<b>・ブーハー' });
  assert.strictEqual(fb.titleEn, 'You Unlocked Future <Friend> Booha!', 'English fallback (written with textContent)');
  assert.match(fb.titleJp, /^フューチャー&lt;b&gt;・ブーハーを /, 'Japanese name is escaped for innerHTML');
  assert.strictEqual(Unlock.copyFor('nobody', null), null, 'no name, no copy');
}

// ── Thumpkin week: the reveal renders with Thumpkin's art and copy ──────
const h = makeHarness(saveWithTrio(), NOV);
assert.strictEqual(h.skins.rotationCharacterId(), 'thumpkin', 'Nov 5 resolves to Thumpkin');
h.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(h.popup.classList.contains('show'), true, 'the Christmas reveal shows');
assert.strictEqual(h.scrim.classList.contains('show'), true);
assert.strictEqual(h.popup.dataset.skinId, 'thumpkin');
assert.strictEqual(h.art.src, 'assets/skins/thumpkin_booha/static.webp');
assert.strictEqual(h.art.alt, 'Thumpkin Booha');
assert.strictEqual(h.equipButton.attrs['aria-label'], 'Equip Thumpkin Booha');
assert.strictEqual(h.popup.nodes['#battyUnlockTitle'].textContent, 'You Unlocked Thumpkin Booha!');
assert.strictEqual(h.popup.nodes['.batty-kicker'].textContent, 'A FLUFFY FRIEND HOPPED IN!');
assert.match(h.popup.nodes['#battyUnlockCopy'].textContent, /warm scarf/);
assert.match(h.popup.nodes['#battyUnlockCopy .batty-jp'].html, /マフラー/);
assert.ok(h.stored.weekly.unlockedBoohaSkins.thumpkin, 'Thumpkin is unlocked');

// Shown but not acted on: NOT marked seen yet.
assert.ok(!h.stored.weekly.unlockedBoohaSkins.thumpkin.revealSeenAt, 'showing the reveal does not mark it seen');

// Interrupted (student leaves / page reloads): it shows again.
const again = makeHarness(h.stored, NOV);
again.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(again.popup.classList.contains('show'), true, 'an untouched reveal returns on the next visit');

// Equip: marks seen, equips, closes; never shows again.
again.controller.equipSeasonalFromUnlockPopup();
assert.ok(again.stored.weekly.unlockedBoohaSkins.thumpkin.revealSeenAt, 'equipping marks the reveal seen');
assert.strictEqual(again.stored.meta.selectedBoohaSkin, 'thumpkin', 'Thumpkin is equipped');
assert.strictEqual(again.popup.classList.contains('show'), false, 'the popup closes');
assert.strictEqual(again.applied(), 1, 'the Maze re-skins the player');
const later = makeHarness(again.stored, NOV);
later.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(later.popup.classList.contains('show'), false, 'a seen reveal does not repeat');

// Already unlocked by Blitz before the fix (no revealSeenAt): the reveal
// still plays on the next Maze visit.
const viaBlitz = saveWithTrio();
viaBlitz.weekly.unlockedBoohaSkins.thumpkin = { unlockedAt: 1 };
const b = makeHarness(viaBlitz, NOV);
b.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(b.popup.dataset.skinId, 'thumpkin', 'students who unlocked earlier this week still get the reveal');

// No trio, no reveal.
const none = makeHarness({ meta: { blitz: { weeklyKey: NOV.occurrenceKey, weekly: {} } }, weekly: { unlockedBoohaSkins: {} } }, NOV);
none.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(none.popup.classList.contains('show'), false);

// Later weeks resolve to their own characters and copy.
[['2026-11-10', '2026-11-08|november-w2', 'crumbly', 'FRESH FROM THE OVEN!'],
 ['2026-12-14', '2026-12-13|december-w2', 'tinkerplunk', 'HO HO HO! A VERY SPECIAL GUEST!']].forEach(([today, occurrenceKey, id, kicker]) => {
  const s = saveWithTrio(); s.meta.blitz.weeklyKey = occurrenceKey;
  const w = makeHarness(s, { today, occurrenceKey });
  assert.strictEqual(w.skins.rotationCharacterId(), id, `${today} → ${id}`);
  w.controller.maybeShowSeasonalUnlockPopup();
  assert.strictEqual(w.popup.dataset.skinId, id);
  assert.strictEqual(w.popup.nodes['.batty-kicker'].textContent, kicker);
});

console.log('maze seasonal unlock (Christmas): ok');
