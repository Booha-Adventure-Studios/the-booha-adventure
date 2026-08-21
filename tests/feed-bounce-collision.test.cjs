#!/usr/bin/env node
'use strict';
// Focused unit test for pass 2: the swept point-vs-box collision test that
// replaced the old "top edge, this exact frame only" bounce-pad check.
// Verifies the three failure modes from the audit: fast horizontal
// tunneling straight through a pad, hitting the underside while rising,
// and a side approach — plus that a normal slow top-down landing still works.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(ROOT, 'js/feed_booha_1.js'), 'utf8');

// Pull just the sweptBoxHit function body out of the engine file so this
// test exercises the real shipped implementation, not a re-typed copy.
const match = engineSource.match(/function sweptBoxHit\([^)]*\)\s*\{[\s\S]*?\n  \}/);
assert.ok(match, 'sweptBoxHit() must exist in the engine');
// eslint-disable-next-line no-eval
const sweptBoxHit = eval(`(${match[0]})`);

// A 100x24 pad centered at (270, 500) — comparable to a real level's bounce pad.
const left = 220, right = 320, top = 488, bottom = 512;

// 1) Normal slow landing straight down onto the top face: must still work.
{
  const hit = sweptBoxHit(270, 470, 270, 495, left, right, top, bottom);
  assert.ok(hit && hit.ny === -1, 'slow top-down landing should hit the top face');
}

// 2) Fast horizontal pass: candy's center jumps clean across the pad's
// width in a single frame while also crossing the top edge (the exact
// "candy falls through" tunneling case from the audit).
{
  const hit = sweptBoxHit(180, 495, 380, 495 + 4, left, right, top, bottom);
  assert.ok(hit, 'a fast horizontal sweep through the pad must register a hit');
}

// 3) Rising into the underside: candy moving upward from below the pad.
{
  const hit = sweptBoxHit(270, 560, 270, 505, left, right, top, bottom);
  assert.ok(hit && hit.ny === 1, 'rising into the underside should hit the bottom face, not pass through');
}

// 4) Side approach: candy moving in from the left at pad height.
{
  const hit = sweptBoxHit(150, 500, 240, 500, left, right, top, bottom);
  assert.ok(hit && hit.nx === -1, 'a side approach should hit the left face, not pass through');
}

// 5) A path that never comes near the box should not report a hit.
{
  const hit = sweptBoxHit(0, 0, 10, 10, left, right, top, bottom);
  assert.strictEqual(hit, null, 'a path nowhere near the box must not report a hit');
}

console.log('Feed Booha bounce-collision test passed: 5/5 cases');
