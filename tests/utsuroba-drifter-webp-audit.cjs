#!/usr/bin/env node
'use strict';

// Performance pass: Utsuroba's transparent drifter sprites use lossy WebP
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
  .filter((name) => /^.+\.webp$/.test(name) && name !== 'kurobane_shizuma-profile.webp')
  .sort();
assert.deepStrictEqual(actual, Object.keys(expectedDimensions).sort(), 'Utsuroba must contain the expected 12 drifter WebP files');

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

for (const [name, [width, height]] of Object.entries(expectedDimensions)) {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert.deepStrictEqual(readWebp(file, name), { width, height, hasAlpha: true, encoding: 'lossy' }, `${name} must preserve its transparent canvas as lossy WebP`);
  assert(data.includes(`assets/img/drifters/${name}`), `Utsuroba data must reference ${name}`);
}

assert.strictEqual(
  fs.readdirSync(assetDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).length,
  0,
  'retired drifter raster files must be absent',
);
assert(!/assets\/img\/drifters\/[^'"\s]+\.png/i.test(data), 'Utsuroba must not reference retired drifter PNG paths');

console.log('Utsuroba drifter audit passed: all 12 transparent sprites are lossy WebP assets with stable dimensions and references.');
