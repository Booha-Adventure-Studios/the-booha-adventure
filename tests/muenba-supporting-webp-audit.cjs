#!/usr/bin/env node
'use strict';

// Pass 26C: Muenba's remaining transparent support art must use lossless WebP
// without changing the canvas or cross-page references.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'img', 'muenba');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const expectedDimensions = {
  'hiding.webp': [1264, 1244],
  'muenba_logo.webp': [400, 600],
};

assert.deepStrictEqual(
  Object.keys(expectedDimensions).sort(),
  fs.readdirSync(assetDir).filter((name) => /^(hiding|muenba_logo)\.webp$/.test(name)).sort(),
  'Muenba must contain both supporting-art WebP files',
);

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
}

assert(muenba.includes('assets/img/muenba/hiding.webp'), 'Muenba must reference the WebP hiding pose');
assert(muenba.includes('assets/img/muenba/muenba_logo.webp'), 'Muenba must reference the WebP logo');
assert(karasuki.includes('assets/img/muenba/muenba_logo.webp'), 'Karasuki must reference the shared WebP Muenba logo');
assert.strictEqual(
  fs.readdirSync(assetDir).filter((name) => /^(hiding|muenba_logo)\.png$/i.test(name)).length,
  0,
  'retired Muenba supporting-art PNG files must be absent',
);
assert(!/assets\/img\/muenba\/(?:hiding|muenba_logo)\.png/i.test(`${muenba}\n${karasuki}`), 'runtime must not reference retired supporting-art PNG paths');

console.log('Muenba 26C supporting-art audit passed: hiding art and the shared logo are lossless WebP assets with stable canvases and live references.');
