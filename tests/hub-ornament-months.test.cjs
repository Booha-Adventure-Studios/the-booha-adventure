#!/usr/bin/env node
'use strict';

// Hub Pass 5: per-month QA for the ornament banner on a LIVE page.
// Runs the real index.html date-change + visit + banner code together with
// the real visit-days.js and hub-ornament-banner.js, an in-memory student
// save and a calendar the test moves forward, across every boundary:
//   Nov 30 → Dec 1 (mid-week art change; December lights take over)
//   Sat → Sun (weekly reset: fresh strand)
//   Dec 31 → Jan 1, Jan 31 → Feb 1, Feb 28 → Mar 1 (banner hides),
//   and a leap day.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const index = read('index.html');

function slice(startMarker, endMarker) {
  const start = index.indexOf(startMarker);
  const end = index.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `${startMarker} must remain extractable`);
  return index.slice(start, end);
}
const refreshSrc = slice('function seasonTodayKey()', "document.addEventListener('visibilitychange'");
const visitSrc = slice('/* Weekly visit record for the hub ornament banner', '\nlet started = false');

// ── Fake DOM (only what the banner and page code touch) ──────────────────
class FakeNode {
  constructor(doc, tag) {
    this.ownerDocument = doc; this.tagName = tag; this.children = []; this.parent = null;
    this.style = {}; this.dataset = {}; this.attrs = {}; this.hidden = false; this.className = '';
    this.offsetWidth = 10;
    const set = new Set();
    this.classList = {
      add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c),
      toggle: (c, on) => { if (on) set.add(c); else set.delete(c); return on; },
    };
  }
  get firstChild() { return this.children[0] || null; }
  appendChild(n) { n.parent = this; this.children.push(n); return n; }
  removeChild(n) { this.children = this.children.filter(c => c !== n); n.parent = null; return n; }
  remove() { if (this.parent) this.parent.removeChild(this); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
}
const listeners = {};
const doc = {
  hidden: false,
  createElement(tag) { return new FakeNode(doc, tag); },
  createElementNS(ns, tag) { return new FakeNode(doc, tag); },
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  dispatchEvent(ev) { (listeners[ev.type] || []).slice().forEach(fn => fn(ev)); return true; },
  getElementById(id) {
    if (id === 'hubOrnamentBanner') return banner;
    if (id === 'hubScene') return hubScene;
    return null;
  },
};
const banner = new FakeNode(doc, 'div');
banner.hidden = true;
const hubScene = { classList: { contains: c => c === 'active' } };
class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }

// ── Calendar the test controls (Tokyo day keys, Sunday-start weeks) ──────
let today = '2026-11-29';
function sundayOf(day) {
  const t = Date.parse(`${day}T00:00:00Z`);
  const d = new Date(t);
  return new Date(t - d.getUTCDay() * 86400000).toISOString().slice(0, 10);
}

// ── One student's save in memory ─────────────────────────────────────────
const save = { meta: { checkIn: {} }, weekly: { visitDays: {} } };
const saveFile = {
  key: () => 'booha_save:v3:month-student',
  load: () => JSON.parse(JSON.stringify(save)),
  patchDeep(section, key, obj) { Object.assign(save[section][key], obj); return true; },
};
function sundayReset() {                       // what resetWeekly does to visitDays
  const start = sundayOf(today);
  Object.keys(save.weekly.visitDays).forEach(k => { if (k < start) delete save.weekly.visitDays[k]; });
}
function dailyCheck(day) {
  save.meta.checkIn[day] = { st: 'done', pct: 90 };
  doc.dispatchEvent(new CustomEvent('booha:checkIn', { detail: { day, st: 'done', pct: 90 } }));
}

const ctx = {
  console, Date, Math, JSON, Intl, Set, Map,
  document: doc, CustomEvent,
  applySeasonalLandingSkin() {},
  renderDailyCheckStamp() {},
};
ctx.window = ctx;
ctx.BOOHA_READY = true;
ctx.BoohaSaveFile = saveFile;
ctx.BoohaSkins = { applySeasonTheme() {} };
ctx.CALENDAR = {
  getTodayKey: () => today,
  getCurrentCurriculumWeek: () => ({ weekStart: sundayOf(today) }),
};
vm.createContext(ctx);
vm.runInContext(read('js/core/visit-days.js'), ctx, { filename: 'js/core/visit-days.js' });
vm.runInContext(read('js/ui/hub-ornament-banner.js'), ctx, { filename: 'js/ui/hub-ornament-banner.js' });
vm.runInContext(refreshSrc + '\n' + visitSrc, ctx, { filename: 'index-hub-live.js' });

const orn = () => (banner._ob ? banner._ob.wrap.children : []);
const srcs = () => orn().map(o => o.children[0].children[0].src.replace(/^.*ornament-/, ''));
const days = () => orn().map(o => o.dataset.day);
function nextDay() {
  const t = Date.parse(`${today}T00:00:00Z`) + 86400000;
  today = new Date(t).toISOString().slice(0, 10);
  if (sundayOf(today) === today) sundayReset();
  ctx.refreshSeasonIfDateChanged();
}

// Page opened on Sunday Nov 29 (identity already ready): today's visit hangs.
assert.strictEqual(save.weekly.visitDays['2026-11-29'], 1, 'opening the page records today');
assert.strictEqual(banner.hidden, false);
assert.strictEqual(banner.dataset.art, 'november-round');
assert.deepStrictEqual(days(), ['2026-11-29']);

// Monday Nov 30: page left open past midnight → a visit; then a Daily Check.
nextDay();
assert.deepStrictEqual(days(), ['2026-11-29', '2026-11-30']);
const novWire = banner.children[0];
dailyCheck('2026-11-30');
assert.ok(orn()[1].classList.contains('gold'), 'Daily Check turns Monday gold');
assert.ok(orn()[1].classList.contains('is-new'), 'the gold upgrade hangs itself while the hub is on screen');
assert.strictEqual(banner.children[0], novWire, 'no rebuild for a check-in');

// Tuesday Dec 1: mid-week month change. The whole week becomes December
// lights (one art per month), the gold day stays gold, colours cycle.
nextDay();
assert.strictEqual(banner.dataset.art, 'december-bulb', 'December lights take over on Dec 1');
assert.notStrictEqual(banner.children[0], novWire, 'new art rebuilds the strand');
assert.deepStrictEqual(days(), ['2026-11-29', '2026-11-30', '2026-12-01']);
assert.ok(srcs().every(s => s === 'december-bulb.webp'), 'earlier days this week re-hang as bulbs');
assert.deepStrictEqual(orn().map(o => o.classList.contains('gold')), [false, true, false], 'gold survives the art change');
assert.deepStrictEqual(orn().map(o => o.dataset.tint), ['red', 'green', 'warm']);
assert.ok(orn()[2].classList.contains('is-new'), 'today\'s new bulb hangs itself');
assert.ok(!orn()[0].classList.contains('is-new'), 're-hung earlier days do not animate');
assert.strictEqual(banner.dataset.visits, '3');

// Same day again (interval tick): nothing changes.
const sameWire = banner.children[0];
ctx.refreshSeasonIfDateChanged();
assert.strictEqual(banner.children[0], sameWire);
assert.strictEqual(orn().length, 3);

// Wed → Sat: the page stays open; each day adds one bulb.
for (let i = 0; i < 4; i++) nextDay();
assert.strictEqual(today, '2026-12-05');
assert.strictEqual(orn().length, 7, 'a full week is seven ornaments');

// Sunday Dec 6: weekly reset → fresh strand with only today.
nextDay();
assert.strictEqual(today, '2026-12-06');
assert.deepStrictEqual(days(), ['2026-12-06'], 'the new week starts with one ornament (today)');
assert.strictEqual(banner.dataset.art, 'december-bulb');

// Jump ahead: Wed Dec 30 → Fri Jan 1 (New Year art inside the Christmas season).
today = '2026-12-29'; sundayReset(); save.weekly.visitDays = { '2026-12-27': 1 };
nextDay();                                   // Wed Dec 30
assert.strictEqual(banner.dataset.art, 'december-bulb');
nextDay();                                   // Thu Dec 31
nextDay();                                   // Fri Jan 1
assert.strictEqual(today, '2027-01-01');
assert.strictEqual(banner.dataset.art, 'january-shimenawa', 'shimenawa on New Year\'s Day');
assert.deepStrictEqual(days(), ['2026-12-27', '2026-12-30', '2026-12-31', '2027-01-01']);
assert.ok(srcs().every(s => s === 'january-shimenawa.webp'));
assert.ok(orn().every(o => o.dataset.tint === 'warm'), 'only December uses coloured tints');

// Sun Jan 31 → Mon Feb 1.
today = '2027-01-30'; save.weekly.visitDays = {};
nextDay();                                   // Sun Jan 31 (reset)
assert.strictEqual(banner.dataset.art, 'january-shimenawa');
nextDay();                                   // Mon Feb 1
assert.strictEqual(banner.dataset.art, 'february-oni');
assert.deepStrictEqual(days(), ['2027-01-31', '2027-02-01']);

// Sun Feb 28 → Mon Mar 1: no March art → the banner hides cleanly.
today = '2027-02-27'; save.weekly.visitDays = {};
nextDay();                                   // Sun Feb 28
assert.strictEqual(banner.hidden, false);
nextDay();                                   // Mon Mar 1
assert.strictEqual(banner.hidden, true, 'months without art hide the banner');
assert.strictEqual(banner.children.length, 0);
assert.strictEqual(save.weekly.visitDays['2027-03-01'], 1, 'visits are still recorded while the banner is hidden');

// Leap year: Feb 29 is February; Mar 1 hides.
today = '2028-02-28'; save.weekly.visitDays = {};
nextDay();                                   // Tue Feb 29 2028
assert.strictEqual(today, '2028-02-29');
assert.strictEqual(banner.hidden, false);
assert.strictEqual(banner.dataset.art, 'february-oni');
nextDay();
assert.strictEqual(banner.hidden, true);

// A hidden tab crossing midnight records nothing and hangs nothing new.
today = '2026-11-10'; save.weekly.visitDays = {};
ctx.refreshSeasonIfDateChanged();
doc.hidden = true;
nextDay();
assert.strictEqual(save.weekly.visitDays['2026-11-11'], undefined, 'hidden page: no visit');
doc.hidden = false;

console.log('hub ornament months: ok');
