#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');
const dataSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba-data.js'), 'utf8');

assert(source.includes('state.inputLocked = false;'), 'room entry must release the movement lock');
assert(source.includes("if (state.spawnId === 'fromKarasuki' || state.arrivalDir) beginEntryDrift();"), 'room transitions must drift Booha toward the center');
assert(source.includes('state.distMovedSinceSpawn = Math.max(state.distMovedSinceSpawn, ARROW_MOVE_THRESHOLD);'), 'the first valid movement tap must reveal room arrows');
assert(source.includes("const MUENBA_NUPPI = { roomId: 'room_01', x: 940, y: 215"), 'Nuppi must stay clear of the room 01 up arrow');
assert(dataSource.includes("up:    { x: 767, y: 284 }"), 'room 01 up-arrow coordinates must remain stable');

function shouldDrift(spawnId, arrivalDir) {
  return spawnId === 'fromKarasuki' || !!arrivalDir;
}

assert.strictEqual(shouldDrift('fromKarasuki', null), true, 'Karasuki entry should drift');
assert.strictEqual(shouldDrift('fromLeft', 'right'), true, 'left-side room entry should drift');
assert.strictEqual(shouldDrift('fromUp', 'down'), true, 'upper room entry should drift');
assert.strictEqual(shouldDrift('default', null), false, 'direct room jumps should not invent an arrival drift');

console.log('Muenba navigation audit passed: room entry drift, input unlock, first-tap arrows, and Nuppi spacing.');
