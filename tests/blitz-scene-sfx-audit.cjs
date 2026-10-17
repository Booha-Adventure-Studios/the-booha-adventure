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
assert.match(engine, /fill: Object\.freeze\(\{ kind: 'circus-marquee', count: 15, positions:/,
  'Circus must own a fifteen-step persistent marquee fill');
assert.match(engine, /fill: Object\.freeze\(\{ kind: 'spooky-fog', count: 15 \}\)/,
  'Spooky Forest must own a fifteen-step fog reveal');
assert.match(engine, /kind: 'firefly-swarm',[\s\S]*?portraitPositions:/,
  'Firefly Glade must own a responsive persistent swarm');
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
assert.match(engine, /sceneFill\.setCount\(correctCount, fillOptions\)/,
  'scene fill must follow the current correct-answer count and setback options');
assert.match(engine, /setBackground\(0, \{ setback: true \}\)/,
  'wrong answers must trigger the scene-specific setback animation');
assert.match(engine, /setCount\(correctCount = 0, \{ setback = false \} = \{\}\)/,
  'scene fills must share a progress and setback contract');
assert.match(engine, /--blitz-spooky-fog-opacity/,
  'Spooky Forest must express progress through fog opacity');
assert.match(engine, /@keyframes boohaBlitzFireflyGather/,
  'Firefly Glade must gather each light from the prompt area');
assert.match(engine, /@keyframes boohaBlitzFireflyScatter/,
  'Firefly Glade must scatter lights on a setback');
assert.match(engine, /blitz-scene-fill-fireflies\.all-lit/,
  'Firefly Glade must have a shared full-ring finish state');
assert.match(engine, /@keyframes boohaBlitzMarqueePopOut/,
  'Circus must reverse its marquee lights on a setback');
assert.match(engine, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?blitz-scene-fill-fireflies[\s\S]*?animation: none;/,
  'scene fills must have a reduced-motion fallback');
assert.match(engine, /gain\.gain\.exponentialRampToValueAtTime\(0\.0001, startAt \+ cues\.duration\)/,
  'scene-specific SFX must decay cleanly');

console.log('Blitz scene-SFX audit passed: Circus, Spooky Forest, and Firefly Glade own distinct lightweight cues.');
