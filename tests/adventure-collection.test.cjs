#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'adventure-profile.html'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'js/ui/adventure-collection.js'), 'utf8');
const dataSource = fs.readFileSync(path.join(ROOT, 'js/karasuki-wanderer-data.js'), 'utf8');

assert.match(page, /Wanderers Found/, 'the adventure profile should label the collection');
assert.match(renderer, /collection\.wanderers/, 'the renderer should read the permanent collection slot');
assert.match(renderer, /VISITS/, 'found tiles should display visit counts');
assert.match(renderer, /UtsuFurigana\.sentence/, 'found comments should render with furigana');
assert.match(renderer, /NOT YET FOUND/, 'unfound tiles should have a clear locked state');
assert.match(dataSource, /"Shoganai"/, 'the collection renderer should use the shared 36-wanderer data');

console.log('Adventure collection tests passed.');
