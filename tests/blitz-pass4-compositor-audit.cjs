#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');

assert.match(engine, /function injectCompositorStyles\(\)/,
  'shared engine must install one compositor-friendly interaction skin per mode');
assert.match(engine, /blitz-compositor/,
  'Blitz overlays must opt into the compositor-friendly interaction skin');
assert.match(engine, /::after/, 'interactive glow must use a separate visual layer');
assert.match(engine, /transition: transform 120ms ease, background 120ms ease, opacity 120ms ease/,
  'interactive states must transition compositor-friendly properties');
assert.match(engine, /box-shadow: none !important/,
  'correct and wrong states must not animate large shadow regions');
assert.match(engine, /injectCompositorStyles\(\);/,
  'the compositor skin must be installed on the active launch path');

const celebrationLines = engine.split('\n').filter(line =>
  /(?:p|d|line)\.style\.cssText/.test(line));
assert(celebrationLines.length > 0, 'shared engine must retain batched celebration styling');
for (const line of celebrationLines) {
  assert(!line.includes('box-shadow:'), 'celebration nodes must not carry individual box-shadow layers');
  assert(!line.includes('text-shadow:'), 'celebration names must not carry individual text-shadow layers');
}
assert(!engine.includes('correctBtn.style.boxShadow'),
  'correct-answer feedback must not add an inline shadow layer');

console.log('Blitz Pass 4 compositor audit passed: interaction glow uses opacity/transform layers and celebration nodes are shadow-free.');
