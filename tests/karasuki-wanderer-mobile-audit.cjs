#!/usr/bin/env node
'use strict';

// Pass 21B: stable Wanderer cards remain readable and usable on phone/tablet
// viewports while preserving the large portrait treatment.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(card.includes('width:min(620px,calc(100% - 2px))'), 'celebration card needs a mobile-safe width guard');
assert(card.includes('max-height:min(86dvh,720px)'), 'celebration card needs dynamic viewport-height support');
assert(card.includes('env(safe-area-inset-top)'), 'mobile celebration padding must respect the safe area');
assert(card.includes('width:min(230px,60vw,100%)'), 'mobile portraits must retain a large responsive frame');
assert(card.includes('@media(max-height:620px) and (orientation:landscape)'), 'short landscape screens need a dedicated compact rule');
assert(card.includes('max-height:calc(100dvh - 16px)'), 'short landscape cards must fit inside the dynamic viewport');
assert(card.includes('min-height:48px'), 'celebration actions must remain comfortable tap targets');
assert(card.includes('overflow:auto'), 'long celebration content must scroll instead of clipping');
assert(source.includes('copyCompact: true'), 'Karasuki Wanderer cards must use the responsive compact-copy variant');
assert(verify.includes('tests/karasuki-wanderer-mobile-audit.cjs'), 'verify.sh must run the 21B mobile audit');

console.log('Karasuki 21B mobile audit passed: Wanderer cards have safe-area spacing, dynamic viewport guards, large responsive portraits, and usable action targets.');
