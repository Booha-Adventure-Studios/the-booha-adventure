#!/usr/bin/env node
'use strict';

// Christmas Pass 3: Grubb's countdown, the after-Christmas phases
// (Dec 26-31 "See you next year!", Jan 1-2 "Happy New Year!"), gold winter
// lights after Christmas, and the December maze frost border.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function load(today) {
  const context = {
    window: { CALENDAR: { getTodayKey: () => today }, BoohaAdventure: { save: { load: () => ({}) } } },
    document: { documentElement: { dataset: {}, style: { setProperty() {} } } },
    Intl, Date, console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });
  return { skins: context.window.BoohaSkins, dataset: context.document.documentElement.dataset };
}

const { skins } = load('2026-12-10');
const line = date => skins.seasonGreeting('christmas-2026', date);

// ── Every day of the season has exactly the line we expect ───────────────
const expected = [
  ['2026-11-01', "Hi! It's snowing!", 'ゆきが ふってきたね！'],
  ['2026-11-30', "Hi! It's snowing!", 'ゆきが ふってきたね！'],
  ['2026-12-01', 'Christmas is coming!', 'もうすぐ クリスマス！'],
  ['2026-12-17', 'Christmas is coming!', 'もうすぐ クリスマス！'],
  ['2026-12-18', '7 more days to Christmas!', 'クリスマスまで あと7日！'],
  ['2026-12-20', '5 more days to Christmas!', 'クリスマスまで あと5日！'],
  ['2026-12-23', '2 more days to Christmas!', 'クリスマスまで あと2日！'],
  ['2026-12-24', 'Tomorrow is Christmas!', 'あしたは クリスマス！'],
  ['2026-12-25', 'Merry Christmas!', 'メリークリスマス！'],
  ['2026-12-26', 'See you next year!', 'よいお年を！'],
  ['2026-12-31', 'See you next year!', 'よいお年を！'],
  ['2027-01-01', 'Happy New Year!', 'あけまして おめでとう！'],
  ['2027-01-02', 'Happy New Year!', 'あけまして おめでとう！'],
];
expected.forEach(([date, en, jp]) => {
  const got = line(date);
  assert.ok(got, `${date} must have a Grubb line`);
  assert.strictEqual(got.en, en, `${date} English`);
  assert.strictEqual(got.jp, jp, `${date} Japanese`);
});
assert.strictEqual(line('2027-01-03'), null, 'no Christmas line after the season ends');
assert.strictEqual(skins.seasonGreeting('halloween-2026', '2026-10-20'), null, 'Halloween has no Grubb line');
// Every day Nov 1 - Jan 2 resolves to some line (no gaps between phases).
for (let t = Date.parse('2026-11-01T00:00:00Z'); t <= Date.parse('2027-01-02T00:00:00Z'); t += 86400000) {
  const date = new Date(t).toISOString().slice(0, 10);
  assert.ok(line(date), `${date} has a phase and a line`);
}

// ── Lights, frost, and sparkles by phase ─────────────────────────────────
const phase = date => skins.seasonPhase('christmas-2026', date);
assert.strictEqual(phase('2026-11-15').lights, undefined, 'no lights in November');
assert.strictEqual(phase('2026-12-10').lights, 'christmas');
assert.strictEqual(phase('2026-12-28').lights, 'gold', 'quieter gold winter lights after Christmas');
assert.strictEqual(phase('2027-01-01').lights, 'gold');
assert.ok(!phase('2026-11-15').mazeFrost, 'November maze has no frost border');
['2026-12-01', '2026-12-28', '2027-01-02'].forEach(date => assert.strictEqual(phase(date).mazeFrost, true, `${date} frost`));
const christmas = skins.getSeason('christmas-2026');
const afterSparks = Array.from(phase('2026-12-28').checkpointSparkColors);
assert.ok(!afterSparks.includes(christmas.glow.red) && !afterSparks.includes(christmas.glow.green),
  'after Christmas the sparkles drop red/green');

const dec = load('2026-12-10').dataset;
assert.strictEqual(dec.seasonLights, 'christmas');
assert.strictEqual(dec.seasonFrost, 'on');
const nye = load('2026-12-31').dataset;
assert.strictEqual(nye.seasonPhase, 'year-end');
assert.strictEqual(nye.seasonLights, 'gold');
const nov = load('2026-11-10').dataset;
assert.strictEqual(nov.seasonLights, undefined);
assert.strictEqual(nov.seasonFrost, undefined);
const after = load('2027-01-03').dataset;
assert.strictEqual(after.season, undefined, 'no season after Jan 2');

// ── Page wiring ──────────────────────────────────────────────────────────
const index = read('index.html');
assert.ok(index.includes('window.BoohaSkins?.seasonGreeting?.()'), 'Grubb bubble uses the dated greeting');
assert.ok(index.includes("lights === 'gold' ? ['gold', 'white']"), 'after Christmas the bulbs are gold and white');
const maze = read('maze.html');
assert.ok(maze.includes('<div id="seasonFrost" aria-hidden="true"></div>'), 'maze has the frost layer');
assert.ok(maze.includes('html[data-season="christmas"][data-season-frost] #seasonFrost'), 'frost only shows when the phase asks');
assert.ok(/#seasonFrost\{[^}]*pointer-events:none/.test(maze), 'frost never blocks taps');

console.log('Christmas countdown passed: daily Grubb lines Nov 1 - Jan 2, gold winter lights, maze frost.');
