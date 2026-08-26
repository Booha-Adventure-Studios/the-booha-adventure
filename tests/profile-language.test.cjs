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
assert.match(profile, /RECORDED/, 'the canonical profile should show the recorded total');
assert.match(profile, /THIS WEEK'S RECORD/, 'the canonical profile should contain the detailed weekly record');
['profile-totals', 'dc-week', 'alog-week', 'curr-cards', 'games-grid', 'unlocks-grid', 'juku-report-log', 'alog-calendar', 'alog-past']
  .forEach(id => assert.match(profile, new RegExp(`id=\\"${id}\\"`), `the canonical profile should mount ${id}`));
assert.match(profile, /js\/ui\/profile-progress\.js/, 'the canonical profile should load its detailed progress renderer');
assert.match(profile, /id="profile-highlights"/, 'the canonical profile should mount its progress highlights');
assert.match(profile, /js\/karasuki-wanderer-data\.js/, 'the canonical profile should load wanderer collection data');
assert.match(profile, /aria-controls="acc-games-body"/, 'the bonus-games accordion should expose its controlled region');
assert.match(profile, /aria-controls="acc-achievements-body"/, 'the achievements accordion should expose its controlled region');
assert.doesNotMatch(adventure, /class="totals-bar"/, 'the adventure profile should not duplicate the progress totals');
assert.doesNotMatch(adventure, /This Week's Record/, 'the adventure profile should not duplicate the detailed weekly record');
assert.doesNotMatch(adventure, /js\/ui\/adventure-log\.js/, 'the adventure profile should not load the canonical weekly log');
assert.match(adventure, /Save &amp; Memory/, 'the adventure profile should retain save and memory controls');
assert.match(adventure, /id="wanderer-grid"/, 'the adventure profile should mount the wanderer collection');
assert.match(adventure, /id="wanderer-count"/, 'the adventure profile should show the permanent wanderer count');
assert.match(adventure, /js\/ui\/adventure-collection\.js/, 'the adventure profile should load the collection renderer');
assert.match(adventureLog, /RECORDED`/, 'the weekly log should call activity recorded');
assert.match(adventureLog, /FULLY LOGGED/, 'past weeks should describe full records, not a yearly completion path');

console.log('Profile language tests passed.');
