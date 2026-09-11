const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /width: clamp\(5px, 1\.1vw, 9px\)/,
  'streak sparks must remain visible on small screens');
assert.match(engine, /width: clamp\(5px, 1vw, 8px\)/,
  'correct and wrong sparks must have a readable mobile minimum');
assert.match(engine, /animation: boohaBlitzStreakSpark 680ms/,
  'streak sparks must have a short bright life');
assert.match(engine, /animation: boohaBlitzWrongSpark 400ms/,
  'wrong sparks must resolve quickly without lingering noise');
assert.match(engine, /\.booha-blitz-streak-spark-large \{[\s\S]*?width: clamp\(11px, 1\.8vw, 16px\)/,
  'high streak events must include one larger readable spark');
assert.match(engine, /threshold >= 5 \? \(palette\.feel === 'arcade' \? 14 : 12\)/,
  'high streak events must increase the particle burst while retaining low-power limits');
assert.match(engine, /const count = isLowPower\(\) \? 3 : streak >= 5 \? 10 : 6/,
  'correct feedback must add a modest streak-scaled burst');
assert.match(engine, /const size = 5 \+ Math\.random\(\) \* 6/,
  'celebration particles must avoid sub-five-pixel sizing');
assert.match(engine, /\.booha-blitz-streak-spark \{ display: none; \}/,
  'reduced motion must still remove streak particles');
assert.match(verify, /tests\/blitz-pass23-particle-audit\.cjs/,
  'verify.sh must run the Pass 3 particle audit');

console.log('Blitz Pass 3 particle audit passed: readable spark sizes, short lifetimes, high-streak emphasis, low-power limits, and reduced-motion behavior are covered.');
