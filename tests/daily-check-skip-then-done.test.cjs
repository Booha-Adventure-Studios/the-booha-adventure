#!/usr/bin/env node
'use strict';

// A day with a completed Daily Check keeps no skip record anywhere: the week
// summary (lanterns) and the Adventure Log calendar both read it as a plain
// checked day. A day that was skipped and never checked keeps its skip (the
// red dot). The Adventure Log's class picker opens on the student's class.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MON = '2026-11-16', TUE = '2026-11-17', WED = '2026-11-18', THU = '2026-11-19';
const ev = (day, type, ts) => ({ day, type, ts, curr: 'pb' });
const save = {
  meta: {
    checkIn: {
      [MON]: { st: 'done', pct: 100, curr: 'pb', ts: 2, retries: [] },
      [WED]: { st: 'done', pct: 80, curr: 'pb', ts: 6, retries: [] },
    },
    dailyCheckEvents: {
      a: ev(MON, 'student_skip', 1),     // skipped, then did the check
      b: ev(TUE, 'student_skip', 3),     // skipped, never checked
      c: ev(WED, 'load_failure', 4),     // problem, then did the check
      d: ev(WED, 'closed', 5),
      e: ev(THU, 'load_failure', 7),     // problem only
    },
  },
};

function bootDailyCheck(lastCurr) {
  const window = {
    BOOHA_READY: true,
    CALENDAR: { getTodayKey: () => THU, getCurrentCurriculumWeek: () => ({ weekStart: '2026-11-15' }) },
    BoohaSaveFile: { load: () => JSON.parse(JSON.stringify(save)), patch: () => true, patchDeep: () => true },
  };
  const ctx = {
    window,
    document: { addEventListener() {}, dispatchEvent() {} },
    console: { error() {}, warn() {}, log() {} },
    CustomEvent: function () {},
    sessionStorage: { getItem: () => null, setItem() {} },
    localStorage: { getItem: k => (k === 'booha_userid' ? 'student-1' : k === 'booha_last_curr' ? lastCurr : null) },
    setTimeout: fn => fn(),
  };
  Object.assign(ctx, window);
  ctx.window = ctx;
  vm.runInNewContext(read('js/core/media-config.js'), ctx);
  vm.runInNewContext(read('js/daily-check.js'), ctx);
  return ctx.BoohaDailyCheck;
}

// Week summary (the lantern row).
const DC = bootDailyCheck('br');
const days = Object.fromEntries(DC.weekSummary().days.map(d => [d.key, d]));
assert.strictEqual(days[MON].st, 'done');
assert.strictEqual(days[MON].skipped, false, 'a skip followed by the check leaves no skip');
assert.strictEqual(days[TUE].st, 'skip', 'a skip with no check stays a skip');
assert.strictEqual(days[WED].st, 'done');
assert.strictEqual(days[WED].tech, false, 'a problem followed by the check leaves no mark');
assert.strictEqual(days[THU].st, 'tech');

// Class picker: preselects the class from the shared mirror when the page
// has no curriculum.js; ignores anything that is not a class.
assert.match(read('js/daily-check.js'), /localStorage\.getItem\('booha_last_curr'\)/);
assert.strictEqual(bootDailyCheck('nonsense').weekSummary().days.length, 7);

// Adventure Log calendar.
const logCtx = { window: {}, document: { addEventListener() {}, getElementById: () => null }, console };
logCtx.window.window = logCtx.window;
Object.assign(logCtx, { localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null } });
vm.createContext(logCtx);
vm.runInContext(read('js/ui/adventure-log.js'), logCtx, { filename: 'js/ui/adventure-log.js' });
const byDay = JSON.parse(JSON.stringify(
  logCtx.window.BoohaAdventureLog._test.dcEventsByDay(save.meta.dailyCheckEvents, save.meta.checkIn)));
assert.strictEqual(byDay[MON], undefined, 'checked day: no skip in the calendar');
assert.strictEqual(byDay[WED], undefined, 'checked day: no problem marks in the calendar');
assert.deepStrictEqual(byDay[TUE].map(e => e.type), ['student_skip'], 'skipped day keeps its skip');
assert.deepStrictEqual(byDay[THU].map(e => e.type), ['load_failure']);

// A skip is the one red mark.
const css = read('theme/profile.css');
assert.match(css, /\.rb-cal-flag\.skip \{[^}]*background:#ff3b4e/, 'calendar skip is a red dot');
assert.match(css, /\.dc-day\.skip \.dc-dow::after \{[^}]*background:#ff3b4e/, 'lantern row shows the same red dot');
assert.doesNotMatch(css, /\.rb-cal-flag\.(tech|closed) \{[^}]*#ff3b4e/, 'only skips are red');

console.log('Daily Check skip-then-done passed: completed days carry no skip or problem marks, real skips keep a red dot, class picker preselects.');
