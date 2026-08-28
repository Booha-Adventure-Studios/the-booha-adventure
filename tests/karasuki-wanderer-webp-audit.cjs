#!/usr/bin/env node
'use strict';

// Pass 24B: shared wanderer sprites are transparent WebP assets. The test
// derives the expected frame set from the live Karasuki definitions so a new
// wanderer cannot silently fall back to a retired PNG URL.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wandererDir = path.join(root, 'assets', 'img', 'wanderers');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const collection = fs.readFileSync(path.join(root, 'js', 'ui', 'adventure-collection.js'), 'utf8');

const expected = new Set(['nuppi-1.webp', 'nuppi-2.webp']);
const framePattern = /frames:\['([^']+)',\s*'([^']+)'\]/g;
let match;
let definitionCount = 0;
while ((match = framePattern.exec(karasuki))) {
  definitionCount += 1;
  expected.add(match[1].replace(/\.png$/i, '.webp'));
  expected.add(match[2].replace(/\.png$/i, '.webp'));
}

assert.strictEqual(definitionCount, 36, 'Karasuki should define all 36 wanderers');
assert.strictEqual(expected.size, 74, 'Karasuki frames plus Nuppi should total 74 shared wanderer files');

const webps = fs.readdirSync(wandererDir).filter((name) => /\.webp$/i.test(name)).sort();
assert.deepStrictEqual(webps, [...expected].sort(), 'shared wanderer WebP set must match live definitions');
assert.strictEqual(fs.readdirSync(wandererDir).filter((name) => /\.png$/i.test(name)).length, 0, 'retired wanderer PNG files must be absent');

webps.forEach((name) => {
  const file = fs.readFileSync(path.join(wandererDir, name));
  assert(file.length > 12, `${name} must not be empty`);
  assert(file.subarray(0, 4).toString('ascii') === 'RIFF', `${name} must have a RIFF header`);
  assert(file.subarray(8, 12).toString('ascii') === 'WEBP', `${name} must have a WEBP signature`);
});

assert(karasuki.includes("filename.replace(/\\.png$/i, '.webp')"), 'Karasuki must normalize wanderer frames to WebP at runtime');
assert(!/assets\/img\/wanderers\/[^'"\s]+\.png/i.test(karasuki), 'Karasuki must not reference a wanderer PNG path');
assert(!/assets\/img\/wanderers\/[^'"\s]+\.png/i.test(muenba), 'Muenba must not reference a wanderer PNG path');
assert(!/assets\/img\/wanderers\/[^'"\s]+\.png/i.test(collection), 'Collection must not reference a wanderer PNG path');
assert(collection.includes("imageSlug(item) + '-1.webp\""), 'Collection portraits must use WebP');

console.log('Karasuki 24B wanderer audit passed: shared transparent sprites use WebP and old PNG sources are retired.');
