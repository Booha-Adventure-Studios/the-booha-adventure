#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'profile.html'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'js/ui/profile-progress.js'), 'utf8');

assert.match(page, /id="profile-highlights"/, 'profile should mount the highlights panel');
assert.match(renderer, /RECENT WEEKS/, 'renderer should include the recent-weeks trend language');
assert.match(renderer, /longestStreak/, 'renderer should derive the longest game streak');
assert.match(renderer, /BEST WEEK AVERAGE/, 'renderer should show a best-week highlight');
assert.match(renderer, /WANDERERS FOUND/, 'renderer should show a wanderer collection teaser');
assert.match(renderer, /href="adventure-profile\.html"/, 'wanderer teaser should link to the adventure profile');
assert.match(renderer, /slice\(-8\)/, 'renderer should limit the trend strip to eight weeks');

console.log('Profile highlights tests passed.');
