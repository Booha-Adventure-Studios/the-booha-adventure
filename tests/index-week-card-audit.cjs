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
assert.match(index, /card\.setAttribute\('role', 'button'\)/, 'week cards must expose button semantics');
assert.match(index, /event\.key !== 'Enter' && event\.key !== ' '/, 'week cards must support keyboard activation');
assert.match(index, /prefers-reduced-motion: reduce[\s\S]*?weekCard\.currentWeek/, 'current-week emphasis must respect reduced motion');
assert.match(verify, /tests\/index-week-card-audit\.cjs/, 'verify.sh must run the current-week card audit');

console.log('Index current-week card audit passed: hierarchy, semantics, keyboard activation, and reduced-motion treatment are wired.');
