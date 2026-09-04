#!/usr/bin/env node
'use strict';

// Performance pass: Muenba ghost artwork uses lossy WebP without changing
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

function readWebp(file, name) {
  assert(file.length > 25, `${name} must not be empty`);
  assert.strictEqual(file.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must have a RIFF header`);
  assert.strictEqual(file.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must have a WEBP signature`);
  const chunks = [];
  for (let offset = 12; offset + 8 <= file.length;) {
    const type = file.subarray(offset, offset + 4).toString('ascii');
    const size = file.readUInt32LE(offset + 4);
    chunks.push(type);
    offset += 8 + size + (size % 2);
  }
  assert(chunks.includes('VP8X') && chunks.includes('ALPH') && chunks.includes('VP8 '), `${name} must be a lossy transparent WebP`);
  return {
    width: 1 + file[24] + (file[25] << 8) + (file[26] << 16),
    height: 1 + file[27] + (file[28] << 8) + (file[29] << 16),
    hasAlpha: (file[20] & 0x10) !== 0,
    encoding: 'lossy',
  };
}

for (const name of expected) {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert.deepStrictEqual(readWebp(file, name), { width: 2048, height: 2048, hasAlpha: true, encoding: 'lossy' }, `${name} must preserve its transparent canvas as lossy WebP`);
  assert(data.includes(`assets/img/muenba/ghosts/${name}`), `Muenba data must reference ${name}`);
}

assert.strictEqual(
  fs.readdirSync(assetDir).filter((name) => /\.png$/i.test(name)).length,
  0,
  'retired Muenba ghost PNG files must be absent',
);
assert(!/assets\/img\/muenba\/ghosts\/[^'"\s]+\.png/i.test(data), 'Muenba must not reference retired ghost PNG paths');

console.log('Muenba ghost audit passed: all seven transparent ghost sprites are lossy WebP assets with stable canvases and live references.');
