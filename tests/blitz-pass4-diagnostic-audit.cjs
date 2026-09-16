#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');

assert.match(engine, /blitzdiag/,
  'the performance readout must be gated behind the blitzdiag URL flag');
assert.match(engine, /function createPerformanceDiagnostic\(overlay\)/,
  'the shared engine must expose one diagnostic panel implementation');
assert.match(engine, /HARDWARE TIER/,
  'the diagnostic must report the hardware tier and device hints');
assert.match(engine, /RUNTIME TIER/,
  'the diagnostic must report the active runtime tier');
assert.match(engine, /avg frame[\s\S]*slow frames/,
  'the diagnostic must report average frame time and slow-frame counts');
assert.match(engine, /reduced-motion \$\{REDUCED_MOTION\}/,
  'the diagnostic must expose the accessibility motion setting separately');
assert.match(engine, /active classes \$\{activeClasses\}/,
  'the diagnostic must show the active performance/compositor classes');
assert.match(engine, /function monitorFramePerformance\(overlay, onPoorPerformance, onProgress\)/,
  'the frame sampler must stream progress into the diagnostic');
assert.match(engine, /onProgress\?\.\(\{[\s\S]*?sampledMs:/,
  'the sampler must publish sampled duration and frame statistics');
assert.match(engine, /const performanceDiagnostic = createPerformanceDiagnostic\(overlay\)/,
  'each Blitz run must attach the shared diagnostic when requested');
assert.match(engine, /progress => performanceDiagnostic\?\.update\(progress\)/,
  'runtime sampling must update the visible diagnostic readout');

console.log('Blitz Pass 4 diagnostic audit passed: URL-gated tier, frame, accessibility, and active-class telemetry are wired.');
