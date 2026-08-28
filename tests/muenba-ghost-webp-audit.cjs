#!/usr/bin/env node
'use strict';

// Pass 26B: Muenba ghost artwork must use lossless WebP without changing
// transparent canvases or the data-driven runtime paths.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'img', 'muenba', 'ghosts');
const data = fs.readFileSync(path.join(root, 'js', 'muenba-data.js'), 'utf8');
const expected = [
  'angry_change.webp',
  'fuzzle.webp',
  'glimmer.webp',
  'jerk.webp',
  'nibsy.webp',
  'tinklet.webp',
  'twiddle.webp',
];

const actual = fs.readdirSync(assetDir)
  .filter((name) => /^.+\.webp$/.test(name))
  .sort();
assert.deepStrictEqual(actual, expected.slice().sort(), 'Muenba must contain the expected ghost WebP files');

function readVp8l(file, name) {
  assert(file.length > 25, `${name} must not be empty`);
  assert.strictEqual(file.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must have a RIFF header`);
  assert.strictEqual(file.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must have a WEBP signature`);
  assert.strictEqual(file.subarray(12, 16).toString('ascii'), 'VP8L', `${name} must use lossless VP8L encoding`);
  assert.strictEqual(file[20], 0x2f, `${name} must have a valid VP8L signature`);

  const bits = file.readUInt32LE(21) >>> 0;
  return {
    width: (bits & 0x3fff) + 1,
    height: ((bits >>> 14) & 0x3fff) + 1,
    hasAlpha: ((bits >>> 28) & 1) === 1,
    version: bits >>> 29,
  };
}

for (const name of expected) {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert.deepStrictEqual(readVp8l(file, name), { width: 2048, height: 2048, hasAlpha: true, version: 0 }, `${name} must preserve its transparent canvas`);
  assert(data.includes(`assets/img/muenba/ghosts/${name}`), `Muenba data must reference ${name}`);
}

assert.strictEqual(
  fs.readdirSync(assetDir).filter((name) => /\.png$/i.test(name)).length,
  0,
  'retired Muenba ghost PNG files must be absent',
);
assert(!/assets\/img\/muenba\/ghosts\/[^'"\s]+\.png/i.test(data), 'Muenba must not reference retired ghost PNG paths');

console.log('Muenba 26B ghost audit passed: all seven transparent ghost sprites are lossless WebP assets with stable canvases and live references.');
