#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const unlockSource = fs.readFileSync(
  path.join(ROOT, 'js/core/unlock-system.js'),
  'utf8'
);
const karasukiSource = fs.readFileSync(
  path.join(ROOT, 'js/karasuki.js'),
  'utf8'
);

function gateFor(counts, devFlags = {}) {
  let unlockSystem = null;
  const BoohaAdventure = {
    scores: {
      weeklyCompletedFor(curriculum) {
        return counts[curriculum] || 0;
      },
    },
    registerSystem(name, api) {
      if (name === 'unlockSystem') unlockSystem = api;
    },
  };

  const context = {
    window: { ...devFlags },
    BoohaAdventure,
    document: { dispatchEvent() {} },
    console,
    Date,
  };
  context.window.BoohaAdventure = BoohaAdventure;
  vm.createContext(context);
  vm.runInContext(unlockSource, context, { filename: 'js/core/unlock-system.js' });

  assert.ok(unlockSystem, 'unlock system should register itself');
  return unlockSystem.isWeeklyWorldGateOpen();
}

assert.strictEqual(gateFor({ bc: 8, br: 0, pb: 0 }), false,
  'eight games must not open the weekly world gate');
assert.strictEqual(gateFor({ bc: 9, br: 0, pb: 0 }), true,
  'nine games in one curriculum must open the weekly world gate');
assert.strictEqual(gateFor({ bc: 0, br: 9, pb: 0 }), true,
  'the gate must work for every curriculum');
assert.strictEqual(gateFor({ bc: 8, br: 1, pb: 0 }), false,
  'games mixed across curricula must not open the gate');
assert.strictEqual(gateFor({ bc: 0, br: 0, pb: 0 }, { __devAllGames: true }), true,
  'developer all-games mode must preserve access');
assert.strictEqual(gateFor({ bc: 0, br: 0, pb: 0 }, { __devUtsuroba: true }), true,
  'developer Utsuroba mode must preserve access');

assert.match(karasukiSource, /BoohaUnlockSystem\.isWeeklyWorldGateOpen/,
  'Karasuki must consume the shared weekly gate');
assert.doesNotMatch(karasukiSource, /weeklyCompletedFor\(c\)\s*>=\s*9/,
  'Karasuki must not keep its own copied nine-game rule');

console.log('Weekly Output-world gate tests passed.');
