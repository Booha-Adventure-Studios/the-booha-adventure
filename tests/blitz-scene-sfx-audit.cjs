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
assert.match(engine, /\[0, 0\], \[10, 0\], \[30, 0\], \[50, 0\], \[70, 0\], \[90, 0\], \[100, 0\]/,
  'Circus marquee bulbs must be positioned relative to the sign edge');
assert.match(engine, /\.booha-blitz-marquee \{[\s\S]*?min-width: min\(100%, 440px\);[\s\S]*?min-height: clamp\(150px, 24vh, 220px\);/,
  'Circus must size a stable prompt-owned sign box');
assert.match(engine, /sign\.insertBefore\(fill, sign\.firstChild\)/,
  'Circus marquee fill must be mounted inside the prompt-owned sign');
assert.match(engine, /#vb-stage, #sb-prompt, #qb-prompt \{\s*box-sizing: border-box;/,
  'Vocab stage must include padding in its width on wide layouts');
assert.doesNotMatch(engine, /@media \(orientation: portrait\) \{\s*\.blitz-scene-fill-circus::before/,
  'Circus must not use a separate screen-positioned portrait frame');
assert.match(engine, /fill: Object\.freeze\(\{ kind: 'spooky-fog', count: 15 \}\)/,
  'Spooky Forest must own a fifteen-step fog reveal');
assert.match(engine, /kind: 'firefly-swarm',[\s\S]*?portraitPositions:/,
  'Firefly Glade must own a responsive persistent swarm');
assert.match(engine, /\[9, 24\], \[21, 15\], \[34, 22\], \[46, 13\]/,
  'Firefly Glade landscape positions must use a loose scatter clear of answers');
assert.match(engine, /\[7, 72\], \[21, 79\], \[36, 71\], \[53, 80\]/,
  'Firefly Glade portrait positions must stay below the answer block');
assert.match(engine, /const fireflyHues = \[52, 160, 200, 290, 330, 95, 25, 240, 180, 310, 70, 130, 220, 0, 270\]/,
  'Firefly Glade must give all fifteen lights distinct hues');
assert.match(engine, /@keyframes boohaBlitzFireflyGlow/,
  'Firefly Glade must fade lights between flashes');
assert.match(engine, /@keyframes boohaBlitzFireflyBlink/,
  'Firefly Glade must give each light an independent pulse');
assert.match(engine, /\.booha-blitz-scene-fill \{[\s\S]*?z-index: 1;/,
  'Scene fills must stay behind the interactive UI');
assert.match(engine, /#vb-options, #sb-options, #qb-options,[\s\S]*?#vb-stage, #sb-prompt, #qb-prompt \{\s*position: relative;\s*z-index: 3;/,
  'Prompts and answers must sit above every scene fill');
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
