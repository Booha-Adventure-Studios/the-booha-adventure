#!/usr/bin/env node
'use strict';

// Pass 20F: procedural audio belongs to the two stable Wanderer celebrations.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'karasuki.html'), 'utf8');

assert(sfx.includes('window.AudioContext || window.webkitAudioContext'), 'celebration audio must use the existing WebAudio-compatible path');
assert(sfx.includes('wandererFound: function ()'), 'first discovery needs a dedicated synthesized motif');
assert(sfx.includes('wandererReturn: function ()'), 'return celebration needs a dedicated synthesized motif');
assert(/wandererFound: function \(\)[\s\S]*?tone\(/.test(sfx), 'discovery motif must synthesize tones');
assert(/wandererReturn: function \(\)[\s\S]*?tone\(/.test(sfx), 'return motif must synthesize tones');
assert(card.includes('if (opts.sfx && window.UtsuSfx'), 'shared celebration card must route optional SFX names');
assert(card.includes('window.UtsuSfx[opts.sfx]();'), 'shared celebration card must invoke the requested procedural motif');
assert(karasuki.includes("sfx: 'wandererFound'"), 'new Wanderer celebration must request the discovery motif');
assert(karasuki.includes("sfx: 'wandererReturn'"), 'return Wanderer celebration must request the reunion motif');
assert(page.includes('<script src="js/utsu-sfx.js"></script>'), 'Karasuki must load the shared SFX helper');

console.log('Karasuki 20F celebration audio audit passed: first-discovery and return cards use distinct lightweight procedural WebAudio motifs.');
