#!/usr/bin/env node
'use strict';

// Pass 26E: Muenba danger audio is a staggered procedural WebAudio layer,
// not a shared looping scream sample restarted by each hostile ghost.
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
assert(sfx.includes('DANGER_SCREAM_PRESETS'), 'danger audio must rotate through multiple procedural presets');
assert(sfx.includes('window.setTimeout(scheduleDangerScreamPulse'), 'danger audio must schedule the next scream after each pulse');
assert(sfx.includes('dangerScreamVoices.forEach'), 'danger audio must stop every active voice when danger ends');
assert(sfx.includes('startDangerScream: startDangerScream'), 'shared SFX must publish the danger-scream start function');
assert(sfx.includes('stopDangerScream: stopDangerScream'), 'shared SFX must publish the danger-scream stop function');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.startDangerScream'), 'Muenba must start danger audio through shared SFX');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.stopDangerScream'), 'Muenba must stop danger audio through shared SFX');
assert(!muenba.includes('scream.mp3'), 'Muenba must not load the retired scream sample');
assert(!fs.existsSync(path.join(audioDir, 'scream.mp3')), 'retired scream sample must be absent');

console.log('Muenba 26E danger-audio audit passed: staggered procedural scream presets start once, rotate, and clean up safely.');
