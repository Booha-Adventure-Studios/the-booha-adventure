#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(profile, /weeklyBucket/, 'Grimmerglen profile must read the occurrence-scoped weekly garden bucket');
assert.match(profile, /weeklyFoundFor/, 'Grimmerglen profile must keep weekly object progress separate from lifetime records');
assert.match(profile, /id="weekly-progress"/, 'Grimmerglen profile must mount weekly garden progress');
assert.match(profile, /This Week's Garden/, 'Grimmerglen profile must show weekly garden progress');
assert.match(profile, /Fresh every Sunday/, 'Grimmerglen profile must explain the weekly reset cadence');
assert.match(profile, /This week: \$\{weeklyFound\} of 3 returned/, 'Grimmerglen memory cards must show weekly object progress');
assert.match(profile, /Lifetime clues returned/, 'Grimmerglen profile must label lifetime object progress separately');
assert.match(profile, /memory-card\$\{weeklyFound >= 3 \? ' weekly-complete' : ''\}\$\{found >= 3 \? ' has-lifetime-memory' : ''\}/, 'Grimmerglen card completion must be driven by weekly object progress');
assert.doesNotMatch(profile, /memory-card\$\{found >= 3 \? ' complete'/, 'Grimmerglen lifetime completion must not re-light a new week');
assert.match(profile, /booha:weeklyReset/, 'Grimmerglen profile must refresh weekly garden status after rollover');
assert.match(verify, /tests\/grimmerglen-profile-weekly-audit\.cjs/, 'verify.sh must run the Grimmerglen weekly/lifetime profile audit');

console.log('Grimmerglen profile weekly audit passed: weekly garden progress is separated from lifetime memory progress.');
