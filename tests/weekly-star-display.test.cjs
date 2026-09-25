#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function overlaySource(file) {
  const source = read(file);
  const marker = '/* ── Weekly star overlay';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${file} must contain the weekly star overlay`);
  const match = source.slice(start).match(/\(function \(\) \{[\s\S]*?\}\)\(\);/);
  assert.ok(match, `${file} weekly star overlay must remain executable`);
  return match[0];
}

function runOverlay(file, selectedWeek, currentWeek) {
  let ready;
  const badges = [];
  const tiles = [{
    dataset: { game: 'vocab-tap' },
    appendChild(node) { badges.push(node); },
    classList: { add() {} },
  }];
  const window = {
    location: { search: `?week=${selectedWeek}` },
    CALENDAR: { getCurrentCurriculumWeek() { return currentWeek; } },
    BoohaAdventure: {
      scores: { weeklyStarsForGame() { return 3; } },
    },
  };
  const document = {
    addEventListener(type, listener) {
      if (type === 'booha:ready') ready = listener;
    },
    querySelectorAll() { return tiles; },
    createElement() { return {}; },
  };
  const context = {
    window,
    document,
    BoohaAdventure: window.BoohaAdventure,
    URLSearchParams,
  };
  vm.createContext(context);
  vm.runInContext(overlaySource(file), context, { filename: file });
  assert.strictEqual(typeof ready, 'function', `${file} must wait for booha:ready`);
  ready();
  return badges.length;
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
