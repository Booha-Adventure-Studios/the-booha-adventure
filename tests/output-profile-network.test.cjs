#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pages = {
  log: fs.readFileSync(path.join(ROOT, 'profile.html'), 'utf8'),
  adventure: fs.readFileSync(path.join(ROOT, 'adventure-profile.html'), 'utf8'),
  utsuroba: fs.readFileSync(path.join(ROOT, 'utsuroba-profile.html'), 'utf8'),
};

Object.entries(pages).forEach(([name, source]) => {
  assert.match(source, /aria-label="Output profiles"/, `${name} should expose the Output profile network`);
  assert.match(source, /href="profile\.html"/, `${name} should link to the main log profile`);
  assert.match(source, /href="adventure-profile\.html"/, `${name} should link to the adventure profile`);
  assert.match(source, /href="utsuroba-profile\.html"/, `${name} should link to the Utsuroba profile`);
  assert.doesNotMatch(source, /href="juku(?:\.html|-profile\.html)/,
    `${name} must not add a Juku profile route`);
});

assert.match(pages.log, /href="profile\.html" aria-current="page"/,
  'the main log profile should mark itself as current');
assert.match(pages.adventure, /href="adventure-profile\.html" aria-current="page"/,
  'the adventure profile should mark itself as current');
assert.match(pages.utsuroba, /href="utsuroba-profile\.html" aria-current="page"/,
  'the Utsuroba profile should mark itself as current');

console.log('Output profile network tests passed.');
