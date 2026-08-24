#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'utsuroba.js'), 'utf8');
const loader = fs.readFileSync(path.join(__dirname, '..', 'js', 'utsuroba-episodes.js'), 'utf8');
const profile = fs.readFileSync(path.join(__dirname, '..', 'utsuroba-profile.html'), 'utf8');
const modes = ['start', 'fresh', 'deep'];

assert(source.includes("const UTSUROBA_MEMORY_MODES = ['start', 'fresh', 'deep'];"), 'Utsuroba must define all three memory modes');
assert(source.includes('completedModes'), 'Utsuroba must persist completion by reading mode');
assert(source.includes('weeklyStatusByMode'), 'weekly completion must be scoped to the reading mode');
assert(source.includes('readingDifficulty: mode'), 'quests must remember the selected reading mode');
assert(loader.includes("const READING_MODES = ['start', 'fresh', 'deep'];"), 'episode loader must resolve Start Memory');
assert(loader.includes('episode[difficulty]'), 'episode loader must resolve tier-specific content');
assert(loader.includes("return READING_MODES.includes(value) ? value : 'start';"), 'new Utsuroba saves should default to Starter Memory');
assert(source.includes("data.utsuroba.readingDifficulty = 'start';"), 'save migration should default an unselected mode to Starter Memory');
assert(profile.includes('Starter Memory'), 'Utsuroba profile should show the Starter Memory label');
assert(profile.includes('Case Memory'), 'Utsuroba profile should show the Case Memory label');
assert(profile.includes('memoryModeLabel(entry.difficulty || \'start\')'), 'Utsuroba journal should show the player-facing mode label');

function migrate(record, legacyMode = 'deep') {
  const next = { ...record, completed: Array.isArray(record.completed) ? record.completed.slice() : [] };
  if (!next.completedModes || typeof next.completedModes !== 'object') {
    next.completedModes = next.completed.length ? { [legacyMode]: next.completed.slice() } : {};
  }
  return next;
}

function complete(record, mode) {
  const next = migrate(record);
  next.completedModes[mode] = [1];
  return next;
}

function modeComplete(record, mode) {
  return Array.isArray(record.completedModes?.[mode]) && record.completedModes[mode].includes(1);
}

let record = migrate({ completed: [1] }, 'deep');
assert.strictEqual(modeComplete(record, 'deep'), true, 'legacy completed memories should migrate to Deep Memory');
assert.strictEqual(modeComplete(record, 'start'), false, 'legacy migration must not falsely complete Start Memory');

record = complete({ completed: [] }, 'start');
assert.strictEqual(modeComplete(record, 'start'), true, 'Start Memory should complete its own lane');
assert.strictEqual(modeComplete(record, 'fresh'), false, 'Start Memory must leave Fresh Memory open');
assert.strictEqual(modeComplete(record, 'deep'), false, 'Start Memory must leave Deep Memory open');

record = complete(record, 'fresh');
assert.strictEqual(modeComplete(record, 'deep'), false, 'Fresh Memory must leave Deep Memory open');
record = complete(record, 'deep');
assert.ok(modes.every(mode => modeComplete(record, mode)), 'all three modes should be independently completable');

console.log('Utsuroba memory progress audit passed: Start/Fresh/Deep lanes remain independent.');
