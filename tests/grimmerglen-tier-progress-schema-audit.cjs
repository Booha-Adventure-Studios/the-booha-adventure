#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const saveSource = fs.readFileSync(path.join(ROOT, 'js/core/save-file.js'), 'utf8');
const saveKey = 'booha_save:v3:grimmerglen-tier-progress-student';

let stored = {
  version: 3,
  meta: { lastWeeklyKey: '2026-08-23|august-w4' },
  weekly: {
    worlds: {
      occurrenceKey: '2026-08-23|august-w4',
      grimmerglen: {
        objects: { banner: { found: 2 }, ticket: { found: 1 } },
        objectSlots: { 'banner-1': true, 'ticket-1': true },
        activeTargetType: 'banner',
        carriedObjectId: 'banner-2',
        memoryQuestAccepted: true,
        mariettaIntroSeen: true,
        mariettaIntroSkipped: false,
      },
    },
  },
  grimmerglen: {
    objects: { banner: { found: 2 } },
    objectSlots: { 'banner-1': true },
    activeTargetType: 'banner',
    carriedObjectId: 'banner-2',
  },
};

const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return 'grimmerglen-tier-progress-student';
    if (name === saveKey) return JSON.stringify(stored);
    return null;
  },
  setItem(name, value) {
    if (name === saveKey) stored = JSON.parse(value);
  },
  removeItem() {},
};

const document = {
  addEventListener() {},
  dispatchEvent() {},
};
class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}
class Event {
  constructor(type) { this.type = type; }
}

const context = {
  window: {},
  BoohaAdventure: {
    registerSystem(name, api) {
      if (name === 'saveFile') this.save = api;
    },
  },
  localStorage,
  document,
  CustomEvent,
  Event,
  console,
  Date,
};
context.window.BoohaAdventure = context.BoohaAdventure;
vm.createContext(context);
vm.runInContext(saveSource, context, { filename: 'js/core/save-file.js' });

const save = context.BoohaAdventure.save;
const migrated = save.load();
const plain = value => JSON.parse(JSON.stringify(value));

assert.strictEqual(migrated.weekly.worlds.grimmerglen.tierProgressSchema, 1);
assert.deepStrictEqual(plain(migrated.weekly.worlds.grimmerglen.tierProgress), {
  start: {
    objects: { banner: { found: 2 }, ticket: { found: 1 } },
    objectSlots: { 'banner-1': true, 'ticket-1': true },
  },
  case: { objects: {}, objectSlots: {} },
  deep: { objects: {}, objectSlots: {} },
});
assert.deepStrictEqual(plain(migrated.grimmerglen.objects), { banner: { found: 2 } });
assert.deepStrictEqual(plain(migrated.grimmerglen.objectSlots), { 'banner-1': true });
assert.strictEqual(migrated.weekly.worlds.grimmerglen.activeTargetType, 'banner');
assert.strictEqual(migrated.weekly.worlds.grimmerglen.carriedObjectId, 'banner-2');

save.save(migrated);
stored.weekly.worlds.grimmerglen.tierProgress.start.objects.banner.found = 3;
const alreadyMigrated = save.load();
assert.strictEqual(alreadyMigrated.weekly.worlds.grimmerglen.tierProgress.start.objects.banner.found, 3);
assert.deepStrictEqual(plain(alreadyMigrated.weekly.worlds.grimmerglen.tierProgress.case.objects), {});
assert.deepStrictEqual(plain(alreadyMigrated.weekly.worlds.grimmerglen.tierProgress.deep.objects), {});

save.resetWeekly('2026-08-30|august-w4');
const reset = save.load();
assert.strictEqual(reset.weekly.worlds.occurrenceKey, '2026-08-30|august-w4');
assert.deepStrictEqual(plain(reset.weekly.worlds.grimmerglen.tierProgress), {
  start: { objects: {}, objectSlots: {} },
  case: { objects: {}, objectSlots: {} },
  deep: { objects: {}, objectSlots: {} },
});
assert.deepStrictEqual(plain(reset.grimmerglen.objects), { banner: { found: 2 } });
assert.deepStrictEqual(plain(reset.grimmerglen.objectSlots), { 'banner-1': true });
assert.strictEqual(reset.grimmerglen.activeTargetType, null);
assert.strictEqual(reset.grimmerglen.carriedObjectId, null);

console.log('Grimmerglen tier-progress schema audit passed: legacy weekly progress migrates to Starter, advanced tiers stay clean, and rollover resets all three tiers without touching lifetime records.');
