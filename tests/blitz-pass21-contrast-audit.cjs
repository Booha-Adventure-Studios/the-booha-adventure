const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /border-width: 2px;\n\s+border-color: var\(--blitz-accent\);/,
  'resting option cards must expose a solid curriculum-colored edge');
assert.match(engine, /background-image: linear-gradient\(160deg, rgba\(255,255,255,\.10\), rgba\(0,0,0,\.16\)\)/,
  'resting option cards must gain a subtle luminance edge without replacing their palette fill');
assert.match(engine, /0 0 0 1px rgba\(255,255,255,\.20\)/,
  'playful and arcade options must have a crisp outer contrast ring');
assert.match(engine, /0 0 0 1px rgba\(255,255,255,\.18\)/,
  'sleek options must have a restrained crisp outer contrast ring');
assert.match(engine, /\.booha-blitz-nameplate[\s\S]*?background: linear-gradient\(180deg, rgba\(0, 0, 0, \.76\), rgba\(0, 0, 0, \.64\)\)/,
  'the streak nameplate must use a readable dark plate');
assert.match(engine, /box-shadow: 0 0 20px var\(--streak-color, var\(--blitz-accent\)\), 0 0 34px var\(--blitz-streak-glow\)/,
  'the streak nameplate must retain a hard readable glow plus a wider halo');
assert.match(engine, /\.vb-opt\.correct[\s\S]*?\.qb-opt\.micro-win \{\n\s+background-image: none;/,
  'correct and wrong states must keep their dedicated high-contrast backgrounds');
assert.match(verify, /tests\/blitz-pass21-contrast-audit\.cjs/,
  'verify.sh must run the Pass 1 contrast audit');

console.log('Blitz Pass 1 contrast audit passed: resting option edges, nameplate readability, state isolation, and theme preservation are covered.');
