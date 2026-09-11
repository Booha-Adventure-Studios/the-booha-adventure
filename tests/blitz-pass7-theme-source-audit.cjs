const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modeFiles = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js'];
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /const THEMES = Object\.freeze\(\{/,
  'shared Blitz themes must be defined in the engine');
assert.match(engine, /themes: THEMES,/, 'shared Blitz themes must be exposed by the engine');

for (const token of ['background', 'correct', 'wrong', 'popup', 'streak', 'reward', 'shape', 'motion']) {
  assert.match(engine, new RegExp(`${token}: Object\\.freeze`),
    `shared themes must include the ${token} token group`);
}

for (const path of modeFiles) {
  const source = fs.readFileSync(path, 'utf8');
  assert.strictEqual((source.match(/const PALETTES = BoohaBlitzEngine\.themes;/g) || []).length, 1,
    `${path} must have exactly one shared theme reference`);
  assert.doesNotMatch(source, /const PALETTES = \{/,
    `${path} must not carry a duplicated palette object`);
}

assert.match(verify, /tests\/blitz-pass7-theme-source-audit\.cjs/,
  'verify.sh must run the shared theme source audit');

console.log('Blitz Pass 7 theme-source audit passed: all modes consume one canonical token source.');
