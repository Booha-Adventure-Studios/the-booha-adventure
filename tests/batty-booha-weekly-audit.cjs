#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/core/booha-skins.js'), 'utf8');

let stored = {
  unlocks: {},
  meta: { selectedBoohaSkin: null },
  weekly: { unlockedBoohaSkins: {} },
};
const currentWeek = { occurrenceKey: '2026-09-20|september-w3' };
const events = [];
const save = {
  load() { return stored; },
  save(next) { stored = next; return true; },
  patch(section, patchObj) {
    stored[section] = Object.assign(stored[section] || {}, patchObj);
    return true;
  },
};
const document = {
  dispatchEvent(event) { events.push(event.type); },
};
class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}
const BoohaAdventure = { save };
const context = {
  window: {
    BoohaAdventure,
    CALENDAR: {
      getCurrentCurriculumWeek() { return currentWeek; },
      getCurriculumWeekOccurrenceKey(week) { return week.occurrenceKey; },
    },
  },
  BoohaAdventure,
  document,
  CustomEvent,
  Date,
};
context.window.window = context.window;

vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/core/booha-skins.js' });
const skins = context.window.BoohaSkins;

assert.strictEqual(skins.CURRENT_SEASON_ID, 'halloween');
const mummington = skins.get('mummington');
assert.strictEqual(mummington.id, 'mummington');
assert.strictEqual(mummington.seasonId, 'halloween');
assert.strictEqual(mummington.enabled, true);
assert.strictEqual(mummington.name, 'Mummington Booha');
assert.strictEqual(mummington.nameJp, 'マミングトン ブーハー');
assert.strictEqual(mummington.unlockId, 'booha_skin_mummington');
assert.strictEqual(skins.isAvailable('mummington'), true);
assert.strictEqual(skins.availableCharacters().map(skin => skin.id).join(','), 'batty,mummington,mortisa,doomlet,hazel,mister_happy');
assert.strictEqual(skins.nextAvailableId('batty'), 'mummington');
assert.strictEqual(skins.nextAvailableId('mister_happy'), 'batty');
assert.strictEqual(skins.rotationCharacterId(), 'batty');
assert.strictEqual(skins.landingSeasonIdForDate('2026-09-20'), null);
assert.strictEqual(skins.landingSeasonIdForDate('2026-09-27'), 'halloween');
assert.strictEqual(skins.landingSeasonIdForDate('2026-11-01'), null);
assert.strictEqual(skins.menuCharacterId('halloween', '2026-09-20'), null);
assert.strictEqual(skins.menuCharacterId('halloween', '2026-09-27'), 'batty');
assert.strictEqual(skins.menuCharacterId('halloween', '2026-10-31'), 'batty');
assert.strictEqual(skins.menuCharacterId('halloween', '2026-11-01'), null);
assert.strictEqual(skins.rotationCharacterId('halloween', '2026-11-01|november-w1'), null);

// A stale bucket entry must not keep Batty active before this week's Blitz
// trio is complete.
stored.weekly.unlockedBoohaSkins.batty = { unlockedAt: Date.now() };
assert.strictEqual(skins.isUnlocked('batty'), false);
assert.strictEqual(skins.selectedId(), null);
assert.strictEqual(skins.unlockAndEquip('batty'), false);

stored.meta.blitz = {
  weeklyKey: currentWeek.occurrenceKey,
  weekly: {
    vocab: { pb: { ms: 1000 } },
    sentences: { pb: { ms: 1000 } },
    questions: { pb: { ms: 1000 } },
  },
};
stored.weekly.unlockedBoohaSkins = {};

assert.strictEqual(skins.isUnlocked('batty'), false);
assert.strictEqual(skins.unlockAndEquip('batty'), true);
assert.ok(stored.weekly.unlockedBoohaSkins.batty);
assert.strictEqual(stored.meta.selectedBoohaSkin, 'batty');
assert.strictEqual(stored.unlocks.booha_skin_batty, undefined,
  'Batty must not be written to permanent unlocks');
assert.strictEqual(skins.isUnlocked('batty'), true);
assert.strictEqual(skins.selectedId(), 'batty');
assert.ok(events.includes('booha:skinChanged'));

// The weekly rollover clears this bucket and the selected skin, after which
// the next qualifying Blitz completion can call unlockAndEquip again.
stored.weekly.unlockedBoohaSkins = {};
stored.meta.selectedBoohaSkin = null;
stored.meta.blitz.weekly = {};
assert.strictEqual(skins.isUnlocked('batty'), false);
assert.strictEqual(skins.selectedId(), null);
assert.strictEqual(skins.unlockAndEquip('batty'), false);

// The next calendar week schedules Mummington. Batty cannot be unlocked
// there even when the current week's Blitz trio is complete.
currentWeek.occurrenceKey = '2026-09-27|september-w4';
stored.meta.blitz.weeklyKey = currentWeek.occurrenceKey;
stored.meta.blitz.weekly = {
  vocab: { pb: { ms: 1000 } },
  sentences: { pb: { ms: 1000 } },
  questions: { pb: { ms: 1000 } },
};
stored.weekly.unlockedBoohaSkins = {};
stored.meta.selectedBoohaSkin = null;
assert.strictEqual(skins.rotationCharacterId(), 'mummington');
assert.strictEqual(skins.isUnlocked('batty'), false);
assert.strictEqual(skins.unlockAndEquip('batty'), false);
assert.strictEqual(skins.rotationCharacterId(), 'mummington');
assert.strictEqual(skins.unlockAndEquip('mummington'), true);
assert.strictEqual(skins.selectedId(), 'mummington');

// Every October occurrence has its own scheduled Halloween character.
[
  ['2026-10-04|october-w1', 'mortisa'],
  ['2026-10-11|october-w2', 'doomlet'],
  ['2026-10-18|october-w3', 'hazel'],
  ['2026-10-25|october-w4', 'mister_happy'],
].forEach(([occurrenceKey, id]) => {
  currentWeek.occurrenceKey = occurrenceKey;
  stored.meta.blitz.weeklyKey = occurrenceKey;
  stored.meta.blitz.weekly = {};
  stored.weekly.unlockedBoohaSkins = {};
  stored.meta.selectedBoohaSkin = null;
  assert.strictEqual(skins.rotationCharacterId(), id);
  assert.strictEqual(skins.unlockAndEquip(id), false);
});

console.log('Halloween skin schedule audit passed: six weekly characters, a gated unlock path, and a Batty landing-menu schedule are wired correctly.');
