const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /\.booha-blitz-streak-meter \{[\s\S]*?transition: height 180ms ease, box-shadow 180ms ease, background 180ms ease;/,
  'the streak meter must animate its visual intensity as the tier changes');
assert.match(engine, /streak-tier-1 \.booha-blitz-streak-meter \{ height: 4px; \}/,
  'tier 1 must retain a quiet baseline meter');
assert.match(engine, /streak-tier-3 \.booha-blitz-streak-meter \{ height: 5px;/,
  'tier 3 must grow the meter beyond its baseline');
assert.match(engine, /streak-tier-5 \.booha-blitz-streak-meter \{ height: 7px;/,
  'tier 5 must visibly thicken the meter');
assert.match(engine, /streak-tier-5 \.booha-blitz-streak-meter-fill \{ box-shadow: 0 0 18px var\(--streak-color\), 0 0 32px rgba\(255,59,189,\.58\); \}/,
  'the top tier must have a stronger luminance halo');
assert.match(engine, /\.booha-blitz-streak-meter,[\s\S]*?\.booha-blitz-streak-meter-fill \{ transition: none; \}/,
  'reduced motion must remove streak-meter transitions');
assert.match(engine, /palette\.streak\?\.colors/,
  'the meter must retain the curriculum-specific streak color ladder');
assert.match(verify, /tests\/blitz-pass22-streak-meter-audit\.cjs/,
  'verify.sh must run the Pass 2 streak-meter audit');

console.log('Blitz Pass 2 streak-meter audit passed: tier growth, luminance escalation, palette colors, and reduced-motion behavior are covered.');
