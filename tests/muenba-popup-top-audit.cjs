#!/usr/bin/env node
'use strict';

// Pass 27B: popup focus must never pull a long Muenba card away from its
// opening line after the browser performs its normal focus/layout cycle.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

assert(source.includes("function resetMuenbaPopupScroll(overlay, cardSelector = '.muenba-lobby-box')"),
  'Muenba must centralize overlay/card scroll resets');
assert(source.includes('overlay.scrollTop = 0;') && source.includes('overlay.scrollLeft = 0;'),
  'popup overlays must reset both scroll axes');
assert(source.includes('card.scrollTop = 0;') && source.includes('card.scrollLeft = 0;'),
  'popup cards must reset both scroll axes');
assert(source.includes('function resetMuenbaPopupScrollAfterLayout(overlay'),
  'popup resets must survive the browser focus/layout cycle');
assert(source.includes("control.focus({ preventScroll: true });\n      resetMuenbaPopupScrollAfterLayout(captureOverlay);"),
  'capture focus must not move the reading card down the page');
assert(source.includes("control.focus({ preventScroll: true });\n      resetMuenbaPopupScrollAfterLayout(lobbyOverlay);"),
  'lobby focus must not move the long Nuppi card down the page');
assert(source.includes("resetMuenbaPopupScrollAfterLayout(returnPortalOverlay, '.muenba-return-box');"),
  'the return popup must also reopen from its initial position');
assert(!/control\.focus\(\);/.test(source),
  'Muenba must not use an unguarded focus call that can scroll a popup');

console.log('Muenba 27B popup-top audit passed: lobby, capture, and return popups reset after focus and layout.');
