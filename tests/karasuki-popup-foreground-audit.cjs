#!/usr/bin/env node
'use strict';

// Pass 20I: Wanderer celebrations have one clear action in the foreground,
// while Nuppi gets a distinct black-and-pink character treatment.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(!card.includes('utsu-celebration-close'), 'Wanderer celebration cards must not render a competing X control');
assert(/utsu-celebration-copy"><h2[\s\S]*utsu-celebration-action/.test(card), 'the celebration action must live inside the foreground copy layer');
assert(card.includes('card.classList.toggle(\'is-copy-overlay\', opts.copyOverlay === true)'), 'celebration cards must be able to opt into the foreground layer');
assert(card.includes('action.onclick = dismiss'), 'the primary celebration action must remain the dismissal path');

const nuppi = karasuki.slice(karasuki.indexOf('function injectNuppiPop()'), karasuki.indexOf('function openNuppiPop()'));
assert(nuppi.includes('background:radial-gradient(circle at 50% 0%,rgba(255,119,200,.22)'), 'Nuppi popup must have a pink-on-black background');
assert(nuppi.includes('border:2px solid rgba(255,105,180,0.62)'), 'Nuppi popup must have a vivid pink border');
assert(nuppi.includes('box-shadow:0 0 0 1px rgba(255,209,236,.12),0 0 28px rgba(255,79,163,.52)'), 'Nuppi popup must have a soft pink celebration glow');
assert(nuppi.includes('>NUPPI SAYS ♡</p>'), 'Nuppi popup must feel like a character message, not a generic log');
assert(nuppi.includes('>ヌーピーからのひとこと</p>'), 'Nuppi popup must include its cute Japanese identity label');
assert(nuppi.includes('alt="Nuppi"'), 'Nuppi artwork must have accessible alt text');
assert(karasuki.includes("nuppiPopEl.style.background = 'rgba(10,0,8,0.92)'"), 'Nuppi backdrop must keep the black-and-pink mood');
assert(verify.includes('tests/karasuki-popup-foreground-audit.cjs'), 'verify.sh must run the foreground/Nuppi audit');

console.log('Karasuki 20I popup audit passed: Wanderer actions stay in front without an X control, and Nuppi has a readable black-and-pink character popup.');
