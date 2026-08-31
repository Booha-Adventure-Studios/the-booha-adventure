// Pass 9I: Grimmerglen's edge-leaf vignette is denser without larger leaves,
// and individual leaves carry varied opacity.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const start = runtime.indexOf('function reseedSparkles(');
const end = runtime.indexOf('function drawPastelVignette(', start);
assert(start >= 0 && end > start, 'Grimmerglen atmosphere seed/draw functions must remain discoverable');
const atmosphere = runtime.slice(start, end);

assert(atmosphere.includes('const EDGE_LEAF_COUNT = 72'), 'leaf vignette must increase to 72 small leaves');
assert(atmosphere.includes('const leavesPerSide = EDGE_LEAF_COUNT / 4'), 'extra leaves must be distributed across all four edges');
assert(atmosphere.includes('Math.floor(i / 4)'), 'leaf lanes must use per-edge positions rather than clustering');
assert(atmosphere.includes('size: 5.5 + (i % 4) * 1.2'), 'leaf sizes must remain at the existing petite scale');
assert(atmosphere.includes('baseAlpha: .3 +'), 'leaves must have deterministic individual opacity differences');
assert(atmosphere.includes('leaf.baseAlpha + .07'), 'leaf opacity must gently breathe around each individual base opacity');
assert(atmosphere.includes('Math.min(.78'), 'leaf opacity must remain capped so the vignette stays atmospheric');
assert(verify.includes('tests/grimmerglen-pass9i-audit.cjs'), 'verify.sh must run the Pass 9I leaf-vignette audit');

console.log('Grimmerglen Pass 9I audit passed: denser small leaves, even edge coverage, and varied opacity are wired.');
