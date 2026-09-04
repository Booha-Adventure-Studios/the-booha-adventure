#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'utsuroba-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const assetPath = path.join(root, 'assets/img/drifters/kurobane_shizuma-profile.webp');
const asset = fs.readFileSync(assetPath);

assert.doesNotMatch(profile, /href=["'](?:\.\/)?utsuroba\.html(?:[?"'])/,
  'Utsuroba profile must not offer a direct gameplay shortcut');
assert.doesNotMatch(profile, /id="utsuroba-profile-back"/,
  'obsolete direct Utsuroba profile entrance must be removed');
assert.match(profile, /<a href="utsuroba-profile\.html" aria-current="page">/,
  'the Utsuroba profile-network link must remain');
assert.match(profile, /id="utsuroba-profile-karasuki"[^>]+href="karasuki\.html\?room=room_03"[^>]+hidden/,
  'the Karasuki route must start hidden and target Utsuroba room_03');

const gateStart = profile.indexOf('function renderWorldGateState()');
const gateEnd = profile.indexOf('\n      // Tier-agnostic', gateStart);
assert(gateStart >= 0 && gateEnd > gateStart, 'named world-gate renderer must remain present');
const gate = profile.slice(gateStart, gateEnd);
assert.match(gate, /BoohaUnlockSystem\.isWeeklyWorldGateOpen\(\)/,
  'Utsuroba world access must use the shared weekly gate');
assert.match(gate, /utsuroba-world-status/,
  'the shared gate renderer must update the status display');
assert.match(gate, /utsuroba-profile-karasuki/,
  'the shared gate renderer must update the Karasuki route');
assert.match(profile, /renderWorldGateState\(\);/,
  'the gate display must render on initial/profile repaint');
assert.match(profile, /booha:saved[\s\S]*?render\);/,
  'the gate display must refresh after saves');
assert.match(profile, /booha:weeklyReset[\s\S]*?render\);/,
  'the gate display must refresh after weekly reset');
assert.match(profile, /booha:newWeek[\s\S]*?render\);/,
  'the gate display must refresh after a new week');

assert.match(profile, /UTSUROBA IS LOCKED NOW\./,
  'locked Utsuroba status copy must exist');
assert.match(profile, /UTSUROBA IS OPEN\./,
  'open Utsuroba status copy must exist');
assert.match(profile, /THE DRIFTERS ARE WAITING\./,
  'open Utsuroba waiting copy must exist');
assert.match(profile, /うつろばは<ruby>今<rt>いま<\/rt><\/ruby>、<ruby>閉<rt>と<\/rt><\/ruby>じています。/,
  'locked Japanese status copy must include furigana');
assert.match(profile, /うつろばは<ruby>開<rt>ひら<\/rt><\/ruby>いています。/,
  'open Japanese status copy must include furigana');
assert.match(profile, /ドリフターたちが<ruby>待<rt>ま<\/rt><\/ruby>っています。/,
  'the open status must identify the waiting drifters in Japanese with furigana');

assert.match(profile, /src="assets\/img\/drifters\/kurobane_shizuma-profile\.webp"[^>]+width="768"[^>]+height="768"[^>]+decoding="async"/,
  'the Utsuroba hero must reference the Kurobane profile asset with intrinsic dimensions and async decoding');
assert.match(profile, /\.hero-art[\s\S]*?245px/,
  'the Utsuroba hero must reserve the intended desktop artwork footprint');
assert.match(profile, /\.hero-art img[\s\S]*?object-fit: contain/,
  'the Kurobane art must stay contained inside its hero slot');
assert.match(profile, /radial-gradient\(circle, rgba\(216,168,255/,
  'the Utsuroba hero must keep its restrained violet glow');
assert.match(profile, /rgba\(159,228,186/,
  'the Utsuroba hero must include the mint edge of its glow palette');
assert.match(profile, /@media \(max-width: 760px\)[\s\S]*?\.hero \{ grid-template-columns: 1fr; \}/,
  'the hero must stack on narrow screens');

assert.strictEqual(asset.slice(0, 4).toString('ascii'), 'RIFF', 'Kurobane profile asset must have a RIFF header');
assert.strictEqual(asset.slice(8, 12).toString('ascii'), 'WEBP', 'Kurobane profile asset must be WebP');
assert.strictEqual(asset.slice(12, 16).toString('ascii'), 'VP8X', 'Kurobane profile asset must use an extended WebP container');
assert((asset[20] & 0x10) !== 0, 'Kurobane profile asset must carry an alpha channel');
const width = 1 + asset[24] + (asset[25] << 8) + (asset[26] << 16);
const height = 1 + asset[27] + (asset[28] << 8) + (asset[29] << 16);
assert.strictEqual(width, 768, 'Kurobane profile asset must be 768px wide');
assert.strictEqual(height, 768, 'Kurobane profile asset must be 768px high');
assert(asset.length <= 500 * 1024, 'Kurobane profile asset must stay under the 500 KB hard maximum');

assert.match(verify, /tests\/utsuroba-profile-access-audit\.cjs/,
  'verify.sh must run the Utsuroba profile access audit');

console.log(`Utsuroba profile access audit passed: ${width}x${height} WebP, ${asset.length} bytes.`);
