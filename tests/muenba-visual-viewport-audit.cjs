const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes('function currentMuenbaViewport()'),
  'Muenba must centralize the visible viewport dimensions');
assert(source.includes('window.visualViewport'),
  'Muenba must use the visual viewport when available');
assert(source.includes("document.documentElement.style.setProperty('--muenba-viewport-height'"),
  'Muenba must publish the visible height for popup layout');
assert(source.includes('const { width, height } = currentMuenbaViewport();'),
  'phone detection and orientation must use the visible viewport');
assert(source.includes('const refreshMuenbaViewport = () =>'),
  'viewport changes must refresh metrics and orientation together');
assert(source.includes('height:var(--muenba-viewport-height,100dvh);'),
  'popup surfaces must size to the visible viewport');

console.log('Muenba 27G visual-viewport audit passed: rotation timing and popup height use the visible phone viewport.');
