#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(ROOT, 'grimmerglen-profile.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(ROOT, 'verify.sh'), 'utf8');

const statsStart = profile.indexOf('function renderStats()');
const statsEnd = profile.indexOf('function renderWeeklyProgress()', statsStart);
assert(statsStart >= 0 && statsEnd > statsStart, 'profile must expose an isolated lifetime stats renderer');
const stats = profile.slice(statsStart, statsEnd);

for (const counter of ['cluesReturnedTotal', 'memoriesRestoredTotal', 'roomVisitsTotal', 'gardenVisitsTotal']) {
  assert(stats.includes(`lifetimeTotal('${counter}')`), `${counter} must feed the lifetime profile card`);
}
assert(stats.includes('Lifetime memories restored'), 'profile must call completed memories restored');
assert(!stats.includes('Lifetime memories held'), 'profile must remove the ambiguous memories held label');
assert(!stats.includes(' / ${esc(item[1])}'), 'lifetime stat cards must not render a denominator');
assert(!stats.includes('∞'), 'lifetime stat cards must not render infinity');
assert(profile.includes('weekly-hunt-count">${found} / ${totalSlots}'),
  'weekly progress must keep its current-week denominator');
assert(/pages:\s+'booha-pages-2026-405'/.test(serviceWorker),
  'page cache must be bumped for the profile markup update');
assert(verify.includes('tests/grimmerglen-profile-counters-audit.cjs'),
  'verify.sh must run the Grimmerglen profile-counter audit');

console.log('Grimmerglen profile counter audit passed: lifetime cards are plain running totals and weekly progress remains scoped.');
