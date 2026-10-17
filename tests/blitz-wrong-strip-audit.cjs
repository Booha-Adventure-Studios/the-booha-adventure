const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = [
  ['js/vocab-blitz.js', 'vb'],
  ['js/sentence-blitz.js', 'sb'],
  ['js/question-blitz.js', 'qb'],
].map(([file, prefix]) => ({ source: fs.readFileSync(file, 'utf8'), prefix }));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /blitz-wrong-compact[\s\S]*?width: 100%;[\s\S]*?flex-direction: row;/,
  'wrong feedback must be a compact bottom strip rather than a repeated question card');
assert.match(engine, /wrong-active \.vb-opt\.wrong::before[\s\S]*?content: '✗'/,
  'the tapped answer must receive a visible wrong mark');
assert.match(engine, /wrong-active \.vb-opt\.correct::before[\s\S]*?content: '✓'/,
  'the correct answer must receive a visible correct mark');
assert.match(engine, /wrong-active \.vb-opt:not\(\.wrong\):not\(\.correct\)[\s\S]*?opacity: \.25 !important;/,
  'uninvolved answers must fade while feedback is shown');
assert.match(engine, /wrong-active \.vb-opt\.wrong,[\s\S]*?padding-right: clamp\(44px, 6vw, 64px\) !important;/,
  'answer text must reserve room for the visible correction mark');
assert.match(engine, /renderRubyReading\(scoldJp, scoldHira, scold\.jp, scold\.hira\)/,
  'the compact strip must keep the joke with an inline reading');
assert.match(engine, /requestAnimationFrame\(\(\) => continueButton\?\.focus\(\{ preventScroll: true \}\)\)/,
  'focus must move to Continue instead of remaining on a disabled answer');
assert.match(engine, /continueButton\.removeAttribute\('aria-disabled'\)/,
  'Continue must restore its accessible enabled state on each wrong-answer panel');
assert.match(engine, /setAttribute\('aria-label', `\$\{chosen\.en\} — incorrect answer`\)/,
  'the selected wrong answer must expose its state to assistive technology');
assert.match(engine, /setAttribute\('aria-label', `\$\{correct\.en\} — correct answer`\)/,
  'the correct answer must expose its state to assistive technology');
assert.match(engine, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?blitz-wrong-compact\.show[\s\S]*?animation: none;/,
  'the compact strip must remain still for reduced-motion users');
assert.doesNotMatch(engine, /statusByFeel|BUMP!|CHAIN<rt>|LINK<rt>/,
  'the old player/status line must not be rebuilt in the wrong-answer strip');

for (const { source, prefix } of modes) {
  assert.match(source, new RegExp(`id="${prefix}-wrong-popup" class="blitz-wrong-feedback blitz-wrong-compact"`),
    `${prefix} must use the compact wrong-answer strip`);
  assert.match(source, /class="blitz-wrong-joke" aria-live="polite"/,
    `${prefix} must expose the joke as a live, compact feedback region`);
  assert.match(source, new RegExp(`id="${prefix}-wrong-close" type="button">つぎへ / CONTINUE`),
    `${prefix} must retain an explicit Continue action`);
}

assert.match(verify, /tests\/blitz-wrong-strip-audit\.cjs/,
  'verify.sh must run the wrong-strip audit');

console.log('Blitz wrong-strip audit passed: answers carry the correction and the joke stays compact.');
