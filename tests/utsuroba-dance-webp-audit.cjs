#!/usr/bin/env node
'use strict';

// Performance pass: Utsuroba's celebration poses remain transparent and
// dimension-stable after lossy WebP re-encoding.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'img');
const utsuroba = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const expected = {
  'booha_ghost_dance_arms_up.webp': [1230, 1278],
  'booha_ghost_dance_sway.webp': [1206, 1305],
  'booha_ghost_dance_wave.webp': [1199, 1312],
};

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

for (const [name, [width, height]] of Object.entries(expected)) {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert.deepStrictEqual(readWebp(file, name), { width, height, hasAlpha: true, encoding: 'lossy' }, `${name} must preserve its transparent canvas as lossy WebP`);
  assert(utsuroba.includes(`assets/img/${name}`), `Utsuroba must reference ${name}`);
}

assert.strictEqual(
  Object.keys(expected).filter((name) => fs.existsSync(path.join(assetDir, name.replace(/\.webp$/, '.png')))).length,
  0,
  'retired dance pose PNG files must be absent',
);
assert(!/assets\/img\/booha_ghost_dance_(?:arms_up|sway|wave)\.png/i.test(utsuroba), 'Utsuroba must not reference retired dance pose PNG paths');
assert(sw.includes('booha-assets-2026-513'), 'service-worker asset cache must include the current Muenba canonical target bump');

console.log('Utsuroba dance audit passed: all three celebration poses are transparent lossy WebP assets with stable references.');
