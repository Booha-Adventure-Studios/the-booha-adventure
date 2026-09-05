const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(runtime.includes('function staticFrameOverlayOpen()'),
  'Grimmerglen must centralize the modal render-pause state');
assert(runtime.includes('!staticFrameOverlayOpen() && !rafHandle'),
  'the world scheduler must stop while a modal surface is open');
assert(runtime.includes('mariettaPanel.classList.remove(\'open\');\n    scheduleGrimmerglenFrame();'),
  'closing Marietta must resume the world frame loop');
assert(runtime.includes('returnPortalOverlay.classList.remove(\'open\');\n    scheduleGrimmerglenFrame();'),
  'closing the return popup must resume the world frame loop');
assert(runtime.includes('boohaChangeOverlay?.classList.remove(\'open\');\n    scheduleGrimmerglenFrame();'),
  'closing the transformation prompt must resume the world frame loop');
assert(runtime.includes("const maxDpr = perfTier === 'low' ? 1 : (TOUCH_DEVICE ? 1.5 : 2);"),
  'the adaptive touch-device DPR ceiling must remain active');
assert(runtime.includes('worldPerf.shouldRender(now)'),
  'the shared performance monitor must continue to control low-tier rendering');
assert(verify.includes('tests/grimmerglen-pass6-performance-audit.cjs'),
  'verify.sh must run the Grimmerglen Pass 6 performance audit');

console.log('Grimmerglen Pass 6 performance audit passed: modal render pauses, explicit resume paths, adaptive DPR, and low-tier scheduling are live.');
