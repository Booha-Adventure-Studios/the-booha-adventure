#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const coreSource = fs.readFileSync(path.join(ROOT, 'js/core/adventure-core.js'), 'utf8');
const saveSource = fs.readFileSync(path.join(ROOT, 'js/core/save-file.js'), 'utf8');

const key = 'booha_save:v3:rollover-student';
let stored = {
  version: 2,
  scores: { 'bc:vocab_tap': { completed: true, stars: 3 } },
  unlocks: { first_game: { unlockedAt: 1 } },
  meta: {
    lastWeeklyKey: '2026-08-23|august-w4',
    allTimeStars: 3,
    blitz: {
      weeklyKey: 'august:w4',
      weekly: { vocab: { bc: { ms: 1000 } } },
      records: { vocab: { bc: { ms: 900 } } },
    },
  },
  weekly: {
    completedGames: { 'bc:vocab_tap': true },
    gameScores: { 'bc:vocab_tap': 88 },
    gameStars: { 'bc:vocab_tap': 2 },
    unlockedBonusGames: { booha_blocks: true },
    wanderers: [4],
  },
  muenba: {
    ghostsFound: { ghost_lifetime: true },
    weeklyGhostsFound: { ghost_weekly: true },
    weeklyGhostsFoundWeek: '2026-08-23|august-w4',
    huntGhostOrder: ['ghost_weekly'],
    huntGhostOrderWeek: '2026-08-23|august-w4',
    caseRecords: { case_lifetime: { completed: true } },
  },
};

const events = [];
const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return 'rollover-student';
    if (name === key) return JSON.stringify(stored);
    return null;
  },
  setItem(name, value) {
    if (name === key) stored = JSON.parse(value);
  },
  removeItem() {},
};
const document = {
  readyState: 'loading',
  addEventListener() {},
  dispatchEvent(event) { events.push(event.type); },
};
const BoohaSync = { checkpoint() {} };
class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}
class Event {
  constructor(type) { this.type = type; }
}

const context = {
  window: {
    BOOHA_SYNC_READY: false,
    CALENDAR: {
      getCurrentCurriculumWeek() {
        return {
          year: 2026,
          monthSlug: 'august',
          weekNumber: 4,
          weekId: 'august-w4',
          weekStart: '2026-08-30',
          occurrenceKey: '2026-08-30|august-w4',
        };
      },
      getCurriculumWeekOccurrenceKey(cw) { return cw.occurrenceKey; },
    },
    BoohaSync,
  },
  localStorage,
  document,
  CustomEvent,
  Event,
  console,
  Date,
  setTimeout,
  clearTimeout,
  BoohaSync,
};

vm.createContext(context);
vm.runInContext(coreSource, context, { filename: 'js/core/adventure-core.js' });
vm.runInContext(saveSource, context, { filename: 'js/core/save-file.js' });

context.window.BoohaAdventure.init();

assert.strictEqual(stored.meta.lastWeeklyKey, '2026-08-30|august-w4');
assert.deepStrictEqual(stored.weekly.completedGames, {});
assert.deepStrictEqual(stored.weekly.gameScores, {});
assert.deepStrictEqual(stored.weekly.gameStars, {});
assert.deepStrictEqual(stored.weekly.unlockedBonusGames, {});
assert.deepStrictEqual(stored.weekly.wanderers, []);
assert.deepStrictEqual(stored.meta.blitz.weekly, {});
assert.strictEqual(stored.meta.blitz.weeklyKey, '2026-08-30|august-w4');
assert.deepStrictEqual(stored.muenba.weeklyGhostsFound, {});
assert.strictEqual(stored.muenba.weeklyGhostsFoundWeek, '2026-08-30|august-w4');
assert.deepStrictEqual(stored.muenba.huntGhostOrder, []);
assert.strictEqual(stored.muenba.huntGhostOrderWeek, '2026-08-30|august-w4');

assert.deepStrictEqual(stored.scores, { 'bc:vocab_tap': { completed: true, stars: 3 } });
assert.deepStrictEqual(stored.unlocks, { first_game: { unlockedAt: 1 } });
assert.strictEqual(stored.meta.allTimeStars, 3);
assert.deepStrictEqual(stored.meta.blitz.records, { vocab: { bc: { ms: 900 } } });
assert.deepStrictEqual(stored.muenba.ghostsFound, { ghost_lifetime: true });
assert.deepStrictEqual(stored.muenba.caseRecords, { case_lifetime: { completed: true } });
assert.ok(events.includes('booha:weeklyReset'));
assert.ok(events.includes('booha:newWeek'));

console.log('Weekly rollover audit passed: the fifth occurrence resets weekly state while preserving permanent progress.');
