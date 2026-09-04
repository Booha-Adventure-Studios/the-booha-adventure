#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');
const profileSource = fs.readFileSync(path.join(__dirname, '..', 'muenba-profile.html'), 'utf8');
const MODES = ['start', 'fresh', 'deep'];

// Keep this audit intentionally small and data-shaped. It verifies the save-state
// contract that the browser code must preserve across old saves and new captures.
function migrateRecord(record) {
  const next = { ...record };
  if (!next.completedModes || typeof next.completedModes !== 'object') {
    const legacyMode = MODES.includes(next.difficulty) ? next.difficulty : 'fresh';
    next.completedModes = next.completed ? { [legacyMode]: true } : {};
  }
  for (const mode of Object.keys(next.completedModes)) {
    if (!MODES.includes(mode) || next.completedModes[mode] !== true) delete next.completedModes[mode];
  }
  next.completed = MODES.every(mode => next.completedModes[mode] === true);
  return next;
}

function completeMode(record, mode) {
  const next = migrateRecord(record);
  next.completedModes[mode] = true;
  next.completed = MODES.every(memoryMode => next.completedModes[memoryMode] === true);
  next.difficulty = mode;
  return next;
}

function isComplete(record, mode) {
  return record.completedModes?.[mode] === true;
}

function nextCase(caseIds, records, mode) {
  return caseIds.find(caseId => !isComplete(records[caseId] || {}, mode)) || null;
}

function targetGhost(caseOrder, records, mode) {
  const next = caseOrder.find(caseData => !isComplete(records[caseData.id] || {}, mode));
  return next && next.ghostId;
}

function availableGhostIds(ghostIds, weeklyFound, targetId) {
  return ghostIds.filter(ghostId => ghostId === targetId || !weeklyFound[ghostId]);
}

function rewardForCapture({ caseMode, completedModes = {}, weeklyFound }) {
  const caseModeAlreadyComplete = !!(caseMode && completedModes[caseMode] === true);
  const isNewWeeklyCapture = !weeklyFound;
  return caseMode && !caseModeAlreadyComplete ? 3 : (isNewWeeklyCapture ? 3 : 0);
}

function profileRecord(caseId, caseRecords, legacyCompletedIds) {
  const record = caseRecords[caseId] && typeof caseRecords[caseId] === 'object' ? caseRecords[caseId] : {};
  return !record.completedModes && legacyCompletedIds.includes(caseId)
    ? { ...record, completed: false, completedModes: { fresh: true }, difficulty: 'fresh' }
    : record;
}

assert(source.includes("const MUENBA_CASE_MODES = ['start', 'fresh', 'deep'];"), 'source must define all three memory modes');
assert(source.includes('completedModes'), 'source must persist per-mode completion');
assert(source.includes('caseModeIsComplete'), 'source must check completion for the selected mode');
assert(source.includes('const availableGhosts = tierNeedsSelection'), 'a completed selected tier must not expose case-less ghosts while another tier remains');
assert(source.includes('function activeMuenbaCaseGhost()'), 'selected-mode target ghost should have an explicit helper');
assert(source.includes('ghost.id === (activeCaseGhost && activeCaseGhost.id) || !weeklyFound || !weeklyFound[ghost.id]'), 'weekly availability must preserve an unfinished case target');
assert(source.includes('previousRecord.completed === true && MUENBA_CASE_MODES.includes(previousRecord.difficulty)'), 'legacy mode completion must survive a new mode capture');
assert(source.includes('Object.keys(record.completedModes).forEach'), 'migration must clean invalid per-mode values');
assert(profileSource.includes('const recordForCase = caseData =>'), 'profile should normalize legacy case progress before rendering');
assert(profileSource.includes('Starter Memory'), 'Muenba should use the neutral Starter Memory label');
assert(profileSource.includes('Case Memory'), 'Muenba should use the middle Case Memory label');
assert(source.includes("start: 'Starter Memory'"), 'case popup should use the Starter Memory label');
assert(source.includes("fresh: 'Case Memory'"), 'case popup should use the Case Memory label');
assert(source.includes('id="muenba-case-board-mode"'), 'Nuppi case board should show the selected reading level');
assert(profileSource.includes("memoryModeLabel(entry.caseDifficulty || 'fresh')"), 'journal should show player-facing memory labels');
assert(source.includes('const caseModeAlreadyComplete = !!('), 'capture commits must know whether this memory lane is already complete');
assert(source.includes('const rewardCount = caseMode && !caseModeAlreadyComplete'), 'unfinished memory lanes must receive energy even after the weekly ghost flag is set');
assert(source.includes('if (rewardCount <= 0)'), 'zero-orb captures must not create a fake Nuppi handoff');
assert(source.includes('const pending = Number.isInteger(weekly.orbsPending) ? weekly.orbsPending : 0;'), 'Nuppi handoff must read the durable pending-orb count');
assert(source.includes('weekly.orbsPending = 0;'), 'Nuppi handoff must clear pending orbs during the saved deposit');

const legacy = migrateRecord({ completed: true, difficulty: 'fresh' });
assert.deepStrictEqual(legacy.completedModes, { fresh: true }, 'legacy completed records should migrate to their recorded mode');
assert.strictEqual(legacy.completed, false, 'one completed mode must not mark the whole case complete');
const legacyProfileRecord = profileRecord('case_01', {}, ['case_01']);
assert.deepStrictEqual(legacyProfileRecord.completedModes, { fresh: true }, 'profile should render legacy case IDs as Fresh Memory only');
assert.strictEqual(legacyProfileRecord.completed, false, 'legacy profile progress must not appear fully complete');

const invalidModes = migrateRecord({ completed: true, completedModes: { fresh: true, bogus: true, deep: 'yes' } });
assert.deepStrictEqual(invalidModes.completedModes, { fresh: true }, 'invalid mode keys and values must be discarded');
assert.strictEqual(invalidModes.completed, false, 'invalid mode data must not complete a case');

let record = completeMode({ completed: false, completedModes: {} }, 'start');
assert.strictEqual(isComplete(record, 'start'), true, 'Start Memory should be recorded');
assert.strictEqual(record.completed, false, 'unfinished memory modes should keep the case active');
assert.strictEqual(nextCase(['case_01'], { case_01: record }, 'fresh'), 'case_01', 'the same case should return for unfinished Fresh Memory');
const caseOrder = [{ id: 'case_01', ghostId: 'twiddle' }, { id: 'case_02', ghostId: 'fuzzle' }];
const weeklyFound = { twiddle: true };
assert.strictEqual(targetGhost(caseOrder, { case_01: record }, 'fresh'), 'twiddle', 'Fresh should keep the same target case when it is unfinished');
assert.ok(availableGhostIds(['twiddle', 'fuzzle'], weeklyFound, 'twiddle').includes('twiddle'), 'the unfinished target must return after weekly energy capture');

record = completeMode(record, 'fresh');
assert.strictEqual(record.completed, false, 'Deep Memory should still be required');
assert.strictEqual(nextCase(['case_01'], { case_01: record }, 'deep'), 'case_01', 'the same case should return for unfinished Deep Memory');

assert.strictEqual(rewardForCapture({ caseMode: 'fresh', completedModes: { start: true }, weeklyFound: true }), 3, 'an unfinished Case lane should create new energy after the ghost was captured this week');
assert.strictEqual(rewardForCapture({ caseMode: 'deep', completedModes: { start: true, fresh: true }, weeklyFound: true }), 3, 'an unfinished Deep lane should create new energy after the ghost was captured this week');
assert.strictEqual(rewardForCapture({ caseMode: 'fresh', completedModes: { fresh: true }, weeklyFound: true }), 0, 'an already-complete memory lane must not duplicate energy');

record = completeMode(record, 'deep');
assert.strictEqual(record.completed, true, 'all three modes should complete the case');
assert.strictEqual(nextCase(['case_01', 'case_02'], { case_01: record }, 'start'), 'case_02', 'a fully completed case should advance normally');

console.log('Muenba memory progress audit passed: legacy migration, per-mode replay, and case advancement.');
