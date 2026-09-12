const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /max-height: min\(76dvh, 560px\)/,
  'wrong feedback must use the dynamic viewport height when available');
assert.match(engine, /line-height: 1\.55;/,
  'wrong Japanese content must use a generous line height');
assert.match(engine, /overflow: visible;/,
  'wrong Japanese content must not clip long feedback text');
assert.match(engine, /function renderSeparateReading\(jpContainer, hiraContainer, jp, hira\)/,
  'wrong feedback must use separate Japanese and furigana blocks');
assert.doesNotMatch(engine, /renderFurigana\(/,
  'wrong feedback must not rely on the old ruby renderer');
assert.match(engine, /wrongPopup\.scrollTop = 0;[\s\S]*?wrongPopup\.classList\.add\('show'\)/,
  'opening wrong feedback must always begin at the top of the card');
assert.match(engine, /max-height: calc\(100dvh - 24px\)/,
  'short landscape wrong feedback must fit inside the visible viewport');
assert.match(engine, /\.blitz-wrong-feedback > \*/,
  'wrong feedback children must not shrink away the retry control');

for (const source of modes) {
  assert.match(source, /wrong-kanji|wrong-jp/,
    'each Blitz mode must expose Japanese wrong-answer content for long-ruby coverage');
}

assert.match(verify, /tests\/blitz-pass32-ruby-popup-audit\.cjs/,
  'verify.sh must run the ruby popup audit');

console.log('Blitz separate-reading popup audit passed: long Japanese feedback has safe spacing, scrolling, and retry reachability.');
