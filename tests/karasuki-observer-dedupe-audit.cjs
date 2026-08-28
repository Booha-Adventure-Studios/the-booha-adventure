#!/usr/bin/env node
'use strict';

// Pass 24D: Observer artwork belongs to Karasuki, so it should not also be
// stored in the shared wanderer directory as an unused duplicate.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wandererDir = path.join(root, 'assets', 'img', 'wanderers');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');

['observer-1.webp', 'observer-2.webp'].forEach((name) => {
  assert(fs.existsSync(path.join(root, 'assets', 'img', 'karasuki', name)), `${name} must remain in the Karasuki asset directory`);
  assert(!fs.existsSync(path.join(wandererDir, name)), `${name} must not remain as a duplicate shared wanderer asset`);
});

assert(!/assets\/img\/wanderers\/observer-\d+\.webp/i.test(karasuki), 'Karasuki must use the canonical Observer asset location');
assert(/assets\/img\/karasuki\/observer-1\.webp/.test(karasuki), 'Karasuki canvas must use the canonical Observer asset');
assert(/assets\/img\/karasuki\/observer-2\.webp/.test(karasuki), 'Observer popup must use the canonical Observer asset');

console.log('Karasuki 24D Observer dedupe audit passed: duplicate shared copies are retired and Karasuki owns the canonical sprites.');
