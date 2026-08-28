#!/usr/bin/env node
'use strict';

// PNG cleanup: all 19 Maze-era PNG sources are retired only after the live
// Invaders, Juku, Maze, and service-worker references have moved to WebP.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const names = [
  'maze',
  'blue-boo', 'green-boo', 'pink-boo', 'purple-boo',
  'extra-boo-aqua', 'extra-boo-candy', 'extra-boo-gold', 'extra-boo-lime',
  'extra-boo-mint', 'extra-boo-orange', 'extra-boo-peach', 'extra-boo-rose',
  'extra-boo-sky', 'extra-boo-violet',
  'homework-tree', 'karasuki1-tree', 'karasuki2-tree', 'juku-tree',
];

names.forEach((name) => {
  assert(!fs.existsSync(path.join(root, 'assets', 'img', `${name}.png`)), `${name}.png must be removed`);
  const webpPath = path.join(root, 'assets', 'img', `${name}.webp`);
  assert(fs.existsSync(webpPath), `${name}.webp must remain available`);
  const webp = fs.readFileSync(webpPath);
  assert(webp.subarray(0, 4).toString('ascii') === 'RIFF', `${name}.webp must have a RIFF header`);
  assert(webp.subarray(8, 12).toString('ascii') === 'WEBP', `${name}.webp must have a WEBP signature`);
});

const liveFiles = ['maze.html', 'js/invaders-data.js', 'js/juku-ghosts.js', 'sw.js'];
const liveSource = liveFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
names.forEach((name) => {
  assert(!liveSource.includes(`${name}.png`), `live code must not reference ${name}.png`);
});
assert(liveSource.includes('blue-boo.webp'), 'Invaders/Juku live references must use WebP');
assert(liveSource.includes('extra-boo-violet.webp'), 'Juku extra ghost references must use WebP');

console.log('PNG cleanup audit passed: all 19 retired sources are absent and live references use WebP.');
