const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const typing = fs.readFileSync(path.join(root, 'js', 'grimmerglen-typing.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(typing.includes('inputmode="text"'),
  'the answer field must request a text keyboard on mobile');
assert(typing.includes('enterkeyhint="done"'),
  'the answer field must give mobile keyboards a clear completion action');
assert(typing.includes('min-height:44px'),
  'typing controls must remain comfortably tappable');
assert(typing.includes('font:600 max(1rem,clamp(1rem,3vw,1.14rem))/1.3'),
  'the answer field must not fall below the mobile anti-zoom text size');
assert(typing.includes('scrollIntoView({ block: \'nearest\', inline: \'nearest\' })'),
  'focused typing input must remain visible inside the scroll surface');
assert(typing.includes('@media (orientation:landscape) and (max-height:480px)'),
  'typing layout must provide a short-landscape fallback');
assert(runtime.includes('.mgty-input:focus'),
  'Grimmerglen viewport refresh must protect the active typing field');
assert(verify.includes('tests/grimmerglen-pass4-mobile-typing-audit.cjs'),
  'verify.sh must run the Grimmerglen Pass 4 mobile-typing audit');

console.log('Grimmerglen Pass 4 mobile-typing audit passed: keyboard hints, safe input sizing, focused-field visibility, and short-landscape layout are live.');
