#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const calendarContext = { window: {}, Intl, Date };
vm.createContext(calendarContext);
vm.runInContext(read('js/calendar.js'), calendarContext, { filename: 'js/calendar.js' });
const calendar = calendarContext.window.CALENDAR;
const repeat = calendar.getCurrentCurriculumWeek(new Date('2026-08-31T12:00:00+09:00'));
assert.strictEqual(repeat.weekId, 'august-w4');
assert.strictEqual(repeat.occurrenceKey, '2026-08-30|august-w4');

for (const file of [
  'js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js',
]) {
  const source = read(file);
  assert.ok(source.includes('getCurriculumWeekOccurrenceKey'), `${file} must use occurrence keys`);
  assert.ok(source.includes('cw.occurrenceKey'), `${file} must retain the calendar fallback`);
}

for (const file of ['js/utsuroba.js', 'js/muenba.js', 'js/karasuki.js', 'js/core/day-record.js']) {
  const source = read(file);
  assert.ok(source.includes('occurrenceKey'), `${file} must distinguish repeated occurrences`);
}

const index = read('index.html');
const maze = read('maze.html');
assert.ok(index.includes('const weekId = CALENDAR.getCurriculumWeekOccurrenceKey?.(cw)'),
  'index Blitz progress must read the live occurrence key');
assert.ok(maze.includes('const weekId = CALENDAR.getCurriculumWeekOccurrenceKey?.(cw)'),
  'Maze Blitz progress must read the live occurrence key');

const log = read('js/ui/adventure-log.js');
assert.ok(log.includes('function formatPastWeekLabel'), 'profile log must format occurrence keys');
assert.ok(log.includes('formatPastWeekLabel(k)'), 'profile log must render the occurrence date');

const core = read('js/core/adventure-core.js');
assert.ok(core.includes("window.addEventListener('pageshow'"),
  'core must re-check the occurrence after bfcache restore');
assert.ok(core.includes("document.addEventListener('visibilitychange'"),
  'core must re-check the occurrence when a hidden page becomes active');
assert.ok(index.includes("document.addEventListener('booha:weeklyReset'"),
  'Hub Blitz pills must refresh after an in-session rollover');
assert.ok(maze.includes("document.addEventListener('booha:weeklyReset', onSaveReady)"),
  'Maze progress visuals must refresh after an in-session rollover');

console.log('Weekly occurrence consumer audit passed: all weekly readers distinguish the repeated Week 4 occurrence.');
