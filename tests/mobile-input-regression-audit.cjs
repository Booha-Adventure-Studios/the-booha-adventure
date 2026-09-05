const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const grimmerglen = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const utsuroba = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(grimmerglen.includes('const { width, height } = currentGrimmerglenViewport();\n    const scale = Math.max(width / WORLD_W, height / WORLD_H);'),
  'Grimmerglen object placement must use the visible viewport, not raw window dimensions');
assert(grimmerglen.includes('const INITIAL_VIEWPORT_WIDTH = Number(window.visualViewport?.width) || Number(window.innerWidth) || 0;'),
  'Grimmerglen initial phone sizing must prefer visualViewport width');
assert(muenba.includes('const INITIAL_VIEWPORT_WIDTH = Number(window.visualViewport?.width) || Number(window.innerWidth) || 0;'),
  'Muenba initial phone sizing must prefer visualViewport width');
assert(utsuroba.includes('const INITIAL_VIEWPORT_WIDTH = Number(window.visualViewport?.width) || Number(window.innerWidth) || 0;'),
  'Utsuroba initial phone sizing must prefer visualViewport width');

for (const [name, source] of [['Grimmerglen', grimmerglen], ['Muenba', muenba], ['Utsuroba', utsuroba]]) {
  assert(source.includes('window.visualViewport'), `${name} must retain a visualViewport path`);
  assert(source.includes('100dvh'), `${name} must retain dynamic viewport-height CSS`);
  assert(source.includes('safe-area-inset'), `${name} must retain safe-area handling`);
}

assert(verify.includes('tests/mobile-input-regression-audit.cjs'),
  'verify.sh must run the Pass 9 mobile input regression audit');

console.log('Pass 9 mobile/input regression audit passed: visible viewport, dynamic-height, and safe-area contracts are wired across the three mobile worlds.');
