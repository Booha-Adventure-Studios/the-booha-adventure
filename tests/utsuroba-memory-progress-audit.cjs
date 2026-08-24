#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'utsuroba.js'), 'utf8');
const loader = fs.readFileSync(path.join(__dirname, '..', 'js', 'utsuroba-episodes.js'), 'utf8');
const profile = fs.readFileSync(path.join(__dirname, '..', 'utsuroba-profile.html'), 'utf8');
const modes = ['start', 'fresh', 'deep'];
const episodeRoot = path.join(__dirname, '..', 'content', 'utsuroba', 'episodes');

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

function englishWordCount(value) {
  let total = 0;
  const visit = item => {
    if (typeof item === 'string') {
      total += item.split(/\s+/).filter(Boolean).length;
    } else if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (item && typeof item === 'object') {
      Object.entries(item).forEach(([key, child]) => {
        if (!/JP$/.test(key)) visit(child);
      });
    }
  };
  visit(value);
  return total;
}

for (const filename of fs.readdirSync(episodeRoot).filter(name => name.endsWith('.json') && name !== 'index.json')) {
  const episode = JSON.parse(fs.readFileSync(path.join(episodeRoot, filename), 'utf8'));
  const deep = { ...episode };
  delete deep.start;
  delete deep.fresh;
  const counts = [englishWordCount(episode.start), englishWordCount(episode.fresh), englishWordCount(deep)];
  assert(counts[0] < counts[1] && counts[1] < counts[2],
    `${filename}: Starter, Case, and Deep English content must increase in scope`);
  assert(episode.fresh.checks[0].prompt.includes('clues'),
    `${filename}: Case order check should connect clues`);
  assert(episode.fresh.checks[2].prompt.includes('two clues'),
    `${filename}: Case explanation check should use two clues`);
  assert(!episode.start.checks[2].prompt.includes('two clues'),
    `${filename}: Starter explanation check should stay direct`);
  assert(/prove|choose the line/i.test(episode.checks[2].prompt),
    `${filename}: Deep explanation check should ask for evidence`);
}

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

console.log('Utsuroba memory progress audit passed: Starter/Case/Deep lanes remain independent and ordered.');
