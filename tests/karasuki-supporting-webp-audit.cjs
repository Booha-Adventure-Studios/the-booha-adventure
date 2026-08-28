#!/usr/bin/env node
'use strict';

// Pass 24E: the remaining Karasuki popup/support artwork is shared by other
// pages, so migrate the four files together and keep every consumer aligned.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assets = [
  ['assets/img/memory_box.webp', 'assets/img/memory_box.png'],
  ['assets/img/boo-moon.webp', 'assets/img/boo-moon.png'],
  ['assets/img/utsuroba_icon.webp', 'assets/img/utsuroba_icon.png'],
  ['assets/happy_house/mister_happy-2.webp', 'assets/happy_house/mister_happy-2.png'],
];
const consumers = [
  'js/karasuki.js',
  'js/utsuroba.js',
  'happy_house.html',
  'adventure-profile.html',
].map((file) => fs.readFileSync(path.join(root, file), 'utf8'));

assets.forEach(([webp, retiredPng]) => {
  const file = fs.readFileSync(path.join(root, webp));
  assert(file.length > 12, `${webp} must not be empty`);
  assert(file.subarray(0, 4).toString('ascii') === 'RIFF', `${webp} must have a RIFF header`);
  assert(file.subarray(8, 12).toString('ascii') === 'WEBP', `${webp} must have a WEBP signature`);
  assert(!fs.existsSync(path.join(root, retiredPng)), `${retiredPng} must be retired`);
});

assert(!consumers.some((source) => /(?:memory_box|boo-moon|mister_happy-2|utsuroba_icon)\.png/i.test(source)), 'supporting artwork consumers must not reference retired PNG files');
assert(consumers.every((source) => /(?:memory_box|boo-moon|mister_happy-2|utsuroba_icon)\.webp/i.test(source)), 'supporting artwork consumers must reference WebP');

console.log('Karasuki 24E supporting-art audit passed: popup and profile artwork uses WebP with retired PNG paths removed.');
