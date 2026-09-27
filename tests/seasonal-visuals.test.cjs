#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const seasonalContext = {};
vm.createContext(seasonalContext);
vm.runInContext(read('js/core/seasonal-visuals.js'), seasonalContext, { filename: 'js/core/seasonal-visuals.js' });
const seasonalVisuals = seasonalContext.BoohaSeasonalVisuals;

const cssVars = {};
const context = {
  window: {
    CALENDAR: { getTodayKey: () => '2026-09-27' },
    BoohaAdventure: { save: { load: () => ({}) } },
  },
  document: {
    documentElement: {
      dataset: {},
      style: { setProperty(name, value) { cssVars[name] = value; } },
    },
  },
  Intl,
  Date,
  console,
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });

const skins = context.window.BoohaSkins;
const palette = skins.SEASONS.halloween.palette;
const glow = skins.SEASONS.halloween.glow;
assert.deepStrictEqual(Object.keys(palette).sort(), ['black', 'lime', 'orange', 'purple']);
assert.notStrictEqual(palette.lime, '#38e08a', 'season lime must not become Daily Check correct green');
assert.notStrictEqual(palette.lime, '#ff5a7a', 'season lime must not become Daily Check wrong red');
assert.strictEqual(context.document.documentElement.dataset.season, 'halloween');
assert.strictEqual(cssVars['--season-orange'], palette.orange);
assert.strictEqual(cssVars['--season-purple'], palette.purple);
assert.strictEqual(cssVars['--season-lime'], palette.lime);
assert.strictEqual(cssVars['--season-black'], palette.black);
assert.deepStrictEqual({ ...glow }, {
  orange: '#ff7a00',
  purple: '#b44dff',
  lime: '#9dff3a',
}, 'Halloween glow colors must be separate from the UI palette');
assert.deepStrictEqual([...skins.SEASONS.halloween.checkpointSparkWeeks], [37, 38, 39, 40]);

assert.strictEqual(skins.MONTH_COLORS.length, 12, 'shared month table must cover all 12 months');
assert.deepStrictEqual([...skins.monthColorsForWeek(37)], [glow.orange, glow.purple],
  'October must use the Halloween orange/purple pair');
assert.deepStrictEqual([...skins.monthColorsForWeek(45)], ['#e53935', '#43d17b'],
  'December must have an explicit Christmas red/green pair');
assert.notStrictEqual(skins.monthColorsForWeek(13)[0], '#3bff8a',
  'April must not reuse the answer-like green that only existed in Maze');

const seasonalVisitor = skins.seasonalVisitor('halloween');
assert.strictEqual(seasonalVisitor.kind, 'bat');
assert.strictEqual(seasonalVisitor.requires, 'blitz-triple');
assert.strictEqual(seasonalVisitor.color, glow.lime);
assert.strictEqual(seasonalVisitor.asset, 'assets/img/seasonal-bat.webp');
assert.ok(fs.existsSync(path.join(root, seasonalVisitor.asset)), 'seasonal bat asset must exist');
assert.ok(fs.statSync(path.join(root, seasonalVisitor.asset)).size < 100 * 1024,
  'seasonal bat asset must stay under the 100 KiB budget');

const seasonalKarasuki = skins.seasonalKarasuki('halloween');
assert.strictEqual(seasonalKarasuki.kind, 'barba');
assert.strictEqual(seasonalKarasuki.name, 'Barba');
assert.strictEqual(seasonalKarasuki.nameJp, 'バルバ');
assert.strictEqual(seasonalKarasuki.asset, 'assets/img/wanderers/barba.webp');
assert.strictEqual(seasonalKarasuki.lines.length, 10, 'Barba must have one fact for each folklore entry');
assert.ok(seasonalKarasuki.lines.every(line =>
  line.en.includes('{name}') && line.jp.includes('{name}') && Object.keys(line.furigana).length > 0
), 'every Barba fact must be bilingual, name-aware, and furigana-ready');
assert.ok(fs.existsSync(path.join(root, seasonalKarasuki.asset)), 'Barba asset must exist');
assert.ok(fs.statSync(path.join(root, seasonalKarasuki.asset)).size < 300 * 1024,
  'Barba asset must stay under the wanderer sprite budget');

const karasuki = read('js/karasuki.js');
assert.match(karasuki, /function openBarbaPop\(\)/, 'Karasuki must wire the seasonal Barba popup');
assert.match(karasuki, /function clickCheckBarba\(worldX, worldY\)/, 'Barba must be tappable');
assert.match(karasuki, /drawBarba\(now\); drawNuppi\(now\)/, 'Barba must render beneath Nuppi');
assert.match(karasuki, /line\.furigana \|\| \{\}/, 'Barba popup must render Japanese through furigana data');
assert.ok(!/openBarbaPop[\s\S]{0,1200}recordWandererVisit/.test(karasuki),
  'Barba must stay outside the collectible wanderer visit system');
assert.strictEqual(seasonalVisuals.activeSeasonalVisitor(seasonalVisitor, false), null,
  'Halloween bats must stay gated until Blitz is complete');
assert.strictEqual(seasonalVisuals.activeSeasonalVisitor(seasonalVisitor, 'pb'), seasonalVisitor,
  'a complete Blitz curriculum must activate the Halloween visitor');
assert.deepStrictEqual(
  [...seasonalVisuals.checkpointSparkColors(skins.SEASONS.halloween, 37, ['aqua', 'mint'])],
  [glow.orange, glow.purple, glow.lime],
  'October checkpoints must use the Halloween spark cycle');
assert.deepStrictEqual(
  [...seasonalVisuals.checkpointSparkColors(skins.SEASONS.halloween, 36, ['aqua', 'mint'])],
  ['aqua', 'mint'],
  'non-October checkpoints must retain their own spark colors');

const index = read('index.html');
assert.match(index, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.sp \{ animation: none; \}/,
  'index sparkles must stop under reduced motion');

const maze = read('maze.html');
assert.match(maze, /html\[data-season="halloween"\] #mazeImg\{ filter:brightness\(1\.10\) saturate\(1\.08\); \}/,
  'Halloween Maze artwork must receive a modest brightness lift');
assert.deepStrictEqual(
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(games => seasonalVisuals.extraVisitorCount(games, 10)),
  [0, 0, 1, 2, 3, 3, 4, 5, 6, 6],
  'seasonal visitors must follow the existing weekly-game progression');
assert.strictEqual(seasonalVisuals.seasonalVisitorCount({ games: 9, availableCount: 10, performanceTier: 'low' }), 2);
assert.strictEqual(seasonalVisuals.seasonalVisitorCount({ games: 9, availableCount: 10, reducedMotion: true }), 0);
assert.strictEqual(seasonalVisuals.seasonalVisitorCount({ games: 9, availableCount: 10, forceAll: true }), 10);

let canvasCreations = 0;
const fakeContext = {
  setTransform() {},
  scale() {},
  drawImage() {},
  shadowColor: '',
  shadowBlur: 0,
};
const getBatGlow = seasonalVisuals.createBatGlowCache({
  createCanvas() {
    canvasCreations += 1;
    return { getContext() { return fakeContext; } };
  },
  getDevicePixelRatio: () => 2,
});
const imageA = { _boohaSrc: 'assets/img/seasonal-bat.webp' };
const imageB = { _boohaSrc: 'assets/img/another-bat.webp' };
const glowA1 = getBatGlow(imageA, 24, glow.lime);
const glowA2 = getBatGlow(imageA, 24, glow.lime);
assert.strictEqual(glowA1, glowA2, 'identical bat glow requests must reuse one cached canvas');
assert.strictEqual(getBatGlow(imageB, 24, glow.lime) === glowA1, false,
  'different bat sources must not collide in the glow cache');
assert.strictEqual(canvasCreations, 2);
assert.strictEqual(glowA1._boohaLogicalSize, 42, 'cached glow must expose its logical CSS size');

['maze.html', 'js/karasuki.js', 'js/utsuroba.js'].forEach(file => {
  const source = read(file);
  assert.ok(source.includes('window.BoohaSkins.MONTH_COLORS'), `${file} must use the shared month table`);
  assert.ok(!source.includes('const MONTH_COLORS = ['), `${file} must not define a private month table`);
});

console.log('Seasonal visuals passed: shared palette, CSS variables, 12-month colors, and reduced-motion sparkles.');
