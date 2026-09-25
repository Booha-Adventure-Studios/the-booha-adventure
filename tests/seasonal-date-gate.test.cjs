#!/usr/bin/env node
'use strict';

// Pre-Sunday seasonal gate: keep the first three live Halloween switches
// executable before they reach a student device. This covers the Tokyo
// midnight boundary as well as the season/menu/weekly-character contract.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const calendarContext = { window: {}, Intl, Date, console };
vm.createContext(calendarContext);
vm.runInContext(read('js/calendar.js'), calendarContext, { filename: 'js/calendar.js' });

const skinsContext = {
  window: {
    CALENDAR: calendarContext.window.CALENDAR,
    BoohaAdventure: { save: { load() { return {}; } } },
  },
  Intl,
  Date,
  console,
};
skinsContext.window.window = skinsContext.window;
vm.createContext(skinsContext);
vm.runInContext(read('js/core/booha-skins.js'), skinsContext, { filename: 'js/core/booha-skins.js' });
const skins = skinsContext.window.BoohaSkins;
const calendar = calendarContext.window.CALENDAR;

function dateKey(date) {
  return calendar.getTodayKey(date);
}

function occurrence(date) {
  const week = calendar.getCurrentCurriculumWeek(date);
  return {
    week,
    key: calendar.getCurriculumWeekOccurrenceKey(week),
  };
}

// The decisive boundary is Tokyo midnight, not UTC midnight.
assert.strictEqual(dateKey(new Date('2026-09-26T14:59:59Z')), '2026-09-26');
assert.strictEqual(dateKey(new Date('2026-09-26T15:00:00Z')), '2026-09-27');

const sundaySwitches = [
  ['2026-09-27T00:00:00+09:00', '2026-09-27', 'mummington'],
  ['2026-10-04T00:00:00+09:00', '2026-10-04', 'mortisa'],
];

sundaySwitches.forEach(([iso, key, expectedCharacter]) => {
  const { week, key: occurrenceKey } = occurrence(new Date(iso));
  assert.strictEqual(dateKey(new Date(iso)), key, `${key}: Tokyo date must be stable`);
  assert.strictEqual(skins.seasonIdForDate(key), 'halloween', `${key}: Halloween must be active`);
  assert.strictEqual(skins.menuCharacterId('halloween', key), 'batty', `${key}: menu must show Batty`);
  assert.strictEqual(skins.rotationCharacterId('halloween', occurrenceKey), expectedCharacter,
    `${key}: weekly unlock must schedule ${expectedCharacter}`);
  assert.strictEqual(week.weekStart, key, `${key}: curriculum occurrence must start on Sunday`);
});

const novFirst = occurrence(new Date('2026-11-01T00:00:00+09:00'));
assert.strictEqual(skins.seasonIdForDate('2026-11-01'), null,
  'Nov 1: Halloween must be shut off');
assert.strictEqual(skins.menuCharacterId('halloween', '2026-11-01'), null,
  'Nov 1: Batty must leave the landing menu');
assert.strictEqual(skins.rotationCharacterId('halloween', novFirst.key), null,
  'Nov 1: no Halloween weekly character may be scheduled');

// The requested fifth-Sunday case is Aug 30, outside the Sep 1–Nov 7 sweep.
const fifthSunday = occurrence(new Date('2026-08-30T12:00:00+09:00'));
assert.strictEqual(fifthSunday.week.weekId, 'august-w4');
assert.strictEqual(fifthSunday.week.isRepeatWeek, true);
assert.strictEqual(fifthSunday.key, '2026-08-30|august-w4');

console.log('Seasonal date gate passed: Tokyo midnight, Sep 27/Oct 4 switches, Nov 1 shutoff, and fifth-Sunday occurrence are correct.');
