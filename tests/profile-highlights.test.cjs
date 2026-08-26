#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'profile.html'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'js/ui/profile-progress.js'), 'utf8');
const adventureLog = fs.readFileSync(path.join(ROOT, 'js/ui/adventure-log.js'), 'utf8');

assert.match(page, /id="profile-highlights"/, 'profile should mount the highlights panel');
assert.doesNotMatch(renderer, /RECENT WEEKS/, 'renderer should not duplicate the past-weeks archive with a trend panel');
assert.match(renderer, /longestStreak/, 'renderer should derive the longest game streak');
assert.match(renderer, /BEST WEEK AVERAGE/, 'renderer should show a best-week highlight');
assert.match(renderer, /WANDERERS FOUND/, 'renderer should show a wanderer collection teaser');
assert.match(renderer, /href="adventure-profile\.html"/, 'wanderer teaser should link to the adventure profile');
assert.doesNotMatch(renderer, /slice\(-8\)/, 'renderer should not build a second trend strip');
assert.match(adventureLog, /PERSONAL RECENT AVERAGE/, 'this-week log should explain the personal reference score');
assert.match(adventureLog, /recentFullWeekAverage/, 'this-week log should calculate the reference from full past weeks');

console.log('Profile highlights tests passed.');
