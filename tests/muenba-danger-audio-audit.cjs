#!/usr/bin/env node
'use strict';

// Pass 26F compatibility audit: the shared procedural layer remains available
// to older callers while Muenba's active danger path uses authored samples.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const audioDir = path.join(root, 'assets', 'img', 'muenba');

assert(sfx.includes('function startDangerScream()'), 'shared SFX must expose a danger-scream start function');
assert(sfx.includes('function stopDangerScream()'), 'shared SFX must expose a danger-scream stop function');
assert(sfx.includes('function scheduleDangerScreamPulse()'), 'danger screams must be scheduled in staggered pulses');
assert(sfx.includes('dangerScreamActive'), 'danger audio must have an explicit active state');
assert(sfx.includes('dangerScreamVoices'), 'danger audio must track active voices for cleanup');
assert(sfx.includes('function addDangerNoise('), 'danger audio must add generated texture to abrasive voices');
assert(sfx.includes('getDangerNoiseBuffer'), 'danger audio must reuse generated noise efficiently');
assert(!sfx.includes("preset === 'spectral'"), 'danger audio must not retain an unreachable legacy profile');
assert(!sfx.includes("preset === 'poltergeist'"), 'danger audio must not retain an unreachable legacy profile');
assert(sfx.includes("'banshee', 'psycho', 'beast', 'burst'"), 'danger audio must include the high-register scream presets');
assert(sfx.includes("'demonic', 'parasite', 'wail', 'rasp'"), 'danger audio must include the low, spectral, and rasp scream presets');
assert(sfx.includes('window.setTimeout(scheduleDangerScreamPulse'), 'danger audio must schedule the next scream after each pulse');
assert(sfx.includes('dangerScreamVoices.forEach'), 'danger audio must stop every active voice when danger ends');
assert(sfx.includes('startDangerScream: startDangerScream'), 'shared SFX must publish the danger-scream start function');
assert(sfx.includes('stopDangerScream: stopDangerScream'), 'shared SFX must publish the danger-scream stop function');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.startDangerScreamSamples'), 'Muenba must start authored danger audio through shared SFX');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.stopDangerScreamSamples'), 'Muenba must stop authored danger audio through shared SFX');
assert(!muenba.includes('scream.mp3'), 'Muenba must not load the retired scream sample');
assert(!fs.existsSync(path.join(audioDir, 'scream.mp3')), 'retired scream sample must be absent');

console.log('Muenba danger-audio compatibility audit passed: shared procedural fallback remains safe and Muenba uses authored danger playback.');
