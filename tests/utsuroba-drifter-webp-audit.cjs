#!/usr/bin/env node
'use strict';

// Pass 25B: Utsuroba's transparent drifter sprites must use lossless WebP
// without changing the artwork canvas or the live data references.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'img', 'drifters');
const dataPath = path.join(root, 'js', 'utsuroba-data.js');
const data = fs.readFileSync(dataPath, 'utf8');
const expectedDimensions = {
  'blakesly_kassidy-1.webp': [1024, 1024],
  'blakesly_kassidy-2.webp': [1024, 1024],
  'bryan_harper-1.webp': [1024, 1024],
  'bryan_harper-2.webp': [1024, 1024],
  'chagrin_gobito-1.webp': [854, 1280],
  'chagrin_gobito-2.webp': [1024, 1536],
  'kurobane_shizuma-1.webp': [853, 1280],
  'kurobane_shizuma-2.webp': [853, 1280],
  'ned-the-oogle-1.webp': [1024, 1536],
  'ned-the-oogle-2.webp': [1024, 1536],
  'patricia_hollingshead-1.webp': [1024, 1024],
  'patricia_hollingshead-2.webp': [1024, 1024],
};

const actual = fs.readdirSync(assetDir)
  .filter((name) => /^.+\.webp$/.test(name))
  .sort();
assert.deepStrictEqual(actual, Object.keys(expectedDimensions).sort(), 'Utsuroba must contain the expected 12 drifter WebP files');

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

for (const [name, [width, height]] of Object.entries(expectedDimensions)) {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert.deepStrictEqual(readVp8l(file, name), { width, height, hasAlpha: true, version: 0 }, `${name} must preserve its transparent canvas`);
  assert(data.includes(`assets/img/drifters/${name}`), `Utsuroba data must reference ${name}`);
}

assert.strictEqual(
  fs.readdirSync(assetDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).length,
  0,
  'retired drifter raster files must be absent',
);
assert(!/assets\/img\/drifters\/[^'"\s]+\.png/i.test(data), 'Utsuroba must not reference retired drifter PNG paths');

console.log('Utsuroba 25B drifter audit passed: all 12 transparent sprites are lossless WebP assets with stable dimensions and references.');
