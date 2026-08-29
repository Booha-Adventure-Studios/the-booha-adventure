#!/usr/bin/env node
'use strict';

// Pass 28H: the six authored Muenba screams must be loudness-matched so
// random clip selection does not make some ghosts sound unexpectedly quiet.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const audioDir = path.join(root, 'assets', 'img', 'muenba', 'screams');
const files = Array.from({ length: 6 }, (_, index) => path.join(audioDir, `scream_${index + 1}.mp3`));
const loudness = files.map((file) => {
  assert(fs.existsSync(file), `${path.basename(file)} must exist before loudness audit`);
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-i', file,
    '-filter_complex', 'ebur128=framelog=verbose',
    '-f', 'null', '-'
  ], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `ffmpeg loudness measurement failed for ${path.basename(file)}`);
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const matches = [...output.matchAll(/I:\s*(-?\d+(?:\.\d+)?)\s+LUFS/g)];
  assert(matches.length, `ffmpeg did not report integrated loudness for ${path.basename(file)}`);
  return Number(matches[matches.length - 1][1]);
});

const spread = Math.max(...loudness) - Math.min(...loudness);
assert(spread <= 1.5, `Muenba screams must stay within 1.5 LUFS; measured ${spread.toFixed(1)} LUFS`);

console.log(`Muenba scream loudness audit passed: six clips are within ${spread.toFixed(1)} LUFS.`);
