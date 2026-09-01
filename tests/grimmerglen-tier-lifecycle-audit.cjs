#!/usr/bin/env node
'use strict';

// Pass 5 integration QA: exercise all three weekly tier buckets together,
// including saved tier selection and weekly rollover.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const saveSource = fs.readFileSync(path.join(ROOT, 'js/core/save-file.js'), 'utf8');
const saveKey = 'booha_save:v3:grimmerglen-tier-lifecycle-student';
let stored = null;

const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return 'grimmerglen-tier-lifecycle-student';
    if (name === saveKey) return stored ? JSON.stringify(stored) : null;
    return null;
  },
  setItem(name, value) {
    if (name === saveKey) stored = JSON.parse(value);
  },
  removeItem() {},
};
const document = { addEventListener() {}, dispatchEvent() {} };
class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
class Event { constructor(type) { this.type = type; } }
const context = {
  window: {},
  BoohaAdventure: {
    registerSystem(name, api) { if (name === 'saveFile') this.save = api; },
  },
  localStorage, document, CustomEvent, Event, console, Date,
};
context.window.BoohaAdventure = context.BoohaAdventure;
vm.createContext(context);
vm.runInContext(saveSource, context, { filename: 'js/core/save-file.js' });

const save = context.BoohaAdventure.save;
const plain = value => JSON.parse(JSON.stringify(value));
const data = save.load();
data.grimmerglen = {};
data.grimmerglen.memoryTier = 'case';
data.grimmerglen.objects = { banner: { found: 3 } };
data.grimmerglen.objectSlots = { 'banner-1': true, 'banner-2': true, 'banner-3': true };
const world = data.weekly.worlds.grimmerglen;
world.memoryQuestAccepted = true;
world.tierProgress.start = {
  objects: { banner: { found: 3 } },
  objectSlots: { 'banner-1': true },
  activeTargetType: 'ticket',
  carriedObjectId: 'ticket-1',
};
world.tierProgress.case = {
  objects: { ticket: { found: 2 } },
  objectSlots: { 'ticket-1': true, 'ticket-2': true },
  activeTargetType: 'pillow',
  carriedObjectId: 'pillow-1',
};
world.tierProgress.deep = {
  objects: { pillow: { found: 1 } },
  objectSlots: { 'pillow-1': true },
  activeTargetType: 'book',
  carriedObjectId: 'book-1',
};
save.save(data);

let loaded = save.load();
assert.strictEqual(loaded.grimmerglen.memoryTier, 'case');
assert.deepStrictEqual(plain(loaded.weekly.worlds.grimmerglen.tierProgress.start.objects), { banner: { found: 3 } });
assert.deepStrictEqual(plain(loaded.weekly.worlds.grimmerglen.tierProgress.case.objects), { ticket: { found: 2 } });
assert.deepStrictEqual(plain(loaded.weekly.worlds.grimmerglen.tierProgress.deep.objects), { pillow: { found: 1 } });
assert.strictEqual(loaded.weekly.worlds.grimmerglen.tierProgress.start.activeTargetType, 'ticket');
assert.strictEqual(loaded.weekly.worlds.grimmerglen.tierProgress.case.carriedObjectId, 'pillow-1');
assert.strictEqual(loaded.weekly.worlds.grimmerglen.tierProgress.deep.activeTargetType, 'book');

loaded.grimmerglen.memoryTier = 'deep';
save.save(loaded);
loaded = save.load();
assert.strictEqual(loaded.grimmerglen.memoryTier, 'deep');
assert.deepStrictEqual(plain(loaded.weekly.worlds.grimmerglen.tierProgress.case.objects), { ticket: { found: 2 } });
assert.deepStrictEqual(plain(loaded.weekly.worlds.grimmerglen.tierProgress.deep.objects), { pillow: { found: 1 } });

save.resetWeekly('2026-09-06|september-w1');
loaded = save.load();
const resetTiers = loaded.weekly.worlds.grimmerglen.tierProgress;
for (const tier of ['start', 'case', 'deep']) {
  assert.deepStrictEqual(plain(resetTiers[tier].objects), {}, `${tier} objects must reset`);
  assert.deepStrictEqual(plain(resetTiers[tier].objectSlots), {}, `${tier} slots must reset`);
  assert.strictEqual(resetTiers[tier].activeTargetType, null, `${tier} active target must reset`);
  assert.strictEqual(resetTiers[tier].carriedObjectId, null, `${tier} carried item must reset`);
}
assert.strictEqual(loaded.grimmerglen.memoryTier, 'deep', 'saved tier preference must survive weekly reset');
assert.deepStrictEqual(plain(loaded.grimmerglen.objects), { banner: { found: 3 } });
assert.deepStrictEqual(plain(loaded.grimmerglen.objectSlots), { 'banner-1': true, 'banner-2': true, 'banner-3': true });

console.log('Grimmerglen Pass 5 lifecycle audit passed: all three tier tracks remain isolated across reload and weekly rollover, while saved selection and lifetime records survive.');
