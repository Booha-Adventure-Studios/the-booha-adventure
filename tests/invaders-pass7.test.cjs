#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

// Each Dotty needs a stable per-bug seed and flee-direction fields so its
// panic reaction doesn't depend on its own (fast-moving) position.
const spawn = (() => {
  const from = engine.indexOf('function spawnBug()');
  assert.notStrictEqual(from, -1, 'missing spawnBug()');
  const to = engine.indexOf('\n}', from);
  return engine.slice(from, to);
})();
assert.match(spawn, /panicSeed:\s*rand\(0,\s*100\)/, 'bug needs a fixed per-spawn panic seed');
assert.match(spawn, /panicAwayX:\s*0,\s*panicAwayY:\s*0/, 'bug needs flee-direction fields');
assert.match(spawn, /panicDur:\s*0/, 'bug needs a panicDur field to normalize the flee decay');

// The drift multiplier must ease toward its target, not snap to it, so a
// nearby kill doesn't produce an instant speed pop.
assert.match(engine, /b\.dMult\s*=\s*\(b\.dMult\s*\?\?\s*1\)\s*\+\s*\(targetMult\s*-\s*\(b\.dMult\s*\?\?\s*1\)\)\s*\*\s*Math\.min\(1,\s*dt\s*\*\s*6\)/,
  'drift multiplier must ease toward targetMult, not assign it directly');
assert.doesNotMatch(engine, /if \(b\.panicking\)\s*dMult = 2\.5;/,
  'the old instant-snap dMult assignment should be gone');

// Panic motion must not feed the bug's own x position back into sin() —
// that feedback loop was the source of the "glitchy" teleport-y jitter.
const panicMotion = (() => {
  const from = engine.indexOf('if (b.panicking) {', engine.indexOf('function updatePlay') === -1 ? 0 : 0);
  // Locate the panic-motion block specifically (has panicSeed usage), not
  // the earlier panicT countdown block.
  const marker = engine.indexOf('const seed = b.panicSeed || 0;');
  assert.notStrictEqual(marker, -1, 'missing panic motion block using panicSeed');
  const start = engine.lastIndexOf('if (b.panicking) {', marker);
  const end = engine.indexOf('} else {', marker);
  return engine.slice(start, end);
})();
assert.doesNotMatch(panicMotion, /Math\.sin\(b\.bob\*2\.8 \+ b\.x\)/,
  'panic motion must not feed b.x back into its own sine phase');
assert.match(panicMotion, /Math\.sin\(b\.bob\*1\.6 \+ seed\)/);
assert.match(panicMotion, /b\.panicAwayX/, 'panic motion should push the bug away from the kill point');

// The kill-radius panic trigger must compute and store a flee direction,
// and freeze panicDur alongside panicT so the flee push can decay over the
// panic's actual lifetime instead of a fixed guess.
const trigger = engine.slice(engine.indexOf('for (const nb of bugs) {'), engine.indexOf('for (const nb of bugs) {') + 700);
assert.match(trigger, /nb\.panicT = nb\.panicDur = rand\(0\.6,1\.4\)/);
assert.match(trigger, /nb\.panicAwayX = dx \* inv; nb\.panicAwayY = dy \* inv/);

console.log('Booha Invaders pass 7 checks passed.');
