#!/usr/bin/env node
// Rainbow Pass A (2026-10-22): the run tracker records each item's first
// response vs par, and emitGameEnd carries it to the save in recentRun.pace.
// Pass B: GAME_UTILS.readyPace turns that record into rainbow stars (weekly +
// lifetime in the save) shown on the score card, menu tile and profile.
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
});
assert(/recentRun/.test(read('js/core/adventure-core.js')) && /recentRuns/.test(read('js/core/score-system.js')),
  'the save path keeps recentRun (last 8 runs per game)');
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
{
  const tmp = path.join(require('os').tmpdir(), `pace-${process.pid}.csv`);
  const save = { scores: { 'pb:spell_word': { recentRuns: [{ pace: { v: 1, t: [10, 10], p: [20, 20], f: '11', fr: 0 } }] } } };
  fs.writeFileSync(tmp, 'ID,Owner,saveData\r\n' + `x1,u1,"${JSON.stringify(save).replace(/"/g, '""')}"\r\n`);
  const out = JSON.parse(execFileSync('node', [path.join(ROOT, 'tools/pace-report.cjs'), tmp, '--json'], { encoding: 'utf8' }));
  fs.unlinkSync(tmp);
  assert.strictEqual(out.games[0].game, 'pb:spell_word', 'a CSV export (Wix) is read too');
}

/* ══ Pass B: ready-pace rule ══ */
{
  const { U } = load();
  const P = (t, p, f, fr = 0) => ({ v: 1, t, p, f, fr });
  const fifteen = x => Array.from({ length: 15 }, () => x);
  // steady: 15 right, all at 1.0× par → rainbow
  assert.strictEqual(U.readyPace(P(fifteen(20), fifteen(20), '1'.repeat(15)), 'br:spell_word'), true, 'steady first-try run earns rainbow');
  // notebook pauses: three answers at 10× par still pass on the median
  const t = fifteen(20); t[2] = 200; t[7] = 250; t[11] = 300;
  assert.strictEqual(U.readyPace(P(t, fifteen(20), '1'.repeat(15)), 'br:spell_word'), true, 'a few long notebook pauses do not cost the rainbow');
  // slow throughout → no
  assert.strictEqual(U.readyPace(P(fifteen(40), fifteen(20), '1'.repeat(15)), 'br:spell_word'), false, 'slow throughout stays gold');
  // first-try under 75% → no
  assert.strictEqual(U.readyPace(P(fifteen(10), fifteen(20), '111111111110000'), 'br:spell_word'), false, 'fewer than 75% first-try right stays gold');
  // frantic tapping → no
  assert.strictEqual(U.readyPace(P(fifteen(10), fifteen(20), '1'.repeat(15), 3), 'br:spell_word'), false, 'more than two frantic taps stays gold');
  // speed games: pace not judged, accuracy only
  assert.strictEqual(U.readyPace(P(fifteen(90), fifteen(20), '1'.repeat(15)), 'bc:vocab_speed'), true, 'speed games judge first-try accuracy only');
  // Pre-Boo slack: 1.5× par fails spell_word for br, passes for pb (1.25 × 1.3)
  assert.strictEqual(U.readyPace(P(fifteen(31), fifteen(20), '1'.repeat(15)), 'br:spell_word'), false);
  assert.strictEqual(U.readyPace(P(fifteen(31), fifteen(20), '1'.repeat(15)), 'pb:spell_word'), true, 'Pre-Boo gets wider zones');
  // too few timed answers (answered before clips finished) → no
  assert.strictEqual(U.readyPace(P([null, null, null, null, 10, 10, 10, 10], Array(8).fill(20), '11111111'), 'br:say_word'), false, 'needs at least 5 timed answers');
  assert.strictEqual(U.readyPace(P(fifteen(10), fifteen(20), '1'.repeat(15)), 'br:unknown_game'), false, 'unknown games never get rainbow');
  assert.strictEqual(U.readyPace(null, 'br:spell_word'), false);
  // extras use their own ids
  assert.strictEqual(U.readyPace(P(fifteen(20), fifteen(20), '1'.repeat(15)), 'br-extra:booha_bites'), true, 'extra games can be rainbow too');
}
/* ══ Pass B: replays pause the clock ══ */
{
  const { U, at } = load();
  const run = U.createRun({ total: 1, hud: false });
  at(0); run.ready(3000, { waitAudio: true }); at(2000); run.audioDone();   // clip ends at 2 s
  at(3000); run.pauseClock();                                               // 1 s of thinking, then replay
  at(9000); run.audioDone();                                                // replay ends 6 s later
  at(10500); run.hit();                                                     // 1.5 s more
  assert.deepStrictEqual(Array.from(run.summary().pace.t), [25], 'replay time is excluded; thinking time before and after counts');
}
{
  const { U, at } = load();
  const run = U.createRun({ total: 1, hud: false });
  at(0); run.ready(3000, { waitAudio: true }); at(1000); run.audioDone(); at(1500); run.pauseClock(); at(1700); run.hit();
  assert.deepStrictEqual(Array.from(run.summary().pace.t), [5], 'answering during a replay counts the banked time');
}
['say-word', 'say-sentence', 'ask-question', 'echo', 'week-boss'].forEach(g => {
  assert(/run\.pauseClock\(\)/.test(read(`games/${g}.js`)), `${g} must pause the pace clock on replay`);
});
/* ══ Pass B: emitGameEnd decides rainbow; incomplete runs never do ══ */
{
  const { U, events, at } = load();
  const run = U.createRun({ total: 6, hud: false });
  for (let i = 0; i < 6; i++) { at(i * 10000); run.ready(2000); at(i * 10000 + 1500); run.hit(); }
  run.summary();
  U.emitGameEnd({ saveId: 'br:vocab_tap', score: 100, completed: true });
  assert.strictEqual(events[0].detail.rainbow, true, 'a ready-pace run is sent as rainbow');
  run.summary();
  U.emitGameEnd({ saveId: 'br:vocab_tap', score: 100, completed: false });
  assert.strictEqual(events[1].detail.rainbow, false, 'an unfinished run is never rainbow');
}
/* ══ Pass B: the save keeps weekly + lifetime rainbow, needs ≥1 star ══ */
{
  const key = 'booha_save:v3:rainbow-student';
  let stored = { version: 2, scores: {}, unlocks: {}, meta: { lastWeeklyKey: '2026-10-25|october-w4', allTimeStars: 0 }, weekly: {} };
  const localStorage = {
    getItem(n) { if (n === 'booha_userid') return 'rainbow-student'; if (n === key) return JSON.stringify(stored); return null; },
    setItem(n, v) { if (n === key) stored = JSON.parse(v); }, removeItem() {},
  };
  const listeners = {};
  const document = { readyState: 'loading', addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); }, dispatchEvent(e) { (listeners[e.type] || []).forEach(f => f(e)); } };
  class CustomEvent { constructor(t, i = {}) { this.type = t; this.detail = i.detail; } }
  class Event { constructor(t) { this.type = t; } }
  const context = {
    window: { BOOHA_SYNC_READY: false, CALENDAR: {
      getCurrentCurriculumWeek() { return { year: 2026, monthSlug: 'october', weekNumber: 4, weekId: 'october-w4', weekStart: '2026-10-25', occurrenceKey: '2026-10-25|october-w4' }; },
      getCurriculumWeekOccurrenceKey(cw) { return cw.occurrenceKey; }, getTodayKey() { return '2026-10-27'; },
    } },
    localStorage, document, CustomEvent, Event, console: { log() {}, warn() {}, error: console.error }, Date, setTimeout, clearTimeout,
  };
  context.window.BoohaSync = { checkpoint() {} }; context.BoohaSync = context.window.BoohaSync; context.CALENDAR = context.window.CALENDAR;
  vm.createContext(context);
  for (const f of ['js/core/adventure-core.js', 'js/core/save-file.js', 'js/core/game-registry.js', 'js/core/score-system.js', 'js/core/unlock-system.js', 'js/core/day-record.js']) {
    vm.runInContext(read(f), context, { filename: f });
  }
  const BA = context.window.BoohaAdventure;
  BA.init();
  const fire = d => document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail: d }));
  fire({ saveId: 'br:spell_word', score: 93, completed: true, rainbow: true });
  fire({ saveId: 'br:spell_word', score: 60, completed: true, rainbow: false });
  fire({ saveId: 'br:vocab_tap', score: 10, completed: true, rainbow: true });   // 0 stars: no rainbow
  const S = BA.scores;
  assert.strictEqual(S.weeklyRainbowForGame('br:spell_word'), true, 'a rainbow run this week stays rainbow for the week');
  assert.strictEqual(S.weeklyRainbowForGame('br:vocab_tap'), false, 'rainbow needs at least one star');
  assert.strictEqual(stored.scores['br:spell_word'].rainbows, 1, 'lifetime rainbow count');
  assert(stored.scores['br:spell_word'].firstRainbowAt > 0, 'first rainbow time is kept');
  assert.strictEqual(S.weeklyStarsFor('br'), 3, 'rainbow adds no stars to the weekly total');
  // Ready Pass 1: the permanent week log keeps which games were rainbow.
  const wk = stored.meta.weekLog['2026-10-25|october-w4'];
  assert(wk && wk.ready && wk.ready['br:spell_word'] === 1, 'weekLog.ready records a rainbow game (survives the Sunday reset)');
  assert(!wk.ready['br:vocab_tap'], 'weekLog.ready needs at least one star, like the score system');
}
/* ══ Pass B: shown everywhere it was promised ══ */
{
  const sc = read('js/game-scorecard.js');
  assert(/U\.readyPace\(run\.pace, opts\.gameId\)/.test(sc) && /bsc-rainbow/.test(sc), 'score card turns earned stars rainbow');
  assert(/READY PACE · じゅんび OK/.test(sc), 'score card shows a short rainbow chip');
  // Shared iPads: "first rainbow ever" must be per student, read from the
  // student's own synced save, never from a device-wide flag.
  assert(!/booha_rainbow_seen/.test(sc) && !/localStorage/.test(sc.slice(sc.indexOf('function firstRainbowEver'), sc.indexOf('var overlay'))),
    'the first-rainbow explanation is not keyed on a device-wide flag');
  assert(/BoohaAdventure\.save\.load\(\)\.scores/.test(sc) && /\.rainbows\) > 0/.test(sc), 'first rainbow = no rainbows yet in this student\'s save');
  const css = read('theme/game.css');
  assert(/\.bsc-rainbow \.bsc-star\.on path \{ fill: url\(#booha-rainbow\)/.test(css), 'rainbow fill on score-card stars');
  assert(/@keyframes bscSheen \{[^}]*translateX/.test(css), 'the sheen moves by transform only');
  assert(/prefers-reduced-motion: reduce\) \{ \.bsc-rainbow::after \{ animation: none/.test(css), 'reduced motion keeps the rainbow still');
  const menu = read('js/menu-core.js');
  assert(/setRainbow\(t, rainbow\)/.test(menu) && /setRainbow\(t, xr\)/.test(menu) && /weeklyRainbowForGame/.test(menu), 'menu tiles (nine + extras) show weekly rainbow');
  assert(/\.tile\.rainbow::after[\s\S]*mask/.test(read('theme/menu.css')), 'rainbow tiles get a prism edge');
  const pg = read('js/ui/profile-game.js');
  assert(/pg-node \$\{state\}\$\{rainbow \? ' rainbow' : ''\}/.test(pg), 'profile trail node keeps the rainbow');
  assert(/pg-x-stars\$\{rainbow \? ' rainbow' : ''\}/.test(pg), 'bonus game cards show rainbow stars');
  assert(/function readyMarker/.test(pg) && /READY GAMES THIS WEEK/.test(pg) && /if \(!n\) return '';/.test(pg),
    'the trail shows "N / 9 ready games this week", hidden until the first one');
  assert(!/🌈/.test(sc) && !/🌈/.test(pg), 'no rainbow emoji; the rainbow is shown by colour');
  // Ready Pass 1
  assert(/READY_LINES/.test(sc) && /You came ready!/.test(sc) && /Your ready pace is glowing!/.test(sc) && /The whole trail is rainbow!/.test(sc),
    'Booha reacts on the score card at the first rainbow and at 3 / 9 ready games');
  assert(/after >= 9 && before < 9/.test(sc) && /after >= 3 && before < 3/.test(sc), 'the 3 and 9 reactions fire only when the weekly count crosses them');
  assert(/extras never move the 9/.test(sc), 'extra games do not count toward the 9');
  assert(/READY_LANES/.test(pg) && /pg-ready-lanes/.test(pg) && /'WORDS'/.test(pg) && /'SENTENCES'/.test(pg) && /'LISTEN'/.test(pg),
    'the ready marker breaks down by lane');
  assert(/markSeen\('readySeen'/.test(pg) && /markSeen\('sealedSeen'/.test(pg), 'profile reactions and Week Sealed remember "seen" in the student save');
  assert(!/localStorage\.setItem\('booha_week_sealed_seen'/.test(pg), 'Week Sealed no longer writes a one-slot device flag');
  assert(/li class="ready"/.test(pg), 'Week Sealed shows READY PACE n / 9');
  assert(/readyShownKey/.test(pg), 'a Booha ready line stays up through re-renders on the page where it first shows');
}

console.log('Pace + rainbow audit passed: first responses vs par, replay pause, ready-pace rule, weekly/lifetime rainbow, score card / menu / profile, calibration report.');
