#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'muenba-profile.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(profile, /data\.weekly\?\.worlds\?\.muenba/, 'Muenba profile must read the occurrence-scoped weekly hunt bucket');
assert.match(profile, /weeklyGhostsFound/, 'Muenba profile must keep weekly hunt state separate from lifetime records');
assert.match(profile, /weeklyFoundCount/, 'Muenba profile must show a weekly hunt meter');
assert.match(profile, /Found this week/, 'Muenba profile must label ghosts found in the current week');
assert.match(profile, /Available this week/, 'Muenba profile must label ghosts available for the current week');
assert.match(profile, /Lifetime case memory/, 'Muenba profile must label case-memory status as lifetime progress');
assert.match(profile, /ghost-card\$\{isFound \? ' has-lifetime-memory' : ''\}\$\{weeklyFound \? ' is-weekly-found' : ''\}/, 'Muenba ghost brightness must be driven by weekly capture state');
assert.doesNotMatch(profile, /ghost-card\$\{isFound \? ' is-found'/, 'Muenba lifetime completion must not re-light a new week');
assert.match(profile, /Fresh every Sunday/, 'Muenba profile must explain the weekly reset cadence');
assert.match(profile, /booha:weeklyReset/, 'Muenba profile must refresh weekly hunt status after rollover');
assert.match(serviceWorker, /\$\{BASE\}\/muenba-profile\.html/, 'Muenba profile must be included in the page precache');
assert.match(verify, /tests\/muenba-profile-weekly-audit\.cjs/, 'verify.sh must run the weekly/lifetime profile audit');

console.log('Muenba profile weekly audit passed: weekly hunt availability is separated from lifetime memory progress.');
