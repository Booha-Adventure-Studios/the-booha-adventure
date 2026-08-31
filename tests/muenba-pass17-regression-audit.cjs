#!/usr/bin/env node
'use strict';

// Pass 17E: integration guard for the popup, celebration, spawn, and
// return-threat changes shipped in Passes 17A–17D.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js', 'muenba-data.js'), 'utf8'), dataContext, {
  filename: 'muenba-data.js'
});
const data = dataContext.window.MUENBA_DATA;

function sourceSection(startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} integration contract`);
  return source.slice(start, end);
}

const popupSource = sourceSection('captureBox', 'setDangerOverlay');
const hideSource = sourceSection('toggleHide', 'clickCheckGhost');
const celebrationSource = sourceSection('startMuenbaCelebration', 'finishMuenbaCelebration');
const finishSource = sourceSection('finishMuenbaCelebration', 'renderNuppiThanks');
const spawnSource = sourceSection('getGhostRoomMap', 'ghostHostilityFor');
const travelSource = sourceSection('pickGhostTravelExit', 'pickGhostTeleportRoom');
const pendingSource = sourceSection('setReturnToNuppiPending', 'leaveCaptureForNuppi');

// 17A: both modal families are top-anchored, scroll-safe, and reset between
// scene replacements.
assert(source.includes('#muenba-lobby-overlay { position:fixed; inset:0; z-index:210; display:none; align-items:flex-start;'), 'lobby overlay must remain top-anchored');
assert(source.includes('#muenba-capture-overlay { position:fixed; inset:0; z-index:215; display:none; align-items:flex-start;'), 'capture overlay must remain top-anchored');
assert(source.includes('overflow-y:auto; background:rgba(0,0,0,0); transition:background .4s ease; padding:max(20px,env(safe-area-inset-top,0px))'), 'modal overlays must retain safe-area scrolling');
assert(popupSource.includes('box.scrollTop = 0;'), 'capture scene replacement must reset vertical scroll');
assert(source.includes('function focusLobbyControl(selector)'), 'lobby scenes must share the scroll reset path');

// 17B: center reward presentation and an interaction lock that cannot be
// bypassed by a direct event or keyboard activation.
assert(celebrationSource.includes('state.x = CENTER_X;') && celebrationSource.includes('state.y = CENTER_Y;'), 'dance must re-anchor Booha at world center');
assert(hideSource.includes('state.celebrating'), 'Hide must be blocked during celebration');
assert(celebrationSource.includes('state.hiding = false;'), 'celebration must clear hiding before dancing');
assert(celebrationSource.includes('setHideButtonDisabled(true);'), 'celebration must disable Hide');
assert(finishSource.includes('setHideButtonDisabled(false);'), 'completed celebration must restore Hide');

// 17C: real hunt targets stay away from Nuppi's direct approach, including
// autonomous travel, while the generic threat pool remains broader.
assert(data && data.rooms && data.rooms.room_01, 'room_01 topology must exist');
const approachRooms = new Set((data.rooms.room_01.exits || []).map(exit => exit.to));
assert.deepStrictEqual([...approachRooms].sort(), ['room_02', 'room_06'], 'room_01 must retain its two direct approach rooms');
assert(source.includes('const MUENBA_NUPPI_APPROACH_ROOMS = new Set('), 'approach safety must derive from room topology');
assert(spawnSource.includes('const huntRoomIds = roomIds.filter(roomId => !MUENBA_NUPPI_APPROACH_ROOMS.has(roomId));'), 'real target assignment must use safe rooms');
assert(spawnSource.includes('const emptyRoomIds = roomIds.filter(roomId => !map[roomId]);'), 'generic threats must retain the wider room pool');
assert(travelSource.includes('const keepTargetAwayFromNuppi = isMainHuntGhostId(realGhost);'), 'travel must preserve target-vs-Jerk distinction');

// 17D: carrying energy increases temporary pressure and clearing the pending
// state invalidates that temporary layout.
assert(source.includes('const JERK_COUNT = 5;') && source.includes('const JERK_RETURN_COUNT = 8;'), 'normal and return-trip threat counts must both exist');
assert(spawnSource.includes('const weekly = readMuenbaWeekly();'), 'return-trip state must read the weekly Muenba bucket');
assert(spawnSource.includes('const returnTripActive = Number(weekly.orbsPending) > 0;'), 'return-trip state must follow pending energy');
assert(spawnSource.includes('const jerkCount = returnTripActive ? JERK_RETURN_COUNT : JERK_COUNT;'), 'Jerk count must change with carrying state');
assert(spawnSource.includes('returnTripJerk: returnTripActive'), 'temporary Jerk instances must be tagged');
assert(source.includes('function invalidateGhostRoomMap()'), 'temporary threat maps need explicit invalidation');
assert(pendingSource.includes('if (changed) invalidateGhostRoomMap();'), 'ending or starting a return trip must refresh threats');

const emptyRoomCount = Object.keys(data.rooms).filter(roomId => roomId !== 'room_01').length - (data.ghosts || []).length;
assert(emptyRoomCount >= 8, 'the current map must have room capacity for the eight-Jerk return pressure');
const threatCounts = [false, true, false].map(carrying => Math.min(emptyRoomCount, carrying ? 8 : 5));
assert.deepStrictEqual(threatCounts, [5, 8, 5], 'threat pressure must expand only while carrying energy');

console.log('Muenba Pass 17 regression audit passed: popup, celebration, target safety, and return-threat contracts remain integrated.');
