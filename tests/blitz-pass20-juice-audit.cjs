const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function backgroundFor\(palette, index = 0\)/,
  'background energy must be derived from the active streak');
assert.match(engine, /const energy = Math\.min\(15, Math\.max\(0, Number\(streak\) \|\| 0\)\)/,
  'streak-driven background energy must be capped');
assert.match(engine, /backgroundFor\(palette, bgIndex, streak\)/,
  'the live play field must use the current streak when rendering a question');
assert.match(engine, /fallbackMessages = \{[\s\S]*?COMBO ×\$\{streak\}[\s\S]*?CHAIN ×\$\{streak\}/,
  'every correct answer must have a lightweight curriculum-flavored combo fallback');
assert.match(engine, /spotlight\.announce\(messages\[streak\] \|\| fallbackMessages/,
  'combo feedback must be announced even between named milestones');
assert.match(engine, /function emitPerfectFlash\(overlay, palette, playerName\)/,
  'perfect clears must have a distinct finishing flash');
assert.match(engine, /booha-blitz-perfect-flash-label/,
  'the perfect flash must identify the player');
assert.match(engine, /if \(isPerfectRun\) emitPerfectFlash\(overlay, palette, playerName\)/,
  'the perfect flash must be limited to perfect clears');
assert.match(engine, /\.booha-blitz-perfect-flash \{ animation: none; opacity: \.88; \}/,
  'the perfect flash must fall back safely for reduced motion');
assert.match(engine, /if \(!REDUCED_MOTION\) \{\n\s+overlay\.classList\.add\('shake'\)/,
  'the extra juice pass must retain reduced-motion protection');
assert.match(verify, /tests\/blitz-pass20-juice-audit\.cjs/,
  'verify.sh must run the Pass 8 extra-juice audit');

console.log('Blitz Pass 8 extra-juice audit passed: combo fallback copy, capped streak energy, perfect flash, and reduced-motion coverage are present.');
