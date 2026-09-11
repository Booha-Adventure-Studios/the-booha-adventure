const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /const REDUCED_MOTION =/, 'the shared engine must detect reduced motion separately from low-power hardware');
assert.match(engine, /optionDurationMs: 340, optionStaggerMs: 36/, 'Pre-Boo must use a playful answer-entry rhythm');
assert.match(engine, /optionDurationMs: 260, optionStaggerMs: 30/, 'Boo-riculum must use a snappy arcade answer-entry rhythm');
assert.match(engine, /optionDurationMs: 380, optionStaggerMs: 44/, 'Boo-continuum must use a measured sleek answer-entry rhythm');
assert.match(engine, /@keyframes boohaBlitzOptionEnter/, 'shared answer-entry motion must use one compositor-friendly transform animation');
assert.match(engine, /\.blitz-enter[\s\S]*?will-change: transform, opacity/, 'answer-entry motion must stay on transform and opacity');
assert.match(engine, /contain: layout style/, 'the reserved feedback rail must contain its own motion layout');
assert.match(engine, /btn\.classList\.add\('blitz-enter'\)/, 'fresh questions must animate their options inside the shared engine');
assert.match(engine, /--blitz-enter-delay.*optionStaggerMs/, 'answer options must use a short stagger rather than a long pause');
assert.match(engine, /if \(!REDUCED_MOTION\) \{\n\s+overlay\.classList\.add\('shake'\)/, 'celebration shake must be skipped for reduced motion');
assert.match(engine, /#\$\{config\.overlayId\}\.shake \{ animation: none !important; \}/, 'reduced motion must disable the shared screen-shake hook');
assert.match(engine, /if \(!REDUCED_MOTION\) \{\n\s+setTimeout\(\(\) => \{\n\s+correctBtn\.style\.transition/, 'correct-answer ejection must be skipped for reduced motion');
assert.match(engine, /#\$\{config\.overlayId\}\.blitz-compositor \.\$\{config\.optionClass\}\.blitz-enter,[\s\S]*?animation: none !important/, 'reduced motion must disable fresh option animation');
assert.match(verify, /tests\/blitz-pass19-motion-audit\.cjs/, 'verify.sh must run the Pass 7 motion audit');

console.log('Blitz Pass 7 motion audit passed: curriculum timing, contained feedback motion, staggered options, and reduced-motion safety are covered.');
