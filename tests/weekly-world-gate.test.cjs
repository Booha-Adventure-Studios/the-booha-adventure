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
assert.match(karasukiSource, /function guardWorldEntry\(\)/,
  'Karasuki must guard untrusted direct entries');
assert.match(karasukiSource, /params\.get\('from'\) === 'maze'/,
  'Karasuki must preserve the Maze entry route');
assert.doesNotMatch(karasukiSource, /weeklyCompletedFor\(c\)\s*>=\s*9/,
  'Karasuki must not keep its own copied nine-game rule');
assert.doesNotMatch(profileSource, /id="world-doors"/,
  'Output profile should not render a second floating world-door menu');
assert.doesNotMatch(profileSource, /id="world-door-(karasuki|utsuroba|muenba)"/,
  'Output profile should keep world navigation in the top profile network');
assert.match(profileSource, /class="profile-network"/, 
  'Output profile must keep its compact profile navigation');
assert.match(profileSource, /id="pnet-muenba" hidden/,
  'Output profile must keep Muenba gated in the top profile network');
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
assert.match(utsurobaSource, /function worldGateOpen\(\)/,
  'Utsuroba must guard direct URL entry with the shared weekly gate');
assert.match(utsurobaSource, /const DEV_MODE = params\.get\('dev'\) === '1';/,
  'Utsuroba DEV mode must require the explicit dev=1 query flag');
assert.match(utsurobaSource, /if \(DEV_MODE\) window\.__devUtsuroba = true;/,
  'Utsuroba DEV mode must establish the test override');
assert.match(utsurobaSource, /if \(DEV_MODE \|\| window\.__devUtsuroba\) return true;/,
  'Utsuroba DEV tools must be able to open the unfinished world');
assert.match(utsurobaSource, /roomId : 'room_05'[\s\S]*?x      : 364[\s\S]*?y      : 246/,
  'Family Room must be placed in Utsuroba room_05 at the requested coordinates');
assert.match(utsurobaSource, /function drawFamilyRoomPortal\(now\)/,
  'Utsuroba must draw the Family Room entrance portal');
const familyRoomPortalStart = utsurobaSource.indexOf('function drawFamilyRoomPortal(now)');
const familyRoomPortalEnd = utsurobaSource.indexOf('function drawDrifters(now)', familyRoomPortalStart);
const familyRoomPortalDraw = utsurobaSource.slice(familyRoomPortalStart, familyRoomPortalEnd);
assert.match(familyRoomPortalDraw, /const flashlightW = 85 \+ pulse \* 5;/,
  'the Family Room portal flashlight must be reduced to the intended size');
assert.doesNotMatch(familyRoomPortalDraw, /setLineDash\(/,
  'the Family Room portal must not use a dashed ring around the flashlight');
assert.match(familyRoomPortalDraw, /rgba\(186,255,69/,
  'the Family Room portal flashlight must pulse with the window green');
assert.match(utsurobaSource, /family-room\/flashlight\.webp/,
  'the Family Room portal must use the generated flashlight sprite');
assert.match(utsurobaSource, /mix-blend-mode:[^;]*screen/,
  'the flashlight sprite must blend cleanly into the dark Utsuroba room');
assert.match(utsurobaSource, /rgba\(0,0,0,0\.66\)/,
  'the open Family Room portal must use black smoke');
assert.match(utsurobaSource, /family-room\.html/,
  'the Utsuroba portal must route to Family Room');
assert.match(utsurobaSource, /function injectFamilyRoomPopup\(\)/,
  'Utsuroba must provide a dedicated Family Room popup');
assert.match(utsurobaSource, /This is a horror puzzle game!/,
  'the Family Room popup must warn students that the game is horror');
assert.match(utsurobaSource, /CASE FILE 02 \/ CLOSED[\s\S]*?Complete nine games this week/,
  'the closed popup must explain the weekly unlock');
assert.match(utsurobaSource, /data-family-room-enter/,
  'the open popup must offer an explicit enter action');
assert.match(utsurobaSource, /family-room\/flashlight\.webp/,
  'the popup must use the flashlight sprite');
assert.match(utsurobaSource, /showLockedWorld\(\)/,
  'Utsuroba should show a friendly locked state');
assert.match(utsurobaSource, /href = 'profile\.html'/,
  'Direct Utsuroba entry should provide a return to the Output profile');
assert.match(karasukiSource, /UTSUROBA_PORTAL\.href\}\?dev=1/,
  'Karasuki Utsuroba DEV entry must preserve the explicit dev route');
assert.match(karasukiSource, /function _utsurobaCurriculumUnlocked\(\)[\s\S]*?if \(window\.__devUtsuroba\) return true;/,
  'Karasuki Utsuroba popup must honor the DEV override');

console.log('Weekly Output-world gate tests passed.');
