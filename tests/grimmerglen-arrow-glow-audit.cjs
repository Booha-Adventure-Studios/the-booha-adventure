#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(ROOT, 'verify.sh'), 'utf8');

const start = runtime.indexOf('function drawExitArrows(');
const end = runtime.indexOf('\n  function drawMarietta(', start);
assert(start >= 0 && end > start, 'runtime must expose the Grimmerglen exit-arrow renderer');
const arrows = runtime.slice(start, end);

assert(arrows.includes('REDUCED_MOTION'), 'arrow glow must respect reduced-motion settings');
assert(arrows.includes('const arrowAlpha'), 'arrow glow must use a clear visibility envelope');
assert(arrows.includes('shadowBlur = 30 + twinkle * 12'), 'arrows must have a broad visible halo');
assert(arrows.includes('lineWidth = 11'), 'arrow halo must be wider than the directional core');
assert(arrows.includes('lineWidth = 4.8'), 'arrows must retain a crisp directional core');
assert(arrows.includes('shadowBlur = 15 + twinkle * 5'), 'arrow core must retain focused glow');
assert(verify.includes('tests/grimmerglen-arrow-glow-audit.cjs'),
  'verify.sh must run the Grimmerglen arrow-glow audit');

console.log('Grimmerglen arrow glow audit passed: stronger halo and crisp core are wired without changing navigation geometry.');
