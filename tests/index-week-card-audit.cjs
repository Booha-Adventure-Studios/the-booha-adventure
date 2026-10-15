#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(index, /isCurrent:true/, 'week data must identify the current week');
assert.match(index, /monthSlug: current\.monthSlug, weekNumber: current\.weekNumber/, 'week data must carry tab metadata into the hub');
assert.match(index, /const currentWeek = weekData\.find\(wk => wk\.isCurrent\)/, 'the hub must select one current week for the hero card');
assert.match(index, /\.weekCard\.currentWeek\s*\{[\s\S]*?rgba\(255,224,102/, 'current week must have a stronger visual treatment');
assert.doesNotMatch(index, /START HERE · THIS WEEK|TAP TO OPEN/, 'retired helper text must stay out of the compact card');
assert.match(index, /class="weekCardOpen" type="button"/, 'week cards must expose a keyboard-accessible curriculum action');
assert.match(index, /card\.setAttribute\('role', 'group'\)/, 'week card containers must avoid nesting interactive roles');
assert.match(index, /weekCardOpen:focus-visible/, 'curriculum actions must expose a visible keyboard focus ring');
assert.match(index, /prefers-reduced-motion: reduce[\s\S]*?weekCard\.currentWeek/, 'current-week emphasis must respect reduced motion');
assert.match(index, /class="hubWeekLayout"[\s\S]*?id="hubPrevWeekBtn"[\s\S]*?id="weekCards" class="hubCurrentWeekMount"[\s\S]*?id="hubNextWeekBtn"/, 'the hub must place previous/current/next week surfaces in one responsive layout');
assert.match(index, /hubWeeklyCompletedFor\(activeCurriculum\)/, 'the hero must read weekly completion for the saved curriculum');
assert.match(index, /class="hubProgressSegment\$\{index < cardCompleted \? ' is-complete' : ''\}"/, 'the hero must render nine completion segments');
assert.match(index, /setHubWeekTab\('hubPrevWeekBtn'/, 'the previous-week tab must be wired');
assert.match(index, /setHubWeekTab\('hubNextWeekBtn'/, 'the next-week tab must be wired');
assert.match(index, /const heroActions = document\.querySelector\('\.hubHeroActions'\)[\s\S]*?card\.appendChild\(heroActions\)/,
  'hero actions must survive hub re-renders inside the current-week card');
assert.match(verify, /tests\/index-week-card-audit\.cjs/, 'verify.sh must run the current-week card audit');

console.log('Index current-week card audit passed: hierarchy, non-nested semantics, focus treatment, and reduced-motion treatment are wired.');
