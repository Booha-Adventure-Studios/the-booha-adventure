#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const profile = fs.readFileSync(path.join(__dirname, '..', 'muenba-profile.html'), 'utf8');
const statsStart = profile.indexOf('<section class="stats"');
const statsEnd = profile.indexOf('</section>', statsStart);
assert(statsStart >= 0 && statsEnd > statsStart, 'Muenba lifetime stats section must remain present');
const stats = profile.slice(statsStart, statsEnd);

for (const label of ['Captures', 'Orbs', 'Cases', 'Rooms']) {
  assert(stats.includes(`>${label}</div>`), `lifetime stats must retain the short ${label} label`);
}
for (const oldLabel of ['Lifetime captures', 'Lifetime orbs', 'Lifetime case records', 'Lifetime rooms visited']) {
  assert(!stats.includes(oldLabel), `lifetime stats must not repeat the long label: ${oldLabel}`);
}
assert(!profile.includes('stat-jp'), 'Pass A3 stats must not add a second always-visible Japanese line');
assert(profile.includes('Weekly hunt; lifetime memory stays saved.'), 'weekly hunt should use one quiet explanatory line');
assert(profile.includes('weekly-hunt-progress'), 'weekly hunt must retain the progress bar');
assert(profile.includes('weekly-hunt-count'), 'weekly hunt must retain the found-count signal');
assert(profile.includes('Fresh every Sunday'), 'weekly hunt must retain its reset cadence');

console.log('Muenba Pass A3 profile audit passed.');
