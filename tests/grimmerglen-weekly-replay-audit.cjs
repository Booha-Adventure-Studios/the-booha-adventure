#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const grimmerglen = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');
const syncClient = fs.readFileSync(path.join(root, 'js', 'sync-client.js'), 'utf8');

assert(grimmerglen.includes('function ensureWeeklyGrimmerglen(data)'),
  'Grimmerglen must have a dedicated occurrence-scoped state adapter');
assert(grimmerglen.includes('function readGrimmerglenWeekly()'),
  'Grimmerglen live item reads must use the weekly world bucket');
assert(grimmerglen.includes('const stored = readGrimmerglenWeekly().objects || {};'),
  'live object progress must read weekly counts');
assert(grimmerglen.includes('const slots = readGrimmerglenWeekly().objectSlots;'),
  'live object availability must read weekly slots');
assert(grimmerglen.includes('weekly.objects = weeklyStored'),
  'successful pickups must update weekly object progress');
assert(grimmerglen.includes('weekly.objectSlots = weeklySlots'),
  'successful pickups must update weekly object slots');
assert(grimmerglen.includes('data.grimmerglen.objects = lifetimeStored'),
  'successful pickups must preserve lifetime object records');
assert(grimmerglen.includes('data.grimmerglen.objectSlots = lifetimeSlots'),
  'successful pickups must preserve lifetime slot records');
assert(grimmerglen.includes('readGrimmerglenWeekly().activeTargetType'),
  'active target selection must be weekly-scoped');
assert(grimmerglen.includes('readGrimmerglenWeekly().carriedObjectId'),
  'carried item state must be weekly-scoped');
assert(saveFile.includes('data.grimmerglen.activeTargetType = null'),
  'weekly reset must clear the legacy active-target compatibility field');
assert(saveFile.includes('data.grimmerglen.carriedObjectId = null'),
  'weekly reset must clear the legacy carried-item compatibility field');
assert(syncClient.includes('w.worlds?.grimmerglen?.objects'),
  'sync emptiness detection must recognize nested Grimmerglen item progress');

console.log('Grimmerglen weekly replay audit passed.');
