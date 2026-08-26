#!/usr/bin/env node
'use strict';

// Pass 17A: popup positioning and scroll-reset regression guard.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

assert(source.includes('#muenba-lobby-overlay { position:fixed; inset:0; z-index:210; display:none; align-items:flex-start;'),
  'lobby popups must open from the top of the viewport');
assert(source.includes('#muenba-capture-overlay { position:fixed; inset:0; z-index:215; display:none; align-items:flex-start;'),
  'capture popups must open from the top of the viewport');
assert(source.includes('overflow-y:auto; background:rgba(0,0,0,0); transition:background .4s ease; padding:max(20px,env(safe-area-inset-top,0px))'),
  'popup overlays must preserve a safe top inset and remain scrollable');
assert(source.includes('max-height:calc(100dvh - 40px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))'),
  'popup cards must fit between mobile safe-area insets');
assert(source.includes('function focusLobbyControl(selector)'), 'lobby scenes need a shared focus/reset helper');
assert(source.includes('box.scrollTop = 0;\n      box.scrollLeft = 0;'),
  'lobby scene replacements must reset to their first line');
assert(source.includes('captureOverlay.appendChild(box);\n    // Every capture scene is a fresh reading/game card.'),
  'capture scene replacements must reset their scroll container');
assert(source.includes('box.scrollTop = 0;\n    box.scrollLeft = 0;\n    return box;'),
  'capture cards must start at scroll position zero');

console.log('Muenba popup audit passed: top anchoring, safe-area spacing, scrollability, and scene reset contracts.');
