const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /\.vb-wrong-kanji,[\s\S]*?font-size: clamp\(28px, 8vw, 72px\)/,
  'wrong-answer Japanese text should scale down on narrow surfaces');
assert.match(engine, /\.vb-wrong-kanji,[\s\S]*?overflow-wrap: anywhere;[\s\S]*?text-wrap: balance;/,
  'wrong-answer Japanese text should wrap instead of clipping');
assert.match(engine, /\.vb-wrong-kanji ruby,[\s\S]*?display: inline;[\s\S]*?white-space: normal;/,
  'the ruby container must be allowed to wrap within the feedback card');
assert.match(engine, /\.vb-wrong-kanji rt,[\s\S]*?max-width: 100%;[\s\S]*?overflow-wrap: anywhere;/,
  'furigana annotations must stay inside the feedback card width');
assert.match(verify, /tests\/blitz-pass26-furigana-layout-audit\.cjs/,
  'verify.sh must run the Pass 1 furigana-layout audit');

console.log('Blitz Pass 1 furigana-layout audit passed: wrong-answer ruby text scales and wraps inside the feedback card.');
