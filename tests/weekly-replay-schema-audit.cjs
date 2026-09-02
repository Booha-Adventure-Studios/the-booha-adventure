#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const saveSource = fs.readFileSync(path.join(ROOT, 'js/core/save-file.js'), 'utf8');
const saveKey = 'booha_save:v3:replay-schema-student';

let stored = {
  version: 2,
  scores: { 'bc:ask_question': { completed: true, stars: 3 } },
  unlocks: { first_game: { unlockedAt: 1 } },
  meta: { lastWeeklyKey: '2026-08-23|august-w4', allTimeStars: 3 },
  collection: { wanderers: { 4: { visits: 2 } } },
  weekly: {
    completedGames: { 'bc:ask_question': true },
    gameScores: { 'bc:ask_question': 80 },
    gameStars: { 'bc:ask_question': 2 },
    unlockedBonusGames: { booha_blocks: true },
    wanderers: [4],
  },
  utsuroba: {
    drifters: { alpha: { completedModes: { deep: [1] } } },
    readingJournal: { entries: [{ episodeId: 'episode-1' }] },
  },
  muenba: {
    ghostsFound: { fuzzle: true },
    huntJournal: { entries: [{ ghostId: 'fuzzle' }] },
  },
  grimmerglen: {
    objects: { banner: { found: 2 } },
    objectSlots: { 'banner-1': true },
  },
};

const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return 'replay-schema-student';
    if (name === saveKey) return JSON.stringify(stored);
    return null;
  },
  setItem(name, value) {
    if (name === saveKey) stored = JSON.parse(value);
  },
  removeItem() {},
};

const events = [];
const document = {
  addEventListener() {},
  dispatchEvent(event) { events.push(event.type); },
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

assert.strictEqual(migrated.version, 3);
assert.deepStrictEqual(plain(migrated.weekly.worlds), {
  occurrenceKey: '',
  utsuroba: { drifterQuest: null, drifters: {}, readingChallenge: null },
  muenba: { ghostsFound: {}, huntGhostOrder: [], activeCaseId: null, activeCaseRecoveryDone: false, orbsPending: 0, huntAccepted: false },
  grimmerglen: {
    objects: {},
    objectSlots: {},
    tierProgressSchema: 2,
    tierProgress: {
      start: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
      case: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
      deep: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
    },
    activeTargetType: null,
    carriedObjectId: null,
    memoryQuestAccepted: false,
    mariettaIntroSeen: false,
    mariettaIntroSkipped: false,
  },
});

save.save(migrated);
stored.muenba.orbsPending = 5;
stored.muenba.caseProgress = { completedCaseIds: ['case-1'], activeCaseId: 'case-2' };
stored.grimmerglen.activeTargetType = 'banner';
stored.grimmerglen.carriedObjectId = 'banner-1';
save.resetWeekly('2026-08-30|august-w4');

assert.strictEqual(stored.version, 3);
assert.strictEqual(stored.meta.lastWeeklyKey, '2026-08-30|august-w4');
assert.strictEqual(stored.weekly.worlds.occurrenceKey, '2026-08-30|august-w4');
assert.deepStrictEqual(plain(stored.weekly.worlds.utsuroba), {
  drifterQuest: null,
  drifters: {},
  readingChallenge: null,
});
assert.deepStrictEqual(plain(stored.weekly.worlds.muenba), {
  ghostsFound: {},
  huntGhostOrder: [],
  activeCaseId: null,
  activeCaseRecoveryDone: false,
  orbsPending: 0,
  huntAccepted: false,
});
assert.deepStrictEqual(plain(stored.weekly.worlds.grimmerglen), {
  objects: {},
  objectSlots: {},
    tierProgressSchema: 2,
  tierProgress: {
    start: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
    case: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
    deep: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
  },
  activeTargetType: null,
  carriedObjectId: null,
  memoryQuestAccepted: false,
  mariettaIntroSeen: false,
  mariettaIntroSkipped: false,
});

assert.deepStrictEqual(plain(stored.scores), { 'bc:ask_question': { completed: true, stars: 3 } });
assert.deepStrictEqual(plain(stored.unlocks), { first_game: { unlockedAt: 1 } });
assert.strictEqual(stored.meta.allTimeStars, 3);
assert.deepStrictEqual(plain(stored.collection), { wanderers: { 4: { visits: 2 } } });
assert.deepStrictEqual(plain(stored.utsuroba.drifters), { alpha: { completedModes: { deep: [1] } } });
assert.deepStrictEqual(plain(stored.utsuroba.readingJournal), { entries: [{ episodeId: 'episode-1' }] });
assert.deepStrictEqual(plain(stored.muenba.ghostsFound), { fuzzle: true });
assert.deepStrictEqual(plain(stored.muenba.huntJournal), { entries: [{ ghostId: 'fuzzle' }] });
assert.strictEqual(stored.muenba.orbsPending, 0);
assert.strictEqual(stored.muenba.caseProgress.activeCaseId, null);
assert.deepStrictEqual(stored.muenba.caseProgress.completedCaseIds, ['case-1']);
assert.deepStrictEqual(plain(stored.grimmerglen.objects), { banner: { found: 2 } });
assert.deepStrictEqual(plain(stored.grimmerglen.objectSlots), { 'banner-1': true });
assert.strictEqual(stored.grimmerglen.activeTargetType, null);
assert.strictEqual(stored.grimmerglen.carriedObjectId, null);
assert.ok(events.includes('booha:weeklyReset'));

console.log('Weekly replay schema audit passed: occurrence-scoped world buckets reset without touching lifetime records.');
