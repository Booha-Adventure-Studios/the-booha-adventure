#!/usr/bin/env node
'use strict';

// Christmas Pass 2 "Lights On": December string lights, ornament visitors
// joining the snowflakes, and gold sparks in the player's Maze trail.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function loadSkins(today) {
  const context = {
    window: { CALENDAR: { getTodayKey: () => today }, BoohaAdventure: { save: { load: () => ({}) } } },
    document: { documentElement: { dataset: {}, style: { setProperty() {} } } },
    Intl, Date, console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });
  return context.window.BoohaSkins;
}

const skins = loadSkins('2026-12-10');
const christmas = skins.getSeason('christmas-2026');

// ── Visitors: snowflakes in November, snowflakes + ornaments in December ─
const kinds = date => Array.from(skins.seasonalVisitors('christmas-2026', date), v => v.kind);
assert.deepStrictEqual(kinds('2026-11-20'), ['snowflake'], 'November is snowflakes only');
assert.deepStrictEqual(kinds('2026-12-01'), ['snowflake', 'ornament'], 'ornaments join on Dec 1');
assert.deepStrictEqual(kinds('2027-01-02'), ['snowflake', 'ornament']);
assert.deepStrictEqual(Array.from(skins.seasonalVisitors('halloween-2026', '2026-10-20'), v => v.kind), ['bat'],
  'Halloween keeps its single bat visitor');
assert.deepStrictEqual(Array.from(loadSkins('2026-10-20').seasonalVisitors(), v => v.kind), ['bat'],
  'on Oct 20 today\'s flock is still Halloween bats');
assert.deepStrictEqual(Array.from(loadSkins('2026-12-10').seasonalVisitors(), v => v.kind), ['snowflake', 'ornament'],
  'on Dec 10 today\'s flock is snowflakes and ornaments');
assert.strictEqual(skins.seasonalVisitors('christmas-2026', '2026-12-10')[0], skins.seasonalVisitor('christmas-2026'),
  'December keeps the November snowflake so they do not vanish on Dec 1');
const ornament = skins.seasonalVisitors('christmas-2026', '2026-12-10')[1];
assert.strictEqual(ornament.requires, 'blitz-triple', 'ornaments are the same Blitz-trio reward');
assert.strictEqual(ornament.color, christmas.glow.gold);
assert.ok(fs.existsSync(path.join(root, ornament.asset)), 'ornament asset must exist');
assert.ok(fs.statSync(path.join(root, ornament.asset)).size < 100 * 1024, 'ornament asset must stay under 100 KiB');

// ── Gold trail accent only in December ───────────────────────────────────
assert.strictEqual(skins.seasonPhase('christmas-2026', '2026-11-20').trailAccent, undefined,
  'November trails stay frosty with no gold');
assert.strictEqual(skins.seasonPhase('christmas-2026', '2026-12-10').trailAccent, christmas.glow.gold);

// ── Maze wiring ──────────────────────────────────────────────────────────
const maze = read('maze.html');
assert.ok(maze.includes('function activeSeasonalVisitors()'), 'maze builds the full flock');
assert.ok(maze.includes('visitorForSlot(seasonalFlock, i)'), 'each flock slot gets a kind');
assert.ok(maze.includes('Math.floor(index / 2) % visitors.length'),
  'kinds are paired across slots so both kinds fly both directions');
assert.ok(maze.includes("w.visitorKind === 'ornament'"), 'ornaments swing instead of flapping');
assert.ok(maze.includes('currentVisitorAssets.includes(w.visitorSrc)'),
  'visitors are cleared when they leave today\'s flock');
assert.ok(maze.includes('function christmasTrailAccent()') && maze.includes('const accent=christmasTrailAccent();'),
  'player trail mixes in the December gold accent');

// ── First screen + hub string lights ─────────────────────────────────────
const index = read('index.html');
assert.strictEqual((index.match(/class="stringLights"/g) || []).length, 2,
  'string lights on the first screen and above the hub title');
assert.ok(index.includes('html[data-season="christmas"][data-season-phase="lights-on"] .stringLights'),
  'string lights only show in the December phase');
assert.ok(index.includes("seasonPhase?.()?.id === 'lights-on'"), 'lights are only built in December');
assert.ok(/html\.hub-reduced-motion \.stringLights \.bulb,\s*html\.hub-low-power \.stringLights \.bulb \{ animation: none;/.test(index),
  'bulbs stop twinkling on reduced motion and low power');
assert.ok(/prefers-reduced-motion[\s\S]*\.stringLights \.bulb \{ animation: none;/.test(index));

console.log('Christmas Lights On passed: December ornaments + snowflakes, gold trail accent, string lights.');
