#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const worldSources = {};
for (const name of ['karasuki', 'utsuroba', 'muenba', 'grimmerglen']) {
  const source = fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8');
  worldSources[name] = source;
  const html = fs.readFileSync(path.join(root, `${name}.html`), 'utf8');
  assert(html.includes('js/core/adventure-performance.js'), `${name} page must load the shared performance helper`);
  assert(source.includes('BoohaPerformance.create'), `${name} must create a shared performance monitor`);
  assert(source.includes('worldPerf.sample(now'), `${name} must measure active world frames periodically`);
  assert(source.includes('worldPerf.pause()'), `${name} must exclude hidden/modal/paused time`);
  assert(source.includes('worldPerf.shouldRender(now)'), `${name} must intentionally schedule low-mode renders`);
  assert(source.includes('worldPerf.enableOverlay'), `${name} must expose the developer-only performance overlay`);
  assert(!source.includes('perfFrameCount'), `${name} must not use the retired one-shot frame-count probe`);
}
const atmosphere = fs.readFileSync(path.join(root, 'js', 'karasuki-atmosphere.js'), 'utf8');
const performanceCore = fs.readFileSync(path.join(root, 'js', 'core', 'adventure-performance.js'), 'utf8');
assert(atmosphere.includes('renderPolicy.shouldRender'), 'Karasuki atmosphere must share the 30fps render policy');
assert(performanceCore.includes('recentFps'), 'shared monitor must expose recent frame-rate telemetry');
assert(performanceCore.includes('healthyWindows'), 'shared monitor must implement recovery hysteresis');
assert(performanceCore.includes('countForTier'), 'shared monitor must support telemetry-only windows');
assert(performanceCore.includes('promotionAllowed'), 'shared monitor must protect intentional low-power mode from promotion');
assert(worldSources.karasuki.includes('updatePerfTier(now, !state.transitioning)'), 'Karasuki transitions must remain telemetry-only for tier decisions');
assert(worldSources.utsuroba.includes('updatePerfTier(now, !state.transitioning && !state.celebrating)'), 'Utsuroba transitions and celebrations must remain telemetry-only for tier decisions');
assert(worldSources.muenba.includes('updateMuenbaPerfTier(now, !state.transitioning && !state.celebrating)'), 'Muenba transitions and celebrations must remain telemetry-only for tier decisions');
assert(worldSources.grimmerglen.includes('updatePerfTier(now, !state.transitioning && !state.celebrating)'), 'Grimmerglen transitions and celebrations must remain telemetry-only for tier decisions');
assert(fs.existsSync(path.join(root, 'PERFORMANCE-BUDGETS.md')), 'performance budgets must be documented');

console.log('Shared performance runtime audit passed: all four worlds use rolling monitoring, modal/visibility exclusion, 30fps low scheduling, and the developer overlay.');
