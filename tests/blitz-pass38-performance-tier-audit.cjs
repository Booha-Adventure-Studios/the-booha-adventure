const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /const HARDWARE_PERFORMANCE_TIER = typeof navigator !== 'undefined'[\s\S]*?'reduced' : 'full';/,
  'Blitz must derive performance tiers from hardware hints, not accessibility preferences');
assert.match(engine, /function performanceTier\(\)[\s\S]*?return RUNTIME_PERFORMANCE_TIER \|\| HARDWARE_PERFORMANCE_TIER;/,
  'the active tier must combine per-launch runtime measurement with the hardware hint');
assert.match(engine, /function effectCount\(fullCount\)[\s\S]*?isMinimalPower\(\)[\s\S]*?isLowPower\(\)/,
  'effect counts must distinguish minimal from reduced mode');
assert.match(engine, /function applyPerformanceTier\(overlay\)[\s\S]*?reduced-power[\s\S]*?low-power/,
  'the overlay must expose separate reduced and minimal classes');
assert.match(engine, /const PERFORMANCE_SETTLE_MS = 2000;/,
  'runtime measurement must wait past the start sting and first question');
assert.match(engine, /const PERFORMANCE_WINDOW_MS = 4500;/,
  'runtime measurement must use a sustained window');
assert.match(engine, /const slowRatio = slowFrames \/ Math\.max\(1, frameCount\);[\s\S]*?averageFrameTime >= 30 && slowRatio >= 0\.35[\s\S]*?'minimal'[\s\S]*?averageFrameTime >= 20 && slowRatio >= 0\.18[\s\S]*?'reduced'/,
  'runtime measurement must require sustained frame-time degradation before downgrading');
assert.match(engine, /RUNTIME_PERFORMANCE_TIER = null;[\s\S]*?const overlay = config\.buildOverlay\(\);[\s\S]*?applyPerformanceTier\(overlay\)/,
  'runtime tier state must reset for each Blitz launch');
assert.match(engine, /if \(isMinimalPower\(\) && palette\.background\?\.main\) return palette\.background\.main;/,
  'only minimal mode may replace the curriculum gradient with a solid background');
assert.match(engine, /#vb-overlay\.reduced-power[\s\S]*?backdrop-filter: blur\(8px\)/,
  'reduced mode must keep a lighter visual identity while reducing blur cost');
assert.match(engine, /function enableRuntimeReducedPower\(overlay\)/,
  'moderate runtime degradation must activate reduced mode');
assert.match(engine, /if \(tier === 'minimal'\) enableRuntimeLowPower\(overlay\);[\s\S]*?else if \(tier === 'reduced'\) enableRuntimeReducedPower\(overlay\)/,
  'measured runtime tiers must be applied to the active overlay');
assert.match(verify, /tests\/blitz-pass38-performance-tier-audit\.cjs/,
  'verify.sh must run the Blitz performance-tier audit');

console.log('Blitz performance-tier audit passed: Fire-tablet fallback now preserves Blitz identity in reduced mode and reserves minimal mode for severe degradation.');
