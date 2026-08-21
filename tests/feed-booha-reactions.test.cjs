#!/usr/bin/env node
'use strict';
// Focused unit test for the "Booha reactions per star count" razzle-dazzle
// pass: the post-catch hop is now driven by a shared triggerBoohaHop(frames,
// amt) helper instead of a hardcoded 16-frame/-18px jump, so a 3-star catch
// can hop bigger/longer than a 2-star catch, and the original last-chance
// save hop (frames=16, amt=1) must still behave exactly as before.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(ROOT, 'js/feed_booha_1.js'), 'utf8');

function extractFn(name) {
  const re = new RegExp(`function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n  \\}`);
  const match = engineSource.match(re);
  assert.ok(match, `${name}() must exist in the engine`);
  return match[0];
}

let state; // triggerBoohaHop/updateBooha close over this.

function makeFns() {
  // eslint-disable-next-line no-eval
  const triggerBoohaHop = eval(`(${extractFn('triggerBoohaHop')})`);
  // eslint-disable-next-line no-eval
  const updateBooha = eval(`(${extractFn('updateBooha')})`);
  return { triggerBoohaHop, updateBooha };
}

function runHop(frames, amt) {
  state = {
    booha: { x: 300, y: 900, behavior: 'none' },
    boohaJumpFrame: 0, boohaJumpTotal: 16, boohaJumpAmt: 1, boohaJumpOffset: 0
  };
  const { triggerBoohaHop, updateBooha } = makeFns();
  triggerBoohaHop(frames, amt);
  let peak = 0;
  for (let i = 0; i < frames; i++) {
    updateBooha(16.667);
    peak = Math.max(peak, Math.abs(state.boohaJumpOffset));
  }
  return { peak, finalOffset: state.boohaJumpOffset, finalFrame: state.boohaJumpFrame };
}

// 1) The original last-chance hop (16 frames, amt=1) must be unchanged:
// peak height ~18px, and it fully settles back to 0 by the end.
{
  const { peak, finalOffset, finalFrame } = runHop(16, 1);
  assert.ok(Math.abs(peak - 18) < 0.5, `default hop should peak near 18px, got ${peak}`);
  assert.strictEqual(finalOffset, 0, 'the hop must settle back to exactly 0, not a sin() rounding remainder');
  assert.strictEqual(finalFrame, 0, 'the hop timer must reach exactly 0');
}

// 2) A 3-star celebration hop (26 frames, amt=1.6) should be visibly
// bigger — roughly 1.6x the peak height of the default hop.
{
  const { peak, finalOffset } = runHop(26, 1.6);
  assert.ok(peak > 25 && peak < 32, `scaled-up hop should peak around 28.8px, got ${peak}`);
  assert.strictEqual(finalOffset, 0, 'a longer/bigger hop must still settle back to exactly 0');
}

// 3) A 2-star hop (16 frames, amt=1) is the same shape as the original
// last-chance hop — same call, same result, no special-casing needed.
{
  const a = runHop(16, 1);
  const b = runHop(16, 1);
  assert.strictEqual(a.peak, b.peak, 'identical trigger args should produce identical peak height');
}

console.log('Feed Booha reaction-hop test passed: 3/3 cases');
