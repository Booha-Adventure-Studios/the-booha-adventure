#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
for (const name of ['karasuki', 'utsuroba', 'muenba', 'grimmerglen']) {
  const source = fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8');
  const html = fs.readFileSync(path.join(root, `${name}.html`), 'utf8');
  assert(html.includes('js/core/adventure-performance.js'), `${name} page must load the shared performance helper`);
  assert(source.includes('BoohaPerformance.create'), `${name} must create a shared performance monitor`);
  assert(source.includes('worldPerf.sample(now)'), `${name} must measure active world frames periodically`);
  assert(source.includes('worldPerf.pause()'), `${name} must exclude hidden/modal/paused time`);
  assert(source.includes('worldPerf.shouldRender(now)'), `${name} must intentionally schedule low-mode renders`);
  assert(source.includes('worldPerf.enableOverlay'), `${name} must expose the developer-only performance overlay`);
  assert(!source.includes('perfFrameCount'), `${name} must not use the retired one-shot frame-count probe`);
}
const atmosphere = fs.readFileSync(path.join(root, 'js', 'karasuki-atmosphere.js'), 'utf8');
assert(atmosphere.includes('renderPolicy.shouldRender'), 'Karasuki atmosphere must share the 30fps render policy');
assert(fs.existsSync(path.join(root, 'PERFORMANCE-BUDGETS.md')), 'performance budgets must be documented');

console.log('Shared performance runtime audit passed: all four worlds use rolling monitoring, modal/visibility exclusion, 30fps low scheduling, and the developer overlay.');
