#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(ROOT, 'js/feed_booha_1.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'js/feed_booha_levels_1.js'), 'utf8'),
  context,
  { filename: 'js/feed_booha_levels_1.js' }
);

const levels = context.window.FEED_BOOHA_LEVELS;
assert.ok(Array.isArray(levels), 'Feed Booha levels must be an array');
assert.strictEqual(levels.length, 50, 'Feed Booha must contain 50 levels');
assert.match(engineSource, /function getActiveRopes\(\) \{ return state\.ropes\.filter\(r => !r\.cut\); \}/,
  'delayed ropes must remain active until their release timer fires');
assert.match(engineSource, /rope\.releaseAt = performance\.now\(\) \+ rope\.delayMs/,
  'delayed ropes must expose their release timing for debugging');
assert.match(engineSource, /const MAX_CONTINUES\s*=\s*3/,
  'each chapter must provide three continues');
assert.match(engineSource, /function showFailureMessage\(\)/,
  'failures must present an explicit choice screen');
assert.doesNotMatch(engineSource, /pendingFailTimeout2\s*=\s*setTimeout\(/,
  'failures must not automatically reset before the student chooses');

levels.forEach((level, index) => {
  const label = `level ${index + 1}`;
  assert.strictEqual(level.id, index + 1, `${label}: ids must be sequential`);
  assert.ok(level.candy && level.booha, `${label}: candy and Booha are required`);
  assert.ok(level.candy.x >= 26 && level.candy.x <= 514, `${label}: candy x is out of bounds`);
  assert.ok(level.candy.y >= 26 && level.candy.y <= 900, `${label}: candy y is out of bounds`);
  assert.ok(level.booha.x >= 80 && level.booha.x <= 460, `${label}: Booha x is out of bounds`);
  assert.ok(level.booha.y >= 80 && level.booha.y <= 880, `${label}: Booha y is out of bounds`);
  assert.strictEqual(
    level.parCuts,
    level.ropes.length,
    `${label}: parCuts should match the number of ropes`
  );

  if (level.booha.behavior === 'horizontal') {
    assert.ok(level.booha.range, `${label}: moving Booha needs a range`);
    assert.ok(level.booha.speed <= 3.0, `${label}: moving Booha is too fast`);
    assert.ok(level.booha.x >= level.booha.range.min && level.booha.x <= level.booha.range.max,
      `${label}: Booha must start inside its movement range`);
  }

  (level.ropes || []).forEach((rope, ropeIndex) => {
    assert.ok(rope.anchor.x >= 0 && rope.anchor.x <= 540,
      `${label} rope ${ropeIndex + 1}: anchor x is out of bounds`);
    assert.ok(rope.anchor.y >= 0 && rope.anchor.y <= 960,
      `${label} rope ${ropeIndex + 1}: anchor y is out of bounds`);
    if (rope.type === 'delayed') {
      assert.ok(rope.delayMs >= 250 && rope.delayMs <= 500,
        `${label} rope ${ropeIndex + 1}: delayed rope timing is unreasonable`);
    }
  });

  (level.objects || []).forEach((object, objectIndex) => {
    assert.ok(object.x >= 0 && object.x <= 540,
      `${label} object ${objectIndex + 1}: x is out of bounds`);
    assert.ok(object.y >= 0 && object.y <= 960,
      `${label} object ${objectIndex + 1}: y is out of bounds`);
    if (object.type === 'bounce') {
      assert.ok(object.width >= 70,
        `${label} object ${objectIndex + 1}: bounce pad is too narrow`);
      assert.ok(object.height >= 20, `${label} object ${objectIndex + 1}: bounce pad is too thin`);
    }
  });
});

console.log(`Feed Booha level audit passed: ${levels.length} levels`);
