#!/usr/bin/env node
'use strict';

// Christmas Pass 1 "First Snow": date-based phases, snowflake visitors,
// light maze snowfall, and Grubb's first-screen greeting.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
// Load the helper in a VM context, like seasonal-visuals.test.cjs, so the
// result does not depend on any parent package.json "type" setting.
const visualsContext = {};
vm.createContext(visualsContext);
vm.runInContext(read('js/core/seasonal-visuals.js'), visualsContext, { filename: 'js/core/seasonal-visuals.js' });
const visuals = visualsContext.BoohaSeasonalVisuals;
assert.ok(visuals && typeof visuals.checkpointSparkColors === 'function', 'seasonal visuals helper must load');

function loadSkins(today) {
  const context = {
    window: {
      CALENDAR: { getTodayKey: () => today },
      BoohaAdventure: { save: { load: () => ({}) } },
    },
    document: { documentElement: { dataset: {}, style: { setProperty() {} } } },
    Intl, Date, console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });
  return { skins: context.window.BoohaSkins, root: context.document.documentElement };
}

// ── Phases switch by date, with no deploy ────────────────────────────────
const { skins } = loadSkins('2026-11-01');
const christmas = skins.getSeason('christmas-2026');
assert.strictEqual(skins.seasonPhase('christmas-2026', '2026-10-31'), null, 'no Christmas phase on Halloween');
assert.strictEqual(skins.seasonPhase('christmas-2026', '2026-11-01').id, 'first-snow');
assert.strictEqual(skins.seasonPhase('christmas-2026', '2026-11-30').id, 'first-snow');
assert.strictEqual(skins.seasonPhase('christmas-2026', '2026-12-01').id, 'lights-on');
assert.strictEqual(skins.seasonPhase('christmas-2026', '2027-01-02').id, 'lights-on');
assert.strictEqual(skins.seasonPhase('christmas-2026', '2027-01-03'), null);
assert.strictEqual(skins.seasonPhase('halloween-2026', '2026-10-15'), null, 'Halloween has no phases');
christmas.phases.forEach(phase => {
  assert.ok(phase.greeting.en && phase.greeting.jp, `${phase.id} needs a bilingual Grubb greeting`);
  assert.strictEqual(phase.mazeSnow, true, `${phase.id} keeps the maze snowfall`);
});

const nov = loadSkins('2026-11-12');
assert.strictEqual(nov.root.dataset.season, 'christmas');
assert.strictEqual(nov.root.dataset.seasonPhase, 'first-snow', 'theme must expose the phase for CSS');
const oct = loadSkins('2026-10-29');
assert.strictEqual(oct.root.dataset.season, 'halloween');
assert.strictEqual(oct.root.dataset.seasonPhase, undefined, 'Halloween must not carry a Christmas phase');

// ── November sparkles are frosty; December brings gold back ──────────────
const firstSnow = skins.seasonPhase('christmas-2026', '2026-11-08');
const lightsOn = skins.seasonPhase('christmas-2026', '2026-12-08');
const novSparks = visuals.checkpointSparkColors(christmas, 41, ['#a', '#b'], firstSnow);
assert.ok(!novSparks.includes(christmas.glow.gold), 'November sparkles must not use gold yet');
assert.ok(novSparks.includes('#ffffff'));
assert.ok(visuals.checkpointSparkColors(christmas, 48, ['#a', '#b'], lightsOn).includes(christmas.glow.gold),
  'December sparkles bring the gold back');
assert.deepStrictEqual(visuals.checkpointSparkColors(christmas, 12, ['#a', '#b'], firstSnow), ['#a', '#b'],
  'non-Christmas weeks keep their month colors');
const halloween = skins.getSeason('halloween-2026');
assert.deepStrictEqual([...visuals.checkpointSparkColors(halloween, 37, ['#a', '#b'])],
  [halloween.glow.orange, halloween.glow.purple, halloween.glow.lime], 'Halloween sparkles unchanged');

// ── Snowflake visitors replace the bats ──────────────────────────────────
const snow = skins.seasonalVisitor('christmas-2026');
assert.strictEqual(snow.kind, 'snowflake');
assert.strictEqual(snow.requires, 'blitz-triple', 'snowflakes are the same Blitz-trio reward as the bats');
assert.notStrictEqual(snow.asset, skins.seasonalVisitor('halloween-2026').asset,
  'a different asset is what clears the bats on Nov 1');
assert.ok(fs.existsSync(path.join(root, snow.asset)), 'snowflake asset must exist');
assert.ok(fs.statSync(path.join(root, snow.asset)).size < 100 * 1024, 'snowflake asset must stay under 100 KiB');

// ── Maze snowfall: light, and off where it should be ─────────────────────
const base = { width: 1280, height: 800, enabled: true };
const n = visuals.mazeSnowCount(base);
assert.ok(n >= visuals.MAZE_SNOW_MIN && n <= visuals.MAZE_SNOW_MAX, 'snowfall count stays light');
assert.strictEqual(visuals.mazeSnowCount({ ...base, performanceTier: 'low' }), 0, 'off on the low tier');
assert.strictEqual(visuals.mazeSnowCount({ ...base, reducedMotion: true }), 0, 'off with reduced motion');
assert.strictEqual(visuals.mazeSnowCount({ ...base, enabled: false }), 0, 'off outside Christmas');
assert.strictEqual(visuals.mazeSnowCount({ width: 4000, height: 4000, enabled: true }), visuals.MAZE_SNOW_MAX);
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const flakes = Array.from({ length: 20 }, () => visuals.makeSnowflake(400, 300, rand));
for (let i = 0; i < 2000; i++) visuals.stepSnowfall(flakes, 1 / 60, 400, 300, rand);
assert.strictEqual(flakes.length, 20);
assert.ok(flakes.every(f => f.y >= -50 && f.y <= 310 && f.x >= -14 && f.x <= 414), 'flakes recycle instead of piling up');
assert.ok(flakes.every(f => f.speed < 25), 'maze flakes fall slowly');

// ── Wiring in the pages ──────────────────────────────────────────────────
const maze = read('maze.html');
assert.ok(maze.includes("w.visitorKind === 'snowflake'"), 'maze draws snowflakes as spinning flakes, not flapping bats');
assert.ok(maze.includes('drawMazeSnow(now, activeSeasonPhase)'), 'maze draws the snowfall layer');
assert.ok(maze.includes('checkpointSparkColors(activeSeason, cp.w, [col1, col2], activeSeasonPhase)'));
assert.ok(!maze.includes("=== 'halloween-2026'"), 'maze must not hard-code a season id for visitors');

const index = read('index.html');
assert.ok(index.includes('id="seasonGreeting"'), 'first screen has Grubb greeting bubble');
assert.ok(index.includes('function applySeasonGreeting('), 'greeting is filled from the season phase');
assert.ok(/prefers-reduced-motion[\s\S]*\.seasonGreeting\.show \{ animation: none; \}/.test(index),
  'greeting pop respects reduced motion');

console.log('Christmas First Snow passed: phases, frosty November sparkles, snowflake visitors, light maze snow, Grubb greeting.');
