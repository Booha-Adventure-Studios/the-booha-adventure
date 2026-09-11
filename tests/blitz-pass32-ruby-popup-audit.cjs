const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /max-height: min\(76dvh, 560px\)/,
  'wrong feedback must use the dynamic viewport height when available');
assert.match(engine, /padding-top: \.45em;/,
  'wrong Japanese content must reserve space above ruby annotations');
assert.match(engine, /line-height: 1\.55;/,
  'wrong Japanese content must use generous ruby-safe line height');
assert.match(engine, /overflow: visible;/,
  'wrong Japanese and ruby content must not clip annotation boxes');
assert.match(engine, /ruby-position: over;/,
  'wrong Japanese content must place furigana above the source text');
assert.match(engine, /rt \{[\s\S]*?line-height: 1;/,
  'furigana annotations must keep a compact predictable line box');
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

console.log('Blitz ruby-popup audit passed: long Japanese feedback has ruby-safe spacing, scrolling, and retry reachability.');
