const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /\.micro-win \{[\s\S]*?background: var\(--blitz-correct\) !important;/,
  'correct answers should keep the curriculum correct color as their fill');
assert.match(engine, /\.micro-win \{[\s\S]*?outline: 2px solid #ffffff;/,
  'correct answers should have a crisp white hit edge');
assert.match(engine, /\.micro-win \{[\s\S]*?0 0 0 2px #ffffff,[\s\S]*?inset 0 0 18px rgba\(255,255,255,\.35\) !important;/,
  'correct answers should combine a white core, colored halo, and inner flash');
assert.match(engine, /\.micro-win \{[\s\S]*?filter: brightness\(1\.12\) saturate\(1\.14\);/,
  'correct answers should get a short luminance lift');
assert.match(engine, /\.micro-win \{ animation: none; filter: none; \}/,
  'reduced motion should remove the correct-answer animation treatment');
assert.match(verify, /tests\/blitz-pass25-correct-contrast-audit\.cjs/,
  'verify.sh must run the Pass 5 correct-contrast audit');

console.log('Blitz Pass 5 correct-contrast audit passed: correct answers have a crisp white hit core, colored halo, luminance lift, and reduced-motion fallback.');
