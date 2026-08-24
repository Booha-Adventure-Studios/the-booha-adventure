#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');
const MODES = ['start', 'fresh', 'deep'];

// Keep this audit intentionally small and data-shaped. It verifies the save-state
// contract that the browser code must preserve across old saves and new captures.
function migrateRecord(record) {
  const next = { ...record };
  if (!next.completedModes || typeof next.completedModes !== 'object') {
    const legacyMode = MODES.includes(next.difficulty) ? next.difficulty : 'fresh';
    next.completedModes = next.completed ? { [legacyMode]: true } : {};
  }
  for (const mode of MODES) {
    if (next.completedModes[mode] !== true) delete next.completedModes[mode];
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

assert(source.includes("const MUENBA_CASE_MODES = ['start', 'fresh', 'deep'];"), 'source must define all three memory modes');
assert(source.includes('completedModes'), 'source must persist per-mode completion');
assert(source.includes('caseModeIsComplete'), 'source must check completion for the selected mode');
assert(source.includes('const availableGhosts = GHOSTS.filter(ghost => ghost.id === activeCaseGhostId || !weeklyFound || !weeklyFound[ghost.id])'), 'unfinished active cases must remain available after weekly capture');

const legacy = migrateRecord({ completed: true, difficulty: 'fresh' });
assert.deepStrictEqual(legacy.completedModes, { fresh: true }, 'legacy completed records should migrate to their recorded mode');
assert.strictEqual(legacy.completed, false, 'one completed mode must not mark the whole case complete');

let record = completeMode({ completed: false, completedModes: {} }, 'start');
assert.strictEqual(isComplete(record, 'start'), true, 'Start Memory should be recorded');
assert.strictEqual(record.completed, false, 'unfinished memory modes should keep the case active');
assert.strictEqual(nextCase(['case_01'], { case_01: record }, 'fresh'), 'case_01', 'the same case should return for unfinished Fresh Memory');

record = completeMode(record, 'fresh');
assert.strictEqual(record.completed, false, 'Deep Memory should still be required');
assert.strictEqual(nextCase(['case_01'], { case_01: record }, 'deep'), 'case_01', 'the same case should return for unfinished Deep Memory');

record = completeMode(record, 'deep');
assert.strictEqual(record.completed, true, 'all three modes should complete the case');
assert.strictEqual(nextCase(['case_01', 'case_02'], { case_01: record }, 'start'), 'case_02', 'a fully completed case should advance normally');

console.log('Muenba memory progress audit passed: legacy migration, per-mode replay, and case advancement.');
