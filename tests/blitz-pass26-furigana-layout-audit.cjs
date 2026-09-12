const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /\.vb-wrong-kanji,[\s\S]*?font-size: clamp\(28px, 8vw, 72px\)/,
  'wrong-answer Japanese text should scale down on narrow surfaces');
assert.match(engine, /\.vb-wrong-kanji,[\s\S]*?overflow-wrap: anywhere;[\s\S]*?text-wrap: balance;/,
  'wrong-answer Japanese text should wrap instead of clipping');
assert.match(engine, /#vb-wrong-popup\.blitz-wrong-feedback \.vb-wrong-hira,[\s\S]*?display: block;[\s\S]*?overflow-wrap: anywhere;/,
  'the separate furigana block must wrap within the feedback card');
assert.doesNotMatch(engine, /function renderFurigana|renderFurigana\(/,
  'the wrong-answer popup must not create ruby markup');
assert.match(verify, /tests\/blitz-pass26-furigana-layout-audit\.cjs/,
  'verify.sh must run the Pass 1 furigana-layout audit');

console.log('Blitz Pass 1 furigana-layout audit passed: wrong-answer Japanese and furigana blocks scale and wrap inside the feedback card.');
