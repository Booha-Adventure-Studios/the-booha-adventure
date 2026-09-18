const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const vocab = fs.readFileSync('js/vocab-blitz.js', 'utf8');
const sentence = fs.readFileSync('js/sentence-blitz.js', 'utf8');
const questions = fs.readFileSync('js/question-blitz.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

for (const [source, label] of [[vocab, 'vocab'], [sentence, 'sentence'], [questions, 'question']]) {
  assert.match(source, /const PALETTES = BoohaBlitzEngine\.themes;/, `${label} must consume the shared curriculum themes`);
}

for (const feel of ['playful', 'arcade', 'sleek']) {
  assert.match(engine, new RegExp(`feel: '${feel}'`), `shared themes must include the ${feel} curriculum feel`);
}
assert.match(engine, /rewardColors:/, 'shared themes must define colors distinct from live-game accents');
assert.match(engine, /nameEasing:/, 'shared themes must define celebration motion character');

assert.match(engine, /progressColorFor\(palette, percent\)/, 'curriculum palettes must control progress color');
assert.match(engine, /const hue = palette\.baseHue/, 'curriculum palettes must control progress hue');
assert.match(engine, /palette\.particleEasing/, 'curriculum palettes must control particle motion easing');
assert.match(engine, /palette\.rewardColors/, 'celebrations must use the separate reward palette');
assert.match(engine, /nameDelay = finalCard\.nameDelay/, 'name rain must have its own delayed celebration beat');
assert.match(engine, /booha-blitz-structure-line/, 'Sentence Blitz must have a structural line flourish');
assert.match(vocab, /badge: 'WORD STORM'/, 'Vocab Blitz must have its own finish identity');
assert.match(sentence, /badge: 'LINE LOCKED'/, 'Sentence Blitz must have its own finish identity');
assert.match(questions, /badge: 'SPEED SOLVED'/, 'Question Blitz must have its own finish identity');
assert.match(verify, /tests\/blitz-pass6-color-feel-audit\.cjs/, 'verify.sh must run the color/feel audit');

console.log('Blitz Pass 6 color/feel audit passed: curriculum personalities, reward palettes, celebration rhythm, and distinct finish cards are covered.');
