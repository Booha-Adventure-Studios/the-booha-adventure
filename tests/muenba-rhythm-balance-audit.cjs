#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

assert(source.includes('const RHYTHM_TRAVEL_MS = 1000;'), 'normal rhythm approach time must be the shared 1000ms value');
assert(source.includes('const PRACTICE_RHYTHM_TRAVEL_MS = RHYTHM_TRAVEL_MS;'), 'practice rhythm must use the shared approach time');
assert(source.includes('const DANGER_RHYTHM_TRAVEL_MS = RHYTHM_TRAVEL_MS;'), 'danger rhythm must use the shared approach time');
assert(source.includes('const SUPER_DANGER_RHYTHM_TRAVEL_MS = RHYTHM_TRAVEL_MS;'), 'super-danger rhythm must use the shared approach time');
for (const value of ['travelMs: 1140', 'travelMs: 1080', 'travelMs: 1020', 'dangerTravelMs: 680', 'dangerTravelMs: 660', 'dangerTravelMs: 640']) {
  assert(!source.includes(value), `old variable travel speed must be retired: ${value}`);
}

assert(source.includes("{ lane: 'bell', beat: 2.5, decoy: true, shape: 'spiral' }"), 'super-danger spiral decoy must use a distinct half-beat');
assert(source.includes("{ lane: 'kat', beat: 5.5, decoy: true, shape: 'skull' }"), 'super-danger skull decoy must use a distinct half-beat');
assert(source.includes('function playRhythmDecoyCue()'), 'decoys must have a dedicated warning cue');
assert(source.includes('function warnRhythmDecoys(now)'), 'decoys must be announced once as they approach the target');
assert(source.includes('decoyWarningIndices: new Set()'), 'decoy warnings must be tracked per rhythm session');
assert(source.includes('warnRhythmDecoys(now)'), 'the rhythm tick must schedule decoy warnings');
assert(source.includes("decoy: 'FAKE NOTE'"), 'decoy feedback must be distinguishable from a normal miss');
assert(source.includes('opacity:.62; border-style:dashed'), 'decoy notes must be visibly translucent and dashed');
assert(source.includes('muenba-rhythm-decoy-direction'), 'active charts with decoys must show an on-board explanation');

console.log('Muenba rhythm balance audit passed: stable approach speed, fair decoy spacing, and warning cues are wired.');
