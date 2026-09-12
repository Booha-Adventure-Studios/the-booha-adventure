const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /const LOW_POWER =/, 
  'existing hardware and reduced-motion low-power detection must remain');
assert.match(engine, /let RUNTIME_LOW_POWER = false;/,
  'runtime low-power state must be tracked separately from the startup hint');
assert.match(engine, /function monitorFramePerformance\(overlay, onPoorPerformance\)/,
  'the engine must expose a startup frame-performance monitor');
assert.match(engine, /const PERFORMANCE_SETTLE_MS = 900;/,
  'runtime performance monitoring must allow the first playable question to settle');
assert.match(engine, /const PERFORMANCE_WINDOW_MS = 2600;/,
  'runtime performance monitoring must use a meaningful sustained window');
assert.match(engine, /now - startedAt >= PERFORMANCE_WINDOW_MS/,
  'runtime performance monitoring must be bounded to the sustained measurement window');
assert.match(engine, /frameTime >= 34/,
  'runtime performance monitoring must count materially slow frames');
assert.match(engine, /averageFrameTime >= 34 \|\| slowFrames >= 12/,
  'runtime performance monitoring must reserve minimal mode for sustained severe degradation');
assert.match(engine, /averageFrameTime >= 22 \|\| slowFrames >= 5/,
  'runtime performance monitoring must assign reduced mode for sustained moderate degradation');
assert.match(engine, /function enableRuntimeLowPower\(overlay\) \{[\s\S]*?RUNTIME_PERFORMANCE_TIER = 'minimal';[\s\S]*?applyPerformanceTier\(overlay\)/,
  'poor runtime performance must switch the active overlay to low-power effects');
assert.match(engine, /function enableRuntimeReducedPower\(overlay\)/,
  'moderate runtime performance must have a reduced visual tier');
assert.match(engine, /function effectCount\(fullCount\) \{[\s\S]*?isLowPower\(\)/,
  'particle counts must respond to runtime low-power mode');
assert.match(engine, /\.low-power[\s\S]*?\.booha-blitz-fire-wallpaper[\s\S]*?display: none !important/,
  'low-power mode must remove the expensive fire wallpaper');
assert.match(engine, /\.low-power[\s\S]*?\.booha-blitz-streak-spark[\s\S]*?display: none !important/,
  'low-power mode must remove streak sparks');
assert.match(engine, /\.low-power[\s\S]*?backdrop-filter: none;/,
  'low-power mode must remove expensive backdrop blur');
assert.match(engine, /overlay\._boohaBlitzPerformanceCleanup = monitorFramePerformance\(/,
  'monitoring must begin when the actual Blitz run begins');
assert.match(engine, /overlay\._boohaBlitzPerformanceCleanup\?\.\(\);[\s\S]*?overlay\.remove\(\)/,
  'performance monitoring must be cleaned up when Blitz closes');

assert.match(verify, /tests\/blitz-pass34-runtime-performance-audit\.cjs/,
  'verify.sh must run the runtime performance audit');

console.log('Blitz runtime-performance audit passed: sustained startup frame drops activate a lightweight low-power mode.');
