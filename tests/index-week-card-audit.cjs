#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(index, /isCurrent:true/, 'week data must identify the current week');
assert.match(index, /`weekCard\$\{wk\.isCurrent \? ' currentWeek' : ''\}`/, 'current week must receive a dedicated card class');
assert.match(index, /\.weekCard\.currentWeek\s*\{[\s\S]*?rgba\(255,224,102/, 'current week must have a stronger visual treatment');
assert.match(index, /START HERE · THIS WEEK/, 'current week must clearly tell students where to start');
assert.match(index, /class="weekCardOpen" type="button"/, 'week cards must expose a keyboard-accessible curriculum action');
assert.match(index, /card\.setAttribute\('role', 'group'\)/, 'week card containers must avoid nesting interactive roles');
assert.match(index, /weekCardOpen:focus-visible/, 'curriculum actions must expose a visible keyboard focus ring');
assert.match(index, /prefers-reduced-motion: reduce[\s\S]*?weekCard\.currentWeek/, 'current-week emphasis must respect reduced motion');
assert.match(verify, /tests\/index-week-card-audit\.cjs/, 'verify.sh must run the current-week card audit');

console.log('Index current-week card audit passed: hierarchy, non-nested semantics, focus treatment, and reduced-motion treatment are wired.');
