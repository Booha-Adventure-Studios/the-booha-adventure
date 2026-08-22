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
const profileSource = fs.readFileSync(
  path.join(ROOT, 'profile.html'),
  'utf8'
);
const utsurobaSource = fs.readFileSync(
  path.join(ROOT, 'js/utsuroba.js'),
  'utf8'
);

function gateSystemFor(counts, devFlags = {}) {
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
  return unlockSystem;
}

function gateFor(counts, devFlags = {}) {
  return gateSystemFor(counts, devFlags).isWeeklyWorldGateOpen();
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

const rolloverCounts = { bc: 9, br: 0, pb: 0 };
const rolloverGate = gateSystemFor(rolloverCounts);
assert.strictEqual(rolloverGate.isWeeklyWorldGateOpen(), true,
  'the world gate should be open before a weekly reset');
rolloverCounts.bc = 0;
assert.strictEqual(rolloverGate.isWeeklyWorldGateOpen(), false,
  'the world gate should re-lock when the weekly count resets');

assert.match(karasukiSource, /BoohaUnlockSystem\.isWeeklyWorldGateOpen/,
  'Karasuki must consume the shared weekly gate');
assert.doesNotMatch(karasukiSource, /weeklyCompletedFor\(c\)\s*>=\s*9/,
  'Karasuki must not keep its own copied nine-game rule');
assert.match(profileSource, /id="world-doors" hidden/,
  'Output profile doors must be hidden by default');
assert.match(profileSource, /BoohaUnlockSystem\.isWeeklyWorldGateOpen/,
  'Output profile doors must consume the shared weekly gate');
assert.match(profileSource, /href="karasuki\.html\?from=profile"/,
  'Output profile must provide a Karasuki door when open');
assert.match(profileSource, /href="utsuroba\.html\?from=profile"/,
  'Output profile must provide an Utsuroba door when open');
assert.doesNotMatch(profileSource, /href="juku\.html"/, 
  'Output world doors must not add a Juku route');
assert.match(profileSource, /booha:weeklyReset/,
  'Output profile must react to the weekly reset event');
assert.match(profileSource, /booha:newWeek/,
  'Output profile must also react to the higher-level week rollover event');
assert.match(karasukiSource, /getSpawnPoint\(PAGE_ID\)/,
  'Karasuki should resume its saved room for a profile entry');
assert.match(karasukiSource, /URLSearchParams\(window\.location\.search\)[\s\S]*from.*profile/,
  'Karasuki should distinguish direct profile entry');
assert.match(utsurobaSource, /getSpawnPoint\(PAGE_ID\)/,
  'Utsuroba should resume its saved room for a profile entry');
assert.match(utsurobaSource, /href = 'profile\.html'/,
  'Direct Utsuroba entry should provide a return to the Output profile');

console.log('Weekly Output-world gate tests passed.');
