#!/usr/bin/env node
'use strict';

// Pass 25D: Utsuroba's celebration poses must remain transparent, lossless,
// and dimension-stable after the dance-art WebP migration.
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

for (const [name, [width, height]] of Object.entries(expected)) {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert.deepStrictEqual(readVp8l(file, name), { width, height, hasAlpha: true, version: 0 }, `${name} must preserve its transparent canvas`);
  assert(utsuroba.includes(`assets/img/${name}`), `Utsuroba must reference ${name}`);
}

assert.strictEqual(
  Object.keys(expected).filter((name) => fs.existsSync(path.join(assetDir, name.replace(/\.webp$/, '.png')))).length,
  0,
  'retired dance pose PNG files must be absent',
);
assert(!/assets\/img\/booha_ghost_dance_(?:arms_up|sway|wave)\.png/i.test(utsuroba), 'Utsuroba must not reference retired dance pose PNG paths');
assert(sw.includes('booha-assets-2026-396'), 'service-worker asset cache must include the current dance-art bump');

console.log('Utsuroba 25D dance audit passed: all three celebration poses are transparent lossless WebP assets with stable references.');
