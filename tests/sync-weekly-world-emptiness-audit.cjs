#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const syncClient = fs.readFileSync(path.join(root, 'js', 'sync-client.js'), 'utf8');

assert(syncClient.includes('const hasEntries = value =>'),
  'sync must use a schema-safe object-entry check');
assert(syncClient.includes('const hasItems = value =>'),
  'sync must keep array-entry checks separate from object-entry checks');
assert(syncClient.includes('w.worlds?.muenba?.activeCaseId'),
  'sync must preserve an in-progress weekly Muenba case');
assert(syncClient.includes('w.worlds?.muenba?.activeHuntGhostId'),
  'sync must preserve an in-progress weekly Muenba hunt target');
assert(syncClient.includes('hasEntries(d.collection.wanderers) || hasItems(d.collection.wanderers)'),
  'sync must recognize the configured object-shaped wanderer collection');
assert(syncClient.includes('const utsuroba = d.utsuroba || {}'),
  'sync must recognize permanent Utsuroba records after weekly reset');
assert(syncClient.includes('const muenba = d.muenba || {}'),
  'sync must recognize permanent Muenba records after weekly reset');
assert(syncClient.includes('const grimmerglen = d.grimmerglen || {}'),
  'sync must recognize permanent Grimmerglen records after weekly reset');
assert(syncClient.includes('Number(utsuroba.memoriesRestoredTotal) > 0'),
  'sync must preserve Utsuroba lifetime totals');
assert(syncClient.includes('Number(muenba.orbsCollected) > 0'),
  'sync must preserve Muenba lifetime totals');
assert(syncClient.includes('hasEntries(grimmerglen.objects)'),
  'sync must preserve Grimmerglen lifetime object records');

console.log('Sync weekly-world emptiness audit passed: active weekly work and permanent world records remain sync-visible.');
