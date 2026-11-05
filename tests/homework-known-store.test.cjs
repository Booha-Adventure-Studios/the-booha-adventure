#!/usr/bin/env node
'use strict';

// Pass 11a: homework.html's "hide items I know" moves into the student save,
// in the same bucket as the hub's notebook ticks:
//   weekly.homework.known = { 'YYYY-MM-DD': { pb: { vocab: [1, 2] } } }
// keyed by week start, limited to last / this / next week, pruned to that
// window on the Sunday reset. js/core/homework-store.js is the only
// reader/writer for both pages.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
const page = read('homework.html');
const keyFor = id => `booha_save:v3:${id}`;

const pageStart = page.indexOf('let activeWeekStart = null;');
const pageEnd = page.indexOf('async function loadCards', pageStart);
assert.ok(pageStart > 0 && pageEnd > pageStart, 'homework.html store wrappers are extractable');
const pageSrc = page.slice(pageStart, pageEnd);

function device(initial = {}) {
  const store = new Map(Object.entries(initial));
  let userId = null;
  let occurrence = '2026-11-01|november-w1';
  const listeners = {};
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
  const document = {
    readyState: 'loading',
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent(e) { events.push(e); (listeners[e.type] || []).slice().forEach(fn => fn(e)); return true; },
  };
  const ctx = { console, Date, Math, JSON, Set, setTimeout, clearTimeout, localStorage, document, CustomEvent, Event, BoohaSync: { checkpoint() {} } };
  ctx.window = ctx;
  ctx.CALENDAR = {
    getCurrentCurriculumWeek: () => ({ occurrenceKey: occurrence, weekStart: occurrence.slice(0, 10) }),
    getCurriculumWeekOccurrenceKey: cw => cw.occurrenceKey,
  };
  vm.createContext(ctx);
  ['js/core/adventure-core.js', 'js/core/save-file.js', 'js/core/homework-store.js'].forEach(f =>
    vm.runInContext(read(f), ctx, { filename: f }));
  vm.runInContext(pageSrc + '\n;this.__setWeek = w => { activeWeekStart = w; };', ctx, { filename: 'homework-page.js' });
  const S = ctx.BoohaHomeworkStore;
  return {
    ctx, S, store, events,
    signIn(id, save) {
      userId = id;
      if (save !== undefined) store.set(keyFor(id), JSON.stringify(save));
      else if (!store.has(keyFor(id))) store.set(keyFor(id), JSON.stringify({ version: 2, meta: { lastWeeklyKey: occurrence }, weekly: {} }));
      if (!ctx.BOOHA_READY) ctx.BoohaAdventure.init();
    },
    setOccurrence(k) { occurrence = k; },
    saveOf: id => JSON.parse(store.get(keyFor(id)) || 'null'),
    known: (w, c, s) => Array.from(S.getKnown(w, c, s)),
  };
}

// ── Before identity: nothing ─────────────────────────────────────────────
const d = device({ 'booha_hw_known_pb_nov_w1_vocab': '[1,2,3]', 'booha_hw_copied_2026-11-01_pb': '["vocab:1"]' });
assert.deepStrictEqual(d.known('2026-11-01', 'pb', 'vocab'), [], 'nothing read before identity');
assert.strictEqual(d.S.setKnown('2026-11-01', 'pb', 'vocab', new Set([1])), false, 'nothing written before identity');
assert.strictEqual(d.S.clearLegacy(), 0, 'legacy keys are not touched before identity');
assert.ok(d.store.has('booha_hw_known_pb_nov_w1_vocab'));

// ── Student A ────────────────────────────────────────────────────────────
d.signIn('student-a');
assert.deepStrictEqual(d.known('2026-11-01', 'pb', 'vocab'), [], 'old device-wide hides are not migrated');
assert.strictEqual(d.S.clearLegacy(), 2, 'old copied + known keys are removed once identity is ready');
assert.ok(!Array.from(d.store.keys()).some(k => k.startsWith('booha_hw_')), 'no legacy keys remain');

// Last / this / next week each keep their own hides.
assert.ok(d.S.setKnown('2026-10-25', 'pb', 'vocab', new Set([3])), 'last week');
assert.ok(d.S.setKnown('2026-11-01', 'pb', 'vocab', new Set([2, 1, 2])), 'this week (dedup + sort)');
assert.ok(d.S.setKnown('2026-11-08', 'br', 'questions', new Set([7])), 'next week');
assert.strictEqual(d.S.setKnown('2026-10-18', 'pb', 'vocab', new Set([1])), false, 'two weeks ago is outside the window');
assert.strictEqual(d.S.setKnown('2026-11-01', 'zz', 'vocab', new Set([1])), false, 'unknown class');
assert.strictEqual(d.S.setKnown('2026-11-01', 'pb', 'grammar', new Set([1])), false, 'unknown section');
assert.deepStrictEqual(d.known('2026-11-01', 'pb', 'vocab'), [1, 2]);
assert.deepStrictEqual(d.saveOf('student-a').weekly.homework.known, {
  '2026-10-25': { pb: { vocab: [3] } },
  '2026-11-01': { pb: { vocab: [1, 2] } },
  '2026-11-08': { br: { questions: [7] } },
});
assert.ok(d.events.some(e => e.type === 'booha:homeworkKnownChanged'));

// Item numbers are validated (1–15 integers).
d.S.setKnown('2026-11-01', 'pb', 'sentences', new Set([0, 4, 16, '5', 'x', 2.5]));
assert.deepStrictEqual(d.known('2026-11-01', 'pb', 'sentences'), [4, 5]);

// ── Hub and sheet preserve each other's fields ──────────────────────────
assert.ok(d.S.setCopied('pb', '2026-11-01', new Set(['vocab:1', 'questions:3'])), 'hub ticks');
let hw = d.saveOf('student-a').weekly.homework;
assert.deepStrictEqual(hw.copied, { pb: ['questions:3', 'vocab:1'] });
assert.deepStrictEqual(hw.known['2026-11-01'].pb.vocab, [1, 2], 'a hub tick keeps the sheet\'s hides');
d.S.setKnown('2026-11-01', 'pb', 'vocab', new Set([1, 2, 9]));
hw = d.saveOf('student-a').weekly.homework;
assert.deepStrictEqual(hw.copied, { pb: ['questions:3', 'vocab:1'] }, 'a sheet hide keeps the hub\'s ticks');
assert.strictEqual(hw.weekStart, '2026-11-01');
// The hub starting a new week's copied list never drops known.
d.S.setCopied('pb', '2026-11-08', new Set(['vocab:2']));
hw = d.saveOf('student-a').weekly.homework;
assert.deepStrictEqual([hw.weekStart, hw.copied], ['2026-11-08', { pb: ['vocab:2'] }]);
assert.ok(hw.known['2026-11-01'] && hw.known['2026-11-08'], 'known weeks survive a copied-week change');
d.S.setCopied('pb', '2026-11-01', new Set(['questions:3', 'vocab:1']));

// homework.html's own wrappers use the chosen week.
d.ctx.__setWeek('2026-10-25');
assert.deepStrictEqual(Array.from(d.ctx.getKnown('pb_oct_w4', 'pb', 'vocab')), [3], 'the page reads the chosen week');
assert.strictEqual(d.ctx.saveKnown('pb_oct_w4', 'pb', 'vocab', new Set([3, 4])), true);
assert.deepStrictEqual(d.known('2026-10-25', 'pb', 'vocab'), [3, 4]);
d.ctx.__setWeek(null);
assert.strictEqual(d.ctx.saveKnown('x', 'pb', 'vocab', new Set([1])), false, 'no week chosen → no write');

// ── Student B on the same iPad ───────────────────────────────────────────
d.signIn('student-b');
assert.deepStrictEqual(d.known('2026-11-01', 'pb', 'vocab'), [], 'B does not see A\'s hides');
d.S.setKnown('2026-11-01', 'pb', 'vocab', new Set([15]));
assert.deepStrictEqual(d.saveOf('student-b').weekly.homework.known, { '2026-11-01': { pb: { vocab: [15] } } });
assert.deepStrictEqual(d.saveOf('student-a').weekly.homework.known['2026-11-01'].pb.vocab, [1, 2, 9], 'A is unchanged');

// ── A on another iPad (synced save) ──────────────────────────────────────
const d2 = device({ [keyFor('student-a')]: d.store.get(keyFor('student-a')) });
d2.signIn('student-a');
assert.deepStrictEqual(d2.known('2026-11-08', 'br', 'questions'), [7], 'hides follow the student');
assert.deepStrictEqual(Array.from(d2.S.getCopied('pb', '2026-11-01')), ['questions:3', 'vocab:1']);

// ── Sunday reset: the window rolls ───────────────────────────────────────
d2.setOccurrence('2026-11-08|november-w2');
// Before the reset runs, the stale "last week" (Oct 25) is already ignored on read.
assert.deepStrictEqual(d2.known('2026-10-25', 'pb', 'vocab'), [], 'stale weeks are ignored at read time');
assert.ok(d2.ctx.BoohaSaveFile.resetWeekly('2026-11-08|november-w2'));
hw = d2.saveOf('student-a').weekly.homework;
assert.deepStrictEqual(Object.keys(hw.known).sort(), ['2026-11-01', '2026-11-08'],
  'old "this week" becomes last week, old "next week" becomes this week, Oct 25 is dropped');
assert.deepStrictEqual(hw.known['2026-11-08'], { br: { questions: [7] } }, 'hides made in advance survive the rollover');
assert.deepStrictEqual([hw.weekStart, hw.copied], ['', {}], 'copied clears (it was last week\'s)');
assert.ok(d2.S.setKnown('2026-11-15', 'pb', 'vocab', new Set([1])), 'the new next week is available');
assert.strictEqual(d2.S.setKnown('2026-10-25', 'pb', 'vocab', new Set([1])), false, 'and the old one is gone');

// ── Normalization on load ────────────────────────────────────────────────
const d3 = device();
d3.signIn('student-c', {
  version: 2, meta: { lastWeeklyKey: '2026-11-01|november-w1' },
  weekly: { homework: {
    weekStart: '2026-11-01',
    copied: { pb: ['vocab:1', 'vocab:99', 'colour:2'] },
    known: {
      '2026-11-01': { pb: { vocab: [3, 3, 1, 'x', 40], grammar: [1] }, zz: { vocab: [1] } },
      'not-a-week': { pb: { vocab: [1] } },
      '2026-11-08': { pb: { vocab: [] } },
    },
  } },
});
assert.deepStrictEqual(plain(d3.ctx.BoohaSaveFile.load().weekly.homework), {
  weekStart: '2026-11-01', copied: { pb: ['vocab:1'] }, known: { '2026-11-01': { pb: { vocab: [1, 3] } } },
});

// ── homework.html wiring ─────────────────────────────────────────────────
const order = ['/the-booha-adventure/js/calendar.js', './js/core/adventure-core.js', './js/core/save-file.js', './js/sync-client.js', './js/core/homework-store.js'];
const idx = order.map(src => page.indexOf(`<script src="${src}"></script>`));
idx.forEach((i, n) => assert.ok(i > 0, `homework.html loads ${order[n]}`));
assert.deepStrictEqual(idx.slice().sort((a, b) => a - b), idx, 'boot stack order: calendar → core → save → sync → store');
assert.doesNotMatch(page, /localStorage\.(getItem|setItem)\(/, 'no device-wide reads or writes remain');
assert.match(page, /data-week-start="\$\{last\.weekStart\}"/);
assert.match(page, /data-week-start="\$\{thisW\.weekStart\}"/);
assert.match(page, /data-week-start="\$\{next\.weekStart\}"/);
assert.match(page, /activeWeekStart=btn\.dataset\.weekStart\|\|null;/);
assert.match(page, /if\(!saveKnown\(weekCode,curr,type,set\)\) return;/, 'only re-render what was saved');
assert.match(page, /document\.addEventListener\('booha:ready', startHomework, \{ once: true \}\);/, 'renders after the save is ready');
assert.match(page, /function startHomework\(\) \{\s*try \{ window\.BoohaHomeworkStore && window\.BoohaHomeworkStore\.clearLegacy\(\); \}/, 'legacy keys cleared once ready');
const sw = read('sw.js');
assert.ok(sw.includes('homework.html'), 'homework.html stays in the page cache');

console.log('homework known store: ok');
