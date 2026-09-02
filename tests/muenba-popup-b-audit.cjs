#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

for (const overlay of ['#muenba-return-overlay', '#muenba-lobby-overlay', '#muenba-capture-overlay']) {
  const start = source.indexOf(`${overlay} {`);
  assert(start >= 0, `${overlay} must remain declared`);
  const end = source.indexOf('\n', start);
  const rule = source.slice(start, end);
  assert(rule.includes('overflow:hidden;'), `${overlay} must not own a competing scroll surface`);
  assert(rule.includes('overscroll-behavior:contain;'), `${overlay} must contain edge gestures`);
}

assert(source.includes('.muenba-lobby-box { position:relative; box-sizing:border-box; width:min(480px,100%); max-height:calc(100vh - 40px); max-height:calc(100dvh - 40px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)); margin:0 auto; overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;'),
  'lobby cards must own safe-area-aware vertical scrolling');
assert(source.includes('.muenba-return-box { box-sizing:border-box; width:min(420px,calc(100% - 40px)); max-height:calc(100dvh - 40px); overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;'),
  'return cards must own vertical scrolling');
assert(source.includes('height:clamp(160px,32vh,250px); min-height:0;'),
  'rhythm boards must scale between short-phone and desktop heights');
assert(source.includes('.muenba-rhythm-lane { position:relative; min-width:0; min-height:0; height:100%;'),
  'rhythm lanes must fill the responsive board without a fixed-height conflict');
assert(!source.includes('html.muenba-phone-portrait .muenba-rhythm-board { height:min(42dvh,250px); min-height:190px;'),
  'portrait rhythm sizing must not restore the old fixed minimum');
assert(source.includes('function resetMuenbaPopupScroll(') && source.includes('function resetMuenbaPopupScrollAfterLayout('),
  'existing popup scroll-reset helpers must remain in place');

console.log('Muenba Pass B popup-shell audit passed.');
