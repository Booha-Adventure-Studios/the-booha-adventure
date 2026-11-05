#!/usr/bin/env node
'use strict';

// Hub Pass 1: the Daily Check stamp on the start screen follows the Tokyo
// date. A page left open past midnight must hide yesterday's stamp, and a
// stamp must only be drawn once identity is ready (BOOHA_READY).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function slice(startMarker, endMarker) {
  const start = index.indexOf(startMarker);
  const end = index.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `${startMarker} must remain extractable`);
  return index.slice(start, end);
}

const refreshSrc = slice('function seasonTodayKey()', "document.addEventListener('visibilitychange'");
const stampSrc = slice('function renderDailyCheckStamp()', 'if (window.BOOHA_READY) renderDailyCheckStamp();');

// Same <script> block, so the refresh can call the (hoisted) stamp function.
const scriptStart = index.lastIndexOf('<script>', index.indexOf('function seasonTodayKey()'));
const scriptEnd = index.indexOf('</script>', scriptStart);
assert(index.indexOf('function renderDailyCheckStamp()') < scriptEnd,
  'renderDailyCheckStamp must live in the same script block as the date refresh');

assert(/document\.addEventListener\('booha:checkIn',\s*renderDailyCheckStamp\)/.test(index),
  'a finished Daily Check must redraw the stamp');
assert(/document\.addEventListener\('booha:ready',\s*recordHubVisit,\s*\{\s*once:\s*true\s*\}\)/.test(index),
  'opening the hub records a visit once identity is ready');

function makeHarness({ today, done = {}, streak = 3, ready = true, season = 'christmas', hidden = false }) {
  const classes = new Set();
  const stamp = {
    textContent: '',
    classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
      contains: c => classes.has(c),
    },
  };
  const state = { today, skinRefreshes: 0, visits: 0 };
  const context = {
    console, Intl, Date,
    window: {
      BOOHA_READY: ready,
      CALENDAR: { getTodayKey: () => state.today },
      BoohaSkins: { applySeasonTheme() {} },
    },
    document: {
      hidden,
      documentElement: { dataset: { season } },
      getElementById: id => (id === 'dcStamp' ? stamp : null),
    },
    applySeasonalLandingSkin: () => { state.skinRefreshes++; },
    recordHubVisit: () => { state.visits++; },
    renderOrnamentBanner: () => { state.banners = (state.banners || 0) + 1; },
  };
  context.window.BoohaDailyCheck = {
    isDoneToday: () => !!done[state.today],
    streak: () => streak,
  };
  context.BoohaDailyCheck = context.window.BoohaDailyCheck;
  vm.createContext(context);
  vm.runInContext(stampSrc + '\n' + refreshSrc, context, { filename: 'index-stamp-refresh.js' });
  return { context, stamp, state, shown: () => classes.has('show') };
}

// ── Done today: stamp shows the streak in the season's wording ───────────
{
  const h = makeHarness({ today: '2026-11-05', done: { '2026-11-05': true } });
  h.context.renderDailyCheckStamp();
  assert.ok(h.shown(), 'stamp shows when today is done');
  assert.strictEqual(h.stamp.textContent, '❄ 3日');
}
{
  const h = makeHarness({ today: '2026-10-20', done: { '2026-10-20': true }, season: 'halloween', streak: 2 });
  h.context.renderDailyCheckStamp();
  assert.strictEqual(h.stamp.textContent, 'キャンディ 2個');
}
{
  const h = makeHarness({ today: '2027-03-01', done: { '2027-03-01': true }, season: null, streak: 1 });
  h.context.renderDailyCheckStamp();
  assert.strictEqual(h.stamp.textContent, '✓ 1日');
}

// ── Page left open past midnight: yesterday's stamp disappears ───────────
{
  const h = makeHarness({ today: '2026-11-05', done: { '2026-11-05': true } });
  h.context.renderDailyCheckStamp();
  assert.ok(h.shown());
  h.state.today = '2026-11-06';
  h.context.refreshSeasonIfDateChanged();
  assert.strictEqual(h.state.skinRefreshes, 1, 'season skin still refreshes on a new day');
  assert.ok(!h.shown(), 'yesterday\'s stamp is hidden after midnight');
  assert.strictEqual(h.stamp.textContent, '', 'stale stamp text is cleared');

  assert.strictEqual(h.state.visits, 1, 'a visible page on a new day records a visit');

  // Same day again: no extra work.
  h.context.refreshSeasonIfDateChanged();
  assert.strictEqual(h.state.skinRefreshes, 1, 'no refresh while the date is unchanged');
  assert.strictEqual(h.state.visits, 1, 'no second visit on the same day');
}

// ── A hidden tab crossing midnight is not a visit ────────────────────────
{
  const h = makeHarness({ today: '2026-11-05', hidden: true });
  h.state.today = '2026-11-06';
  h.context.refreshSeasonIfDateChanged();
  assert.strictEqual(h.state.visits, 0, 'hidden pages do not record visits');
}

// ── New day where the check is already done (e.g. finished on another iPad) ─
{
  const h = makeHarness({ today: '2026-11-30', done: { '2026-12-01': true }, streak: 4 });
  h.context.renderDailyCheckStamp();
  assert.ok(!h.shown(), 'not done on Nov 30');
  h.state.today = '2026-12-01';
  h.context.refreshSeasonIfDateChanged();
  assert.ok(h.shown(), 'done on Dec 1 shows after the date change');
  assert.strictEqual(h.stamp.textContent, '❄ 4日');
}

// ── Before identity is ready, the date refresh does not touch the stamp ──
{
  const h = makeHarness({ today: '2026-11-05', done: { '2026-11-06': true }, ready: false });
  h.state.today = '2026-11-06';
  h.context.refreshSeasonIfDateChanged();
  assert.ok(!h.shown(), 'no stamp from a save that is not identity-ready yet');
  assert.strictEqual(h.state.visits, 0, 'no visit before identity is ready');
  assert.strictEqual(h.stamp.textContent, '');
}

// ── A throwing save layer never leaves a stale stamp up ──────────────────
{
  const h = makeHarness({ today: '2026-11-05', done: { '2026-11-05': true } });
  h.context.renderDailyCheckStamp();
  h.context.window.BoohaDailyCheck.isDoneToday = () => { throw new Error('save unavailable'); };
  h.context.renderDailyCheckStamp();
  assert.ok(!h.shown(), 'an error hides the stamp rather than leaving it stale');
}

console.log('hub daily stamp refresh: ok');
