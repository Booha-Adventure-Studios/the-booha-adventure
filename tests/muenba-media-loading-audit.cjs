#!/usr/bin/env node
'use strict';

// Pass 26D: Muenba must use the migrated shared dance art and request it only
// when the energy-return celebration begins.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const danceFiles = [
  'booha_ghost_dance_arms_up.webp',
  'booha_ghost_dance_sway.webp',
  'booha_ghost_dance_wave.webp',
];

assert(muenba.includes('function makeMuenbaDeferredImage(src)'), 'Muenba must define a deferred dance-image factory');
assert(muenba.includes('function ensureMuenbaImage(image)'), 'Muenba must define a deferred dance-image request helper');
for (const name of danceFiles) {
  assert(muenba.includes(`makeMuenbaDeferredImage('assets/img/${name}')`), `Muenba must use the migrated ${name} path`);
  assert(fs.existsSync(path.join(root, 'assets', 'img', name)), `${name} must exist on disk`);
}
assert(muenba.includes('MUENBA_DANCE_FRAMES.forEach(frame => ensureMuenbaImage(frame.img));'), 'dance art must request at celebration start');
assert(muenba.includes('const boohaSprite = dancing ? ensureMuenbaImage(danceFrame.img)'), 'dance rendering must resolve deferred art');
assert(!/dance(?:ArmsUp|Sway|Wave)Img\.src\s*=\s*['"][^'"]+\.png/.test(muenba), 'Muenba must not assign retired dance PNG paths');
assert(!/dance(?:ArmsUp|Sway|Wave)Img\s*=\s*new Image\(\);[^\n]*\.src\s*=/.test(muenba), 'dance frames must not request art at declaration time');
assert(sw.includes('booha-assets-2026-515'), 'service-worker asset cache must include the current Muenba canonical target bump');

console.log('Muenba 26D media audit passed: shared dance WebP assets are deferred until celebration and remain compatible with the existing dance flow.');
