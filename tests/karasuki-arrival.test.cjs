#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'adventure-profile.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'js/karasuki.js'), 'utf8');

assert.match(page, /href="karasuki\.html\?from=profile"/, 'Adventure profile back button should identify a profile return');
assert.match(source, /const firstVisit = !previous\.firstFoundAt/, 'first discovery should be detected before incrementing visits');
assert.match(source, /showWandererDiscovery\(w\)/, 'first wanderer visits should trigger a discovery moment');
assert.match(source, /showKarasukiArrival\(\)/, 'Karasuki should trigger its arrival moment during init');
assert.match(source, /カラスキへおかえりなさい/, 'arrival moment should include Japanese support text');

console.log('Karasuki arrival tests passed.');
