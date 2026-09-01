#!/usr/bin/env node
'use strict';

// Pass 4: the profile must make each tier's independent weekly state visible
// without letting lifetime progress or another tier bleed into the selection.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(profile, /function weeklyTierStats\(tier\)/,
  'profile must calculate weekly progress independently for each tier');
assert.match(profile, /world\.tierProgress\?\.\[tier\]/,
  'tier summaries must read the matching weekly tier bucket');
assert.match(profile, /function weeklyTierState\(stats\)/,
  'profile must classify each tier as not started, in progress, or complete');
assert.match(profile, /data-tier-state="\$\{state\.key\}"/,
  'tier buttons must expose their weekly state');
assert.match(profile, /\$\{stats\.found\} \/ \$\{stats\.total\} this week/,
  'tier buttons must show their independent weekly counts');
assert.match(profile, /Complete this week/,
  'profile must label a fully completed weekly tier');
assert.match(profile, /In progress/,
  'profile must label a partially completed weekly tier');
assert.match(profile, /Not started/,
  'profile must label a fresh weekly tier');
assert.match(profile, /Each tier has its own 24-clue weekly track/,
  'profile must explain that the three weekly tracks are separate');
assert.match(profile, /const currentTier = selectedWeeklyTier\(\);/,
  'memory cards must remain tied to the selected tier');
assert.match(profile, /DATA\.tierMemories\?\.\[type\]\?\.\[currentTier\]/,
  'memory card stories must remain tied to the selected tier');
assert.match(profile, /\.difficulty-option\[data-tier-state="complete"\]/,
  'completed tier buttons must receive distinct visual treatment');
assert.match(verify, /tests\/grimmerglen-tier-profile-state-audit\.cjs/,
  'verify.sh must run the Pass 4 profile-state audit');

console.log('Grimmerglen Pass 4 audit passed: each tier exposes independent weekly counts and clear not-started, active, and complete states.');
