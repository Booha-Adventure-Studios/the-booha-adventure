#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');
const syncClient = fs.readFileSync(path.join(root, 'js', 'sync-client.js'), 'utf8');

assert(muenba.includes('function ensureWeeklyMuenba(data)'),
  'Muenba must have a dedicated occurrence-scoped state adapter');
assert(muenba.includes('function readMuenbaWeekly()'),
  'Muenba hunt reads must use the weekly world bucket');
assert(muenba.includes('weekly.ghostsFound[ghost.id] = true'),
  'weekly ghost captures must be recorded in the weekly world bucket');
assert(muenba.includes('weekly.orbsPending += rewardCount'),
  'pending weekly energy must be recorded in the weekly world bucket');
assert(muenba.includes('weekly.orbsPending = 0'),
  'pending weekly energy must clear from the weekly world bucket');
assert(muenba.includes('weekly.huntGhostOrder'),
  'Muenba hunt order must be stored in the weekly world bucket');
assert(muenba.includes('mu.ghostsFound[ghost.id] = true'),
  'lifetime ghost history must remain separate and permanent');
assert(muenba.includes('mu.rhythm.capturesCompleted += 1'),
  'lifetime rhythm progression must remain separate and permanent');
assert(saveFile.includes('data.muenba.orbsPending = 0'),
  'weekly reset must clear the legacy pending-energy compatibility field');
assert(saveFile.includes('data.muenba.caseProgress.activeCaseId = null'),
  'weekly reset must clear the legacy active-case compatibility field');
assert(syncClient.includes('w.worlds?.muenba?.ghostsFound'),
  'sync emptiness detection must recognize nested Muenba hunt progress');

console.log('Muenba weekly replay audit passed.');
