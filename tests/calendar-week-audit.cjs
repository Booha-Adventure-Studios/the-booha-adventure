#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/calendar.js'), 'utf8');
const context = { window: {}, Intl, Date };

vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/calendar.js' });

const calendar = context.window.CALENDAR;
assert.ok(calendar, 'calendar API should be exposed');

function resolve(isoDate) {
  return calendar.getCurrentCurriculumWeek(new Date(`${isoDate}T12:00:00+09:00`));
}

const lastAugustWeek = resolve('2026-08-23');
assert.strictEqual(lastAugustWeek.weekId, 'august-w4');
assert.strictEqual(lastAugustWeek.weekStart, '2026-08-23');
assert.strictEqual(lastAugustWeek.isRepeatWeek, false);
assert.strictEqual(lastAugustWeek.occurrenceKey, '2026-08-23|august-w4');

const repeatedAugustWeekSunday = resolve('2026-08-30');
const repeatedAugustWeekMonday = resolve('2026-08-31');
for (const repeated of [repeatedAugustWeekSunday, repeatedAugustWeekMonday]) {
  assert.strictEqual(repeated.weekId, 'august-w4', 'repeat occurrence keeps Week 4 content');
  assert.strictEqual(repeated.weekNumber, 4, 'repeat occurrence remains within four curriculum weeks');
  assert.strictEqual(repeated.weekStart, '2026-08-30', 'week boundary remains Sunday');
  assert.strictEqual(repeated.isRepeatWeek, true, 'fifth occurrence is marked as a repeat');
  assert.strictEqual(repeated.occurrenceKey, '2026-08-30|august-w4');
}
assert.strictEqual(
  calendar.getCurriculumWeekOccurrenceKey(repeatedAugustWeekMonday),
  '2026-08-30|august-w4'
);

const firstSeptemberWeek = resolve('2026-09-06');
assert.strictEqual(firstSeptemberWeek.weekId, 'september-w1');
assert.strictEqual(firstSeptemberWeek.weekStart, '2026-09-06');
assert.strictEqual(firstSeptemberWeek.isRepeatWeek, false);
assert.strictEqual(firstSeptemberWeek.occurrenceKey, '2026-09-06|september-w1');

console.log('Calendar fifth-week audit passed: Sunday boundary, Week 4 content repeat, and distinct occurrence keys are correct.');
