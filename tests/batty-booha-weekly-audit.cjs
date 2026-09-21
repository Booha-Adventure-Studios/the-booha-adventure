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
  window: { BoohaAdventure },
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
assert.strictEqual(mummington.enabled, false);
assert.strictEqual(mummington.placeholder, true);
assert.strictEqual(mummington.name, 'Mummington Booha');
assert.strictEqual(mummington.nameJp, 'マミングトン ブーハー');
assert.strictEqual(mummington.unlockId, 'booha_skin_mummington');
assert.deepStrictEqual(Object.keys(mummington.assets), []);
assert.strictEqual(skins.isAvailable('mummington'), false,
  'Mummington must stay out of rotation until its pose set exists');
assert.strictEqual(skins.availableCharacters().map(skin => skin.id).join(','), 'batty');
assert.strictEqual(skins.nextAvailableId('batty'), 'batty');
assert.strictEqual(skins.unlockAndEquip('mummington'), false,
  'placeholder characters must not be unlockable');

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
assert.strictEqual(skins.isUnlocked('batty'), false);
assert.strictEqual(skins.selectedId(), null);
assert.strictEqual(skins.unlockAndEquip('batty'), true);
assert.strictEqual(skins.isUnlocked('batty'), true);

console.log('Batty Booha weekly audit passed: the skin unlock is scoped to the weekly bucket and can be earned again.');
