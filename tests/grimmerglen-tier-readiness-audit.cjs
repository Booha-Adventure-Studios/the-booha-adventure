#!/usr/bin/env node
'use strict';

// Pass 6 integration QA: completed tiers should guide the player toward the
// next unfinished challenge while preserving free selection of every tier.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(profile, /function nextTierFor\(current, statsByTier\)/,
  'profile must calculate the next recommended tier from weekly tier state');
assert.match(profile, /MEMORY_TIER_CHOICES\.slice\(index \+ 1\)\.find\(tier => !statsByTier\[tier\]\?\.complete\)/,
  'readiness should skip later tiers that are already complete');
assert.match(profile, /const suggestedNext = nextTierFor\(current, statsByTier\);/,
  'profile must derive a recommendation for the selected tier');
assert.match(profile, /tier === suggestedNext \? ' is-next' : ''/,
  'the next recommended tier must receive a visible selector state');
assert.match(profile, /NEXT RECOMMENDED/,
  'the selector must label the next recommended tier');
assert.match(profile, /Complete this week!.*next recommended challenge|complete!.*next recommended challenge/s,
  'a completed tier must explain the next recommended challenge');
assert.match(profile, /class="tier-next-step" role="status"/,
  'readiness guidance must be exposed as a status message');
assert.match(profile, /currentStats\.complete/,
  'completed tiers must have a distinct completion branch in readiness guidance');
assert.doesNotMatch(profile, /data-memory-tier="\$\{tier\}"[^>]*disabled/,
  'tier completion must not lock the player out of any tier');
assert.match(verify, /tests\/grimmerglen-tier-readiness-audit\.cjs/,
  'verify.sh must run the Pass 6 readiness audit');

console.log('Grimmerglen Pass 6 audit passed: completed tiers recommend the next unfinished challenge without locking tier choice.');
