#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const toast = read('js/ui/medal-toast.js');
const system = read('js/core/collectible-system.js');

assert.match(system, /detail: \{ awards \}/, 'earning should announce the channels as one batch');
assert.match(toast, /booha:collectibleEarned/, 'the shared reward toast should listen for oddity earnings');
assert.match(toast, /function enqueueFinds\(awards\)/, 'oddity earnings should enter the existing reward queue');
assert.match(toast, /THIS WEEK'S FINDS/, 'standard and special finds should share one combined headline');
assert.match(toast, /function markFindsRevealed\(awards\)/, 'the reveal should be marked only when it is shown');
assert.match(toast, /pendingFindsFromSave/, 'an unshown reveal should survive a page change and retry later');
assert.match(toast, /if \(busy\(\)\) \{ setTimeout\(next, 1500\); return; \}/, 'oddity reveals should use the existing quiet-moment gate');
assert.match(toast, /ODDITY FIND/, 'the reveal should identify the reward type');

for (const page of ['index.html', 'maze.html', 'profile.html']) {
  const html = read(page);
  assert.match(html, /js\/ui\/medal-toast\.js/, `${page} should load the shared reward toast`);
}

console.log('Oddities reveal tests passed.');
