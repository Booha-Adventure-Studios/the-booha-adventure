#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(ROOT, 'profile.html'), 'utf8');
const adventure = fs.readFileSync(path.join(ROOT, 'adventure-profile.html'), 'utf8');
const adventureLog = fs.readFileSync(path.join(ROOT, 'js/ui/adventure-log.js'), 'utf8');

assert.match(profile, /✓ RECORDED/, 'the daily profile result should describe a recorded check');
assert.match(profile, /NOT RECORDED/, 'the daily profile empty state should describe an unrecorded check');
assert.doesNotMatch(profile, /NOT COMPLETED/, 'the daily profile should not frame participation as a permanent completion');
assert.match(adventure, />Recorded</, 'the adventure profile total should be a record count');
assert.match(adventure, /This Week's Record/, 'the adventure profile should frame curriculum data as weekly');
assert.match(adventureLog, /RECORDED`/, 'the weekly log should call activity recorded');
assert.match(adventureLog, /FULLY LOGGED/, 'past weeks should describe full records, not a yearly completion path');

console.log('Profile language tests passed.');
