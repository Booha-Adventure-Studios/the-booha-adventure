const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const typing = fs.readFileSync(path.join(root, 'js', 'grimmerglen-typing.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Pass G2 replaced the text field and the iPad keyboard with the shared
// on-screen keyboard; these are the mobile-typing contracts that remain.
const widget = typing.slice(typing.indexOf('function renderExercise('), typing.indexOf('function injectStyles('));
assert(widget.length > 0 && !/<input\b|<textarea\b|contenteditable/i.test(widget),
  'no text field: the iPad keyboard, suggestions and autofill never appear');
assert(typing.includes('min-height:44px'),
  'typing controls must remain comfortably tappable');
assert(typing.includes('font:600 max(1rem,clamp(1rem,3vw,1.14rem))/1.35'),
  'the answer box keeps a readable mobile text size');
assert(typing.includes('scrollIntoView({ block: \'nearest\', inline: \'nearest\' })'),
  'the answer box must remain visible inside the scroll surface');
assert(typing.includes('@media (orientation:landscape) and (max-height:480px)'),
  'typing layout must provide a short-landscape fallback');
assert(runtime.includes("document.querySelector('#grimmerglen-marietta-panel .mgty-answer')"),
  'Grimmerglen viewport refresh must protect the active answer box');
assert(runtime.includes('var(--grimmerglen-keys-inset,0px)'),
  "Marietta's panel must sit above the on-screen keyboard");
assert(verify.includes('tests/grimmerglen-pass4-mobile-typing-audit.cjs'),
  'verify.sh must run the Grimmerglen Pass 4 mobile-typing audit');

console.log('Grimmerglen Pass 4 mobile-typing audit passed: on-screen keyboard, safe answer sizing, answer visibility, and short-landscape layout are live.');
