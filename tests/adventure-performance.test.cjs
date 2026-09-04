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
let promoted = 0;
const monitor = performance.create({
  poorAverageFps: 40,
  poorLongFrameMs: 100,
  onTierChange: tier => { if (tier === 'low') downgraded += 1; if (tier === 'high') promoted += 1; },
});
let now = 0;
monitor.sample(now);
for (let i = 0; i < 240; i += 1) { now += 50; monitor.sample(now); }
assert.strictEqual(monitor.getTier(), 'high', 'one poor rolling window does not downgrade');
assert.strictEqual(monitor.metrics().windowFps, 20, 'the completed window exposes its measured FPS');
assert.strictEqual(Math.round(monitor.metrics().recentFps), 20, 'recent FPS uses the most recent frame intervals');
for (let i = 0; i < 240; i += 1) { now += 50; monitor.sample(now); }
assert.strictEqual(monitor.getTier(), 'low', 'two consecutive poor windows downgrade');
assert.strictEqual(downgraded, 1, 'downgrade fires once');
assert(monitor.shouldRender(now), 'low mode renders an eligible frame');
assert(!monitor.shouldRender(now + 1), 'low mode intentionally skips an in-between frame');
for (let window = 0; window < 4; window += 1) {
  for (let i = 0; i < 600; i += 1) { now += 20; monitor.sample(now); }
}
assert.strictEqual(monitor.getTier(), 'high', 'four consecutive healthy windows promote a dynamic downgrade');
assert.strictEqual(promoted, 1, 'promotion fires once after recovery hysteresis');
monitor.pause();
monitor.sample(now + 10000);
assert.strictEqual(monitor.getTier(), 'high', 'pause/resume preserves the recovered tier');

const telemetryOnly = performance.create({ poorAverageFps: 40, poorLongFrameMs: 100 });
let telemetryNow = 0;
telemetryOnly.sample(telemetryNow);
for (let window = 0; window < 2; window += 1) {
  for (let i = 0; i < 240; i += 1) { telemetryNow += 50; telemetryOnly.sample(telemetryNow, { countForTier: false }); }
}
assert.strictEqual(telemetryOnly.getTier(), 'high', 'telemetry-only celebration windows cannot downgrade the device');
assert.strictEqual(telemetryOnly.metrics().windowFps, 20, 'telemetry-only windows still report their FPS');

const intentionalLow = performance.create({ lowPowerHint: true, poorAverageFps: 40 });
let lowNow = 0;
intentionalLow.sample(lowNow);
for (let window = 0; window < 4; window += 1) {
  for (let i = 0; i < 600; i += 1) { lowNow += 20; intentionalLow.sample(lowNow); }
}
assert.strictEqual(intentionalLow.getTier(), 'low', 'devices intentionally starting low never promote');

console.log('Shared performance tests passed: rolling telemetry, excluded celebration windows, two-window downgrade, four-window recovery, pause exclusion, and deliberate 30fps render cadence.');
