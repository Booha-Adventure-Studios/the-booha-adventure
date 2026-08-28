#!/usr/bin/env node
'use strict';

// Pass 25A: Utsuroba room backgrounds must be genuine WebP assets with
// stable dimensions and live data references.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const roomDir = path.join(root, 'assets', 'img', 'utsuroba');
const data = fs.readFileSync(path.join(root, 'js', 'utsuroba-data.js'), 'utf8');
const rooms = fs.readdirSync(roomDir)
  .filter((name) => /^room_\d+\.webp$/.test(name))
  .sort();

assert.deepStrictEqual(
  rooms,
  Array.from({ length: 15 }, (_, i) => `room_${String(i + 1).padStart(2, '0')}.webp`),
  'Utsuroba must contain exactly 15 room WebP files',
);

function dimensions(file, name) {
  assert(file.length > 30, `${name} must not be empty`);
  assert.strictEqual(file.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must have a RIFF header`);
  assert.strictEqual(file.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must have a WEBP signature`);
  assert.strictEqual(file.subarray(12, 16).toString('ascii'), 'VP8 ', `${name} must use a supported lossy WebP frame`);
  assert.deepStrictEqual([...file.subarray(23, 26)], [0x9d, 0x01, 0x2a], `${name} must have a valid VP8 frame header`);
  return {
    width: file.readUInt16LE(26) & 0x3fff,
    height: file.readUInt16LE(28) & 0x3fff,
  };
}

for (const name of rooms) {
  const file = fs.readFileSync(path.join(roomDir, name));
  assert.deepStrictEqual(dimensions(file, name), { width: 1536, height: 1024 }, `${name} must preserve the room canvas size`);
  assert(data.includes(`assets/img/utsuroba/${name}`), `Utsuroba data must reference ${name}`);
}

assert.strictEqual(
  fs.readdirSync(roomDir).filter((name) => /^room_\d+\.(png|jpe?g)$/i.test(name)).length,
  0,
  'retired Utsuroba room raster files must be absent',
);

console.log('Utsuroba 25A room audit passed: all 15 room files are genuine 1536×1024 WebP assets with stable references.');
