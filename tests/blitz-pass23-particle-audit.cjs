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
assert.match(engine, /const fullCount = \(\{ 3: 6, 5: 12, 8: 20, 12: 32, 15: 48 \}\)\[threshold\] \|\| 6/,
  'high streak events must increase the particle burst across the unified ladder');
assert.match(engine, /function emitStreakSparks\(\)[\s\S]*?if \(isMinimalPower\(\)\) return;[\s\S]*?const count = effectCount\(fullCount\)/,
  'streak particle bursts must retain low-power limits without hidden nodes');
assert.match(engine, /const count = isLowPower\(\) \? 4 : streak >= 5 \? 10 : 6/,
  'correct feedback must keep modest bursts across reduced tiers');
assert.match(engine, /const size = 5 \+ Math\.random\(\) \* 6/,
  'celebration particles must avoid sub-five-pixel sizing');
assert.match(engine, /\.booha-blitz-streak-spark \{ display: none; \}/,
  'reduced motion must still remove streak particles');
assert.match(verify, /tests\/blitz-pass23-particle-audit\.cjs/,
  'verify.sh must run the Pass 3 particle audit');

console.log('Blitz Pass 3 particle audit passed: readable spark sizes, short lifetimes, high-streak emphasis, low-power limits, and reduced-motion behavior are covered.');
