#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'js', 'grimmerglen.js'), 'utf8');
const saveSource = fs.readFileSync(path.join(ROOT, 'js', 'core', 'save-file.js'), 'utf8');
const verify = fs.readFileSync(path.join(ROOT, 'verify.sh'), 'utf8');

assert.match(runtime, /function markGrimmerglenGardenVisited\(\)/,
  'runtime must have a separate garden-entry counter');
assert.match(runtime, /d\.gardenVisitsTotal \+= 1/,
  'garden visits must increment on world entry');
assert.match(runtime, /d\.roomVisitsTotal \+= 1/,
  'room entries must remain an always-incrementing lifetime total');
assert.match(runtime, /data\.grimmerglen\.cluesReturnedTotal \+= 1/,
  'successful clue returns must increment the lifetime total');
assert.match(runtime, /data\.grimmerglen\.memoriesRestoredTotal \+= 1/,
  'completed memories must increment the lifetime total');
assert.match(runtime, /const wasWeeklyMemoryComplete = Number\(selectedProgress\.objects\?\.\[type\]\?\.found\) >= 3/,
  'memory totals must increment only when a weekly memory crosses into completion');

const initStart = runtime.indexOf('function init()');
assert(initStart >= 0, 'runtime must expose an init function');
const initEnd = runtime.indexOf('\n  }', initStart);
const init = runtime.slice(initStart, initEnd);
assert.match(init, /state\.spawnId === 'fromKarasuki'\) markGrimmerglenGardenVisited\(\)/,
  'garden visits must count when entering from Karasuki');

const setRoomStart = runtime.indexOf('function setRoom(');
const setRoomEnd = runtime.indexOf('\n  }', setRoomStart);
assert(setRoomStart >= 0 && setRoomEnd > setRoomStart, 'runtime must expose setRoom');
assert(!runtime.slice(setRoomStart, setRoomEnd).includes('markGrimmerglenGardenVisited'),
  'room transitions must not count as garden visits');

const saveKey = 'booha_save:v3:grimmerglen-counter-student';
let stored = {
  version: 3,
  weekly: { worlds: { occurrenceKey: '2026-08-30|august-w4', grimmerglen: {} } },
  grimmerglen: {
    objects: {
      banner: { found: 2 },
      ticket: { found: 3 },
      pillow: { found: 1 },
    },
    visitedRooms: { room_01: 1, room_02: 2, room_03: 3 },
  },
};

const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return 'grimmerglen-counter-student';
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
assert.strictEqual(migrated.grimmerglen.cluesReturnedTotal, 6,
  'legacy clue progress must seed the new running counter');
assert.strictEqual(migrated.grimmerglen.memoriesRestoredTotal, 1,
  'legacy completed memories must seed the new running counter');
assert.strictEqual(migrated.grimmerglen.roomVisitsTotal, 3,
  'legacy visited-room records must seed room entries when no total exists');
assert.strictEqual(migrated.grimmerglen.gardenVisitsTotal, 0,
  'garden visits must not be invented for legacy saves');

migrated.grimmerglen.cluesReturnedTotal = 19;
migrated.grimmerglen.memoriesRestoredTotal = 7;
migrated.grimmerglen.roomVisitsTotal = 28;
migrated.grimmerglen.gardenVisitsTotal = 4;
save.save(migrated);
const preserved = save.load();
assert.deepStrictEqual({
  clues: preserved.grimmerglen.cluesReturnedTotal,
  memories: preserved.grimmerglen.memoriesRestoredTotal,
  rooms: preserved.grimmerglen.roomVisitsTotal,
  gardens: preserved.grimmerglen.gardenVisitsTotal,
}, { clues: 19, memories: 7, rooms: 28, gardens: 4 },
  'valid lifetime counters must not be overwritten during migration');

save.resetWeekly('2026-09-06|september-w1');
const afterReset = save.load();
assert.deepStrictEqual({
  clues: afterReset.grimmerglen.cluesReturnedTotal,
  memories: afterReset.grimmerglen.memoriesRestoredTotal,
  rooms: afterReset.grimmerglen.roomVisitsTotal,
  gardens: afterReset.grimmerglen.gardenVisitsTotal,
}, { clues: 19, memories: 7, rooms: 28, gardens: 4 },
  'weekly reset must preserve all lifetime counters');

assert(verify.includes('tests/grimmerglen-lifetime-counters-audit.cjs'),
  'verify.sh must run the Grimmerglen lifetime-counter audit');

console.log('Grimmerglen lifetime counter audit passed: legacy migration, replay-safe increments, and weekly preservation are covered.');
