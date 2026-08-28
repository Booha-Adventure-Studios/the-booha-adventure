#!/usr/bin/env node
'use strict';

// Pass 28B/28C: authored scream playback, danger-state behavior, and priming.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');

assert(sfx.includes('function startDangerScreamSamples()'), 'shared SFX must expose the authored danger-scream start function');
assert(sfx.includes('function scheduleDangerSampleScreamPulse()'), 'authored screams must be staggered by one scheduler');
assert(sfx.includes('dangerSampleScreamActive'), 'authored scream scheduler must have an explicit active state');
assert(sfx.includes('dangerSampleScreamCount'), 'authored scream scheduler must track decay across pulses');
assert(sfx.includes('dangerScreamSampleLastUrl'), 'authored scream selection must track the previous clip');
assert(sfx.includes('url !== dangerScreamSampleLastUrl'), 'authored scream selection must avoid immediate repeats');
assert(sfx.includes('Math.pow(0.62, dangerSampleScreamCount)'), 'later authored screams must decay in volume');
assert(sfx.includes('1800 + Math.random() * 1100'), 'authored screams must have a readable stagger interval');
assert(sfx.includes('startDangerScreamSamples: startDangerScreamSamples'), 'shared SFX must publish authored danger playback');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.startDangerScreamSamples'), 'Muenba must use authored samples for danger playback');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.stopDangerScreamSamples'), 'Muenba must stop authored samples through shared SFX');
assert(muenba.includes('function primeDangerScreamSamples()'), 'Muenba must prime authored clips after the first player interaction');
assert(muenba.includes('preloadDangerScreamSamples'), 'Muenba must request all authored clips before danger playback');
assert(muenba.includes('const ANGRY_TRANSITION_MS = 260;'), 'angry state needs a smooth visual transition duration');
assert(muenba.includes('angerBlendTarget'), 'ghosts must track a normal-to-angry blend target');
assert(muenba.includes('const angerBlend = blendTarget ? blendProgress : 1 - blendProgress;'), 'ghost rendering must crossfade between normal and angry art');
assert(muenba.includes('setMuenbaProfileDisabled(true);'), 'Muenba profile navigation must lock during the dance');
assert(muenba.includes('setMuenbaProfileDisabled(false);'), 'Muenba profile navigation must restore after the dance');
assert(muenba.includes('#muenba-profile-link.is-disabled'), 'profile lock must have a visible disabled style');
assert(muenba.includes('startDangerRhythmMusic()') && muenba.includes('stopDangerScream();'), 'rhythm entry must stop danger screams');

console.log('Muenba 28B/28C authored-scream audit passed: staggered samples, priming, decay, crossfade, rhythm silence, and dance profile lock are wired.');
