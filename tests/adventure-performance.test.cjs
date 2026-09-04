#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const performanceSource = fs.readFileSync(
  path.join(__dirname, '..', 'js/core/adventure-performance.js'),
  'utf8'
);
const performanceModule = { exports: {} };
vm.runInNewContext(performanceSource, { module: performanceModule, console });
const performance = performanceModule.exports;

let downgraded = 0;
const monitor = performance.create({ poorAverageFps: 40, poorLongFrameMs: 100, onTierChange: () => { downgraded += 1; } });
let now = 0;
monitor.sample(now);
for (let i = 0; i < 240; i += 1) { now += 50; monitor.sample(now); }
assert.strictEqual(monitor.getTier(), 'high', 'one poor rolling window does not downgrade');
for (let i = 0; i < 240; i += 1) { now += 50; monitor.sample(now); }
assert.strictEqual(monitor.getTier(), 'low', 'two consecutive poor windows downgrade');
assert.strictEqual(downgraded, 1, 'downgrade fires once');
assert(monitor.shouldRender(now), 'low mode renders an eligible frame');
assert(!monitor.shouldRender(now + 1), 'low mode intentionally skips an in-between frame');
monitor.pause();
monitor.sample(now + 10000);
assert.strictEqual(monitor.getTier(), 'low', 'pause/resume never upgrades a downgraded session');

console.log('Shared performance tests passed: rolling 12-second windows, two-window downgrade, pause exclusion, and deliberate 30fps render cadence.');
