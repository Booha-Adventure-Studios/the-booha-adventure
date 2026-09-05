#!/usr/bin/env node
'use strict';

// Pass 3: remove confirmed dead masters and keep heavyweight media bounded.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const retiredMasters = [
  ...Array.from({ length: 9 }, (_, i) => `assets/img/grimmerglen/room_${String(i + 1).padStart(2, '0')}.jpg`),
  ...Array.from({ length: 5 }, (_, i) => `assets/img/grimmerglen/marietta/marietta_${String(i + 1).padStart(2, '0')}.png`),
];
retiredMasters.forEach((relative) => {
  assert(!fs.existsSync(path.join(root, relative)), `${relative} must be removed as an unused master`);
});

const longFormAudio = [
  'assets/blocks/too-high.mp3',
  'assets/img/grimmerglen/grimmerglen_bgm.mp3',
  'assets/audio/karasuki-music.mp3',
  'assets/audio/blitz.mp3',
  'assets/audio/utsuroba-music.mp3',
  'assets/happy_house/happy-house.mp3',
  'assets/invaders/dotty-boss-1.mp3',
  'assets/invaders/dotty-boss-2.mp3',
  'assets/invaders/dotty-boss-3.mp3',
  'assets/invaders/invaders-bgm.mp3',
  'assets/blocks/booha-tetris-january.mp3',
  'assets/blocks/booha-tetris-january-2.mp3',
  'assets/blocks/booha-tetris-january-3.mp3',
  'assets/blocks/bgm4.mp3',
  'assets/audio/sneaky.mp3',
  'assets/img/muenba/Muenba_BGM.mp3',
];
longFormAudio.forEach((relative) => {
  const file = path.join(root, relative);
  const bitrate = Number(childProcess.execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'format=bit_rate',
    '-of', 'default=nw=1:nk=1', file,
  ], { encoding: 'utf8' }).trim());
  assert(Number.isFinite(bitrate) && bitrate <= 131000, `${relative} must remain at or below 128 kbps`);
});

for (let i = 1; i <= 9; i += 1) {
  const relative = `assets/img/grimmerglen/room_${String(i).padStart(2, '0')}.webp`;
  const file = path.join(root, relative);
  const bytes = fs.readFileSync(file);
  assert(bytes.subarray(0, 4).toString('ascii') === 'RIFF', `${relative} must remain a WebP file`);
  assert(bytes.subarray(8, 12).toString('ascii') === 'WEBP', `${relative} must have a WebP signature`);
  assert(bytes.length < 700 * 1024, `${relative} must stay below the Pass 3 700 KiB room budget`);
  // Read the RIFF chunk directly instead of shelling out to webpinfo: the CI
  // image installs ffmpeg, but does not guarantee the optional WebP tools.
  const chunks = [];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.subarray(offset, offset + 4).toString('ascii');
    const size = bytes.readUInt32LE(offset + 4);
    chunks.push(type);
    offset += 8 + size + (size % 2);
  }
  assert(chunks.includes('VP8 '), `${relative} must use lossy VP8 encoding after re-encode`);
  assert(!chunks.includes('VP8L'), `${relative} must not regress to lossless VP8L encoding`);
  const dimensions = childProcess.execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'default=nw=1:nk=1', file,
  ], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
  assert(dimensions[0] === 1536 && dimensions[1] === 1024, `${relative} dimensions must remain 1536x1024`);
}

assert(sw.includes('booha-assets-2026-521'), 'Pass 3 asset changes must bump the asset cache');

console.log('Pass 3 asset-weight audit passed: dead masters are absent, long-form audio is 128 kbps, and Grimmerglen room WebPs fit the size budget.');
