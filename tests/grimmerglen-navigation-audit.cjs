#!/usr/bin/env node
'use strict';

// Grimmerglen navigation audit. The room data is a rectangular grid, so this
// protects both the boundary behavior (no phantom arrows) and the reciprocal
// links between neighboring rooms.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { filename: 'grimmerglen-data.js' });
const data = sandbox.window.GRIMMERGLEN_DATA;

const expected = {};
for (let row = 0; row < 5; row++) {
  for (let column = 0; column < 3; column++) {
    const number = row * 3 + column + 1;
    const roomId = `room_${String(number).padStart(2, '0')}`;
    const exits = {};
    if (row > 0) exits.down = `room_${String(number - 3).padStart(2, '0')}`;
    if (row < 4) exits.up = `room_${String(number + 3).padStart(2, '0')}`;
    if (column > 0) exits.left = `room_${String(number - 1).padStart(2, '0')}`;
    if (column < 2) exits.right = `room_${String(number + 1).padStart(2, '0')}`;
    expected[roomId] = exits;
  }
}

const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
for (const [roomId, expectedExits] of Object.entries(expected)) {
  const actualExits = {};
  for (const exit of data.rooms[roomId].exits || []) {
    assert(!actualExits[exit.dir], `${roomId} must not duplicate its ${exit.dir} exit`);
    actualExits[exit.dir] = exit.to;
  }
  assert.deepStrictEqual(actualExits, expectedExits, `${roomId} must expose only its neighboring rooms`);
  for (const [direction, targetRoom] of Object.entries(expectedExits)) {
    const targetExits = data.rooms[targetRoom].exits || [];
    assert(targetExits.some(exit => exit.dir === opposite[direction] && exit.to === roomId),
      `${roomId} ${direction} link to ${targetRoom} must be reciprocal`);
  }
}

assert(runtimeSource.includes("const MARIETTA_RETURN_PORTAL = { roomId: 'room_01'"),
  'the Karasuki return exit must be anchored in room_01');
assert(runtimeSource.includes('function drawExitArrows(now)'), 'runtime must render room arrows from room data');
const drawArrows = runtimeSource.slice(runtimeSource.indexOf('function drawExitArrows('), runtimeSource.indexOf('function drawReturnPortal('));
assert(drawArrows.includes('if (!state.navigationUnlocked) return;'),
  'room arrows must remain hidden until help is accepted');
assert(drawArrows.includes('const reveal = 1;'),
  'room arrows must appear immediately after navigation unlocks');

const inputStart = runtimeSource.indexOf('function handleInput(');
const inputEnd = runtimeSource.indexOf('function bindInput(', inputStart);
const input = runtimeSource.slice(inputStart, inputEnd);
assert(!input.includes('if (state.entryWelcomePending) return;'),
  'Booha must remain free to move in room_01 before help');

const acceptStart = runtimeSource.indexOf('function acceptMariettaHelp(');
const acceptEnd = runtimeSource.indexOf('function continueAfterMariettaHelp(', acceptStart);
const accept = runtimeSource.slice(acceptStart, acceptEnd);
assert(accept.includes('unlockGrimmerglenNavigation();'),
  'accepting Marietta help must reveal room navigation immediately');

console.log('Grimmerglen navigation audit passed: all grid links are reciprocal, boundary arrows are absent, room_01 remains walkable, and the Karasuki exit is isolated to room_01.');
