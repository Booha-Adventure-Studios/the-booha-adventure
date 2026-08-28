#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const audioDir = path.join(root, 'assets', 'img', 'muenba', 'screams');

assert(sfx.includes('DANGER_SCREAM_SAMPLE_URLS'), 'shared SFX must define the authored scream sample list');
assert(sfx.includes("assets/img/muenba/screams/scream_"), 'sample URLs must use the Muenba scream folder');
assert(sfx.includes('dangerScreamSampleBuffers'), 'decoded scream buffers must be cached');
assert(sfx.includes('dangerScreamSampleLoads'), 'in-flight sample loads must be deduplicated');
assert(sfx.includes('decodeAudioData'), 'samples must decode through the shared AudioContext');
assert(sfx.includes('function preloadDangerScreamSamples()'), 'the loader must expose a preload operation');
assert(sfx.includes('function playDangerScreamSample(options)'), 'the loader must expose sample playback');
assert(sfx.includes('source.playbackRate.setValueAtTime(pitch, now)'), 'sample playback must randomize pitch');
assert(sfx.includes('function stopDangerScreamSamples()'), 'sample voices must have an explicit stop operation');
assert(sfx.includes('preloadDangerScreamSamples: preloadDangerScreamSamples'), 'the loader must be published through UtsuSfx');
assert(sfx.includes('playDangerScreamSample: playDangerScreamSample'), 'sample playback must be published through UtsuSfx');
assert(sfx.includes('stopDangerScreamSamples: stopDangerScreamSamples'), 'sample cleanup must be published through UtsuSfx');

for (let index = 1; index <= 6; index += 1) {
  assert(fs.existsSync(path.join(audioDir, `scream_${index}.mp3`)), `scream_${index}.mp3 must exist`);
}

console.log('Muenba scream loader audit passed: shared decode cache, pitch variation, preload, and cleanup are wired.');
