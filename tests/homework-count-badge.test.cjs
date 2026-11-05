#!/usr/bin/env node
'use strict';

// Hub Pass 10: the quiet count on the notebook Homework button.
//   · 45 → 44 → … as the student ticks "copied into my notebook" for their
//     current class this week; hidden at zero; no animation.
//   · Same save source as the list's ticks (weekly.homework) — per student.
//   · Before identity: hidden. Totals sharpen to the real content once the
//     list has loaded it; the hub makes no content requests on its own.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const index = read('index.html');

function slice(startMarker, endMarker) {
  const s = index.indexOf(startMarker);
  const e = index.indexOf(endMarker, s);
  assert.ok(s >= 0 && e > s, `${startMarker} must remain extractable`);
  return index.slice(s, e);
}
const sectionsSrc = slice('const HOMEWORK_SECTIONS = [', '];') + '];';
const weekCardsSrc = slice('function homeworkWeekCards(', '/* Hub Pass 9');
const ticksSrc = slice('/* Hub Pass 9: "copied into my notebook" ticks', '// A list opened before the student\'s save was ready');
const badgeSrc = slice('/* Hub Pass 10: a quiet count', "hubHomeworkBtn.addEventListener('click'");

assert.doesNotMatch(badgeSrc, /localStorage|fetch\(/, 'the badge never reads device storage or fetches content');
assert.doesNotMatch(badgeSrc.replace(/\/\*[\s\S]*?\*\//g, ''), /animation|classList\.add\('is-/, 'a quiet count: no animation');

const WEEK = { weekStart: '2026-11-01', monthSlug: 'november', monthLabel: 'November', weekNumber: 1 };
const keyFor = id => `booha_save:v3:${id}`;

function hub() {
  const store = new Map();
  let userId = null;
  const listeners = {};
  const badge = { hidden: true, textContent: '' };
  const btnAttrs = {};
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  class Event { constructor(type) { this.type = type; } }
  const document = {
    readyState: 'loading',
    getElementById: id => (id === 'hubHomeworkCount' ? badge : null),
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent(e) { (listeners[e.type] || []).forEach(fn => fn(e)); return true; },
  };
  const localStorage = {
    getItem: k => (k === 'booha_userid' ? userId : (store.has(k) ? store.get(k) : null)),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    key: i => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  const ctx = {
    console, Date, Math, JSON, Map, Set, setTimeout, clearTimeout, localStorage, document, CustomEvent, Event,
    BoohaSync: { checkpoint() {} },
    hubHomeworkBtn: { setAttribute: (k, v) => { btnAttrs[k] = v; } },
    homeworkCache: new Map(),
    homeworkWeekRange: () => WEEK,
    curriculum: 'pb',
  };
  ctx.window = ctx;
  ctx.BoohaCurriculum = { get: () => ctx.curriculum };
  ctx.CALENDAR = {
    getCurrentCurriculumWeek: () => ({ occurrenceKey: '2026-11-01|november-w1', weekStart: '2026-11-01' }),
    getCurriculumWeekOccurrenceKey: cw => cw.occurrenceKey,
  };
  vm.createContext(ctx);
  vm.runInContext(read('js/core/adventure-core.js'), ctx, { filename: 'js/core/adventure-core.js' });
  vm.runInContext(read('js/core/save-file.js'), ctx, { filename: 'js/core/save-file.js' });
  vm.runInContext(read('js/core/homework-store.js'), ctx, { filename: 'js/core/homework-store.js' });
  vm.runInContext([sectionsSrc, weekCardsSrc, ticksSrc, badgeSrc].join('\n'), ctx, { filename: 'index-homework-count.js' });
  return {
    ctx, badge, btnAttrs, listeners, store,
    signIn(id, save) {
      userId = id;
      store.set(keyFor(id), JSON.stringify(save || { version: 2, meta: { lastWeeklyKey: '2026-11-01|november-w1' }, weekly: {} }));
      if (!ctx.BOOHA_READY) ctx.BoohaAdventure.init();
    },
    fire: type => (listeners[type] || []).forEach(fn => fn({ type })),
    tick: (curr, keys) => ctx.saveHomeworkCopied(curr, WEEK, new Set(keys)),
    shown: () => (badge.hidden ? null : badge.textContent),
  };
}

// Before identity: hidden.
const h = hub();
h.ctx.updateHomeworkCountBadge();
assert.strictEqual(h.shown(), null, 'hidden before identity is ready');

// Student A arrives: nothing copied yet → 45.
h.signIn('student-a');
h.fire('booha:ready');
assert.strictEqual(h.shown(), '45', 'a fresh week shows 45 (15 words + 15 sentences + 15 questions)');
assert.strictEqual(h.btnAttrs['aria-label'], 'Homework: 45 left to copy / しゅくだい のこり 45');

// Ticking counts down through the change event, quietly.
h.tick('pb', ['vocab:1']);
assert.strictEqual(h.shown(), '44');
h.tick('pb', ['vocab:1', 'vocab:2', 'sentences:15']);
assert.strictEqual(h.shown(), '42');
h.tick('pb', ['vocab:1', 'sentences:15']);
assert.strictEqual(h.shown(), '43', 'un-ticking counts back up');

// Ticks for another class do not count toward this class.
h.tick('br', ['vocab:1', 'vocab:2', 'vocab:3']);
assert.strictEqual(h.shown(), '43');
// Switching class: the badge follows the student's current class.
h.ctx.curriculum = 'br';
h.ctx.updateHomeworkCountBadge();
assert.strictEqual(h.shown(), '42');
h.ctx.curriculum = 'pb';

// Unknown or out-of-range keys never count.
h.tick('pb', ['vocab:1', 'sentences:15', 'vocab:16', 'colour:3', 'questions:0']);
assert.strictEqual(h.shown(), '43');

// Everything copied → the badge disappears.
const all = [];
['vocab', 'sentences', 'questions'].forEach(s => { for (let n = 1; n <= 15; n++) all.push(`${s}:${n}`); });
h.tick('pb', all);
assert.strictEqual(h.shown(), null, 'hidden at zero');
assert.strictEqual(h.btnAttrs['aria-label'], 'Homework / しゅくだい');

// Real totals: once the list has loaded a short week (e.g. 12 questions), the count uses it.
h.tick('pb', []);
const cards = n => ({ cards: Array.from({ length: n }, (_, i) => ({ n: i + 1, en: `item ${i + 1}` })) });
h.ctx.homeworkCache.set('2026-11-01:pb', { vocab: cards(15), sentences: cards(15), questions: cards(12) });
h.ctx.updateHomeworkCountBadge();
assert.strictEqual(h.shown(), '42', 'totals come from the loaded content when available');

// Student B on the same iPad: their own count.
h.signIn('student-b');
h.ctx.updateHomeworkCountBadge();
assert.strictEqual(h.shown(), '42', 'B starts from their own (empty) ticks');
h.tick('pb', ['vocab:5']);
assert.strictEqual(h.shown(), '41');
h.signIn('student-a', JSON.parse(h.store.get(keyFor('student-a'))));
h.ctx.updateHomeworkCountBadge();
assert.strictEqual(h.shown(), '42', 'A is unaffected by B');

// Sunday reset: back to a full count.
h.tick('pb', ['vocab:1', 'vocab:2']);
assert.strictEqual(h.shown(), '40');
h.ctx.BoohaSaveFile.resetWeekly('2026-11-08|november-w2');
h.fire('booha:weeklyReset');
assert.strictEqual(h.shown(), '42', 'the reset clears the ticks (still the cached short week here)');

// Wiring.
['booha:ready', 'booha:homeworkChanged', 'booha:weeklyReset'].forEach(ev =>
  assert.ok(index.includes(`document.addEventListener('${ev}', updateHomeworkCountBadge);`), `badge refreshes on ${ev}`));
assert.match(index, /updateMazeFriendCue\(\);\s*updateHomeworkCountBadge\(\);/, 'badge refreshes with the hub (class changes)');
assert.match(index, /const data = await loadHomeworkTrack\(curr, week\);\s*\/\/[^\n]*\n\s*updateHomeworkCountBadge\(\);/, 'badge sharpens when content loads');
assert.match(index, /<span id="hubHomeworkCount" class="hubHomeworkCount" hidden><\/span>/);
assert.match(index, /\.hubHomeworkCount \{[^}]*background: #2c4f86;[^}]*font-variant-numeric: tabular-nums;/, 'quiet ink-blue tab');
assert.doesNotMatch(index, /hubHomeworkNew|markHomeworkSeen|homeworkSeenThisWeek/, 'the NEW badge is fully retired');

console.log('homework count badge: ok');
