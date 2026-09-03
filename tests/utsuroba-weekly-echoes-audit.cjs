#!/usr/bin/env node
'use strict';

// Weekly ECHOES audit: world-facing completion must be occurrence/tier scoped,
// while the permanent reading archive remains untouched.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/utsuroba.js'), 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

const ever = between('function drifterRestoredEver(', 'function drifterRestoredThisWeek(');
assert(ever.includes('readingEchoes'), 'lifetime ECHOES helper must read permanent readingEchoes');

const weekly = between('function drifterRestoredThisWeek(', 'function drifterMemoryRestored(');
assert(weekly.includes('statusByMode'), 'weekly ECHOES helper must inspect per-tier status');
assert(weekly.includes('completedModes'), 'weekly ECHOES helper must support migrated completed memory records');

const tracker = between('function renderEchoesTracker(', 'function allReadingMemoriesRestored(');
assert(tracker.includes('drifterRestoredThisWeek'), 'ECHOES tile must use weekly completion');
assert(!tracker.includes('restored[d.episodeId]'), 'ECHOES tile must not use lifetime completion directly');

const weeklyGate = between('function allRequiredEchoesRestoredThisWeek(', 'function closeMemoryConvergence(');
assert(weeklyGate.includes('requiredDrifterIds'), 'weekly convergence gate must use authored required drifter IDs');
assert(weeklyGate.includes('drifterRestoredThisWeek'), 'weekly convergence gate must use weekly completion');

const progress = between('function weeklyReadingChallengeProgress(', 'function recordWeeklyReadingEvent(');
assert(progress.includes('drifterRestoredThisWeek'), 'weekly reading trail must count weekly drifter completion');
assert(!progress.includes('Object.keys(bundle.data.utsuroba?.readingEchoes'), 'weekly reading trail must not count lifetime readingEchoes');

const shimmer = between('function drawRestoredRoomShimmer(', 'function drawFrame(');
assert(shimmer.includes('drifterRestoredThisWeek'), 'room shimmer must use weekly completion');

const reset = between('function handleUtsurobaWeeklyReset(', 'function readingJournalEntries(');
assert(reset.includes('invalidateDrifterStateCache()'), 'weekly reset must invalidate weekly drifter cache');
assert(reset.includes('invalidateQuestCache()'), 'weekly reset must invalidate active quest cache');
assert(reset.includes('lastLitEchoIds = null'), 'weekly reset must clear ECHOES animation baseline');
assert(reset.includes('refreshMemoryEchoes()'), 'weekly reset must refresh room echo visuals');

console.log('Utsuroba weekly ECHOES audit passed: lifetime archive data is preserved while tile, gate, trail, shimmer, and rollover refresh use the selected weekly tier.');
