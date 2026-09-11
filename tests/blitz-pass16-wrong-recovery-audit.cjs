const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /statusByFeel = \{/,
  'wrong feedback must have curriculum-specific personality copy');
assert.match(engine, /BUMP! LET'S BOUNCE BACK/,
  'Pre-Boo wrong feedback must stay playful and encouraging');
assert.match(engine, /CHAIN BROKEN — RELOAD!/,
  'Boo-riculum wrong feedback must acknowledge the broken chain');
assert.match(engine, /LINK LOST — TRY AGAIN\./,
  'Boo-continuum wrong feedback must use a sleek recovery line');
assert.match(engine, /function emitWrongMicroFeedback\(wrongBtn\)/,
  'wrong answers must emit a small wrong-color feedback beat');
assert.match(engine, /palette\.wrong\?\.color/,
  'wrong feedback must use the curriculum wrong color');
assert.match(engine, /wrongPopup\.classList\.add\(`wrong-feel-\$\{palette\.feel/,
  'the wrong sheet must receive its curriculum feel');
assert.match(engine, /wrong-active/,
  'the play field must visibly enter a wrong-feedback state');
assert.match(engine, /function recoverFromWrong\(\)/,
  'dismissing wrong feedback must have a dedicated recovery path');
assert.match(engine, /renderQuestion\(true\)/,
  'recovery must rebuild the current prompt and options');
assert.match(engine, /startTime = performance\.now\(\) - elapsed/,
  'recovery must resume the elapsed timer rather than restarting the run');
assert.match(engine, /blitz-recover/,
  'recovered options must animate back with a staggered entrance');
assert.match(engine, /config\.wrongDelay \|\| 320/,
  'wrong feedback must arrive with a short recovery-friendly delay');
assert.match(engine, /selector\('wrongClose'\)\)\.addEventListener\('click', recoverFromWrong\)/,
  'the wrong-sheet action must return to play instead of closing the game');
assert.match(engine, /\.booha-blitz-wrong-spark \{ display: none; \}/,
  'reduced motion must remove wrong-answer particles');

for (const [source, prefix] of [['js/vocab-blitz.js', 'vb'], ['js/sentence-blitz.js', 'sb'], ['js/question-blitz.js', 'qb']]
  .map(([file, prefix]) => [fs.readFileSync(file, 'utf8'), prefix])) {
  assert.match(source, new RegExp(`id="${prefix}-wrong-status">READY FOR THE NEXT TRY`),
    `${prefix} must start with a recovery-oriented wrong status`);
  assert.match(source, new RegExp(`id="${prefix}-wrong-close" type="button">つづける`),
    `${prefix} wrong feedback must offer continue, not a dead-end back button`);
}

assert.match(verify, /tests\/blitz-pass16-wrong-recovery-audit\.cjs/,
  'verify.sh must run the Pass 4 wrong-recovery audit');

console.log('Blitz Pass 4 wrong-recovery audit passed: personality copy, wrong-color beat, snappy sheet, timer resume, staggered return, and reduced-motion coverage are present.');
