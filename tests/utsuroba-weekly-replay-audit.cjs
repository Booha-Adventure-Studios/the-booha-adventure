#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const utsuroba = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const syncClient = fs.readFileSync(path.join(root, 'js', 'sync-client.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');

assert(utsuroba.includes('function ensureWeeklyUtsuroba(data)'),
  'Utsuroba must have a dedicated occurrence-scoped state adapter');
assert(utsuroba.includes('function weeklyDrifterRecord(id, data = null, create = false)'),
  'Utsuroba drifter replay state must be keyed inside the weekly world bucket');
assert(utsuroba.includes('weeklyRecord.statusByMode[normalizedMode] = status'),
  'Utsuroba weekly status must be written to the weekly record');
assert(utsuroba.includes('weeklyRecord.completedModes[mode].push(memIdx)'),
  'Utsuroba weekly memory completion must be recorded separately from lifetime completion');
assert(utsuroba.includes('weeklyDrifterRecord(id, data, true).wrong = true'),
  'Utsuroba wrong-answer lockouts must reset with the weekly drifter record');
assert(utsuroba.includes('world.drifterQuest = null'),
  'Utsuroba quest clearing must clear the occurrence-scoped quest');
assert(utsuroba.includes('world.readingChallenge = state'),
  'Utsuroba reading challenge progress must use the occurrence-scoped bucket');
assert(!/data\.weekly\.drifterQuest\s*=\s*\{/.test(utsuroba),
  'Utsuroba must not create new quests in the legacy top-level weekly bucket');
assert(!/data\.weekly\.drifterQuest\s*=\s*null/.test(utsuroba),
  'Utsuroba must not clear only the legacy top-level quest bucket');

assert(karasuki.includes('weeklyUtsurobaState(data)'),
  'Karasuki must read and update the shared weekly Utsuroba quest bucket');
assert(karasuki.includes('weeklyUtsurobaState(data).drifterQuest = null'),
  'Karasuki quest clearing must clear the shared occurrence-scoped quest');
assert(syncClient.includes('w.worlds?.utsuroba?.drifterQuest'),
  'Sync emptiness detection must recognize an active nested Utsuroba quest');
assert(saveFile.includes('worlds:') && saveFile.includes('_defaultWeeklyWorlds()'),
  'weekly reset must recreate the world replay buckets');

console.log('Utsuroba weekly replay audit passed.');
