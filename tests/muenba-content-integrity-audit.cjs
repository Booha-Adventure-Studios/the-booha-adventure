#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'muenba-data.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'muenba-profile.html'), 'utf8');
const context = { window: {} };
vm.runInNewContext(dataSource, context, { filename: 'muenba-data.js' });
const data = context.window.MUENBA_DATA;

assert(data && typeof data === 'object', 'Muenba data export must be available');
assert(data.rooms && Object.keys(data.rooms).length === 15, 'Muenba must expose all 15 rooms');
assert(Array.isArray(data.ghosts) && data.ghosts.length > 0, 'Muenba must expose hunt ghosts');
assert(data.cases && typeof data.cases === 'object', 'Muenba must expose authored cases');
assert(Array.isArray(data.caseOrder) && data.caseOrder.length === data.ghosts.length, 'case order and hunt roster must stay one-to-one');

function assertAsset(relativePath, label) {
  assert.strictEqual(typeof relativePath, 'string', `${label} must be a path`);
  assert(fs.existsSync(path.join(root, relativePath)), `${label} is missing: ${relativePath}`);
}

const ghostIds = new Set(data.ghosts.map(ghost => ghost.id));
const caseGhostIds = new Set();
for (const roomId of Object.keys(data.rooms)) {
  assertAsset(data.rooms[roomId].bg, `${roomId} background`);
  for (const exit of data.rooms[roomId].exits || []) {
    assert(data.rooms[exit.to], `${roomId} must point to an existing destination`);
    assert(data.rooms[roomId].spawns?.[exit.spawn], `${roomId} must define ${exit.spawn}`);
  }
}

for (const ghost of data.ghosts) {
  assert(!caseGhostIds.has(ghost.id), `multiple cases must not target ${ghost.id}`);
  assertAsset(ghost.img, `${ghost.id} portrait`);
  const caseData = data.cases[data.caseOrder.find(caseId => data.cases[caseId]?.ghostId === ghost.id)];
  assert(caseData, `${ghost.id} must have an authored case`);
  caseGhostIds.add(ghost.id);
}
assert.deepStrictEqual([...caseGhostIds].sort(), [...ghostIds].sort(), 'every hunt ghost must have exactly one case');
assertAsset(data.jerk.img, 'Jerk portrait');
assertAsset(data.ghostAngryChangeImg, 'angry ghost portrait');

const assetRefs = new Set();
for (const match of runtime.matchAll(/['"](assets\/img\/muenba\/[^'"]+)['"]/g)) assetRefs.add(match[1]);
for (const asset of assetRefs) assertAsset(asset, 'runtime Muenba asset');

const tierStart = runtime.indexOf('const RHYTHM_DIFFICULTY_TIERS');
const tierEnd = runtime.indexOf('const params = new URLSearchParams', tierStart);
assert(tierStart >= 0 && tierEnd > tierStart, 'rhythm difficulty tiers must remain discoverable');
const tiers = runtime.slice(tierStart, tierEnd);
const thresholds = [...tiers.matchAll(/minCaptures:\s*(\d+)/g)].map(match => Number(match[1]));
const bpms = [...tiers.matchAll(/\n\s+bpm:\s*(\d+)/g)].map(match => Number(match[1]));
assert(thresholds.length >= 3, 'rhythm progression must define multiple tiers');
assert.strictEqual(thresholds[0], 0, 'rhythm progression must begin at zero captures');
assert(thresholds.every((value, index) => index === 0 || value > thresholds[index - 1]), 'rhythm tier thresholds must increase');
assert(bpms.every((value, index) => index === 0 || value > bpms[index - 1]), 'normal rhythm BPM must increase with tier');
assert(tiers.includes("lanes: ['don', 'kat', 'rim']") && tiers.includes("lanes: ['don', 'kat', 'rim', 'bell']"), 'later tiers must add the authored extra lanes');

assert(runtime.includes('validateData();') && runtime.includes('validateCaseData();'), 'Muenba startup must run room and case validation');
assert(runtime.includes('DATA.cases && typeof DATA.cases === \'object\''), 'live runtime must consume the shared case data export');
assert(profile.includes('window.MUENBA_DATA?.caseOrder'), 'profile must consume the shared authored case order');
for (const label of ['Starter Memory', 'Case Memory', 'Deep Memory']) {
  assert(profile.includes(label), `profile must expose ${label}`);
}

console.log(`Muenba content integrity audit passed: ${Object.keys(data.rooms).length} rooms, ${data.ghosts.length} ghosts, ${data.caseOrder.length} cases, and ${thresholds.length} rhythm tiers resolve.`);
