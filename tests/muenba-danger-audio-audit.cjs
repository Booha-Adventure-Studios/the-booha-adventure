#!/usr/bin/env node
'use strict';

// Pass 28E: the retired procedural scream generator must stay out of the
// shared bundle now that Muenba uses authored samples.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const audioDir = path.join(root, 'assets', 'img', 'muenba');

assert(!sfx.includes('function startDangerScream()'), 'retired procedural danger-scream start must be removed');
assert(!sfx.includes('function scheduleDangerScreamPulse()'), 'retired procedural danger scheduler must be removed');
assert(!sfx.includes('DANGER_SCREAM_PRESETS'), 'retired procedural scream presets must be removed');
assert(!sfx.includes('getDangerNoiseBuffer'), 'retired procedural scream noise must be removed');
assert(!sfx.includes('dangerScreamVoices'), 'retired procedural scream voice tracking must be removed');
assert(sfx.includes('function startDangerScreamSamples()'), 'shared SFX must expose the authored danger-scream start function');
assert(sfx.includes('function stopDangerScreamSamples()'), 'shared SFX must expose the authored danger-scream stop function');
assert(sfx.includes('startDangerScreamSamples: startDangerScreamSamples'), 'shared SFX must publish authored danger playback');
assert(sfx.includes('stopDangerScreamSamples: stopDangerScreamSamples'), 'shared SFX must publish authored danger cleanup');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.startDangerScreamSamples'), 'Muenba must start authored danger audio through shared SFX');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.stopDangerScreamSamples'), 'Muenba must stop authored danger audio through shared SFX');
assert(!muenba.includes('scream.mp3'), 'Muenba must not load the retired scream sample');
assert(!fs.existsSync(path.join(audioDir, 'scream.mp3')), 'retired scream sample must be absent');

console.log('Muenba 28E danger-audio audit passed: retired procedural screams are removed and authored playback is the only shared danger path.');
