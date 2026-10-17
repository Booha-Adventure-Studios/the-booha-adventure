#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');

assert.match(engine, /sfx: Object\.freeze\(\{ start: 'bell', correct: 'pop', streak: 'bell', wrong: 'soft-drop', finish: 'fanfare' \}\)/,
  'Circus must own pop, bell, and fanfare cues');
assert.match(engine, /sfx: Object\.freeze\(\{ start: 'wood-click', correct: 'wood-click', streak: 'chime', wrong: 'wood-click', finish: 'chime' \}\)/,
  'Spooky Forest must own wood-click and chime cues');
assert.match(engine, /sfx: Object\.freeze\(\{ start: 'sparkle', correct: 'sparkle', streak: 'warm-pulse', wrong: 'warm-pulse', finish: 'warm-pulse' \}\)/,
  'Firefly Glade must own sparkle and warm-pulse cues');
assert.match(engine, /fill: Object\.freeze\(\{ kind: 'circus-bulbs', count: 15, positions:/,
  'Circus must own a fifteen-step persistent bulb fill');
assert.match(engine, /function playSceneSfx\(event, \{ threshold = 0, isRecord = false, isPerfectRun = false \} = \{\}\)/,
  'scene-specific SFX must use one shared optional WebAudio helper');
assert.match(engine, /playSceneSfx\('start'\)/,
  'scene-specific start SFX must replace the generic start melody');
assert.match(engine, /playSceneSfx\('correct'\)/,
  'scene-specific correct SFX must remain active after legacy celebrations are disabled');
assert.match(engine, /playSceneSfx\('wrong'\)/,
  'scene-specific wrong SFX must replace the old palette wrong sound');
assert.match(engine, /playSceneSfx\('streak', \{ threshold: eventThreshold \}\)/,
  'scene-specific streak SFX must remain active while legacy streak visuals stay disabled');
assert.match(engine, /playSceneSfx\('finish', \{ isRecord, isPerfectRun \}\)/,
  'scene-specific finish SFX must replace the retired final stinger');
assert.match(engine, /function mountSceneFill\(overlay, scene\)/,
  'scene fill must be mounted from the active scene definition');
assert.match(engine, /sceneFill\.setCount\(correctCount\)/,
  'scene fill must follow the current correct-answer count');
assert.match(engine, /gain\.gain\.exponentialRampToValueAtTime\(0\.0001, startAt \+ cues\.duration\)/,
  'scene-specific SFX must decay cleanly');

console.log('Blitz scene-SFX audit passed: Circus, Spooky Forest, and Firefly Glade own distinct lightweight cues.');
