#!/usr/bin/env node
'use strict';

// Pass 24A: Karasuki room files keep their existing URLs, but must be genuine
// WebP files rather than PNG/JPEG bytes stored under a .webp filename.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const roomDir = path.join(root, 'assets', 'img', 'karasuki');
const data = fs.readFileSync(path.join(root, 'js', 'karasuki-data.js'), 'utf8');
const rooms = fs.readdirSync(roomDir).filter((name) => /^room_\d+\.webp$/.test(name));

assert.deepStrictEqual(rooms.sort(), Array.from({ length: 15 }, (_, i) => `room_${String(i + 1).padStart(2, '0')}.webp`));

rooms.forEach((name) => {
  const file = fs.readFileSync(path.join(roomDir, name));
  assert(file.length > 12, `${name} must not be empty`);
  assert(file.subarray(0, 4).toString('ascii') === 'RIFF', `${name} must have a RIFF header`);
  assert(file.subarray(8, 12).toString('ascii') === 'WEBP', `${name} must have a WEBP signature`);
  assert(data.includes(`assets/img/karasuki/${name}`), `Karasuki data must reference ${name}`);
});

console.log('Karasuki 24A room audit passed: all 15 room files are genuine WebP assets with stable references.');
