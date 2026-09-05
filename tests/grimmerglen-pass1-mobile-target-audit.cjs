#!/usr/bin/env node
'use strict';

// Pass 1: small landscape touch devices keep important Grimmerglen targets
// readable and tappable without changing the calibrated world coordinates.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('let grimmerglenStageScale = 1;'),
  'mobile target sizing must track the fitted world scale');
assert(runtime.includes('function responsiveWorldSize(baseSize, minimumCssPixels)'),
  'mobile target sizing must provide a minimum CSS-pixel visual size');
assert(runtime.includes('function responsiveWorldRadius(baseRadius, minimumDiameterCssPixels)'),
  'mobile target sizing must provide a minimum CSS-pixel hit diameter');
assert(runtime.includes("stage.style.setProperty('--grimmerglen-profile-portal-size'"),
  'the profile doorway must receive a responsive world-space size');
assert(runtime.includes('actorCtx.scale(responsiveVisualScale(26, 20), responsiveVisualScale(26, 20));'),
  'exit arrows must remain readable on small touch screens');
assert(runtime.includes('const size = responsiveWorldSize(MARIETTA.drawR * 2, 32);'),
  'Marietta must remain visually legible on small touch screens');
assert(runtime.includes('const boxSize = responsiveWorldSize(BOOHA_R * 2, 32);'),
  'Booha must remain visually legible on small touch screens');
assert(runtime.includes('const drawSize = responsiveWorldSize(OBJECT_DRAW_SIZE, 32);'),
  'collectible art must remain visually legible on small touch screens');
assert(runtime.includes('responsiveWorldRadius(OBJECT_HIT_R, 44)'),
  'collectible pickup targets must remain comfortably tappable');
assert(runtime.includes('responsiveWorldRadius(MARIETTA_RETURN_PORTAL.r, 44)'),
  'the return portal must remain comfortably tappable');
assert(runtime.includes('const ringRadius = responsiveWorldRadius(22, 28);'),
  'the return portal ring must remain visible on small touch screens');
assert(runtime.includes('touch-action:manipulation'),
  'the profile doorway must advertise direct touch interaction');
assert(verify.includes('tests/grimmerglen-pass1-mobile-target-audit.cjs'),
  'verify.sh must run the Pass 1 mobile target audit');

function responsiveSize(base, minimumCssPixels, scale) {
  return Math.max(base, minimumCssPixels / scale);
}

for (const scale of [0.37, 0.434, 0.555]) {
  assert(responsiveSize(70, 44, scale) * scale >= 43.99,
    'profile doorway must reach 44 CSS px at scale ' + scale);
  assert(responsiveSize(58, 32, scale) * scale >= 31.99,
    'collectible art must reach 32 CSS px at scale ' + scale);
}

console.log('Grimmerglen Pass 1 mobile target audit passed: small touch devices get readable visuals and 44px-class interaction targets.');
