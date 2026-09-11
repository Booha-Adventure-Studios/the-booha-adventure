#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = ['vocab-blitz.js', 'sentence-blitz.js', 'question-blitz.js'];
const sources = files.map(file => ({
  file,
  source: fs.readFileSync(path.join(root, 'js', file), 'utf8')
}));

for (const { file, source } of sources) {
  assert.match(source, /const BLITZ_TIMER_PAINT_INTERVAL_MS = 100;/,
    `${file} must throttle timer DOM paints to 10Hz`);
  assert.match(source, /lastTimerPaint/,
    `${file} must track the last timer paint`);
  assert.match(source, /elapsed - lastTimerPaint >= BLITZ_TIMER_PAINT_INTERVAL_MS/,
    `${file} must avoid per-frame timer DOM writes`);
  assert.match(source, /const BLITZ_LOW_POWER =/, `${file} must detect low-power/reduced-motion devices`);
  assert.match(source, /function effectCount\(fullCount\)/,
    `${file} must scale celebration effects on constrained devices`);
  assert.match(source, /document\.createDocumentFragment\(\)/,
    `${file} must batch celebration DOM insertion`);
  assert.match(source, /backdrop-filter: none;/,
    `${file} must provide a low-power blur fallback`);
  assert(!source.includes('overlay.appendChild(p);'),
    `${file} must not append particle nodes one at a time`);
}

console.log('Blitz Pass 1 performance audit passed: timer paints, low-power effects, batched particles, and blur fallbacks are aligned across all three games.');
