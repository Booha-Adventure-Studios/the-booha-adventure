#!/usr/bin/env node
'use strict';

// Hub Pass 11: liveliness levels.
//   · Level from this week's DISTINCT completed Maze games for the student's
//     class (same count as the "0 / 9" bar; replays never move it):
//       quiet 0–2 · glowing 3–5 · lively 6–8 · festival 9
//   · Quiet is the hub exactly as before; each level only adds.
//   · Festival drift follows the app's season phases (snow while the phase
//     has mazeSnow, e.g. November "first snow"), else the calendar month.
//   · Transform/opacity only; moving layers off for low power / reduced motion.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function slice(startMarker, endMarker) {
  const s = index.indexOf(startMarker);
  const e = index.indexOf(endMarker, s);
  assert.ok(s >= 0 && e > s, `${startMarker} must remain extractable`);
  return index.slice(s, e);
}
const src = slice('function hubWeeklyCompletedFor(curriculum) {', 'function setHubWeekTab(');

function run({ ready = true, completed = {}, curr = 'pb', today = '2026-11-05', phase = null } = {}) {
  const ds = {};
  const listeners = {};
  const ctx = {
    console,
    document: { documentElement: { dataset: ds }, addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); } },
    seasonTodayKey: () => today,
    setTimeout: fn => fn(),
  };
  ctx.window = ctx;
  ctx.BOOHA_READY = ready;
  ctx.BoohaCurriculum = { get: () => curr };
  ctx.BoohaSkins = { seasonPhase: () => phase };
  ctx.BoohaAdventure = { save: { load: () => ({ weekly: { completedGames: completed } }) } };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'index-liveliness.js' });
  return { ctx, ds, listeners };
}

// ── Thresholds ───────────────────────────────────────────────────────────
{
  const { ctx } = run();
  const tiers = [0, 1, 2, 3, 5, 6, 8, 9, 12].map(n => ctx.hubTierFor(n));
  assert.deepStrictEqual(tiers, ['quiet', 'quiet', 'quiet', 'glowing', 'glowing', 'lively', 'lively', 'festival', 'festival']);
  assert.strictEqual(ctx.hubTierFor(undefined), 'quiet');
}

// ── Seasons ──────────────────────────────────────────────────────────────
{
  const { ctx } = run();
  assert.strictEqual(ctx.hubSeasonFor('2026-11-05', { mazeSnow: true }), 'winter', 'November first snow → snow');
  assert.strictEqual(ctx.hubSeasonFor('2026-11-05', null), 'autumn', 'without a snowy phase, November is autumn');
  assert.strictEqual(ctx.hubSeasonFor('2027-01-20', null), 'winter');
  assert.strictEqual(ctx.hubSeasonFor('2027-04-10', null), 'spring');
  assert.strictEqual(ctx.hubSeasonFor('2027-07-07', null), 'summer');
  assert.strictEqual(ctx.hubSeasonFor('2026-10-20', null), 'autumn');
}

// ── Distinct games for the student's class ───────────────────────────────
const games = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [`pb:game_${i}`, true]));
{
  const h = run({ completed: games(4) });
  h.ctx.updateHubLiveliness();
  assert.strictEqual(h.ds.hubTier, 'glowing');
}
{
  const h = run({ completed: Object.assign(games(2), { 'br:a': true, 'br:b': true, 'br:c': true, 'br:d': true }) });
  h.ctx.updateHubLiveliness();
  assert.strictEqual(h.ds.hubTier, 'quiet', 'another class\'s games do not count');
}
{
  const h = run({ completed: games(14) });
  h.ctx.updateHubLiveliness();
  assert.strictEqual(h.ds.hubTier, 'festival', 'capped at the nine Maze games');
}
{
  const h = run({ ready: false, completed: games(9) });
  h.ctx.updateHubLiveliness();
  assert.strictEqual(h.ds.hubTier, 'quiet', 'quiet before identity is ready');
}
{
  const h = run({ completed: games(9), phase: { mazeSnow: true } });
  h.ctx.updateHubLiveliness();
  assert.deepStrictEqual([h.ds.hubTier, h.ds.hubSeason], ['festival', 'winter']);
  ['booha:ready', 'booha:weeklyReset', 'booha:gameEnd'].forEach(t => assert.ok(h.listeners[t], `refreshes on ${t}`));
}
assert.match(index, /updateHomeworkCountBadge\(\);\s*updateHubLiveliness\(\);/, 'refreshes with the hub');

// ── Markup ───────────────────────────────────────────────────────────────
const layer = index.match(/<div id="hubLively" class="hubLively" aria-hidden="true">[\s\S]*?<\/div>/);
assert.ok(layer, 'a decorative, aria-hidden layer');
assert.ok(index.indexOf('id="hubLively"') > index.indexOf('<section id="hubScene"') &&
  index.indexOf('id="hubLively"') < index.indexOf('<div class="hubScroll">'), 'first child of the hub scene, under the content');
assert.strictEqual((layer[0].match(/class="hlFly"/g) || []).length, 12);
assert.strictEqual((layer[0].match(/class="hlDrift"/g) || []).length, 12);
assert.strictEqual((layer[0].match(/class="hlGlow"/g) || []).length, 1);

// ── CSS: quiet adds nothing; levels only add; motion rules ──────────────
const css = slice('/* ══ Hub Pass 11: liveliness', '/* ══ Hub Pass 6: phone layouts');
assert.match(css, /\.hubLively \{ position: fixed; inset: 0; z-index: 0; pointer-events: none;/);
assert.match(css, /\.hubScroll \{ position: relative; z-index: 1; \}/);
assert.match(css, /\.hlGlow \{[\s\S]*?opacity: 0;/, 'quiet: no glow');
assert.match(css, /\.hlFly, \.hlDrift \{ position: absolute; display: none; opacity: 0; \}/, 'quiet: no particles');
assert.match(css, /html\[data-hub-tier="glowing"\]\s+\.hlGlow \{ opacity: \.7; \}/);
assert.match(css, /html\[data-hub-tier="lively"\] \.hlFly:nth-child\(-n\+9\),\s*html\[data-hub-tier="festival"\] \.hlFly \{ display: block; \}/);
assert.match(css, /html\[data-hub-tier="festival"\] \.hlDrift \{ display: block; \}/);
assert.doesNotMatch(css, /data-hub-tier="glowing"\][^{]*\.hl(Fly|Drift)/, 'glowing has no moving parts');
const keyframes = css.match(/@keyframes hl\w+ \{[^\n]*\}/g) || [];
assert.strictEqual(keyframes.length, 5);
keyframes.forEach(k => {
  const props = (k.replace(/@keyframes hl\w+ \{/, '').match(/([a-z-]+)\s*:/g) || []).map(p => p.replace(/\s*:$/, ''));
  props.forEach(p => assert.ok(p === 'opacity' || p === 'transform', `liveliness animates only transform/opacity (found ${p})`));
});
['html.hub-reduced-motion .hlFly', 'html.hub-low-power .hlFly', 'html[data-motion="reduced"] .hlFly', 'html[data-power="minimal"] .hlFly']
  .forEach(sel => assert.ok(css.includes(sel), `${sel} is switched off`));
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.hlFly, \.hlDrift \{ display: none !important; \}/);
assert.doesNotMatch(css, /filter\s*:|backdrop-filter/, 'no filters (cheap on older iPads)');

// ── Pass 12b: a hub left open across a date change refreshes the season ─
{
  const refreshSrc = slice('let seasonDateKey = seasonTodayKey();', '\n}\n') + '\n}\n';
  assert.match(refreshSrc, /if \(typeof updateHubLiveliness === 'function'\) updateHubLiveliness\(\);/, 'date refresh calls updateHubLiveliness');
  let today = '2027-02-28';
  const ds = {};
  const ctx = {
    console, document: { hidden: false, documentElement: { dataset: ds }, addEventListener() {} },
    setTimeout: fn => fn(), applySeasonalLandingSkin() {}, renderDailyCheckStamp() {}, recordHubVisit() {}, renderOrnamentBanner() {},
  };
  ctx.window = ctx; ctx.BOOHA_READY = true;
  ctx.BoohaCurriculum = { get: () => 'pb' };
  ctx.BoohaSkins = { seasonPhase: () => null, applySeasonTheme() {} };
  ctx.BoohaAdventure = { save: { load: () => ({ weekly: { completedGames: {} } }) } };
  ctx.__today = () => today;
  vm.createContext(ctx);
  vm.runInContext('function seasonTodayKey() { return window.__today(); }\n' + refreshSrc + src, ctx, { filename: 'index-liveliness-refresh.js' });
  ctx.updateHubLiveliness();
  assert.strictEqual(ds.hubSeason, 'winter');
  today = '2027-03-01';
  ctx.refreshSeasonIfDateChanged();
  assert.strictEqual(ds.hubSeason, 'spring', 'Feb 28 → Mar 1 switches the drift without a reload');
}

console.log('hub liveliness: ok');
