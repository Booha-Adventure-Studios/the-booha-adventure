const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function emitFinishFlash\(overlay, palette, playerName, kind = 'perfect'\)/,
  'finish flashes should share one helper with an explicit result kind');
assert.match(engine, /flash\.className = `booha-blitz-perfect-flash\$\{isRecordFlash \? ' record' : ''\}`/,
  'record finishes should use the distinct record flash class');
assert.match(engine, /label\.textContent = isRecordFlash \? `\$\{playerName\} · NEW RECORD!` : `\$\{playerName\} · PERFECT!`/,
  'record and perfect finishes should have distinct readable labels');
assert.match(engine, /if \(isPerfectRun\) emitPerfectFlash\(overlay, palette, playerName\);\s*else if \(isRecord\) emitFinishFlash\(overlay, palette, playerName, 'record'\);/,
  'perfect and record flashes should be emitted for their matching result states');
assert.match(engine, /\.booha-blitz-perfect-flash\.record \{ animation-duration: 1050ms; \}/,
  'record flash should hold long enough to read');
assert.match(engine, /\.booha-blitz-perfect-flash\.record \.booha-blitz-perfect-flash-label \{[\s\S]*?color: #fff7b0;/,
  'record flash label should use a bright, warm high-contrast color');
assert.match(engine, /\.blitz-finish\.perfect-mode \.booha-blitz-final-card,[\s\S]*?rgba\(255,214,73,\.32\)/,
  'perfect final cards should receive a brighter gold surface');
assert.match(engine, /\.blitz-finish\.record-mode \.booha-blitz-final-card,[\s\S]*?rgba\(255,199,49,\.38\)/,
  'record final cards should receive a brighter gold surface');
assert.match(engine, /\.booha-blitz-perfect-flash \{ animation: none; opacity: \.88; \}/,
  'reduced motion should disable finish flash animation');
assert.match(verify, /tests\/blitz-pass24-finish-contrast-audit\.cjs/,
  'verify.sh must run the Pass 4 finish-contrast audit');

console.log('Blitz Pass 4 finish-contrast audit passed: perfect and record clears have readable, brighter finish surfaces and distinct reduced-motion-safe flash treatment.');
