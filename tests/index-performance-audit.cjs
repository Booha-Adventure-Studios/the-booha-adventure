#!/usr/bin/env node
'use strict';

// Pass 22A + 22B: index image references use the generated WebP siblings,
// shared pages also use the WebP siblings, and the service worker places the
// new assets in the cache that actually serves static assets.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const expected = [
  'background-1',
  'booha_ghost',
  'profile',
  'pre-boo',
  'boo-tree',
  'cont-tree',
];

expected.forEach((name) => {
  assert(index.includes(`assets/img/${name}.webp`), `index must reference ${name}.webp`);
  assert(fs.existsSync(path.join(root, 'assets', 'img', `${name}.webp`)), `${name}.webp must exist`);
  assert(!fs.existsSync(path.join(root, 'assets', 'img', `${name}.png`)), `${name}.png should be removed after the shared migration`);
  assert(sw.includes(`assets/img/${name}.webp`), `service worker must precache ${name}.webp`);
});

assert(index.includes("apple-touch-icon"), 'platform touch icon must remain available');
assert(!index.includes('assets/img/background-1.png'), 'index background reference must use WebP');
assert(!index.includes('assets/img/booha_ghost.png'), 'index Booha reference must use WebP');
assert(!index.includes('assets/img/profile.png'), 'index profile reference must use WebP');
assert(!index.includes('assets/img/pre-boo.png'), 'index Pre-Boo reference must use WebP');
assert(!index.includes('assets/img/boo-tree.png'), 'index Boo-tree reference must use WebP');
assert(!index.includes('assets/img/cont-tree.png'), 'index Boo-continuum reference must use WebP');
assert(sw.includes('const CORE_ASSETS = ['), 'service worker needs a static asset precache list');
assert(sw.includes('cacheUrlsIndividually(cache, CORE_ASSETS'), 'static asset precache must target the asset cache');

console.log('Index 22A+22B performance audit passed: six WebP references, removed PNG sources, and correct asset precaching.');
