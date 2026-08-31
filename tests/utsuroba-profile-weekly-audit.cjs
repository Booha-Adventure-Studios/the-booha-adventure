#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'utsuroba-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(profile, /data\.weekly\?\.worlds\?\.utsuroba/, 'Utsuroba profile must read the occurrence-scoped weekly trail bucket');
assert.match(profile, /weeklyDrifters/, 'Utsuroba profile must keep weekly drifter progress separate from lifetime records');
assert.match(profile, /weeklyRestoredCount/, 'Utsuroba profile must show weekly trail progress');
assert.match(profile, /Restored this week/, 'Utsuroba profile must label drifters restored in the current week');
assert.match(profile, /Available this week/, 'Utsuroba profile must label drifters available in the current week');
assert.match(profile, /Lifetime .*complete/, 'Utsuroba profile must label lifetime memory status separately');
assert.match(profile, /drifter-card\$\{restoredHere \? ' has-lifetime-memory' : ''\}\$\{weeklyRestored \? ' is-weekly-restored' : ''\}/, 'Utsuroba drifter brightness must be driven by weekly restoration state');
assert.doesNotMatch(profile, /drifter-card\$\{restoredHere \? ' is-restored'/, 'Utsuroba lifetime restoration must not re-light a new week');
assert.match(profile, /Fresh every Sunday/, 'Utsuroba profile must explain the weekly reset cadence');
assert.match(profile, /booha:weeklyReset/, 'Utsuroba profile must refresh weekly trail status after rollover');
assert.match(verify, /tests\/utsuroba-profile-weekly-audit\.cjs/, 'verify.sh must run the Utsuroba weekly/lifetime profile audit');

console.log('Utsuroba profile weekly audit passed: weekly trail availability is separated from lifetime memory progress.');
