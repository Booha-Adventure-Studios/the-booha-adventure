#!/usr/bin/env node
'use strict';

// Pass 21E: celebration cards remain scrollable inside their own surface on
// short touch viewports without handing the gesture back to the page.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(card.includes('overscroll-behavior:none'), 'celebration overlay must contain touch overscroll');
assert(card.includes('overscroll-behavior:contain'), 'celebration card must contain overscroll within the scroll surface');
assert(card.includes('touch-action:pan-y'), 'celebration card must allow vertical touch scrolling');
assert(card.includes('-webkit-overflow-scrolling:touch'), 'celebration card must support momentum scrolling on iOS');
assert(card.includes('max-height:calc(100dvh - 16px)'), 'landscape short viewports must retain an inset-safe card height');
assert(verify.includes('tests/utsu-card-celebration-mobile-audit.cjs'), 'verify.sh must run the 21E mobile audit');

console.log('UtsuCard 21E mobile audit passed: celebration cards contain touch scrolling and remain safe on short viewports.');
