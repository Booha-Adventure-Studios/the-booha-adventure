#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

// A persistent, referenced pool must exist — the old code cloned a fresh
// Audio() per pickup with no reference kept anywhere, which could be
// garbage-collected mid-playback with no error raised.
assert.match(engine, /const CANDY_SFX_POOL_SIZE = 4/);
assert.match(engine, /let candySfxPool = \[\]/);
assert.match(engine, /let candySfxPoolIdx = 0/);

const playFn = (() => {
  const from = engine.indexOf('function playCandySfx()');
  assert.notStrictEqual(from, -1, 'missing playCandySfx()');
  const to = engine.indexOf('\n}', from);
  return engine.slice(from, to);
})();
assert.doesNotMatch(playFn, /candySfx\.cloneNode\(\)/,
  'playCandySfx must not clone-and-discard a new element per call');
assert.match(playFn, /candySfxPool\[candySfxPoolIdx % candySfxPool\.length\]/,
  'playCandySfx must round-robin the persistent pool');
assert.match(playFn, /s\.currentTime = 0/,
  'reused pool elements must be rewound before replay');
assert.match(playFn, /promise\.catch\(\(\) => playSfx\("pickup"\)\)/,
  'fallback to the synthesized tone must remain for real play() rejections');

// The pool must actually be built (not just the primary element) when
// candySfx loads.
const boot = engine.slice(engine.indexOf('candySfx = new Audio(ASSET_PATHS.candySfx)'), engine.indexOf('candySfx = new Audio(ASSET_PATHS.candySfx)') + 400);
assert.match(boot, /candySfxPool = \[candySfx\]/);
assert.match(boot, /for \(let i = 1; i < CANDY_SFX_POOL_SIZE; i\+\+\)/);
assert.match(boot, /candySfx\.cloneNode\(\)/, 'pool members are built via cloneNode at boot, not per-pickup');

// Every pool member — not just the primary element — must be warmed
// (muted play) inside the user-gesture handler, since a clone that only
// ever plays later, outside a gesture, is what mobile autoplay policies
// tend to block.
const warm = engine.slice(engine.indexOf('const warmSfx ='), engine.indexOf('const warmSfx =') + 400);
assert.match(warm, /candySfxPool\.length \? candySfxPool : \(candySfx \? \[candySfx\] : \[\]\)/);
assert.match(warm, /for \(const el of warmSfx\) \{ el\.muted=true; el\.play\(\)\.catch\(\(\)=>\{\}\); \}/);

console.log('Booha Invaders pass 8 checks passed.');
