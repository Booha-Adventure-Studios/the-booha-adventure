#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const audioDir = path.join(root, 'assets', 'img', 'muenba', 'screams');
const files = Array.from({ length: 6 }, (_, index) => `scream_${index + 1}.mp3`);

assert(fs.existsSync(audioDir), 'Muenba scream asset directory must exist');
assert(!fs.existsSync(path.join(audioDir, 'webm')), 'intermediate WebM scream exports must not remain');
assert(!fs.existsSync(path.join(audioDir, 'ogg')), 'unsupported intermediate OGG exports must not remain');

for (const filename of files) {
  const file = path.join(audioDir, filename);
  assert(fs.existsSync(file), `${filename} must exist`);
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name,channels,bit_rate,sample_rate',
    '-of', 'json', file
  ], { encoding: 'utf8' }));
  const stream = probe.streams && probe.streams[0];
  assert(stream && stream.codec_name === 'mp3', `${filename} must remain MP3-compatible`);
  assert(stream.channels === 1, `${filename} must be mono`);
  assert(Number(stream.bit_rate) >= 96000 && Number(stream.bit_rate) <= 128000,
    `${filename} must use a right-sized 96–128 kbps bitrate`);
  assert(Number(stream.sample_rate) === 44100, `${filename} must use the shared 44.1 kHz rate`);
}

console.log('Muenba scream asset audit passed: six mono 112 kbps MP3 one-shots are present with no redundant exports.');
