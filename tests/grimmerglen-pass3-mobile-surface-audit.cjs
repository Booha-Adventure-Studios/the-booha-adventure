const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(runtime.includes('mariettaPanel.scrollTop = 0'),
  'Marietta must reopen at the top of its current mobile surface');
assert(runtime.includes("returnBox.scrollTop = 0"),
  'return popup must reopen at the top of its scroll surface');
assert(runtime.includes("changeBox.scrollTop = 0"),
  'change prompt must reopen at the top of its scroll surface');
assert(runtime.includes('touch-action:pan-y'),
  'Grimmerglen popup surfaces must own vertical touch scrolling');
assert(runtime.includes('min-height:44px'),
  'mobile popup controls must retain 44px-class touch targets');
assert(runtime.includes('min-height:48px'),
  'the transformation prompt must retain a comfortable primary action target');
assert(runtime.includes('@media (orientation:landscape) and (max-height:480px)'),
  'short landscape phones need a dedicated compact surface layout');
assert(runtime.includes('scrollbar-gutter:stable'),
  'scrolling surfaces should not shift their text when a scrollbar appears');
assert(verify.includes('tests/grimmerglen-pass3-mobile-surface-audit.cjs'),
  'verify.sh must run the Grimmerglen Pass 3 mobile-surface audit');

console.log('Grimmerglen Pass 3 mobile-surface audit passed: contained scrolling, compact landscape surfaces, and usable popup targets are live.');
