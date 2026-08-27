#!/usr/bin/env node
'use strict';

// Pass 20H: Wanderer copy stays readable in front of large art, and the
// four-figure Observer card keeps its deliberately slime-green identity.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(card.includes('.utsu-celebration-copy{position:relative;z-index:4'), 'celebration copy needs a foreground stacking layer');
assert(card.includes('.utsu-celebration-card.is-copy-overlay .utsu-celebration-copy'), 'overlay styling must be opt-in for the Wanderer cards');
assert(card.includes('background:linear-gradient(180deg,rgba(4,14,11,.92),rgba(4,10,8,.80))'), 'foreground copy needs a readable dark glow surface');
assert(card.includes('width:100%;height:100%;object-fit:contain'), 'all Wanderer portraits must share a constrained contain frame');
assert(card.includes('width:min(340px,74vw);height:min(360px,42vh)'), 'desktop portrait frame must preserve the large shared scale');
assert(card.includes('width:min(270px,72vw);height:min(280px,38vh)'), 'mobile portrait frame must remain large but screen-safe');

assert((karasuki.match(/copyOverlay: true/g) || []).length >= 2, 'discovery and return cards must both use the foreground copy treatment');
assert(karasuki.includes('alt="The Observers"'), 'Observer artwork alt text must reflect the four-figure group');
assert(karasuki.includes('>THE OBSERVERS</h2>'), 'Observer heading must use the plural group name');
assert(karasuki.includes('>観察者たち</p>'), 'Observer Japanese heading must match the plural group');
assert(karasuki.includes('rgba(163,230,53,0.72)'), 'Observer card must use a slime-green border');
assert(karasuki.includes('rgba(101,163,13,0.5)'), 'Observer card must carry the slime-green outer glow');
assert(karasuki.includes('linear-gradient(90deg,#365314,#65a30d,#a3e635,#d9f99d)'), 'Observer meter must use green hues');
assert(karasuki.includes("observerPopEl.style.background = 'rgba(1,8,1,0.90)'"), 'Observer backdrop must keep the spooky green cast');
assert(verify.includes('tests/karasuki-celebration-visual-audit.cjs'), 'verify.sh must run the visual integration audit');

console.log('Karasuki 20H visual audit passed: Wanderer copy overlays the art safely, portrait scale is normalized, and the Observer group uses a spooky slime-green treatment.');
