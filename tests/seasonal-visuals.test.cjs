#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

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
assert.deepStrictEqual(Object.keys(palette).sort(), ['black', 'lime', 'orange', 'purple']);
assert.notStrictEqual(palette.lime, '#38e08a', 'season lime must not become Daily Check correct green');
assert.notStrictEqual(palette.lime, '#ff5a7a', 'season lime must not become Daily Check wrong red');
assert.strictEqual(context.document.documentElement.dataset.season, 'halloween');
assert.strictEqual(cssVars['--season-orange'], palette.orange);
assert.strictEqual(cssVars['--season-purple'], palette.purple);
assert.strictEqual(cssVars['--season-lime'], palette.lime);
assert.strictEqual(cssVars['--season-black'], palette.black);

assert.strictEqual(skins.MONTH_COLORS.length, 12, 'shared month table must cover all 12 months');
assert.deepStrictEqual([...skins.monthColorsForWeek(37)], [palette.orange, palette.purple],
  'October must use the Halloween orange/purple pair');
assert.deepStrictEqual([...skins.monthColorsForWeek(45)], ['#3b6fff', '#b8c9ff'],
  'December must have an explicit winter pair');
assert.notStrictEqual(skins.monthColorsForWeek(13)[0], '#3bff8a',
  'April must not reuse the answer-like green that only existed in Maze');

const index = read('index.html');
assert.match(index, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.sp \{ animation: none; \}/,
  'index sparkles must stop under reduced motion');

['maze.html', 'js/karasuki.js', 'js/utsuroba.js'].forEach(file => {
  const source = read(file);
  assert.ok(source.includes('window.BoohaSkins.MONTH_COLORS'), `${file} must use the shared month table`);
  assert.ok(!source.includes('const MONTH_COLORS = ['), `${file} must not define a private month table`);
});

console.log('Seasonal visuals passed: shared palette, CSS variables, 12-month colors, and reduced-motion sparkles.');
