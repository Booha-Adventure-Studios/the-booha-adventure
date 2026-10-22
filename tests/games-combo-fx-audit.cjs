#!/usr/bin/env node
'use strict';

// Games Pass 9: combo milestones are a celebration, not a status line.
// Banner + chime + sparks at ×1.5 / ×2 / ×3, a gold edge at ×3, a crack
// and shatter when a combo of 3+ breaks. Nothing may block input, every
// animation stays compositor-only, and reduced motion / low power scale it down.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const utils = fs.readFileSync(path.join(ROOT, 'js/game-utils.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'theme/game.css'), 'utf8');

// Wiring inside createRun
for (const fn of ['fxBanner', 'fxChime', 'fxCrack', 'fxParticles', 'fxEdge', 'fxOrigin']) {
  assert(utils.includes(`const ${fn} =`), `createRun must define ${fn}`);
}
assert.match(utils, /paint\(\{ gained: pts, milestone: mult > before \? mult : 0 \}\)/, 'a hit that raises the multiplier is a milestone');
assert.match(utils, /paint\(\{ broke: hadCombo \}\)/, 'losing a combo of 3+ breaks the meter');
assert.match(utils, /if \(fx\.milestone\) \{[\s\S]{0,200}fxBanner\(fx\.milestone\);[\s\S]{0,40}fxChime\(fx\.milestone\);/, 'milestones show the banner and play the chime');
assert.match(utils, /fxEdge\(st\.combo >= 10\)/, 'the gold edge is on exactly while the combo is ×3');
assert.match(utils, /summary\(\) \{\s*fxEdge\(false\);/, 'the edge turns off when the score card takes over');
assert.match(utils, /if \(fxReduced\(\) \|\| fxPower\(\) === 'minimal'\) return;/, 'no particles under reduced motion or minimal power');
assert.match(utils, /if \(fxReduced\(\)\) el\.classList\.add\('still'\);/, 'reduced motion holds the banner still');
assert.match(utils, /c\.state === 'running' \? c : null/, 'synth cues only play on a running audio context');
assert.match(utils, /capture: true, passive: true/, 'tap tracking must be passive and never delay input');

// CSS: never in the way, compositor-only motion
for (const cls of ['.brun-banner', '.brun-spark, .brun-shard', '.brun-edge']) {
  const at = css.indexOf(cls + ' {');
  assert(at > -1, `game.css must style ${cls}`);
  const rule = css.slice(at, css.indexOf('}', at));
  assert(/pointer-events:\s*none/.test(rule), `${cls} must never take taps`);
}
const kf = /@keyframes\s+(brun[\w-]*)\s*\{/g;
let m, seen = 0;
while ((m = kf.exec(css))) {
  let i = kf.lastIndex, depth = 1;
  while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
  const body = css.slice(kf.lastIndex, i - 1);
  seen++;
  const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]);
  props.forEach(p => assert(['opacity', 'transform'].includes(p), `@keyframes ${m[1]} animates ${p}; only transform/opacity allowed`));
}
assert(seen >= 7, `expected the combo keyframes, found ${seen}`);
assert.match(css, /html\.bsc-open \.brun-hud, html\.bsc-open \.brun-banner, html\.bsc-open \.brun-edge \{ display: none; \}/, 'the score card hides all combo effects');
assert.match(css, /\.brun-banner\.still \{ animation: none; opacity: 1; \}/, 'the reduced-motion banner is visible without animating');
assert(css.indexOf('.brun-banner {') > -1 && /z-index:\s*70/.test(css.slice(css.indexOf('.brun-banner {'), css.indexOf('.brun-banner {') + 120)), 'the banner sits above the game, below the score card (1500)');

console.log('Games combo FX audit passed: milestone banner, chime, sparks, ×3 edge and combo break wired; never blocks input; compositor-only; reduced motion and low power respected.');
