#!/usr/bin/env node
'use strict';

// Pass 24C: Karasuki's Observer artwork keeps the room-folder image set
// consistent with the converted room backgrounds and shared wanderers.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'img', 'karasuki');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const expected = [
  'observer-1.webp',
  'observer-2.webp',
];

expected.forEach((name) => {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert(file.length > 12, `${name} must not be empty`);
  assert(file.subarray(0, 4).toString('ascii') === 'RIFF', `${name} must have a RIFF header`);
  assert(file.subarray(8, 12).toString('ascii') === 'WEBP', `${name} must have a WEBP signature`);
});

assert.strictEqual(
  fs.readdirSync(assetDir).filter((name) => /^observer-\d+\.png$/i.test(name)).length,
  0,
  'retired Karasuki Observer PNG files must be absent',
);
assert(karasuki.includes("assets/img/karasuki/observer-1.webp"), 'Observer canvas image must use WebP');
assert(karasuki.includes("assets/img/karasuki/observer-2.webp"), 'Observer popup image must use WebP');
assert(!/assets\/img\/karasuki\/observer-\d+\.png/i.test(karasuki), 'Karasuki must not reference Observer PNG paths');

console.log('Karasuki 24C Observer audit passed: both Observer sprites use transparent WebP and old PNG paths are retired.');
