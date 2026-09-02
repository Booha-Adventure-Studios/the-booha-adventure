#!/usr/bin/env node
'use strict';

// Pass 27C: phone popup presentation is portrait-safe without changing the
// established tablet/desktop landscape experience.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

assert(source.includes("document.documentElement.classList.toggle('muenba-phone-portrait', phone && orientationMode === 'portrait');"),
  'portrait popup styling must be scoped to phone portrait mode');
assert(source.includes("document.documentElement.classList.toggle('muenba-phone-landscape', phone && orientationMode === 'landscape');"),
  'phone landscape mode must remain explicit for the explorable world');
assert(source.includes('html.muenba-phone-portrait #muenba-lobby-overlay'),
  'lobby popup must have a phone portrait presentation');
assert(source.includes('html.muenba-phone-portrait #muenba-capture-overlay'),
  'capture and rhythm popup must have a phone portrait presentation');
assert(source.includes('html.muenba-phone-portrait #muenba-return-overlay'),
  'return popup must have a phone portrait presentation');
assert(source.includes('max-height:calc(100dvh - 20px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))'),
  'portrait popup cards must fit within dynamic viewport safe areas');
assert(source.includes('overscroll-behavior:contain; touch-action:pan-y;'),
  'portrait popup scrolling must stay inside the modal instead of chaining to the page');
assert(source.includes('html.muenba-phone-portrait .muenba-rhythm-board { height:clamp(160px,32vh,250px); min-height:0;'),
  'portrait rhythm boards must remain compact and playable');
assert(source.includes('html.muenba-phone-portrait .muenba-case-choice { min-height:58px;'),
  'portrait comprehension choices must retain a comfortable touch target');

console.log('Muenba 27C portrait-popup audit passed: phone-only portrait cards, safe-area scrolling, and compact rhythm layout are wired.');
