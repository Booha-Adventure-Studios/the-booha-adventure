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
  assert.strictEqual(skins.seasonIdForDate(key), 'halloween-2026', `${key}: Halloween must be active`);
  assert.strictEqual(skins.menuCharacterId('halloween', key), 'batty', `${key}: menu must show Batty`);
  assert.strictEqual(skins.rotationCharacterId('halloween', occurrenceKey), expectedCharacter,
    `${key}: weekly unlock must schedule ${expectedCharacter}`);
  assert.strictEqual(week.weekStart, key, `${key}: curriculum occurrence must start on Sunday`);
});

const novFirst = occurrence(new Date('2026-11-01T00:00:00+09:00'));
assert.strictEqual(skins.menuCharacterId('halloween', '2026-11-01'), null,
  'Nov 1: Batty must leave the landing menu');
assert.strictEqual(skins.rotationCharacterId('halloween', novFirst.key), null,
  'Nov 1: no Halloween weekly character may be scheduled');

assert.strictEqual(skins.seasonIdForDate('2026-11-01'), 'christmas-2026',
  'Nov 1: Christmas must begin at the Tokyo date boundary');
assert.strictEqual(skins.getSeason('christmas').themeId, 'christmas');
assert.strictEqual(skins.seasonMascot('christmas').id, 'grubb');
assert.strictEqual(skins.menuCharacterId('christmas', '2026-11-01'), 'grubb');
assert.strictEqual(skins.mascotAsset('static', 'christmas'), 'assets/skins/grubb_booha/static.webp');

[
  ['2026-11-01', 'thumpkin'],
  ['2026-11-08', 'crumbly'],
  ['2026-11-15', 'gnasher'],
  ['2026-11-22', 'waddlesworth'],
  ['2026-11-29', 'waddlesworth'],
  ['2026-12-06', 'snaggle'],
  ['2026-12-13', 'tinkerplunk'],
  ['2026-12-20', 'oats'],
  ['2026-12-27', 'quillock'],
].forEach(([date, expectedCharacter]) => {
  const { key: occurrenceKey } = occurrence(new Date(`${date}T00:00:00+09:00`));
  assert.strictEqual(skins.rotationCharacterId('christmas-2026', occurrenceKey), expectedCharacter,
    `${date}: Christmas must schedule ${expectedCharacter}`);
});
assert.strictEqual(skins.seasonIdForDate('2027-01-02'), 'christmas-2026',
  'Jan 2: Christmas must remain active through the final unlock week');
assert.strictEqual(skins.seasonIdForDate('2027-01-03'), null,
  'Jan 3: Christmas must end after the eighth unlock week');

// The requested fifth-Sunday case is Aug 30, outside the Sep 1–Nov 7 sweep.
const fifthSunday = occurrence(new Date('2026-08-30T12:00:00+09:00'));
assert.strictEqual(fifthSunday.week.weekId, 'august-w4');
assert.strictEqual(fifthSunday.week.isRepeatWeek, true);
assert.strictEqual(fifthSunday.key, '2026-08-30|august-w4');

console.log('Seasonal date gate passed: Tokyo midnight, Sep 27/Oct 4 switches, Nov 1 shutoff, and fifth-Sunday occurrence are correct.');
