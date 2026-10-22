#!/usr/bin/env node
// Rainbow Pass A (2026-10-22): the run tracker silently records each item's
// first response vs par, and emitGameEnd carries it to the save in
// recentRun.pace. Nothing about pace may be shown to students yet.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function load() {
  let t = 0;
  const events = [];
  const ctx = {
    console, Date, Math, JSON, setTimeout: fn => fn(),
    performance: { now: () => t },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
  };
  ctx.window = ctx;
  ctx.document = { dispatchEvent: e => events.push(e), addEventListener() {}, querySelectorAll: () => [], getElementById: () => null };
  vm.createContext(ctx);
  vm.runInContext(read('js/game-utils.js'), ctx, { filename: 'js/game-utils.js' });
  return { U: ctx.GAME_UTILS, events, at: ms => { t = ms; } };
}

/* ── per-item first response, frantic misses, audio wait ── */
{
  const { U, at } = load();
  const run = U.createRun({ total: 4, hud: false });
  at(0);    run.ready(2000);          at(1200); run.hit();                  // right, 1.2 s / par 2 s
  at(2000); run.ready(3000);          at(2200); run.miss(); at(5000); run.recover();   // frantic miss (0.2 s < 0.4 s)
  at(6000); run.ready(2500, { waitAudio: true }); at(7000); run.audioDone(); at(9500); run.hit();  // clock starts at clip end
  at(10000); run.ready(2000);         at(40000); run.hit();                 // a long notebook pause is still recorded
  const s = run.summary();
  assert.deepStrictEqual(Array.from(s.pace.t), [12, 2, 25, 300], 'first-response times in tenths of a second');
  assert.deepStrictEqual(Array.from(s.pace.p), [20, 30, 25, 20], 'each item keeps its own par');
  assert.strictEqual(s.pace.f, '1011', 'first try right / wrong per item');
  assert.strictEqual(s.pace.fr, 1, 'a wrong answer faster than minMs counts as frantic');
  assert.strictEqual(s.pace.v, 1);
  assert.strictEqual(s.firstTry, 3, 'existing run stats are unchanged');
}
{
  const { U, at } = load();
  const run = U.createRun({ total: 1, hud: false });
  at(0); run.ready(3000, { waitAudio: true }); at(500); run.miss();
  assert.deepStrictEqual(Array.from(run.summary().pace.t), [null], 'answering before the clip ends records no time, and is not frantic');
  assert.strictEqual(run.summary().pace.fr, 0);
}
{
  const { U, at } = load();
  const run = U.createRun({ total: 2, hud: false });
  at(0); run.ready(2000); at(1000); run.hit(); run.hit();   // double fire on one item
  assert.strictEqual(run.summary().pace.t.length, 1, 'only the first response per item is recorded');
  run.reset();
  assert.strictEqual(run.summary().pace.t.length, 0, 'replay starts a fresh record');
}

/* ── emitGameEnd attaches the record; old callers keep working ── */
{
  const { U, events, at } = load();
  const run = U.createRun({ total: 1, hud: false });
  at(0); run.ready(2000); at(900); run.hit();
  run.summary();
  U.emitGameEnd({ saveId: 'br:vocab_tap', score: 100, completed: true });
  const d = events[0].detail;
  assert.strictEqual(d.saveId, 'br:vocab_tap');
  assert.deepStrictEqual(Array.from(d.recentRun.pace.t), [9], 'the pace record travels in recentRun');
  U.emitGameEnd({ saveId: 'x', score: 1 });
  assert(!events[1].detail.recentRun, 'a record is attached once, never to a later unrelated result');
  U.emitGameEnd({ saveId: 'y', score: 1, recentRun: { wave: 3 } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(events[2].detail.recentRun)), { wave: 3 }, 'engines that send their own recentRun are untouched');
}

/* ── wiring: all twelve engines summarise then emit; nothing is displayed ── */
['vocab-tap', 'spell-word', 'vocab-speed', 'sentence-tap', 'sentence-order', 'sentence-speed',
  'say-word', 'say-sentence', 'ask-question', 'booha-bites', 'echo', 'week-boss'].forEach(g => {
  const src = read(`games/${g}.js`);
  assert(/run\.summary\(\)/.test(src) && /U\.emitGameEnd\(/.test(src), `${g} must summarise the run and emit through U.emitGameEnd`);
  assert(src.indexOf('run.summary()') < src.lastIndexOf('U.emitGameEnd('), `${g} must call summary() before emitGameEnd`);
  assert(!/\.pace\b/.test(src), `${g} must not display pace yet (Pass A is silent)`);
});
assert(/recentRun/.test(read('js/core/adventure-core.js')) && /recentRuns/.test(read('js/core/score-system.js')),
  'the save path keeps recentRun (last 8 runs per game)');
['js/game-scorecard.js', 'js/menu-core.js', 'js/ui/profile-game.js'].forEach(f => {
  assert(!/\.pace\b/.test(read(f)), `${f} must not show pace yet`);
});

/* ── the calibration report reads saves, including stringified exports ── */
{
  const tmp = path.join(require('os').tmpdir(), `pace-${process.pid}.json`);
  const save = { scores: { 'br:vocab_tap': { recentRuns: [
    { pace: { v: 1, t: [10, 12, 8, 30], p: [20, 20, 20, 20], f: '1111', fr: 0 } },
    { pace: { v: 1, t: [2, 2, 2, 2], p: [20, 20, 20, 20], f: '0000', fr: 4 } },
  ] } } };
  fs.writeFileSync(tmp, JSON.stringify([{ _id: 'a', data: JSON.stringify(save) }]));
  const out = JSON.parse(execFileSync('node', [path.join(ROOT, 'tools/pace-report.cjs'), tmp, '--json'], { encoding: 'utf8' }));
  fs.unlinkSync(tmp);
  assert.strictEqual(out.students, 1, 'saves nested as JSON strings are found');
  const g = out.games[0];
  assert.strictEqual(g.game, 'br:vocab_tap');
  assert.strictEqual(g.runs, 2);
  assert.strictEqual(g.rainbowShareAt['0.8'], 0.5, 'the steady run qualifies at ≤0.8 of par; the frantic run never does');
}

console.log('Pace record audit passed: first responses vs par, frantic misses, audio wait, save wiring, silent UI, calibration report.');
