const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /baseHue: 330, bgSat: 76, bgLit: 24/,
  'Pre-Boo must use a brighter candy background instead of the old muddy dark magenta');
assert.match(engine, /secondary: 'hsl\(24, 88%, 20%\)'/,
  'Pre-Boo must have a warm candy secondary background');
assert.match(engine, /accent: '#ff6fb5', accent2: '#ffe27a'/,
  'Pre-Boo must use pink/coral and yellow toy-like accents');
assert.match(engine, /baseHue: 185, bgSat: 92, bgLit: 11/,
  'Boo-riculum must keep a high-contrast electric baseline');
assert.match(engine, /secondary: 'hsl\(264, 75%, 14%\)'/,
  'Boo-riculum must add an arcade secondary color');
assert.match(engine, /baseHue: 222, bgSat: 46, bgLit: 10/,
  'Boo-continuum must remain deep but clean');
assert.match(engine, /secondary: 'hsl\(205, 48%, 15%\)'/,
  'Boo-continuum must use a cool blue premium secondary color');

assert.match(engine, /function progressColorFor\(palette, percent\)/,
  'the shared engine must render the dead-to-alive progress color');
assert.match(engine, /const stops = palette\.aliveStops \|\|[\s\S]*?mixHex\(stops\[index\], stops\[index \+ 1\], localT\)/,
  'theme backgrounds must move through curriculum-specific live color stops');
assert.match(engine, /#vb-overlay\.blitz-feel-playful \.vb-opt/,
  'Pre-Boo must have a shared playful option treatment');
assert.match(engine, /#sb-overlay\.blitz-feel-arcade \.sb-opt/,
  'Boo-riculum must have a shared arcade option treatment');
assert.match(engine, /#qb-overlay\.blitz-feel-sleek \.qb-opt/,
  'Boo-continuum must have a shared sleek option treatment');
assert.match(verify, /tests\/blitz-pass8-personality-audit\.cjs/,
  'verify.sh must run the curriculum personality audit');

console.log('Blitz Pass 2 personality audit passed: PB, BR, and BC now have distinct visual identities.');
