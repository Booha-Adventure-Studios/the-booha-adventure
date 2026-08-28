#!/usr/bin/env node
'use strict';

// Maze visual assets use quality-checked WebP files. Their old PNG sources
// are retired after the cross-page reference migration.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const assets = [
  'maze',
  'blue-boo', 'green-boo', 'pink-boo', 'purple-boo',
  'extra-boo-aqua', 'extra-boo-candy', 'extra-boo-gold', 'extra-boo-lime',
  'extra-boo-mint', 'extra-boo-orange', 'extra-boo-peach', 'extra-boo-rose',
  'extra-boo-sky', 'extra-boo-violet',
  'homework-tree', 'karasuki1-tree', 'karasuki2-tree', 'juku-tree',
];

assets.forEach((name) => {
  const pngPath = path.join(root, 'assets', 'img', `${name}.png`);
  const webpPath = path.join(root, 'assets', 'img', `${name}.webp`);
  const webp = fs.readFileSync(webpPath);
  assert(!fs.existsSync(pngPath), `${name}.png must be retired after WebP migration`);
  assert(webp.length > 12, `${name}.webp must not be empty`);
  assert(webp.subarray(0, 4).toString('ascii') === 'RIFF', `${name}.webp must have a RIFF header`);
  assert(webp.subarray(8, 12).toString('ascii') === 'WEBP', `${name}.webp must have a WEBP signature`);
  assert(maze.includes(`assets/img/${name}.webp`), `maze must reference ${name}.webp`);
  assert(!maze.includes(`assets/img/${name}.png`), `maze must not reference ${name}.png`);
});

assert(!sw.includes('${BASE}/assets/img/juku-tree.png'), 'service worker must not precache the retired Maze tree path');
assert(sw.includes('booha-pages-2026-372'), 'Maze HTML migration must bump the page cache');
assert(sw.includes('booha-assets-2026-417'), 'Maze WebP migration must bump the asset cache');

console.log('Maze visual asset audit passed: 19 WebP files are present and all retired PNG sources are absent.');
