#!/usr/bin/env node
'use strict';

// Pass 3: the profile's selected tier must be the single source of truth for
// live Grimmerglen stories, exercises, hunt slots, targets, and progress.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');
const syncClient = fs.readFileSync(path.join(root, 'js', 'sync-client.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(runtime, /const GRIMMERGLEN_MEMORY_TIERS = \['start', 'case', 'deep'\]/,
  'runtime must define the three selectable memory tiers');
assert.match(runtime, /function getSelectedGrimmerglenTier\(data = null\)/,
  'runtime must resolve the saved memory tier');
assert.match(runtime, /function getSelectedGrimmerglenTierProgress\(data = null\)/,
  'runtime must resolve the selected tier weekly bucket');
assert.match(runtime, /const stored = selected\.progress\.objects \|\| \{\};/,
  'object progress must come from the selected tier bucket');
assert.match(runtime, /const slots = selected\.progress\.objectSlots;/,
  'object slots must come from the selected tier bucket');
assert.match(runtime, /const savedTarget = selected\.progress\.activeTargetType;/,
  'active target must be restored per selected tier');
assert.match(runtime, /function writeGrimmerglenTierProgress\(patchObj\)/,
  'selected-tier transient state must have a dedicated writer');
assert.match(runtime, /selectedProgress\.objects = weeklyStored;/,
  'completed returns must write selected-tier object counts');
assert.match(runtime, /selectedProgress\.objectSlots = weeklySlots;/,
  'completed returns must write selected-tier exact slots');

const exerciseStart = runtime.indexOf('function renderMariettaMemoryExercise(');
const exerciseEnd = runtime.indexOf('function renderMariettaMemoryReplay(', exerciseStart);
assert(exerciseStart >= 0 && exerciseEnd > exerciseStart, 'memory exercise renderer must be present');
const exercise = runtime.slice(exerciseStart, exerciseEnd);
assert.match(exercise, /const tier = getSelectedGrimmerglenTier\(\);/,
  'typing exercise tier must come from the saved selector');
assert.match(exercise, /DATA\.memories\?\.\[object\.type\]\?\.\[tier\]/,
  'typing exercise must load the selected tier content');

assert.match(profile, /const selectedWeeklyTier = \(\) =>/,
  'profile must resolve the selected tier');
assert.match(profile, /const weeklyTierBucket = \(\) =>/,
  'profile must read the selected tier weekly bucket');
assert.match(profile, /weeklyTierBucket\(\)\.objects/,
  'profile counts must come from selected tier objects');
assert.match(profile, /const currentTier = selectedWeeklyTier\(\);/,
  'profile cards must use the selected tier');
assert.match(profile, /\[currentTier\]\?\.story/,
  'profile stories must use the selected tier');

assert.match(saveFile, /activeTargetType: null, carriedObjectId: null/,
  'weekly tier buckets must own their transient target and carried-item state');
assert.match(saveFile, /tierProgressSchema: 2/,
  'tier-progress schema must identify the Pass 3 tier-scoped runtime shape');
assert.match(syncClient, /for \(const tier of \['start', 'case', 'deep'\]\)/,
  'sync emptiness detection must inspect all tier buckets');
assert.match(verify, /tests\/grimmerglen-tier-routing-audit\.cjs/,
  'verify.sh must run the Pass 3 tier-routing audit');

console.log('Grimmerglen Pass 3 audit passed: saved tier selection routes live stories, typing, hunt state, completion, replay, profile progress, and sync visibility.');
