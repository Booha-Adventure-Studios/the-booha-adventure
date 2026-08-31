#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const saveKey = 'booha_save:v3:boundary-student';

let currentWeek = {
  weekId: 'august-w4',
  weekStart: '2026-08-23',
  occurrenceKey: '2026-08-23|august-w4',
};
let stored = {
  meta: { lastWeeklyKey: currentWeek.occurrenceKey },
  weekly: { completedGames: { 'br:vocab_tap': true } },
};

const windowListeners = {};
const documentListeners = {};
const events = [];
const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return 'boundary-student';
    if (name === saveKey) return JSON.stringify(stored);
    return null;
  },
  setItem(name, value) {
    if (name === saveKey) stored = JSON.parse(value);
  },
  removeItem() {},
};
const document = {
  readyState: 'complete',
  hidden: false,
  addEventListener(type, listener) {
    (documentListeners[type] ||= []).push(listener);
  },
  dispatchEvent(event) {
    events.push(event.type);
    (documentListeners[event.type] || []).forEach(listener => listener(event));
  },
};
const window = {
  BOOHA_SYNC_READY: false,
  addEventListener(type, listener) {
    (windowListeners[type] ||= []).push(listener);
  },
  CALENDAR: {
    getCurrentCurriculumWeek() { return currentWeek; },
    getCurriculumWeekOccurrenceKey(cw) { return cw.occurrenceKey; },
  },
};
class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
}
class Event {
  constructor(type) { this.type = type; }
}

const context = {
  window,
  document,
  localStorage,
  CustomEvent,
  Event,
  console,
  Date,
  setTimeout,
  clearTimeout,
};
vm.createContext(context);
vm.runInContext(read('js/core/adventure-core.js'), context, { filename: 'js/core/adventure-core.js' });
vm.runInContext(read('js/core/save-file.js'), context, { filename: 'js/core/save-file.js' });

context.window.BoohaAdventure.init();
assert.deepStrictEqual(stored.weekly.completedGames, { 'br:vocab_tap': true });

currentWeek = {
  weekId: 'august-w4',
  weekStart: '2026-08-30',
  occurrenceKey: '2026-08-30|august-w4',
};
windowListeners.pageshow.forEach(listener => listener({ persisted: true }));
assert.strictEqual(stored.meta.lastWeeklyKey, '2026-08-30|august-w4');
assert.deepStrictEqual(stored.weekly.completedGames, {});
assert.strictEqual(events.filter(type => type === 'booha:weeklyReset').length, 1);

// Rechecking the same occurrence from visibility must be a no-op.
documentListeners.visibilitychange.forEach(listener => listener());
assert.deepStrictEqual(stored.weekly.completedGames, {});
assert.strictEqual(events.filter(type => type === 'booha:weeklyReset').length, 1);

console.log('Weekly boundary refresh audit passed: pageshow/visibility rollover resets once and preserves the Sunday occurrence key.');
