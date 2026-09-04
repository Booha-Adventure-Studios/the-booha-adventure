#!/usr/bin/env node
'use strict';

// Muenba's profile is a record surface. Karasuki remains the physical
// entrance, and the profile must expose only that gated route.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'muenba-profile.html'), 'utf8');
const assetPath = path.join(root, 'assets', 'img', 'muenba', 'nuppi_profile.webp');

assert(!/href\s*=\s*["'][^"']*muenba\.html/i.test(profile),
  'Muenba profile must not contain a direct gameplay entrance');
assert(!profile.includes('id="muenba-profile-back"'),
  'Muenba profile must remove the direct world-entry button');
assert(profile.includes('<a class="back-link" id="muenba-profile-karasuki" href="karasuki.html?room=room_13" hidden'),
  'Muenba profile must keep a hidden Karasuki link aimed at room_13');
assert(profile.includes('id="muenba-profile-karasuki"'),
  'Muenba profile must retain its Karasuki entrance control');

const accessStart = profile.indexOf('function renderWorldAccess()');
const accessEnd = profile.indexOf('function render()', accessStart);
assert(accessStart >= 0 && accessEnd > accessStart, 'Muenba profile must have a bounded world-access renderer');
const access = profile.slice(accessStart, accessEnd);
assert(access.includes('BoohaUnlockSystem.isMuenbaUnlocked()'),
  'Muenba profile access must use the specific Muenba unlock gate');
assert(!access.includes('isWeeklyWorldGateOpen'),
  'Muenba profile access must not use the generic weekly gate');
assert(access.includes('status.innerHTML'), 'Muenba status must render static markup');
assert(access.includes('muenba-profile-karasuki'), 'Muenba access renderer must control the Karasuki link');

assert(profile.includes('MUENBA IS LOCKED') && profile.includes('MUENBA IS OPEN'),
  'Muenba profile must include locked and open status copy');
assert(profile.includes('THE GHOSTS ARE WAITING'),
  'Muenba profile must include the open-world waiting copy');
assert(profile.includes('むえんばは<ruby>今<rt>いま</rt></ruby>は<ruby>閉<rt>と</rt></ruby>じています。'),
  'locked Muenba status must include ruby furigana');
assert(profile.includes('むえんばは<ruby>開<rt>ひら</rt></ruby>いています。'),
  'open Muenba status must include ruby furigana');

assert(profile.includes('class="hero-art"'), 'Muenba hero must retain the Nuppi art wrapper');
assert(profile.includes('class="hero-art"><img src="assets/img/muenba/nuppi_profile.webp"'),
  'Muenba hero must use the profile Nuppi asset');
assert(profile.includes('decoding="async"'), 'Nuppi profile image must decode asynchronously');
assert(profile.includes('grid-template-columns: minmax(0, 1fr) 245px'),
  'Muenba hero must use a two-column desktop layout');
assert(profile.includes('@media (max-width: 760px)') && profile.includes('.hero { grid-template-columns: 1fr; }'),
  'Muenba hero must stack on narrow screens');
assert(profile.includes('width: 245px; height: 245px'),
  'Nuppi profile art must retain the approximate 245px footprint');

assert(fs.existsSync(assetPath), 'Nuppi profile WebP must exist');
const asset = fs.readFileSync(assetPath);
assert.strictEqual(asset.subarray(0, 4).toString('ascii'), 'RIFF', 'Nuppi profile asset must have a RIFF header');
assert.strictEqual(asset.subarray(8, 12).toString('ascii'), 'WEBP', 'Nuppi profile asset must have a WebP signature');
assert.strictEqual(asset.subarray(12, 16).toString('ascii'), 'VP8X', 'Nuppi profile asset must use an inspectable WebP extended header');
assert((asset[20] & 0x10) !== 0, 'Nuppi profile asset must retain an alpha channel');
const width = 1 + asset[24] + (asset[25] << 8) + (asset[26] << 16);
const height = 1 + asset[27] + (asset[28] << 8) + (asset[29] << 16);
assert.strictEqual(width, 768, 'Nuppi profile asset must be 768px wide');
assert.strictEqual(height, 768, 'Nuppi profile asset must be 768px high');
assert(asset.length <= 500 * 1024, 'Nuppi profile asset must not exceed the 500 KB hard maximum');

const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
assert(verify.includes('tests/muenba-profile-access-audit.cjs'),
  'verify.sh must run the Muenba profile-access regression audit');

console.log(`Muenba profile access audit passed: physical Karasuki entry, status copy, responsive Nuppi art, and ${asset.length} byte alpha WebP.`);
