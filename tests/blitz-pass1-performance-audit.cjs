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
const engine = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');

assert.match(engine, /const TIMER_PAINT_INTERVAL_MS = 100;/,
  'shared engine must throttle timer DOM paints to 10Hz');
assert.match(engine, /lastTimerPaint/,
  'shared engine must track the last timer paint');
assert.match(engine, /elapsed - lastTimerPaint >= TIMER_PAINT_INTERVAL_MS/,
  'shared engine must avoid per-frame timer DOM writes');
assert.match(engine, /const LOW_POWER =/, 'shared engine must detect low-power/reduced-motion devices');
assert.match(engine, /function effectCount\(fullCount\)/,
  'shared engine must scale celebration effects on constrained devices');
assert.match(engine, /document\.createDocumentFragment\(\)/,
  'shared engine must batch celebration DOM insertion');
for (const { file, source } of sources) {
  assert.match(source, /BoohaBlitzEngine\.LOW_POWER/,
    `${file} must use the shared low-power signal for its skin`);
  assert.match(source, /backdrop-filter: none;/,
    `${file} must provide a low-power blur fallback`);
}
assert(!engine.includes('overlay.appendChild(p);'),
  'shared engine must not append particle nodes one at a time');

console.log('Blitz Pass 1 performance audit passed: shared timer paints, low-power effects, batched particles, and blur fallbacks are aligned across all three games.');
