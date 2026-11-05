#!/usr/bin/env node
'use strict';

// Hub Pass 2: weekly visit/check-in data contract (js/core/visit-days.js).
//   · weekly.visitDays lives in the identity-scoped save, one key per day.
//   · At most one write per student per Tokyo day, never before BOOHA_READY.
//   · Shared iPads: one student's visit never shows up in another's save.
//   · The Sunday reset clears it, carrying only keys already in the new week.
//   · Reading counts only this week's seven days; a Daily Check implies a
//     visit and turns that day gold. No "missed day" entries exist.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

// ── Pure helpers (Node module path) ──────────────────────────────────────
const VisitDays = require(path.join(ROOT, 'js/core/visit-days.js'));

assert.deepStrictEqual(VisitDays.weekDays('2026-11-01'), [
  '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04',
  '2026-11-05', '2026-11-06', '2026-11-07',
], 'a week is Sunday through Saturday');
assert.deepStrictEqual(VisitDays.weekDays('2026-12-27').slice(-2), ['2027-01-01', '2027-01-02'],
  'weeks cross the year boundary');
assert.deepStrictEqual(VisitDays.weekDays(null), []);
assert.deepStrictEqual(VisitDays.weekDays('not-a-date'), []);

{
  const s = plain(VisitDays.summarize(
    { '2026-11-05': 1, '2026-11-02': 1, '2026-10-31': 1, '2026-11-08': 1, junk: 1 },
    {
      '2026-11-02': { st: 'done', pct: 80 },
      '2026-11-03': { st: 'done', pct: 60 },   // check-in without a visit key
      '2026-11-04': { st: 'skip' },            // "later" is not a visit by itself
      '2026-10-30': { st: 'done' },            // last week
    },
    '2026-11-01'
  ));
  assert.deepStrictEqual(s, {
    weekStart: '2026-11-01',
    visits: 3,
    checks: 2,
    days: [
      { day: '2026-11-02', gold: true },
      { day: '2026-11-03', gold: true },
      { day: '2026-11-05', gold: false },
    ],
  }, 'only this week counts; a Daily Check implies a gold visit; skips and stray keys do not count');
}
{
  const s = plain(VisitDays.summarize({}, {}, '2026-11-01'));
  assert.deepStrictEqual(s, { weekStart: '2026-11-01', visits: 0, checks: 0, days: [] },
    'a fresh week is empty, not a list of missed days');
  const bad = plain(VisitDays.summarize([1, 2], 'nope', undefined));
  assert.deepStrictEqual(bad, { weekStart: null, visits: 0, checks: 0, days: [] }, 'malformed input is safe');
}

// ── Real save layer in a VM (shared-iPad scenario) ───────────────────────
const store = new Map();
let userId = 'student-a';
let today = '2026-11-05';
let week = { weekStart: '2026-11-01', weekId: 'november-w1', occurrenceKey: '2026-11-01|november-w1' };
const keyFor = id => `booha_save:v3:${id}`;

// Student A arrives with a save from before this pass (no weekly.visitDays).
store.set(keyFor('student-a'), JSON.stringify({
  version: 2,
  meta: {
    lastWeeklyKey: '2026-11-01|november-w1',
    checkIn: { '2026-11-03': { st: 'done', pct: 90, curr: 'pb', ts: 1, retries: [] } },
  },
  weekly: { completedGames: {}, gameScores: {}, gameStars: {}, unlockedBonusGames: {}, wanderers: [] },
}));

const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return userId;
    return store.has(name) ? store.get(name) : null;
  },
  setItem(name, value) { store.set(name, String(value)); },
  removeItem(name) { store.delete(name); },
};
const events = [];
class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
class Event { constructor(type) { this.type = type; } }
const document = {
  readyState: 'loading',
  hidden: false,
  addEventListener() {},
  dispatchEvent(event) { events.push(event); },
};
let checkpoints = 0;
const BoohaSync = { checkpoint() { checkpoints++; } };

const context = {
  window: {
    BOOHA_SYNC_READY: false,
    CALENDAR: {
      getTodayKey: () => today,
      getCurrentCurriculumWeek: () => week,
      getCurriculumWeekOccurrenceKey: cw => cw.occurrenceKey,
    },
    BoohaSync,
    document,
    CustomEvent,
  },
  localStorage, document, CustomEvent, Event, console, Date, setTimeout, clearTimeout, BoohaSync,
};
vm.createContext(context);
vm.runInContext(read('js/core/adventure-core.js'), context, { filename: 'js/core/adventure-core.js' });
vm.runInContext(read('js/core/save-file.js'), context, { filename: 'js/core/save-file.js' });
vm.runInContext(read('js/core/visit-days.js'), context, { filename: 'js/core/visit-days.js' });

const win = context.window;
const saveOf = id => JSON.parse(store.get(keyFor(id)) || 'null');
const visitEvents = () => events.filter(e => e.type === 'booha:visitRecorded');

// Before identity is ready, nothing is written.
assert.strictEqual(win.BoohaVisitDays.record(), false, 'no write before BOOHA_READY');
assert.ok(!saveOf('student-a').weekly.visitDays, 'save untouched before identity is ready');
assert.strictEqual(plain(win.BoohaVisitDays.current()).visits, 0, 'nothing readable before identity is ready');

win.BoohaAdventure.init();
assert.strictEqual(win.BOOHA_READY, true);
assert.deepStrictEqual(plain(win.BoohaSaveFile.load().weekly.visitDays), {},
  'older saves gain an empty weekly.visitDays');

// First visit today writes once; repeats are free.
assert.strictEqual(win.BoohaVisitDays.record(), true, 'first visit today is recorded');
assert.deepStrictEqual(saveOf('student-a').weekly.visitDays, { '2026-11-05': 1 });
assert.strictEqual(visitEvents().length, 1, 'booha:visitRecorded fires once');
assert.strictEqual(visitEvents()[0].detail.day, '2026-11-05');
assert.strictEqual(checkpoints, 1, 'a new visit day asks for one cloud checkpoint');
assert.strictEqual(win.BoohaVisitDays.record(), false, 'second visit the same day does not write');
assert.strictEqual(visitEvents().length, 1);
assert.strictEqual(checkpoints, 1);

assert.deepStrictEqual(plain(win.BoohaVisitDays.current()), {
  weekStart: '2026-11-01', visits: 2, checks: 1,
  days: [{ day: '2026-11-03', gold: true }, { day: '2026-11-05', gold: false }],
}, 'student A: Tuesday check-in (gold) plus today\'s visit');

// Shared iPad: student B signs in on the same device.
userId = 'student-b';
store.set(keyFor('student-b'), JSON.stringify({
  version: 2,
  meta: { lastWeeklyKey: '2026-11-01|november-w1' },
  weekly: { completedGames: {}, visitDays: {} },
}));
assert.strictEqual(plain(win.BoohaVisitDays.current()).visits, 0, 'student B does not see A\'s visits');
assert.strictEqual(win.BoohaVisitDays.record(), true, 'student B gets their own visit');
assert.deepStrictEqual(saveOf('student-b').weekly.visitDays, { '2026-11-05': 1 });
assert.deepStrictEqual(saveOf('student-a').weekly.visitDays, { '2026-11-05': 1 }, 'A is unchanged by B');
assert.ok(!localStorage.getItem('booha_visit_days'), 'no device-wide visit key');

// Locked save (signed out): no write.
userId = null;
assert.strictEqual(win.BoohaVisitDays.record(), false, 'no identity, no write');

// Sunday rollover race: Sunday's visit is written into the old bucket just
// before the live page notices the new occurrence. The reset keeps it.
userId = 'student-a';
today = '2026-11-08';
assert.strictEqual(win.BoohaVisitDays.record(), true);
assert.deepStrictEqual(saveOf('student-a').weekly.visitDays, { '2026-11-05': 1, '2026-11-08': 1 });
week = { weekStart: '2026-11-08', weekId: 'november-w2', occurrenceKey: '2026-11-08|november-w2' };
assert.deepStrictEqual(plain(win.BoohaVisitDays.current()), {
  weekStart: '2026-11-08', visits: 1, checks: 0, days: [{ day: '2026-11-08', gold: false }],
}, 'before the reset runs, last week\'s keys are already ignored');
assert.ok(win.BoohaSaveFile.resetWeekly('2026-11-08|november-w2'));
assert.deepStrictEqual(saveOf('student-a').weekly.visitDays, { '2026-11-08': 1 },
  'reset clears last week but keeps the new week\'s Sunday visit');
assert.strictEqual(win.BoohaVisitDays.record(), false, 'Sunday is not written twice');

// A plain reset with no new-week keys starts empty.
userId = 'student-b';
assert.ok(win.BoohaSaveFile.resetWeekly('2026-11-08|november-w2'));
assert.deepStrictEqual(saveOf('student-b').weekly.visitDays, {}, 'B starts the new week empty');

// Malformed occurrence keys carry nothing over.
store.set(keyFor('student-b'), JSON.stringify(Object.assign(saveOf('student-b'), {
  weekly: Object.assign(saveOf('student-b').weekly, { visitDays: { '2026-11-09': 1 } }),
})));
assert.ok(win.BoohaSaveFile.resetWeekly(''));
assert.deepStrictEqual(saveOf('student-b').weekly.visitDays, {}, 'no occurrence key, no carry-over');

// ── Wiring in index.html ─────────────────────────────────────────────────
const index = read('index.html');
const dc = index.indexOf('<script src="js/daily-check.js"></script>');
const vd = index.indexOf('<script src="js/core/visit-days.js"></script>');
assert.ok(vd > dc && dc > 0, 'index.html loads visit-days.js after daily-check.js');

console.log('hub visit days: ok');
