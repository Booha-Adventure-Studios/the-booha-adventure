#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');

assert.match(engine, /sfx: Object\.freeze\(\{ start: 'bell', correct: 'pop', streak: 'bell', finish: 'fanfare' \}\)/,
  'Circus must own pop, bell, and fanfare cues');
assert.match(engine, /sfx: Object\.freeze\(\{ start: 'wood-click', correct: 'wood-click', streak: 'chime', finish: 'chime' \}\)/,
  'Spooky Forest must own wood-click and chime cues');
assert.match(engine, /sfx: Object\.freeze\(\{ start: 'sparkle', correct: 'sparkle', streak: 'warm-pulse', finish: 'warm-pulse' \}\)/,
  'Firefly Glade must own sparkle and warm-pulse cues');
assert.match(engine, /function playSceneSfx\(event, \{ threshold = 0, isRecord = false, isPerfectRun = false \} = \{\}\)/,
  'scene-specific SFX must use one shared optional WebAudio helper');
assert.match(engine, /playSceneSfx\('start'\)/,
  'scene-specific start SFX must replace the generic start melody');
assert.match(engine, /playSceneSfx\('correct'\)/,
  'scene-specific correct SFX must remain active after legacy celebrations are disabled');
assert.match(engine, /playSceneSfx\('streak', \{ threshold: eventThreshold \}\)/,
  'scene-specific streak SFX must remain active while legacy streak visuals stay disabled');
assert.match(engine, /playSceneSfx\('finish', \{ isRecord, isPerfectRun \}\)/,
  'scene-specific finish SFX must replace the retired final stinger');
assert.match(engine, /gain\.gain\.exponentialRampToValueAtTime\(0\.0001, startAt \+ cues\.duration\)/,
  'scene-specific SFX must decay cleanly');

console.log('Blitz scene-SFX audit passed: Circus, Spooky Forest, and Firefly Glade own distinct lightweight cues.');
