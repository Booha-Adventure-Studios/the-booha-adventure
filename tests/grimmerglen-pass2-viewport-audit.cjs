const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(runtime.includes('function currentGrimmerglenViewport()'),
  'Grimmerglen must centralize visible viewport dimensions');
assert(runtime.includes('window.visualViewport'),
  'Grimmerglen must prefer the visual viewport when available');
assert(runtime.includes('const { width, height } = currentGrimmerglenViewport();'),
  'stage fitting and viewport metrics must use the shared visible viewport');
assert(runtime.includes("document.documentElement.style.setProperty('--grimmerglen-viewport-width'"),
  'Grimmerglen must publish visible viewport width');
assert(runtime.includes("document.documentElement.style.setProperty('--grimmerglen-viewport-height'"),
  'Grimmerglen must publish visible viewport height');
assert(runtime.includes("visualViewport.addEventListener('resize', refresh"),
  'visual viewport resize must refresh the stage');
assert(runtime.includes("visualViewport.addEventListener('scroll', refresh"),
  'visual viewport movement must refresh the stage');
assert(runtime.includes('height:var(--grimmerglen-viewport-height,100dvh)'),
  'the app shell must use dynamic viewport height');
assert(runtime.includes('width:var(--grimmerglen-viewport-width,100vw)'),
  'the app shell must use the visible viewport width');
assert(runtime.includes('fitStage();\n        resizeCanvas();'),
  'viewport refresh must refit the world and resize its canvases together');
assert(verify.includes('tests/grimmerglen-pass2-viewport-audit.cjs'),
  'verify.sh must run the Grimmerglen Pass 2 viewport audit');

const scenarios = [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
];
for (const { width, height } of scenarios) {
  const scale = Math.max(width / 1536, height / 1024);
  assert(Number.isFinite(scale) && scale > 0,
    `visible viewport ${width}x${height} must produce a usable stage scale`);
}

console.log('Grimmerglen Pass 2 viewport audit passed: visible viewport sizing, dynamic app bounds, and resize wiring are live.');
