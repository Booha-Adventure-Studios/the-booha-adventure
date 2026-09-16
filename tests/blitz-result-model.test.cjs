#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadDayRecord() {
  let stored = { meta: {} };
  const document = { addEventListener() {}, dispatchEvent() {} };
  const save = {
    load: () => stored,
    patch: (key, value) => { stored[key] = value; },
  };
  const calendar = {
    getTodayKey: () => '2026-09-16',
    getCurrentCurriculumWeek: () => ({ occurrenceKey: '2026-09-13|september-w2' }),
  };
  const context = {
    console: { error() {} },
    document,
    window: { CALENDAR: calendar, BoohaAdventure: { save } },
    CALENDAR: calendar,
    BoohaAdventure: { save },
    CustomEvent: function CustomEvent(type, init) { return { type, ...init }; },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/core/day-record.js'), 'utf8'), context);
  return { record: context.window.BoohaDayRecord.record, getStored: () => stored };
}

const dayRecord = loadDayRecord();
dayRecord.record({
  saveId: 'blitz:pb:vocab', completed: true, recordEligible: true,
  time: 18000, clearTier: 'perfect', mistakes: 0,
});
let stored = dayRecord.getStored();
let result = stored.meta.weekLog['2026-09-13|september-w2'].blitz['pb:vocab'];
assert.strictEqual(result.ms, 18000);
assert.strictEqual(result.tier, 'perfect');
assert.strictEqual(result.mistakes, 0);

dayRecord.record({
  saveId: 'blitz:pb:vocab', completed: true, recordEligible: true,
  time: 22000, clearTier: 'perfect', mistakes: 0,
});
stored = dayRecord.getStored();
assert.strictEqual(stored.meta.weekLog['2026-09-13|september-w2'].blitz['pb:vocab'].tier, 'perfect',
  'a slower perfect clear must not downgrade a weekly stamp');

dayRecord.record({
  saveId: 'blitz:pb:vocab', completed: true, recordEligible: true,
  time: 26000, clearTier: 'perfect', mistakes: 0,
});
stored = dayRecord.getStored();
assert.strictEqual(stored.meta.weekLog['2026-09-13|september-w2'].blitz['pb:vocab'].tier, 'perfect',
  'a perfect clear must upgrade a clean stamp');

const logContext = {
  window: {},
  document: { getElementById: () => null, addEventListener() {} },
};
vm.createContext(logContext);
vm.runInContext(fs.readFileSync(path.join(root, 'js/ui/adventure-log.js'), 'utf8'), logContext);
const status = logContext.window.BoohaAdventureLog._test.weekStatus(
  { adv: {}, blitz: { 'pb:vocab': { ms: 26000, tier: 'perfect', mistakes: 0 } } },
  'pb', Array.from({ length: 9 }, (_, i) => ({ id: `g${i}`, name: `G${i}` })),
);
assert.strictEqual(status.blitzDone, 1);
assert.strictEqual(status.blitzStamps[0].tier, 'perfect');
assert.strictEqual(status.complete, false);

console.log('Blitz result-model test passed: perfect completions persist and render as weekly stamps.');
