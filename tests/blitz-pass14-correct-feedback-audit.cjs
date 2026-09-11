const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /\.micro-win[\s\S]*animation: boohaBlitzCorrectPop 220ms/,
  'correct answers must have a brief card-pop animation');
assert.match(engine, /45% \{ transform: scale\(1\.08\); \}/,
  'the correct-answer pop must peak at a restrained 1.08 scale');
assert.match(engine, /correctBtn\.style\.background = palette\.correct\?\.color/,
  'the correct card flash must use the curriculum correct-answer color');
assert.match(engine, /function emitCorrectMicroBurst\(correctBtn\)/,
  'correct answers must emit a small immediate particle burst');
assert.match(engine, /booha-blitz-correct-spark/,
  'the correct burst must use a shared lightweight spark surface');
assert.match(engine, /blitz-feel-playful \.booha-blitz-correct-spark[\s\S]*?border-radius: 50%/,
  'Pre-Boo correct feedback must use round particles');
assert.match(engine, /blitz-feel-arcade \.booha-blitz-correct-spark[\s\S]*?border-radius: 2px/,
  'Boo-riculum correct feedback must use arcade particles');
assert.match(engine, /blitz-feel-sleek \.booha-blitz-correct-spark[\s\S]*?clip-path: polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/,
  'Boo-continuum correct feedback must use diamond particles');
assert.match(engine, /function playCorrectHit\(\)/,
  'correct answers must have dedicated audio feedback');
assert.match(engine, /const pitch = base \* \(1 \+ Math\.min\(streak, 12\) \* 0\.018\)/,
  'correct-answer audio pitch must vary with the active streak');
assert.match(engine, /\[pitch, pitch \* 1\.5\]\.forEach/,
  'correct-answer audio must layer a second satisfying note');
assert.match(engine, /playCorrectHit\(\);/,
  'the correct-answer path must trigger the micro-celebration audio');
assert.match(engine, /nextDelay: 220|config\.nextDelay \|\| 200/,
  'the existing short next-question delay must be preserved');
assert.match(engine, /\.booha-blitz-correct-spark \{ display: none; \}/,
  'reduced motion must remove correct-answer particles');
assert.match(verify, /tests\/blitz-pass14-correct-feedback-audit\.cjs/,
  'verify.sh must run the Pass 2 correct-feedback audit');

console.log('Blitz Pass 2 correct-feedback audit passed: card pop, curriculum particles, layered pitch variation, pacing, and reduced-motion coverage are present.');
