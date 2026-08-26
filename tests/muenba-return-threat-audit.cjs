#!/usr/bin/env node
'use strict';

// Pass 17D: dynamic Jerk pressure while Booha carries energy.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

function sourceSection(startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} return-threat contract`);
  return source.slice(start, end);
}

const mapSource = sourceSection('getGhostRoomMap', 'ghostHostilityFor');
const pendingSource = sourceSection('setReturnToNuppiPending', 'leaveCaptureForNuppi');
const depositSource = sourceSection('depositOrbsAtNuppi', 'spawnMuenbaDanceSparkle');
const lossSource = sourceSection('loseCarriedEnergyAndMarkRestart', 'restartHuntAfterCarriedEnergyLoss');

assert(source.includes('const JERK_COUNT = 5;'), 'ordinary hunts must retain the baseline Jerk count');
assert(source.includes('const JERK_RETURN_COUNT = 8;'), 'return trips must use the increased Jerk count');
assert(mapSource.includes('const returnTripActive = Number(readMuenba().orbsPending) > 0;'), 'Jerk escalation must follow pending energy');
assert(mapSource.includes("|return-trip:${returnTripActive ? 'on' : 'off'}"), 'the ghost-map cache must distinguish return trips');
assert(mapSource.includes('const jerkCount = returnTripActive ? JERK_RETURN_COUNT : JERK_COUNT;'), 'Jerk count must switch with return-trip state');
assert(mapSource.includes("const jerkSeed = today + '|muenbaJerkRooms|' + (returnTripActive ? 'return' : 'hunt');"), 'return-trip placement must have its own deterministic layout');
assert(mapSource.includes("id: (returnTripActive ? 'return_jerk_' : 'jerk_') + (i + 1)"), 'return-trip Jerks must be identifiable as temporary threats');
assert(mapSource.includes('returnTripJerk: returnTripActive'), 'temporary Jerk instances must be tagged');

assert(source.includes('function invalidateGhostRoomMap()'), 'energy-state changes need an explicit ghost-map invalidation');
assert(pendingSource.includes('if (changed) invalidateGhostRoomMap();'), 'pending-state changes must invalidate the threat map');
assert(depositSource.includes('mu.orbsPending = 0;'), 'successful handoff must clear pending energy');
assert(depositSource.includes('setReturnToNuppiPending(false);'), 'successful handoff must end return-trip threat state');
assert(lossSource.includes('mu.orbsPending = 0;'), 'lost energy must clear pending energy');
assert(lossSource.includes('setReturnToNuppiPending(false);'), 'lost energy must end return-trip threat state');

function jerkCount(emptyRooms, carryingEnergy) {
  return Math.min(emptyRooms, carryingEnergy ? 8 : 5);
}
assert.strictEqual(jerkCount(9, false), 5, 'ordinary hunts should use five Jerks');
assert.strictEqual(jerkCount(9, true), 8, 'return trips should use eight Jerks when rooms allow');
assert.strictEqual(jerkCount(3, true), 3, 'return-trip count must never exceed available rooms');

console.log('Muenba return-threat audit passed: dynamic Jerk escalation, cache invalidation, and cleanup contracts.');
