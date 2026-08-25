#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const audioDir = path.join(root, 'assets', 'img', 'muenba');
const audioFiles = new Set(fs.readdirSync(audioDir));

for (const filename of ['Muenba_BGM.mp3', 'rhythm.mp3', 'scream.mp3', 'get.mp3', 'miss.mp3']) {
  assert(audioFiles.has(filename), `Muenba audio asset is missing: ${filename}`);
}

assert(source.includes("new Audio('assets/img/muenba/Muenba_BGM.mp3')"), 'Muenba BGM path must match the restored filename case');
assert(source.includes('music.loop = true;'), 'Muenba BGM must loop');
assert(source.includes("music.addEventListener('ended'"), 'Muenba BGM needs a loop recovery handler');
assert(source.includes('music.addEventListener(\'error\''), 'Muenba BGM errors must release the started flag');
assert(source.includes('const rhythmHitSfxPool = makeRhythmSfxPool'), 'rhythm hit sounds must use a playback pool');
assert(source.includes('const rhythmMissSfxPool = makeRhythmSfxPool'), 'rhythm miss sounds must use a playback pool');
assert(source.includes('sound.pause();\n      sound.currentTime = 0;'), 'rhythm SFX must reset each voice before playback');
assert(source.includes('const playResult = dangerScream.play();'), 'scream playback must be explicitly started on encounter');
assert(source.includes('dangerRhythmMusic.play().catch'), 'danger rhythm music must start with the danger chart');

console.log('Muenba audio audit passed: restored assets, looping BGM, danger audio, and pooled rhythm SFX.');
