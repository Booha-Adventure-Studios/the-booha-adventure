#!/usr/bin/env node
'use strict';

// Pass 17C: keep real hunt targets away from Nuppi's direct approach.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const dataSource = fs.readFileSync(path.join(root, 'js', 'muenba-data.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(dataSource, context, { filename: 'muenba-data.js' });
const data = context.window.MUENBA_DATA;

assert(data && data.rooms && data.rooms.room_01, 'Muenba data must define room_01');
const approachRooms = new Set((data.rooms.room_01.exits || []).map(exit => exit.to));
assert.deepStrictEqual([...approachRooms].sort(), ['room_02', 'room_06'], 'room_01 approach topology must remain explicit');
assert(source.includes('const MUENBA_NUPPI_APPROACH_ROOMS = new Set('), 'approach rooms must be derived from the room graph');
assert(source.includes('const huntRoomIds = roomIds.filter(roomId => !MUENBA_NUPPI_APPROACH_ROOMS.has(roomId));'), 'real targets must use rooms away from Nuppi');
assert(source.includes('_muenbaShuffle(huntRoomIds, today + \'|muenbaGhostRooms\')'), 'real target placement must shuffle only eligible rooms');
assert(source.includes('const emptyRoomIds = roomIds.filter(roomId => !map[roomId]);'), 'generic threats must still use all non-Nuppi rooms');
assert(source.includes('const keepTargetAwayFromNuppi = isMainHuntGhostId(realGhost);'), 'travel must distinguish real ghosts from generic Jerks');
assert(source.includes('&& !(keepTargetAwayFromNuppi && MUENBA_NUPPI_APPROACH_ROOMS.has(exit.to))'), 'real ghosts must remain away from the approach rooms while traveling');
assert(source.includes('pickGhostTravelExit(fromRoomId, g.ghost)'), 'wandering travel must carry the ghost role into the room filter');
assert(source.includes('pickGhostTeleportRoom(roomId, captureSession.ghost)'), 'danger dismissal must preserve the room safety rule');

const eligibleRooms = Object.keys(data.rooms).filter(roomId => roomId !== 'room_01' && !approachRooms.has(roomId));
assert(eligibleRooms.length >= (data.ghosts || []).length, 'there must be enough safe rooms for all real hunt targets');

console.log(`Muenba spawn audit passed: ${eligibleRooms.length} eligible target rooms; Nuppi approach rooms remain reserved.`);
