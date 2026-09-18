const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function progressColorFor\(palette, percent\)/,
  'background energy must be derived from cumulative correct progress');
assert.match(engine, /const p = Math\.max\(0, Math\.min\(100, Number\(percent\) \|\| 0\)\) \/ 100/,
  'progress color must be capped to the run range');
assert.match(engine, /function setBackground\(correctCount = 0\)[\s\S]*?progressColorFor\(palette, percent\)/,
  'the live play field must derive its background from correct answers');
assert.match(engine, /setBackground\(streak\)/,
  'question rendering must apply the current streak background energy');
assert.match(engine, /function clearAnnouncement\(\)/,
  'ordinary streak feedback must be clearable without leaving a floating callout');
assert.match(engine, /spotlight\.clearAnnouncement\(\);\s*spotlight\.setStreak\(streak, eventThreshold, initialQueueLength\);/,
  'streak updates must use the nameplate instead of an ordinary floating combo callout');
assert.match(engine, /function emitPerfectFlash\(overlay, palette, playerName\)/,
  'perfect clears must have a distinct finishing flash');
assert.match(engine, /booha-blitz-perfect-flash-label/,
  'the perfect flash must identify the player');
assert.match(engine, /if \(isPerfectRun && speedBand === 'elite'\) emitFinishFlash\(overlay, palette, playerName, 'speed'\);[\s\S]*?else if \(isPerfectRun && speedBand === 'target'\) emitPerfectFlash\(overlay, palette, playerName\);[\s\S]*?else if \(isPerfectRun\) emitFinishFlash\(overlay, palette, playerName, 'clear'\);/,
  'finishing spectacle must remain limited to perfect clears and scale with speed');
assert.match(engine, /\.booha-blitz-perfect-flash \{ animation: none; opacity: \.88; \}/,
  'the perfect flash must fall back safely for reduced motion');
assert.match(engine, /if \(!REDUCED_MOTION\) \{\n\s+overlay\.classList\.add\('shake'\)/,
  'the extra juice pass must retain reduced-motion protection');
assert.match(verify, /tests\/blitz-pass20-juice-audit\.cjs/,
  'verify.sh must run the Pass 8 extra-juice audit');

console.log('Blitz Pass 8 extra-juice audit passed: capped streak energy, perfect flash, and reduced-motion coverage are present.');
