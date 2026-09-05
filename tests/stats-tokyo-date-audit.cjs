#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const calendarSource = fs.readFileSync(path.join(ROOT, 'js/calendar.js'), 'utf8');
const statsSource = fs.readFileSync(path.join(ROOT, 'js/core/stats-system.js'), 'utf8');

const calendarContext = { window: {}, Intl, Date };
vm.createContext(calendarContext);
vm.runInContext(calendarSource, calendarContext, { filename: 'js/calendar.js' });
const calendar = calendarContext.window.CALENDAR;
assert.ok(calendar, 'calendar API should be exposed');

assert.strictEqual(
  calendar.getTodayKey(new Date('2026-09-04T14:59:59Z')),
  '2026-09-04',
  'before the Tokyo midnight boundary should remain on the earlier Tokyo date'
);
assert.strictEqual(
  calendar.getTodayKey(new Date('2026-09-04T15:00:00Z')),
  '2026-09-05',
  'the UTC instant at Tokyo midnight should advance the Tokyo date'
);
assert.doesNotMatch(statsSource, /new Date\(\)\.toDateString\(\)/, 'stats must not use the local runtime date string');
assert.match(statsSource, /window\.CALENDAR\.getTodayKey\(\)/, 'stats must use the shared Tokyo calendar key');
assert.match(statsSource, /Legacy values written by Date#toDateString/, 'legacy date migration behavior must be documented');

const stats = { lastPlayedDate: 'Sat Sep 05 2026' };
const todayKeys = ['2026-09-05', '2026-09-05', '2026-09-06'];
let registeredStats;
const context = {
  window: {
    CALENDAR: { getTodayKey: () => todayKeys.shift() },
  },
  BoohaAdventure: {
    save: {
      load: () => ({ stats }),
      patch: (key, value) => Object.assign(stats, value),
    },
    registerSystem: (name, api) => {
      assert.strictEqual(name, 'statsSystem');
      registeredStats = api;
    },
  },
  document: { dispatchEvent() {} },
  CustomEvent: function CustomEvent() {},
};
vm.createContext(context);
vm.runInContext(statsSource, context, { filename: 'js/core/stats-system.js' });
assert.ok(registeredStats, 'stats system should register with the adventure core');

registeredStats.trackDailyPlay();
registeredStats.trackDailyPlay();
registeredStats.trackDailyPlay();
assert.strictEqual(stats.daysPlayed, 2, 'daily count should advance once per Tokyo calendar date');
assert.strictEqual(stats.totalPlays, 3, 'total plays should count every play');
assert.strictEqual(stats.lastPlayedDate, '2026-09-06', 'last played date should use the canonical Tokyo key');

console.log('Tokyo daily-stats audit passed: shared date key, midnight boundary, and legacy migration contract are correct.');
