#!/usr/bin/env node
'use strict';

// Pass 28B/28C/28H/28I: authored scream playback, danger-state behavior, and priming.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');

assert(sfx.includes('function startDangerScreamSamples(options)'), 'shared SFX must expose configurable authored danger-scream playback');
assert(sfx.includes('function scheduleDangerSampleScreamPulse(generation)'), 'authored screams must be staggered by one generation-safe scheduler');
assert(sfx.includes('dangerSampleScreamActive'), 'authored scream scheduler must have an explicit active state');
assert(sfx.includes('dangerSampleScreamCount'), 'authored scream scheduler must track decay across pulses');
assert(sfx.includes('dangerScreamSampleLastUrl'), 'authored scream selection must track the previous clip');
assert(sfx.includes('url !== dangerScreamSampleLastUrl'), 'authored scream selection must avoid immediate repeats');
assert(sfx.includes('Math.pow(0.82, dangerSampleScreamCount)'), 'later authored screams must taper gently instead of dropping abruptly');
assert(sfx.includes('dangerSampleScreamDecayEnabled'), 'authored scream scheduler must support a loud-only return-trip mode');
assert(sfx.includes('var DANGER_SCREAM_BASE_GAIN = 0.78;'), 'danger samples must have an audible gain separate from UI tones');
assert(sfx.includes('var DANGER_SCREAM_MAX_GAIN = 0.88;'), 'danger samples must have a dedicated gain ceiling');
assert(sfx.includes('DANGER_SCREAM_BASE_GAIN * Math.pow(0.82, dangerSampleScreamCount)'), 'danger taper must use the dedicated audible baseline');
assert(sfx.includes('options.reset === true'), 'authored scream scheduler must support an explicit per-ghost reset');
assert(sfx.includes('generation !== dangerSampleScreamGeneration'), 'stale scream loads must be ignored after a ghost reset');
assert(sfx.includes('1800 + Math.random() * 1100'), 'authored screams must have a readable stagger interval');
assert(sfx.includes('startDangerScreamSamples: startDangerScreamSamples'), 'shared SFX must publish authored danger playback');
assert(muenba.includes('window.UtsuSfx && window.UtsuSfx.startDangerScreamSamples'), 'Muenba must use authored samples for danger playback');
assert(muenba.includes('reset: true'), 'Muenba must reset scream volume for each new ghost encounter');
assert(muenba.includes('loudOnly: Number(readMuenba().orbsPending) > 0'), 'Muenba return-trip ghost encounters must use loud-only screams');
assert(muenba.includes('loudOnly: captureSession.carryingEnergy === true'), 'Muenba danger retries and returns must preserve loud return-trip screams');
assert(muenba.includes("startGhostScream(activeGhost, now, 'wrong-ghost')"), 'clicking a hostile ghost must enter the authored scream path');
assert(muenba.includes("startGhostScream(g, now, 'sight')"), 'proximity anger must enter the authored scream path');
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

console.log('Muenba 28I authored-scream audit passed: per-ghost reset, louder danger gain, gentle taper, loud return-trip mode, priming, crossfade, rhythm silence, and dance profile lock are wired.');
