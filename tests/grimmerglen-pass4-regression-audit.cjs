#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(ROOT, 'js', 'grimmerglen.js'), 'utf8');
const profile = fs.readFileSync(path.join(ROOT, 'grimmerglen-profile.html'), 'utf8');
const saveFile = fs.readFileSync(path.join(ROOT, 'js', 'core', 'save-file.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(ROOT, 'verify.sh'), 'utf8');

for (const counter of ['cluesReturnedTotal', 'memoriesRestoredTotal', 'roomVisitsTotal', 'gardenVisitsTotal']) {
  assert(runtime.includes(counter), `runtime must retain ${counter}`);
  assert(saveFile.includes(counter), `save schema must retain ${counter}`);
}

assert(runtime.includes('data.grimmerglen.cluesReturnedTotal += 1'),
  'successful clue returns must remain counted');
assert(runtime.includes('data.grimmerglen.memoriesRestoredTotal += 1'),
  'completed memories must remain counted');
assert(runtime.includes('d.roomVisitsTotal += 1'),
  'room entries must remain counted');
assert(runtime.includes("state.spawnId === 'fromKarasuki'"),
  'garden visits must remain scoped to world entry');
assert(runtime.includes('d.gardenVisitsTotal += 1'),
  'garden entries must remain counted');

const statsStart = profile.indexOf('function renderStats()');
const statsEnd = profile.indexOf('function renderWeeklyProgress()', statsStart);
const stats = profile.slice(statsStart, statsEnd);
for (const label of [
  'Lifetime clues returned',
  'Lifetime memories restored',
  'Lifetime rooms explored',
  'Lifetime garden visits',
]) assert(stats.includes(label), `profile must retain ${label}`);
assert(!stats.includes(' / ${esc(item[1])}'), 'lifetime stats must stay denominator-free');
assert(!stats.includes('∞'), 'lifetime stats must stay finite plain counters');
assert(profile.includes('weekly-hunt-count">${found} / ${totalSlots}'),
  'weekly progress must remain separate from lifetime totals');

assert(runtime.includes('shadowBlur = 30 + twinkle * 12'),
  'the stronger arrow halo must remain present');
assert(runtime.includes('lineWidth = 4.8'),
  'the arrow directional core must remain present');
assert(saveFile.includes('worlds:            _defaultWeeklyWorlds()'),
  'weekly reset must continue to recreate transient world state');
assert(/pages:\s+'booha-pages-2026-402'/.test(serviceWorker),
  'the current profile page cache must remain active');
assert(/assets:\s+'booha-assets-2026-483'/.test(serviceWorker),
  'the current runtime asset cache must remain active');
assert(verify.includes('tests/grimmerglen-pass4-regression-audit.cjs'),
  'verify.sh must run the consolidated Grimmerglen regression audit');

console.log('Grimmerglen Pass 4 regression audit passed: counters, profile totals, weekly separation, arrow glow, and cache contracts are intact.');
