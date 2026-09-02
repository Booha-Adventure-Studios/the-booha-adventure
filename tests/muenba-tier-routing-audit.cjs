#!/usr/bin/env node
'use strict';

// Regression guard for the Muenba report: selected-tier completion must not be
// mislabeled as an unselected level or silently skip the authored case flow.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'muenba-profile.html'), 'utf8');

assert(profile.includes("return ['start', 'fresh', 'deep'].includes(value) ? value : 'start';"),
  'profile and runtime must share Starter Memory as the unset default');
assert(runtime.includes("mu.readingDifficulty = 'start';"),
  'runtime save migration must initialize the selected reading tier');
assert(runtime.includes('function muenbaModeHasRemainingCases(mode)'),
  'runtime must be able to distinguish an empty selected tier from missing content');
assert(runtime.includes('function allMuenbaCaseModesComplete()'),
  'runtime must distinguish selected-tier completion from total case completion');
assert(runtime.includes('function unfinishedMuenbaModeExcept(mode)'),
  'runtime must identify the next tier that still has authored cases');
assert(runtime.includes('const tierNeedsSelection = !huntTarget && unfinishedMuenbaModeExcept(getMuenbaReadingDifficulty());'),
  'ghost placement must stop when the selected tier is complete but another tier needs selection');
assert(runtime.includes("eyebrow.textContent = everyModeComplete ? 'ALL CASE FILES SETTLED' : 'READING TIER COMPLETE';"),
  'Nuppi must report tier completion instead of no reading level');
assert(!runtime.includes("mode.textContent = 'No reading level selected';"),
  'Nuppi must not mislabel a completed tier as unselected');
assert(runtime.includes('Choose reading level'),
  'completed tiers must provide a route back to the profile selector');
assert(runtime.includes("window.location.href = 'muenba-profile.html';"),
  'tier handoff must open the Muenba profile selector');

console.log('Muenba tier-routing audit passed: default selection, completion messaging, and no-case rhythm bypass are guarded.');
