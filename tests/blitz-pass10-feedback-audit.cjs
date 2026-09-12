const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const vocab = fs.readFileSync('js/vocab-blitz.js', 'utf8');
const sentence = fs.readFileSync('js/sentence-blitz.js', 'utf8');
const question = fs.readFileSync('js/question-blitz.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /#vb-wrong-popup\.blitz-wrong-feedback,[\s\S]*?bottom: max\(env\(safe-area-inset-bottom/,
  'wrong feedback must be a contained bottom card rather than a full-screen layer');
assert.match(engine, /max-height: min\(76vh, 560px\)/,
  'wrong feedback must remain bounded while allowing long content to scroll');
assert.match(engine, /var\(--blitz-popup-bg, rgba\(0,0,0,.92\)\)/,
  'wrong feedback must use the curriculum popup theme');
assert.match(engine, /@keyframes boohaBlitzWrongCard/,
  'wrong feedback must enter as lightweight game feedback');
assert.match(engine, /@keyframes boohaBlitzWrongSheet/,
  'wrong feedback must have a mobile sheet treatment');
assert.match(engine, /showWrongPopup\(correct\)/,
  'the existing wrong-answer flow must remain wired');
assert.match(engine, /renderSeparateReading\(scoldJp, scoldHira, scold\.jp, scold\.hira\)/,
  'the contained feedback must preserve the Booha scold content and reading');

for (const [source, prefix] of [[vocab, 'vb'], [sentence, 'sb'], [question, 'qb']]) {
  assert.match(source, new RegExp(`id="${prefix}-wrong-popup" class="blitz-wrong-feedback"`),
    `${prefix} wrong feedback must use the shared panel treatment`);
  assert.doesNotMatch(source, new RegExp(`#${prefix}-overlay\\.low-power #${prefix}-wrong-popup`),
    `${prefix} low-power mode must not restore a full-screen error blackout`);
}

assert.match(verify, /tests\/blitz-pass10-feedback-audit\.cjs/,
  'verify.sh must run the wrong-feedback audit');

console.log('Blitz Pass 4 feedback audit passed: wrong answers use contained game feedback instead of error screens.');
