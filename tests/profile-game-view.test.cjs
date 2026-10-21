#!/usr/bin/env node
// Adventure Log game view: level-star rules, wanderer categories,
// traveler records, and the profile.html wiring that renders them.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── level-stars.js ────────────────────────────────────────────── */
const L = require(path.join(ROOT, 'js/core/level-stars.js'));
const starsFor = (saveId, pct) => (pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0);

assert.deepStrictEqual([...L.LEVELS], [0, 40, 120, 240, 400, 600, 850, 1150, 1500],
  'nine level thresholds must match the agreed star plan');
assert.strictEqual(L.levelFor(0).level, 1, 'a new player starts at level 1');
assert.strictEqual(L.levelFor(39).level, 1, 'level 2 starts at 40 stars');
assert.strictEqual(L.levelFor(40).level, 2, 'level 2 starts at 40 stars');
assert.deepStrictEqual(
  (({ level, next, toNext }) => ({ level, next, toNext }))(L.levelFor(1020)),
  { level: 7, next: 1150, toNext: 130 }, 'level progress must report the next threshold');
assert.strictEqual(L.levelFor(5000).max, true, 'level 9 is the top rank');

const ids = ['a', 'b', 'c', 'd', 'e'];
const week = {
  adv: { 'br:a': 95, 'br:b': 75, 'br:c': 50, 'br:d': 80, 'bc:a': 100 },
  blitz: { 'br:vocab': { ms: 41000, tier: 'clean' }, 'br:sentence': 39000, 'br:question': { tier: 'perfect' } },
};
const w = L.weekStars(week, 'br', ids, starsFor);
assert.deepStrictEqual(w.stars, [3, 2, 1, 2, null], 'maze stars come from each best weekly pct');
assert.deepStrictEqual(w.links, [true, false, false, false],
  'a link lights only when both neighbours have two or more stars');
assert.strictEqual(w.linkStars, 1, 'each lit link is worth one star');
assert.strictEqual(w.blitzCount, 2, 'only Blitz clears with a time count (legacy numbers included)');
assert.strictEqual(w.total, 8 + 1 + 6, 'week total is maze + links + 3 per Blitz clear');
assert.strictEqual(w.twoStarCount, 3, 'arcade progress counts games at two stars or more');

const checkIn = {
  '2026-10-18': { st: 'done' }, '2026-10-19': { st: 'done' },
  '2026-10-20': { st: 'skip' }, '2026-10-12': { st: 'done' },
};
assert.strictEqual(L.dailyDoneCount(checkIn), 3, 'skipped days never earn Daily Check stars');
assert.strictEqual(L.dailyDoneInWeek(checkIn, '2026-10-18'), 2, 'weekly Daily Check count stays inside its Sunday week');
const life = L.lifetime({ w1: week, w2: { adv: { 'br:a': 90 } } }, checkIn, { br: ids, bc: ids, pb: [] }, starsFor);
assert.deepStrictEqual(life, { maze: 8 + 3 + 3, links: 1, blitz: 6, daily: 6, total: 27 },
  'lifetime stars add every recorded week and curriculum plus 2 per Daily Check');

/* ── profile-game.js categories ────────────────────────────────── */
const sandbox = {
  console,
  localStorage: { getItem: () => null, setItem() {} },
  document: { addEventListener() {}, getElementById: () => null },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(read('js/karasuki-wanderer-data.js'), sandbox);
vm.runInContext(read('js/ui/profile-game.js'), sandbox);
const kinds = sandbox.BoohaProfileGame._test.WANDERER_KIND;
const wandererIds = Object.values(sandbox.KARASUKI_WANDERER_DATA).map(item => item.id);
Object.keys(kinds).forEach(id => assert(wandererIds.includes(id), `category id must be a real wanderer: ${id}`));
const count = kind => wandererIds.filter(id => (kinds[id] || 'friendly') === kind).length;
assert.strictEqual(count('dangerous'), 7, 'seven wanderers are dangerous');
assert.strictEqual(count('mischievous'), 9, 'nine wanderers are mischievous');
assert.strictEqual(count('friendly'), wandererIds.length - 16, 'everyone else is friendly');
assert.strictEqual(kinds.gorogui, 'dangerous', 'Gorogui keeps its canonical id');

/* ── traveler-record.js ────────────────────────────────────────── */
let stored = { collection: { wanderers: {} } };
const tSandbox = {
  console,
  BoohaAdventure: { save: { load: () => JSON.parse(JSON.stringify(stored)), save: d => { stored = d; return true; } } },
};
tSandbox.window = tSandbox;
vm.createContext(tSandbox);
vm.runInContext(read('js/core/traveler-record.js'), tSandbox);
tSandbox.BoohaTravelers.record('barba', { seasonId: 'halloween-2026' });
tSandbox.BoohaTravelers.record('barba');
assert.strictEqual(stored.collection.travelers.barba.visits, 2, 'each tap adds one traveler visit');
assert.strictEqual(stored.collection.travelers.barba.seasonId, 'halloween-2026', 'a seasonal traveler keeps its season');
assert.deepStrictEqual(stored.collection.wanderers, {}, 'traveler records never touch the wanderer collection');

/* ── wiring ────────────────────────────────────────────────────── */
const profile = read('profile.html');
['pg-hero', 'pg-skin', 'pg-trail', 'pg-stars', 'pg-collection', 'pg-travelers', 'pg-medals', 'pg-sealed', 'dc-week']
  .forEach(id => assert.match(profile, new RegExp(`id="${id}"`), `profile must mount ${id}`));
assert(profile.indexOf('js/core/level-stars.js') < profile.indexOf('js/ui/profile-game.js'),
  'level stars must load before the game view');
assert(profile.indexOf('id="pg-hero"') < profile.indexOf('id="profile-totals"'),
  'the game view must sit above the record book');
['karasuki.html', 'muenba.html'].forEach(page => {
  assert.match(read(page), /js\/core\/traveler-record\.js/, `${page} must load the traveler recorder`);
});
assert.match(read('js/karasuki.js'), /BoohaTravelers\.record\('nuppi'\)/, 'tapping Nuppi in Karasuki must be recorded');
assert.match(read('js/karasuki.js'), /BoohaTravelers\.record\('barba'/, 'tapping Barba must be recorded');
assert.match(read('js/muenba.js'), /BoohaTravelers\.record\('nuppi'\)/, 'tapping Nuppi in Muenba must be recorded');
['rank-coin-1', 'rank-coin-9', 'medal-first-step', 'medal-br-champion', 'treasure-chest-open', 'adventure-trail-forest']
  .forEach(name => assert(fs.existsSync(path.join(ROOT, `assets/img/profile/${name}.webp`)), `profile art must exist: ${name}`));

console.log('Profile game view test passed: level stars, wanderer categories, traveler records, and wiring.');
