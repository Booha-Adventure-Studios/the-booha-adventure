#!/usr/bin/env node
'use strict';
// Focused unit test for pass 3: stars are no longer mathematically stuck
// at 3 every time. cutCount === parCuts on every legitimate clear (every
// rope must be cut to win), so the old tiering alone could never produce
// anything but 3 stars. The fix docks a star for the Helper/continue
// assist and a star for the last-second safety-catch magnet, since a
// round that needed rescuing wasn't actually a clean throw.

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

let state; // getParCuts/starsForCuts close over this module-level variable.

function starsFor(mockState, cutCount, hitBounce) {
  state = mockState;
  // Direct eval of a function *expression* (not a declaration) evaluated
  // in this scope, so the real shipped source is exercised and its calls
  // to getParCuts()/references to `state` resolve against this function's
  // locals — same trick as tests/feed-bounce-collision.test.cjs.
  // eslint-disable-next-line no-eval
  const getParCuts = eval(`(${extractFn('getParCuts')})`);
  void getParCuts;
  // eslint-disable-next-line no-eval
  const starsForCuts = eval(`(${extractFn('starsForCuts')})`);
  return starsForCuts(cutCount, hitBounce);
}

function level(parCuts, noBounce) {
  return { parCuts, noBounce: !!noBounce };
}

// 1) Clean clear, no assist, no safety catch: full 3 stars.
assert.strictEqual(
  starsFor({ currentLevel: level(3), continueAssist: false, usedSafetyCatch: false }, 3, false),
  3, 'a clean clear with no assists should still earn 3 stars'
);

// 2) Safety-catch used, otherwise clean: docked to 2. This is the case
// that actually matters for most players (few ever touch the Helper).
assert.strictEqual(
  starsFor({ currentLevel: level(3), continueAssist: false, usedSafetyCatch: true }, 3, false),
  2, 'needing the safety-catch magnet should dock a star'
);

// 3) Helper/continue used, otherwise clean: docked to 2.
assert.strictEqual(
  starsFor({ currentLevel: level(3), continueAssist: true, usedSafetyCatch: false }, 3, false),
  2, 'using the Helper should dock a star'
);

// 4) Both the Helper and the safety-catch: floors at 1, doesn't go negative.
assert.strictEqual(
  starsFor({ currentLevel: level(3), continueAssist: true, usedSafetyCatch: true }, 3, false),
  1, 'needing both assists should floor at 1 star, not go below it'
);

// 5) noBounce level, bounce hit, safety-catch also used: stacks below the
// bounce penalty's own cap of 2, still floors at 1.
assert.strictEqual(
  starsFor({ currentLevel: level(3, true), continueAssist: false, usedSafetyCatch: true }, 3, true),
  1, 'bounce penalty and safety-catch should stack, floored at 1'
);

console.log('Feed Booha star-rating test passed: 5/5 cases');
