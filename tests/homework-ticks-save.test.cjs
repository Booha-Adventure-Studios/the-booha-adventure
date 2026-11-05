#!/usr/bin/env node
'use strict';

// Hub Pass 9: the hub homework list's "copied into my notebook" ticks live
// in the student's own save (weekly.homework), not device-wide localStorage.
//   · two students on one device stay isolated
//   · switching devices preserves progress (the save blob is what syncs)
//   · the Sunday reset clears it (keeping only a bucket already in the new week)
//   · old booha_hw_copied_* / booha_hw_known_* keys are not migrated, are
//     removed only once identity is ready, and never reappear
//   · nothing is read or written before identity is ready
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
const index = read('index.html');

const start = index.indexOf('/* Hub Pass 9: "copied into my notebook" ticks');
const end = index.indexOf('// A list opened before the student\'s save was ready', start);
assert.ok(start > 0 && end > start, 'hub homework tick functions are extractable');
const hubSrc = index.slice(start, end);
assert.doesNotMatch(hubSrc.replace(/booha_hw_copied_/g, ''), /localStorage\.(getItem|setItem)/,
  'ticks are never read from or written to device-wide storage');

const WEEK = { weekStart: '2026-11-01', monthLabel: 'November', weekNumber: 1 };
const keyFor = id => `booha_save:v3:${id}`;

function device(initial = {}) {
  const store = new Map(Object.entries(initial));
  let userId = null;
  let occurrence = '2026-11-01|november-w1';
  const events = [];
  const localStorage = {
    getItem: k => (k === 'booha_userid' ? userId : (store.has(k) ? store.get(k) : null)),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    key: i => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  class Event { constructor(type) { this.type = type; } }
  const listeners = {};
  const document = {
    readyState: 'loading',
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent(e) { events.push(e); (listeners[e.type] || []).slice().forEach(fn => fn(e)); return true; },
  };
  const ctx = {
    console, Date, Math, JSON, setTimeout, clearTimeout, localStorage, document, CustomEvent, Event,
    BoohaSync: { checkpoint() {} },
  };
  ctx.window = ctx;
  ctx.CALENDAR = {
    getCurrentCurriculumWeek: () => ({ occurrenceKey: occurrence, weekStart: occurrence.slice(0, 10) }),
    getCurriculumWeekOccurrenceKey: cw => cw.occurrenceKey,
  };
  vm.createContext(ctx);
  vm.runInContext(read('js/core/adventure-core.js'), ctx, { filename: 'js/core/adventure-core.js' });
  vm.runInContext(read('js/core/save-file.js'), ctx, { filename: 'js/core/save-file.js' });
  vm.runInContext(read('js/core/homework-store.js'), ctx, { filename: 'js/core/homework-store.js' });
  vm.runInContext(hubSrc, ctx, { filename: 'index-homework-ticks.js' });
  return {
    ctx, store, events,
    signIn(id) { userId = id; if (!ctx.BOOHA_READY) ctx.BoohaAdventure.init(); },
    setOccurrence(k) { occurrence = k; },
    saveOf: id => JSON.parse(store.get(keyFor(id)) || 'null'),
    get: (curr, week = WEEK) => Array.from(ctx.getHomeworkCopied(curr, week)).sort(),
    tick(curr, keys, week = WEEK) { return ctx.saveHomeworkCopied(curr, week, new Set(keys)); },
  };
}

// ── Before identity: nothing read, nothing written ───────────────────────
const legacy = {
  'booha_hw_copied_2026-11-01_pb': JSON.stringify(['vocab:1', 'vocab:2']),   // old device-wide ticks
  'booha_hw_copied_2026-10-25_br': JSON.stringify(['questions:4']),
  'booha_hw_known_pb_nov_w1_vocab': JSON.stringify([1, 2]),                  // homework.html still uses these
  [keyFor('student-a')]: JSON.stringify({
    version: 2,
    meta: { lastWeeklyKey: '2026-11-01|november-w1' },
    weekly: { completedGames: {} },          // a save from before this pass: no weekly.homework
  }),
};
const d1 = device(legacy);
// Pass 11a: old keys are removed only once a student is identified.
assert.ok(d1.store.has('booha_hw_copied_2026-11-01_pb'), 'nothing is removed before identity');
assert.deepStrictEqual(d1.get('pb'), [], 'nothing is read before identity');
assert.strictEqual(d1.tick('pb', ['vocab:1']), false, 'nothing is written before identity');

// ── Student A ────────────────────────────────────────────────────────────
d1.signIn('student-a');
assert.ok(!d1.store.has('booha_hw_copied_2026-11-01_pb'), 'old hub ticks are removed once identity is ready');
assert.ok(!d1.store.has('booha_hw_copied_2026-10-25_br'));
assert.ok(!d1.store.has('booha_hw_known_pb_nov_w1_vocab'), 'old homework.html keys are removed too (Pass 11a)');
assert.deepStrictEqual(plain(d1.ctx.BoohaSaveFile.load().weekly.homework), { weekStart: '', copied: {}, known: {} },
  'older saves gain an empty homework bucket');
assert.deepStrictEqual(d1.get('pb'), [], 'old ticks do not reappear for the signed-in student');
assert.strictEqual(d1.tick('pb', ['vocab:1', 'sentences:2']), true);
assert.deepStrictEqual(d1.saveOf('student-a').weekly.homework,
  { weekStart: '2026-11-01', copied: { pb: ['sentences:2', 'vocab:1'] }, known: {} }, 'stored in A\'s save');
assert.deepStrictEqual(d1.get('pb'), ['sentences:2', 'vocab:1']);
assert.ok(d1.events.some(e => e.type === 'booha:homeworkChanged' && e.detail.copied === 2), 'change event for the badge');
// Another class keeps its own list; the first is untouched.
d1.tick('br', ['questions:15']);
assert.deepStrictEqual(d1.saveOf('student-a').weekly.homework.copied, { pb: ['sentences:2', 'vocab:1'], br: ['questions:15'] });
// Un-ticking.
d1.tick('pb', ['vocab:1']);
assert.deepStrictEqual(d1.get('pb'), ['vocab:1']);

// ── Student B on the same iPad ───────────────────────────────────────────
d1.signIn('student-b');
d1.store.set(keyFor('student-b'), JSON.stringify({ version: 2, meta: { lastWeeklyKey: '2026-11-01|november-w1' }, weekly: {} }));
assert.deepStrictEqual(d1.get('pb'), [], 'B does not see A\'s ticks');
d1.tick('pb', ['questions:3']);
assert.deepStrictEqual(d1.saveOf('student-b').weekly.homework.copied, { pb: ['questions:3'] });
assert.deepStrictEqual(d1.saveOf('student-a').weekly.homework.copied.pb, ['vocab:1'], 'A is unchanged by B');
assert.ok(!Array.from(d1.store.keys()).some(k => k.startsWith('booha_hw_copied_')), 'no device-wide tick keys are written');

// ── A switches to another iPad (the synced save blob arrives) ────────────
const d2 = device({ [keyFor('student-a')]: d1.store.get(keyFor('student-a')) });
d2.signIn('student-a');
assert.deepStrictEqual(d2.get('pb'), ['vocab:1'], 'progress follows the student to another device');
assert.deepStrictEqual(d2.get('br'), ['questions:15']);

// ── A stale bucket is ignored ────────────────────────────────────────────
assert.deepStrictEqual(d2.get('pb', { weekStart: '2026-11-08' }), [], 'last week\'s ticks never show in a new week');

// ── Sunday reset ─────────────────────────────────────────────────────────
d2.setOccurrence('2026-11-08|november-w2');
assert.ok(d2.ctx.BoohaSaveFile.resetWeekly('2026-11-08|november-w2'));
assert.deepStrictEqual(d2.saveOf('student-a').weekly.homework, { weekStart: '', copied: {}, known: {} }, 'the reset clears last week\'s ticks');
// Race: a tick saved for the new week just before the page noticed the rollover survives.
d2.tick('pb', ['vocab:9'], { weekStart: '2026-11-08' });
assert.ok(d2.ctx.BoohaSaveFile.resetWeekly('2026-11-08|november-w2'));
assert.deepStrictEqual(d2.saveOf('student-a').weekly.homework, { weekStart: '2026-11-08', copied: { pb: ['vocab:9'] }, known: {} },
  'a bucket already in the new week is kept');

// ── Malformed data is cleaned on load ────────────────────────────────────
const d3 = device({ [keyFor('student-c')]: JSON.stringify({
  version: 2, meta: { lastWeeklyKey: '2026-11-01|november-w1' },
  weekly: { homework: { weekStart: 'nope', copied: { pb: ['vocab:1', 42, '<script>', 'sentences:15'], xx: ['vocab:1'] } } },
}) });
d3.signIn('student-c');
assert.deepStrictEqual(plain(d3.ctx.BoohaSaveFile.load().weekly.homework), { weekStart: '', copied: { pb: ['vocab:1', 'sentences:15'] }, known: {} });

// ── index.html wiring ────────────────────────────────────────────────────
assert.match(index, /if \(!saveHomeworkCopied\(ctx\.curr, ctx\.week, set\)\) return;\s*paint\(set\.has\(key\)\);/,
  'a tick only paints after it is saved');
assert.match(index, /document\.addEventListener\('booha:ready', repaintOpenHomeworkList\);/, 'an open list repaints once identity is ready');
assert.match(index, /document\.addEventListener\('booha:weeklyReset', repaintOpenHomeworkList\);/);
assert.doesNotMatch(index, /function homeworkCopiedKey\(/, 'the device-wide key helper is gone');

console.log('homework ticks in the student save: ok');
