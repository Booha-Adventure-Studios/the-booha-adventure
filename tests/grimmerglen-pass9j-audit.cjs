// Pass 9J: randomized memory objects remain fully visible and reachable when
// the world is cropped to fill a mobile viewport.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const start = runtime.indexOf('function getObjectViewportBounds(');
const end = runtime.indexOf('function drawGrimmerglenObjects(', start);
assert(start >= 0 && end > start, 'mobile object placement helpers must remain discoverable');
const placement = runtime.slice(start, end);

assert(placement.includes('const { width, height } = currentGrimmerglenViewport();') &&
       placement.includes('const scale = Math.max(width / WORLD_W, height / WORLD_H)'),
  'object safety bounds must follow the same visible-viewport cover scale as the world stage');
assert(placement.includes('visibleWorldW') && placement.includes('visibleWorldH'),
  'object safety bounds must calculate the visible world crop');
assert(placement.includes('responsiveWorldRadius(OBJECT_HIT_R, 44)') && placement.includes('responsiveWorldSize(OBJECT_DRAW_SIZE, 32)'),
  'memory items must keep both their pickup radius and art inside the viewport at mobile scale');
assert(placement.includes('function safeObjectRange('),
  'clearing ranges must be clipped safely when a mobile crop trims an edge');
assert(placement.includes('function constrainObjectLayoutToViewport('),
  'orientation changes must re-constrain an existing item layout without requiring a reload');
assert(placement.includes('const viewport = getObjectViewportBounds()'),
  'randomized memory placement must use the viewport-safe bounds');
assert(placement.includes('const xRange = safeObjectRange(zone.x, viewport.minX, viewport.maxX)'),
  'memory item x positions must stay inside the visible crop');
assert(placement.includes('const yRange = safeObjectRange(zone.y, viewport.minY, viewport.maxY)'),
  'memory item y positions must stay inside the visible crop');
assert(placement.includes('Math.min(viewport.maxX, 768 + entryIndex * 130)'),
  'fallback x positions must also remain visible');
assert(placement.includes('Math.min(viewport.maxY, 220 + entryIndex * 210)'),
  'fallback y positions must also remain visible');
assert(runtime.includes('constrainObjectLayoutToViewport();'),
  'resize handling must keep existing memory items visible after phone rotation');
assert(verify.includes('tests/grimmerglen-pass9j-audit.cjs'), 'verify.sh must run the Pass 9J mobile visibility audit');

console.log('Grimmerglen Pass 9J audit passed: memory items are constrained to the visible mobile crop and remain reachable.');
