#!/usr/bin/env node
'use strict';

// Games Pass 4: combo / sharp / points / crown. Stars, completion and unlocks
// must not change; points and crowns are saved additively and reset weekly.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. Tracker rules (pure) ────────────────────────────────────────────────
{
  const sandbox = { window: {}, performance: { now: () => 0 }, console };
  vm.runInNewContext(read('js/game-utils.js'), sandbox);
  const U = sandbox.window.GAME_UTILS;
  let t = 0;
  const clock = () => t;

  const perfect = U.createRun({ hud: false, now: clock });
  for (let i = 0; i < 15; i++) { perfect.ready(2000); t += 1000; perfect.hit(); }
  const p = perfect.summary();
  assert.strictEqual(p.fullCombo, true, 'fifteen first-try answers earn the crown');
  assert.strictEqual(p.maxCombo, 15);
  // 2×100 + 3×150 + 4×200 + 6×300 = 3250, + 15 sharp × 25
  assert.strictEqual(p.points, 3250 + 15 * 25, 'combo multipliers ×1 / ×1.5 / ×2 / ×3 at 3 / 6 / 10');

  const slip = U.createRun({ hud: false, now: clock });
  for (let i = 0; i < 15; i++) { slip.ready(2000); t += 1000; if (i === 14) { slip.miss(); slip.recover(); } else slip.hit(); }
  assert.strictEqual(slip.summary().fullCombo, false, 'one slip loses the crown');
  assert(slip.summary().points < p.points, 'a slip scores fewer points than a clean run');

  const fast = U.createRun({ hud: false, now: clock });
  fast.ready(2000); t += 100; fast.hit();
  assert.strictEqual(fast.summary().sharp, 0, 'answers under 0.4 s earn no sharp bonus');

  const listen = U.createRun({ hud: false, now: clock });
  listen.ready(3000, { waitAudio: true }); t += 500; listen.hit();
  assert.strictEqual(listen.summary().sharp, 0, 'answering before the audio finishes earns no sharp bonus');

  const masher = U.createRun({ hud: false, now: clock, recoverPoints: 0 });
  for (let i = 0; i < 15; i++) { masher.ready(2000); masher.miss(); masher.miss(); masher.miss(); masher.recover(); }
  assert.strictEqual(masher.summary().points, 0, 'tapping every option in multiple choice scores 0 points');
  assert.strictEqual(masher.summary().misses, 15, 'repeat misses on one item count once');
}

// ── 2. Engines report every answer and send the summary ──────────────────
const ENGINES = ['vocab-tap', 'spell-word', 'vocab-speed', 'sentence-tap', 'sentence-order',
  'sentence-speed', 'say-word', 'say-sentence', 'ask-question'];
for (const name of ENGINES) {
  const src = read(`games/${name}.js`);
  assert.match(src, /const run = U\.createRun\(\{ total: 15, recoverPoints: (0|50) \}\);/, `${name} must create a run tracker`);
  for (const call of ['run.hit(', 'run.miss()', 'run.reset()', 'run.ready(']) {
    assert(src.includes(call), `${name} must call ${call}`);
  }
  assert.match(src, /const runSum = run\.summary\(\);/, `${name} must summarise the run at results`);
  assert.match(src, /U\.emitGameEnd\(\{\s*points: runSum\.points, maxCombo: runSum\.maxCombo, crown: runSum\.fullCombo,/,
    `${name} must send points / maxCombo / crown with its result`);
  assert.match(src, /U\.showScorecard\(Object\.assign\(\{\s*run:\s+runSum,/, `${name} must hand the run to the score card`);
}
for (const name of ['say-word', 'say-sentence', 'ask-question', 'vocab-tap', 'sentence-tap', 'vocab-speed', 'sentence-speed']) {
  assert.match(read(`games/${name}.js`), /recoverPoints: 0 \}/, `${name} is multiple choice: second tries must earn 0`);
}
for (const name of ['say-word', 'say-sentence', 'ask-question']) {
  const src = read(`games/${name}.js`);
  assert(src.includes('run.audioDone()') && src.includes('waitAudio: true'), `${name} sharp clock must start after the audio`);
}

// ── 3. Save: additive, weekly, never touches stars ───────────────────────
const key = 'booha_save:v3:points-student';
let stored = {
  version: 2, scores: {}, unlocks: {},
  meta: { lastWeeklyKey: '2026-10-18|october-w3', allTimeStars: 0 },
  weekly: { completedGames: {}, gameScores: {}, gameStars: {}, gamePoints: { 'pb:vocab_tap': 9999 }, gameCrowns: { 'pb:vocab_tap': true }, unlockedBonusGames: {}, wanderers: [] },
};
const localStorage = {
  getItem(n) { if (n === 'booha_userid') return 'points-student'; if (n === key) return JSON.stringify(stored); return null; },
  setItem(n, v) { if (n === key) stored = JSON.parse(v); },
  removeItem() {},
};
const listeners = {};
const document = {
  readyState: 'loading',
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  dispatchEvent(ev) { (listeners[ev.type] || []).forEach(fn => fn(ev)); },
};
class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
class Event { constructor(type) { this.type = type; } }
const context = {
  window: {
    BOOHA_SYNC_READY: false,
    CALENDAR: {
      getCurrentCurriculumWeek() {
        return { year: 2026, monthSlug: 'october', weekNumber: 4, weekId: 'october-w4', weekStart: '2026-10-25', occurrenceKey: '2026-10-25|october-w4' };
      },
      getCurriculumWeekOccurrenceKey(cw) { return cw.occurrenceKey; },
    },
  },
  localStorage, document, CustomEvent, Event, console, Date, setTimeout, clearTimeout,
};
context.window.BoohaSync = { checkpoint() {} };
context.BoohaSync = context.window.BoohaSync;
vm.createContext(context);
for (const f of ['js/core/adventure-core.js', 'js/core/save-file.js', 'js/core/game-registry.js', 'js/core/score-system.js']) {
  vm.runInContext(read(f), context, { filename: f });
}
const BA = context.window.BoohaAdventure;
BA.init();

assert.deepStrictEqual(JSON.parse(JSON.stringify(stored.weekly.gamePoints)), {}, 'weekly points reset with the week');
assert.deepStrictEqual(JSON.parse(JSON.stringify(stored.weekly.gameCrowns)), {}, 'weekly crowns reset with the week');

// Same event path the engines use.
const fire = detail => document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail }));
fire({ saveId: 'pb:vocab_tap', score: 100, completed: true, points: 3625, maxCombo: 15, crown: true });
let entry = stored.scores['pb:vocab_tap'];
assert.strictEqual(entry.bestPoints, 3625);
assert.strictEqual(entry.crowns, 1);
assert.strictEqual(entry.bestCombo, 15);
assert.strictEqual(entry.stars, 3);
assert.strictEqual(stored.weekly.gamePoints['pb:vocab_tap'], 3625);
assert.strictEqual(stored.weekly.gameCrowns['pb:vocab_tap'], true);

fire({ saveId: 'pb:vocab_tap', score: 60, completed: true, points: 900, maxCombo: 4, crown: false });
entry = stored.scores['pb:vocab_tap'];
assert.strictEqual(entry.bestPoints, 3625, 'a lower run never lowers best points');
assert.strictEqual(stored.weekly.gamePoints['pb:vocab_tap'], 3625, 'a lower run never lowers weekly points');
assert.strictEqual(entry.crowns, 1, 'only crowned runs add crowns');

// Points can never buy stars: 30% accuracy with huge points is still 0 stars.
fire({ saveId: 'pb:spell_word', score: 30, completed: false, points: 99999, crown: false });
assert.strictEqual(stored.scores['pb:spell_word'].stars, 0, 'points must not affect stars');
assert.strictEqual(stored.weekly.gameStars['pb:spell_word'], 0, 'points must not affect weekly stars');
assert.strictEqual(!!stored.weekly.completedGames['pb:spell_word'], false, 'points must not mark a game completed');

// Old engines / bonus games that send no points keep working.
fire({ saveId: 'bonus:booha_blocks', score: 5000, completed: true, maxCombo: 7 });
assert.strictEqual(stored.scores['bonus:booha_blocks'].bestPoints, 0);
assert.strictEqual(stored.weekly.gamePoints['bonus:booha_blocks'], undefined);

assert.strictEqual(BA.scores.weeklyPointsForGame('pb:vocab_tap'), 3625);
assert.strictEqual(BA.scores.weeklyCrownForGame('pb:vocab_tap'), true);
assert.strictEqual(BA.scores.weeklyCrownsFor('pb'), 1);
assert.strictEqual(BA.scores.getBestPoints('pb:vocab_tap'), 3625);

console.log('Games points audit passed: tracker rules, nine engines wired, additive weekly save, stars untouched.');
