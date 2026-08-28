#!/usr/bin/env node
'use strict';

// Pass 22E: final index performance/runtime guardrails. This is intentionally
// static so it can run in verify.sh without needing credentials or a browser
// session. The live no-auth smoke check is performed separately.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const imageNames = [
  'background-1',
  'booha_ghost',
  'profile',
  'pre-boo',
  'boo-tree',
  'cont-tree',
];

imageNames.forEach((name) => {
  const webpPath = path.join(root, 'assets', 'img', `${name}.webp`);
  const webp = fs.readFileSync(webpPath);

  assert(webp.length > 12, `${name}.webp must not be empty`);
  assert(webp.subarray(0, 4).toString('ascii') === 'RIFF', `${name}.webp must have a RIFF header`);
  assert(webp.subarray(8, 12).toString('ascii') === 'WEBP', `${name}.webp must have a WEBP signature`);
  assert(!fs.existsSync(path.join(root, 'assets', 'img', `${name}.png`)), `${name}.png should be absent after the shared migration`);
});

// Critical Booha art is available immediately; curriculum picker art is
// deferred until the picker is opened.
const ghostTag = index.match(/<img[^>]+id="boohaGhost"[^>]*>/i);
assert(ghostTag, 'critical Booha image must remain in the start scene');
assert(!/\bloading\s*=\s*["']lazy["']/i.test(ghostTag[0]), 'critical Booha image must not be lazy-loaded');
assert(/\bdecoding\s*=\s*["']async["']/i.test(ghostTag[0]), 'critical Booha image should decode asynchronously');

const pickerImages = [...index.matchAll(/<div class="tileIcon">\s*<img[^>]+>/gi)].map((match) => match[0]);
assert(pickerImages.length === 3, 'index must retain all three curriculum picker icons');
pickerImages.forEach((tag) => {
  assert(/\bloading\s*=\s*["']lazy["']/i.test(tag), 'picker icons must remain lazy-loaded');
  assert(/\bdecoding\s*=\s*["']async["']/i.test(tag), 'picker icons should decode asynchronously');
});

// No sound file or AudioContext should be created merely by parsing index.
assert(!/<audio\b/i.test(index), 'index must not add an audio element for button feedback');
assert(!/new\s+(?:Audio|AudioContext|webkitAudioContext)\s*\(/i.test(index), 'index must not create WebAudio at load time');
assert(index.includes('function playIndexSfx(name)'), 'index needs the guarded shared-SFX bridge');
assert(index.indexOf('<script src="js/utsu-sfx.js"></script>') < index.indexOf('</body>'), 'shared SFX script must load before body close');

// The shared helper creates its context only from a sound call, and static
// index art plus the helper must be covered by the asset cache.
assert(/function ensureCtx\(\)[\s\S]*?if \(!ctx\) ctx = new AC\(\);/.test(sfx), 'shared SFX context must be lazy');
assert(sw.includes('cache.addAll(CORE_ASSETS)'), 'service worker must precache static index assets');
imageNames.concat('utsu-sfx').forEach((name) => {
  const assetPath = name === 'utsu-sfx' ? 'js/utsu-sfx.js' : `assets/img/${name}.webp`;
  assert(sw.includes(assetPath), `service worker must cover ${assetPath}`);
});

console.log('Index 22E final audit passed: WebP integrity, critical/deferred loading, lazy SFX, and asset-cache guardrails hold.');
