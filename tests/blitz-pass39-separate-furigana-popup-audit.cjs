const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = [
  ['js/vocab-blitz.js', 'vb', 'vb-wrong-kanji'],
  ['js/sentence-blitz.js', 'sb', 'sb-wrong-jp'],
  ['js/question-blitz.js', 'qb', 'qb-wrong-jp'],
].map(([file, prefix, jpClass]) => ({ source: fs.readFileSync(file, 'utf8'), prefix, jpClass }));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function renderRubyReading\(jpContainer, hiraContainer, jp, hira\)/,
  'the shared wrong-answer renderer must support one compact ruby line');
assert.match(engine, /renderSeparateReading\(wrongJp, wrongHira, correct\.jp, correct\.hira\)/,
  'the correct answer must populate separate Japanese and furigana blocks');
assert.match(engine, /renderRubyReading\(scoldJp, scoldHira, scold\.jp, scold\.hira\)/,
  'the scold message must populate one Japanese line with ruby reading');
assert.match(engine, /<ruby>\$\{escapeHtml\(jp\)\}<rt>\$\{escapeHtml\(hira\)\}<\/rt><\/ruby>/,
  'the compact joke must render its reading as ruby text');
assert.match(engine, /hiraContainer\.hidden = true/,
  'the old separate reading line must be hidden in the compact strip');
assert.match(engine, /width: min\(100%, 760px\);[\s\S]*?overflow-wrap: anywhere;/,
  'separate furigana blocks must stay within the popup width');

for (const { source, prefix, jpClass } of modes) {
  assert.match(source, new RegExp('\\.' + jpClass + '\\s*\\{'),
    prefix + ' popup must retain its Japanese content block');
  assert.match(source, new RegExp('\\.' + prefix + '-wrong-hira\\s*\\{'),
    prefix + ' popup must retain its dedicated furigana block');
  assert.match(source, new RegExp('\\.' + prefix + '-wrong-scold-hira\\s*\\{'),
    prefix + ' popup must retain its dedicated scold-furigana block');
  assert.match(source, new RegExp('\\.' + prefix + '-wrong-scold-hira\\[hidden\\]'),
    prefix + ' compact strip must retain a hidden compatibility reading block');
}

assert.match(verify, /tests\/blitz-pass39-separate-furigana-popup-audit\.cjs/,
  'verify.sh must run the separate-furigana popup audit');

console.log('Blitz Pass 39 compact-reading audit passed: the joke strip uses inline ruby and keeps the legacy reading blocks safe.');
