#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(engine, /function emitCorrectMicroBurst\(correctBtn, answerRect, overlayRect\) \{\s*if \(isMinimalPower\(\)\) return;/,
  'minimal mode must skip correct-answer spark allocation entirely');
assert.match(engine, /function emitStreakSparks\(\) \{\s*const threshold = arguments\.length \? arguments\[0\] : 0;\s*if \(isMinimalPower\(\)\) return;/,
  'minimal mode must skip hidden streak spark allocation');
assert.match(engine, /function emitWrongMicroFeedback\(wrongBtn, answerRect, overlayRect\) \{\s*if \(isMinimalPower\(\)\) return;/,
  'minimal mode must skip hidden wrong-answer spark allocation');
assert.match(engine, /let questionOverlayRect = null;/,
  'the engine must retain one cached overlay rectangle per question');
assert.match(engine, /questionOverlayRect = overlay\.getBoundingClientRect\(\);/,
  'the overlay rectangle must be captured after question layout');
assert.match(engine, /const answerRect = isMinimalPower\(\) \? null : btn\.getBoundingClientRect\(\);/,
  'the selected answer rectangle must be captured once at tap time');
assert.match(engine, /correctDetonate\(btn, answerRect, overlayRect\);/,
  'correct feedback must consume the cached geometry');
assert.match(engine, /emitWrongMicroFeedback\(btn, answerRect, overlayRect\);/,
  'wrong feedback must consume the cached geometry');

assert.match(index, /const BLITZ_SCRIPT_SOURCES = \[[\s\S]*?js\/question-blitz\.js[\s\S]*?\];/,
  'the hub must retain an explicit ordered Blitz module list');
assert.match(index, /function loadBlitzScript\(src, globalName\)[\s\S]*?script\.async = false[\s\S]*?document\.body\.appendChild\(script\)/,
  'Blitz modules must be injected as ordered scripts only when requested');
assert.match(index, /function loadBlitzEngines\(\)[\s\S]*?BLITZ_SCRIPT_SOURCES[\s\S]*?\.reduce\(/,
  'the hub must load Blitz dependencies sequentially');
assert.match(index, /if \(!engine\) \{[\s\S]*?await loadBlitzEngines\(\)/,
  'a game tap must trigger the deferred Blitz load');
for (const file of ['blitz-engine.js', 'vocab-blitz.js', 'sentence-blitz.js', 'question-blitz.js']) {
  assert(!index.includes(`<script src="js/${file}"></script>`),
    `${file} must not be eagerly loaded by the hub`);
}

console.log('Blitz Pass 5 performance audit passed: minimal node hygiene, cached layout geometry, and deferred hub loading are covered.');
