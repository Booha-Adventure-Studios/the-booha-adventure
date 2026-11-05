#!/usr/bin/env node
'use strict';

// Hub Pass 12: weekly postcards.
//   · Any visit in a week earns that week's postcard; 5+ visit days = deluxe.
//   · Permanent (meta.postcards), per student, survives the Sunday reset.
//   · v / g only go up within a week; month = latest visit day's month.
//   · Shown in the Trophy Case (Adventure Log) with month ornament art.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = v => JSON.parse(JSON.stringify(v));
const keyFor = id => `booha_save:v3:${id}`;

function device() {
  const store = new Map();
  let userId = null;
  let today = '2026-11-03';
  const sundayOf = d => { const t = Date.parse(`${d}T00:00:00Z`); return new Date(t - new Date(t).getUTCDay() * 86400000).toISOString().slice(0, 10); };
  const listeners = {};
  const events = [];
  const localStorage = {
    getItem: k => (k === 'booha_userid' ? userId : (store.has(k) ? store.get(k) : null)),
    setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
    key: i => Array.from(store.keys())[i] ?? null, get length() { return store.size; },
  };
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  class Event { constructor(type) { this.type = type; } }
  const document = {
    readyState: 'loading',
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    dispatchEvent(e) { events.push(e); (listeners[e.type] || []).slice().forEach(fn => fn(e)); return true; },
  };
  const ctx = { console, Date, Math, JSON, setTimeout, clearTimeout, localStorage, document, CustomEvent, Event, BoohaSync: { checkpoint() {} } };
  ctx.window = ctx;
  ctx.CALENDAR = {
    getTodayKey: () => today,
    getCurrentCurriculumWeek: () => { const ws = sundayOf(today); return { weekStart: ws, occurrenceKey: `${ws}|w` }; },
    getCurriculumWeekOccurrenceKey: cw => cw.occurrenceKey,
  };
  vm.createContext(ctx);
  ['js/core/adventure-core.js', 'js/core/save-file.js', 'js/core/visit-days.js', 'js/core/postcards.js']
    .forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return {
    ctx, store, events, P: ctx.BoohaPostcards,
    signIn(id) {
      userId = id;
      if (!store.has(keyFor(id))) store.set(keyFor(id), JSON.stringify({ version: 2, meta: { lastWeeklyKey: `${sundayOf(today)}|w` }, weekly: {} }));
      if (!ctx.BOOHA_READY) ctx.BoohaAdventure.init();
    },
    visit(day) { today = day; return ctx.BoohaVisitDays.record(); },
    check(day) {
      const s = JSON.parse(store.get(keyFor(userId)));
      s.meta.checkIn = Object.assign(s.meta.checkIn || {}, { [day]: { st: 'done', pct: 90 } });
      store.set(keyFor(userId), JSON.stringify(s));
      document.dispatchEvent(new CustomEvent('booha:checkIn', { detail: { day, st: 'done' } }));
    },
    setToday(d) { today = d; },
    saveOf: id => JSON.parse(store.get(keyFor(id))),
    pc: id => (JSON.parse(store.get(keyFor(id))).meta.postcards || {}),
  };
}

// ── Before identity: nothing ─────────────────────────────────────────────
const d = device();
assert.strictEqual(d.P.record(), null, 'no postcard before identity');
assert.deepStrictEqual(plain(d.P.list()), []);

// ── Student A, week of Nov 1 ─────────────────────────────────────────────
d.signIn('student-a');
d.visit('2026-11-03');                                  // Tue (booha:visitRecorded → record)
assert.deepStrictEqual(d.pc('student-a'), { '2026-11-01': { m: '11', v: 1, g: 0 } }, 'one visit earns the week\'s postcard');
assert.ok(d.events.some(e => e.type === 'booha:postcardUpdated' && e.detail.week === '2026-11-01'));
d.check('2026-11-03');
assert.deepStrictEqual(d.pc('student-a')['2026-11-01'], { m: '11', v: 1, g: 1 }, 'a Daily Check adds a gold day');
d.visit('2026-11-04'); d.visit('2026-11-05'); d.visit('2026-11-06');
assert.deepStrictEqual(d.pc('student-a')['2026-11-01'], { m: '11', v: 4, g: 1 });
assert.strictEqual(plain(d.P.list())[0].deluxe, false, '4 days is not a full week');
d.visit('2026-11-07');
assert.deepStrictEqual(d.pc('student-a')['2026-11-01'], { m: '11', v: 5, g: 1 });
assert.strictEqual(plain(d.P.list())[0].deluxe, true, '5 visit days = deluxe');
const up = d.events.filter(e => e.type === 'booha:postcardUpdated').pop();
assert.strictEqual(up.detail.upgraded, true, 'the upgrade to deluxe is flagged once');
const n = d.events.length;
assert.deepStrictEqual(plain(d.P.record()), { m: '11', v: 5, g: 1 }, 'nothing new → no write');
assert.strictEqual(d.events.length, n, 'and no event');

// ── Sunday reset: the postcard is permanent ──────────────────────────────
d.setToday('2026-11-08');
assert.ok(d.ctx.BoohaSaveFile.resetWeekly('2026-11-08|w'));
assert.deepStrictEqual(d.pc('student-a')['2026-11-01'], { m: '11', v: 5, g: 1 }, 'last week\'s postcard survives the reset');
d.visit('2026-11-10');
assert.deepStrictEqual(Object.keys(d.pc('student-a')).sort(), ['2026-11-01', '2026-11-08'], 'a new week, a new postcard');
assert.deepStrictEqual(plain(d.P.list()).map(c => c.week), ['2026-11-08', '2026-11-01'], 'newest first');

// Monotonic within a week (e.g. a fresh reset of this week's visits on another page).
const s = d.saveOf('student-a'); s.weekly.visitDays = {}; d.store.set(keyFor('student-a'), JSON.stringify(s));
d.visit('2026-11-11');
assert.deepStrictEqual(d.pc('student-a')['2026-11-08'], { m: '11', v: 1, g: 0 }, 'counts never go down within a week');

// ── A week that spans two months uses the latest visit's month ──────────
d.setToday('2026-11-29');
d.ctx.BoohaSaveFile.resetWeekly('2026-11-29|w');
d.visit('2026-11-29'); d.visit('2026-12-01');
assert.deepStrictEqual(d.pc('student-a')['2026-11-29'], { m: '12', v: 2, g: 0 }, 'December art once the week reaches December');

// ── Student B on the same iPad ───────────────────────────────────────────
d.signIn('student-b');
assert.deepStrictEqual(plain(d.P.list()), [], 'B has no postcards of A\'s');
d.visit('2026-12-02');
assert.deepStrictEqual(d.pc('student-b'), { '2026-11-29': { m: '12', v: 1, g: 0 } });
assert.strictEqual(Object.keys(d.pc('student-a')).length, 3, 'A is unchanged');

// ── Normalization ────────────────────────────────────────────────────────
assert.strictEqual(d.P.normalizeCard({ m: '13', v: 2 }), null);
assert.strictEqual(d.P.normalizeCard({ m: '11', v: 0 }), null, 'no visits, no card');
assert.deepStrictEqual(plain(d.P.normalizeCard({ m: '11', v: 9, g: 12 })), { m: '11', v: 7, g: 7 }, 'capped to a week');
const bad = d.saveOf('student-b'); bad.meta.postcards['nope'] = { m: '11', v: 3 }; bad.meta.postcards['2026-10-04'] = 'x';
d.store.set(keyFor('student-b'), JSON.stringify(bad));
assert.deepStrictEqual(plain(d.P.list()).map(c => c.week), ['2026-11-29'], 'junk entries are ignored');

// ── Rendering ────────────────────────────────────────────────────────────
const P = d.P;
const empty = P.renderHTML([], {});
assert.match(empty, /Your first postcard arrives the week you visit\./, 'friendly empty state');
const html = P.renderHTML([
  { week: '2026-11-29', m: '12', v: 2, g: 0, deluxe: false },
  { week: '2026-11-01', m: '11', v: 5, g: 1, deluxe: true },
], { artFor: day => `art/${day.slice(5, 7)}.webp` });
assert.match(html, /POSTCARDS · 2 · ★ 1/, 'count and deluxe count');
assert.strictEqual((html.match(/class="rb-postcard[ "]/g) || []).length, 2);
assert.match(html, /<figure class="rb-postcard deluxe" aria-label="Week of Nov 1: 5 visits, 1 Daily Check, full week">/);
assert.match(html, /<i class="rb-pc-stamp">FULL WEEK<\/i>/);
assert.match(html, /<img src="art\/12\.webp"/, 'art comes from the month');
assert.match(html, /11月29日の しゅう/);
assert.ok(html.indexOf('Week of Nov 29') < html.indexOf('Week of Nov 1:'), 'newest first');
assert.match(P.renderHTML([{ week: '2026-11-01', m: '11', v: 1, g: 0 }], { artFor: () => '"><script>' }), /&quot;&gt;&lt;script&gt;/, 'escaped');
assert.strictEqual((P.renderHTML(Array.from({ length: 20 }, (_, i) => ({ week: `2026-0${(i % 9) + 1}-0${(i % 7) + 1}`, m: '01', v: 1, g: 0 }))).match(/class="rb-postcard[ "]/g) || []).length, 12, 'shows the latest 12');

// ── Wiring ───────────────────────────────────────────────────────────────
const index = read('index.html');
const profile = read('profile.html');
const pg = read('js/ui/profile-game.js');
assert.ok(index.indexOf('js/core/postcards.js') > index.indexOf('js/core/visit-days.js'), 'hub loads postcards after visit-days');
const order = ['./js/core/visit-days.js', './js/ui/hub-ornament-banner.js', './js/core/postcards.js', './js/ui/profile-game.js'].map(f => profile.indexOf(`<script src="${f}"></script>`));
order.forEach(i => assert.ok(i > 0));
assert.deepStrictEqual(order.slice().sort((a, b) => a - b), order, 'profile: visit-days → banner → postcards → profile-game');
assert.match(pg, /\$\{renderPostcards\(\)\}`;/, 'the Trophy Case draws the postcards shelf');
assert.match(pg, /document\.addEventListener\('booha:postcardUpdated', render\);/);
const pcCss = profile.slice(profile.indexOf('.rb-postcards {'), profile.indexOf('.rb-pc-stamp') + 400);
assert.doesNotMatch(pcCss, /animation|transition|filter\s*:/, 'static postcard styling');

console.log('postcards: ok');
