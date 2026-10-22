#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Games Pass 5: the three menus share js/menu-core.js. Each page must still
// load it with its own data-curriculum, and the shared tile-star rule must
// show weekly stars on the live week only (never last or next week).
function menuStars(file, curriculum, selectedWeek, currentWeek) {
  const page = read(file);
  assert.match(page, new RegExp(`<html[^>]*data-curriculum="${curriculum}"`), `${file} must declare data-curriculum="${curriculum}"`);
  assert.ok(page.includes('/the-booha-adventure/js/menu-core.js'), `${file} must load the shared menu engine`);
  assert.ok(page.indexOf('js/core/score-system.js') < page.indexOf('js/menu-core.js'), `${file} must load the score system before the menu`);
  const context = { window: {}, URLSearchParams };
  vm.createContext(context);
  vm.runInContext(read('js/menu-core.js'), context, { filename: 'js/menu-core.js' });
  const menu = context.window.BoohaMenu;
  assert.ok(menu && typeof menu.tileStars === 'function', 'menu-core must expose BoohaMenu.tileStars');
  const calendar = { getCurrentCurriculumWeek() { return currentWeek; } };
  const scores = { weeklyStarsForGame() { return 3; } };
  return menu.tileStars(curriculum, selectedWeek, 'vocab-tap', calendar, scores) > 0 ? 1 : 0;
}

function runOverlay(file, selectedWeek, currentWeek) {
  const curriculum = file.split('/')[1];
  return menuStars(file, curriculum, selectedWeek, currentWeek);
}

const current = {
  monthSlug: 'september',
  weekNumber: 4,
};

for (const [curriculum, file] of [
  ['bc', 'curriculum/bc/games-index.html'],
  ['br', 'curriculum/br/games-index.html'],
  ['pb', 'curriculum/pb/games-index.html'],
]) {
  const currentSlug = `${curriculum}_sep_w4`;
  assert.strictEqual(runOverlay(file, currentSlug, current), 1,
    `${file} should show the live week's stars`);
  assert.strictEqual(runOverlay(file, `${curriculum}_sep_w3`, current), 0,
    `${file} must hide stars on last week's content`);
  assert.strictEqual(runOverlay(file, `${curriculum}_oct_w1`, current), 0,
    `${file} must hide stars on next week's content`);
}

console.log('Weekly star display test passed: current-week badges do not bleed into adjacent week pages.');
