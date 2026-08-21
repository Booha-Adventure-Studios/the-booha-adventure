#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

// Rock hit-flash must be composited through the sprite's own alpha
// ("source-atop") so it hugs the rock's real silhouette instead of
// lighting up its whole (mostly transparent) bounding box.
const rocks = (() => {
  const from = engine.indexOf('// Rocks');
  assert.notStrictEqual(from, -1, 'missing rock draw block');
  const to = engine.indexOf('// Bugs', from);
  assert.notStrictEqual(to, -1, 'missing end of rock draw block');
  return engine.slice(from, to);
})();

assert.match(rocks, /if \(r\.hitT > 0\)/);
assert.match(rocks, /ctx\.globalCompositeOperation\s*=\s*"source-atop"/,
  'hit-flash must use source-atop so it clips to the rock art, not its bounding box');
assert.match(rocks, /ctx\.fillRect\(r\.x, r\.y, r\.w, r\.h\)/,
  'flash fill should follow the same box the composite mode then clips down to actual pixels');
assert.match(rocks, /ctx\.restore\(\);\s*\n\s*\}\s*\n\s*if \(pct < 0\.99\)/,
  'composite mode must be restored before the health-bar draw below it');

// The composite-mode toggle must be scoped with save/restore, not left
// bleeding into whatever draws next (bugs, shots, candy...).
const flashBlock = rocks.slice(rocks.indexOf('if (r.hitT > 0)'));
assert.match(flashBlock, /ctx\.save\(\);[\s\S]*ctx\.restore\(\);/);

console.log('Booha Invaders pass 6 checks passed.');
