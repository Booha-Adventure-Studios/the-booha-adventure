const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(runtime.includes('function isGrimmerglenPhoneViewport()'),
  'orientation gating must distinguish phone-sized touch viewports');
assert(runtime.includes('Math.min(width, height) <= 540'),
  'the portrait gate must not block tablet-sized touch viewports');
assert(runtime.includes('function updateGrimmerglenOrientationGate()'),
  'orientation state must be updated centrally');
assert(runtime.includes("classList.toggle('is-visible', needsLandscape)"),
  'the rotate surface must follow the visible orientation state');
assert(runtime.includes("setAttribute('aria-hidden', String(!needsLandscape))"),
  'the rotate surface must expose its visible state to assistive technology');
assert(runtime.includes("visualViewport.addEventListener('resize', refresh"),
  'rotation and browser chrome changes must refresh the orientation gate');
assert(runtime.includes('#grimmerglen-rotate-overlay.is-visible'),
  'the rotate surface must be hidden until JavaScript confirms it is needed');
assert(runtime.includes('env(safe-area-inset-top,0px)'),
  'the rotate surface must respect device safe areas');
assert(runtime.includes('touch-action:none'),
  'the rotate surface must prevent touches leaking to the world');
assert(verify.includes('tests/grimmerglen-pass5-orientation-audit.cjs'),
  'verify.sh must run the Grimmerglen Pass 5 orientation audit');

console.log('Grimmerglen Pass 5 orientation audit passed: phone-only landscape gating, safe-area insets, accessibility state, and viewport refresh wiring are live.');
