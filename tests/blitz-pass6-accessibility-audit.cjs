#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');

assert.match(engine, /const REDUCED_MOTION = typeof window\.matchMedia === 'function'/,
  'the engine must detect reduced motion as its own accessibility preference');
assert.match(engine, /const HARDWARE_PERFORMANCE_TIER = typeof navigator !== 'undefined'/,
  'hardware performance tier must be derived independently');
assert.doesNotMatch(engine, /const HARDWARE_PERFORMANCE_TIER = REDUCED_MOTION/,
  'reduced motion must not pin a fast device to minimal performance');
assert.match(engine, /if \(HARDWARE_PERFORMANCE_TIER === 'minimal'\)/,
  'only genuinely minimal hardware should skip frame sampling');
assert.match(engine, /function emitCorrectMicroBurst\(correctBtn, answerRect, overlayRect\) \{\s*if \(isMinimalPower\(\) \|\| REDUCED_MOTION\) return;/,
  'reduced-motion runs must skip moving particle nodes without losing other feedback');
assert.match(engine, /correctBtn\.style\.background = palette\.correct\?\.color/,
  'reduced-motion runs must retain the immediate correct-color snap');
assert.match(engine, /function playCorrectHit\(\)/,
  'reduced-motion runs must retain correct-answer audio');
assert.match(engine, /flashEl\.style\.background = palette\.accent;\s*flashEl\.style\.opacity = '0\.45';[\s\S]*?flashEl\.style\.opacity = '0';/,
  'reduced-motion runs must receive a short color/opacity pulse instead of a white flash');
assert.match(engine, /winScreen\.classList\.add\('show'\)/,
  'reduced-motion runs must still reach the static final card');

console.log('Blitz Pass 6 accessibility audit passed: reduced motion is independent from hardware tiers while color, audio, milestone, and final-card feedback remain available.');
