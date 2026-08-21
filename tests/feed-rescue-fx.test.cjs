#!/usr/bin/env node
'use strict';
// Focused unit test for the near-miss camera beat (pass 4): the slow-mo +
// camera punch-in that plays the instant the safety-catch magnet first
// grabs a throw. It must fire exactly once per rescue, not re-trigger (and
// keep resetting its own countdown) on every frame the steer stays active
// — SAFETY_CATCH_DIST is wide enough that the steer can run for several
// consecutive frames before the candy actually lands.

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

// Mirrors the engine's own physics constants (same convention already used
// by tests/feed-playability-audit.cjs, which hardcodes GRAVITY/AIR_DRAG
// rather than extracting them from a canvas-dependent const chain).
const SAFETY_CATCH_Y     = 850;  // FLOOR_Y (900) - 50
const SAFETY_CATCH_DIST  = 62;
const SAFETY_CATCH_STEER = 0.045;
const MAGNET_DIST        = 60;
const MAGNET_FORCE       = 0.09;
const RESCUE_FX_FRAMES   = 14;

let state; // applyMagnet/boohaMouthPoint close over this.

function makeApplyMagnet() {
  // eslint-disable-next-line no-eval
  const boohaMouthPoint = eval(`(${extractFn('boohaMouthPoint')})`);
  void boohaMouthPoint;
  // eslint-disable-next-line no-eval
  return eval(`(${extractFn('applyMagnet')})`);
}

function freshState(candyY, dist) {
  // Booha's mouth sits at a fixed point; place the candy `dist` away from
  // it, at height candyY, so the safety-catch band condition is controllable.
  return {
    booha: { x: 300, y: 900 },
    boohaJumpOffset: 0,
    won: false, lost: false,
    candy: { x: 300 - dist, y: candyY, vx: 0, vy: 0 },
    usedSafetyCatch: false,
    continueAssist: false,
    rescueFxFrames: 0, rescueFxX: 0, rescueFxY: 0
  };
}

// 1) First frame inside the safety-catch band: fires the beat once.
{
  state = freshState(SAFETY_CATCH_Y + 5, 30);
  const applyMagnet = makeApplyMagnet();
  applyMagnet(16.667);
  assert.strictEqual(state.usedSafetyCatch, true, 'entering the safety-catch band should mark it used');
  assert.strictEqual(state.rescueFxFrames, RESCUE_FX_FRAMES, 'first rescue frame should start the camera beat at full length');
}

// 2) A later frame, still inside the band, with the beat already partway
// through: must NOT reset the countdown back to full length.
{
  state = freshState(SAFETY_CATCH_Y + 5, 30);
  const applyMagnet = makeApplyMagnet();
  applyMagnet(16.667);                 // triggers the beat
  state.rescueFxFrames = 5;            // simulate frame() having ticked it down
  applyMagnet(16.667);                 // still inside the band next frame
  assert.strictEqual(state.rescueFxFrames, 5, 'an already-active rescue must not re-trigger the camera beat');
}

// 3) Outside the safety-catch band (still within the plain magnet's
// pull, if any): must not fire the beat at all.
{
  state = freshState(SAFETY_CATCH_Y - 200, 40);
  const applyMagnet = makeApplyMagnet();
  applyMagnet(16.667);
  assert.strictEqual(state.usedSafetyCatch, false, 'above the safety-catch height, the rescue must not fire');
  assert.strictEqual(state.rescueFxFrames, 0, 'no camera beat should start outside the safety-catch band');
}

console.log('Feed Booha rescue-fx test passed: 3/3 cases');
