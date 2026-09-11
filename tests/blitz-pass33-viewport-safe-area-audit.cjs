const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /#vb-overlay, #sb-overlay, #qb-overlay \{[\s\S]*?height: 100vh;[\s\S]*?height: var\(--blitz-viewport-height, 100dvh\);/,
  'Blitz overlays must fall back to 100vh and prefer the visible dynamic viewport');
assert.match(engine, /#vb-win, #sb-win, #qb-win \{[\s\S]*?padding-top: max\(env\(safe-area-inset-top/,
  'finish screens must preserve the top safe area');
assert.match(engine, /#vb-overlay #vb-quit, #sb-overlay #sb-quit, #qb-overlay #qb-quit \{[\s\S]*?safe-area-inset-right/,
  'quit controls must stay clear of the right safe area');
assert.match(engine, /\.booha-blitz-final-card \{[\s\S]*?max-height: min\(92dvh, 860px\);/,
  'final cards must use the dynamic viewport height when available');
assert.match(engine, /function bindViewportMetrics\(overlay\) \{[\s\S]*?window\.visualViewport[\s\S]*?visualViewport\?\.addEventListener\('resize', update/,
  'viewport metrics must listen for visualViewport resize changes');
assert.match(engine, /window\.addEventListener\('orientationchange', update/,
  'viewport metrics must refresh after orientation changes');
assert.match(engine, /return \(\) => \{[\s\S]*?removeEventListener\('scroll', update\)/,
  'viewport listeners must be cleaned up when Blitz closes');
assert.match(engine, /overlay\._boohaBlitzViewportCleanup = bindViewportMetrics\(overlay\)/,
  'each Blitz overlay must bind visible viewport metrics');
assert.match(engine, /overlay\._boohaBlitzViewportCleanup\?\.\(\);[\s\S]*?overlay\.remove\(\)/,
  'closing Blitz must remove viewport listeners before removing the overlay');

assert.match(verify, /tests\/blitz-pass33-viewport-safe-area-audit\.cjs/,
  'verify.sh must run the viewport and safe-area audit');

console.log('Blitz viewport-safe-area audit passed: dynamic viewport sizing, safe areas, orientation refresh, and cleanup are wired.');
