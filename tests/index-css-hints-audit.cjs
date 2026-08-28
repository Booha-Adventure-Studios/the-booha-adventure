#!/usr/bin/env node
'use strict';

// Pass 22C: remove duplicated animation rules and avoid eager decoding for
// images that live inside the initially hidden curriculum picker.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert((index.match(/@keyframes goldShift/g) || []).length === 1, 'goldShift must have one shared definition');
assert((index.match(/@keyframes goldGlimmer/g) || []).length === 1, 'goldGlimmer must have one shared definition');
assert(index.includes('id="boohaGhost"') && index.includes('decoding="async"'), 'hero Booha image should decode asynchronously');
assert((index.match(/loading="lazy" decoding="async"/g) || []).length === 3, 'hidden curriculum icons should be lazy and async');
assert(index.includes('assets/img/profile.webp" alt="" decoding="async"'), 'profile icon should decode asynchronously');
assert(index.includes('assets/img/juku-logo.png" alt="" decoding="async"'), 'Juku icon should decode asynchronously');
assert(verify.includes('tests/index-css-hints-audit.cjs'), 'verify.sh must run the 22C index audit');

console.log('Index 22C audit passed: duplicate keyframes removed and image decoding hints are scoped safely.');
