#!/usr/bin/env node
'use strict';

// Pass 25C: Utsuroba requests drifter and celebration artwork only when it
// becomes visible or the celebration actually starts.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const utsuroba = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(utsuroba.includes('function makeUtsurobaDeferredImage(src)'), 'Utsuroba must define a deferred image factory');
assert(utsuroba.includes('function ensureUtsurobaImage(image)'), 'Utsuroba must define a deferred image request helper');
assert(utsuroba.includes('img1: makeUtsurobaDeferredImage(d.sprite1)'), 'drifter idle images must not request at boot');
assert(utsuroba.includes('img2: makeUtsurobaDeferredImage(d.sprite2)'), 'drifter engaged images must not request at boot');
assert(utsuroba.includes('const img         = ensureUtsurobaImage(useImg2 ? imgs.img2 : imgs.img1);'), 'visible drifters must request only the active frame');
assert(utsuroba.includes('const img  = ensureUtsurobaImage(imgs.img1);'), 'drifter hit testing must request the idle frame when needed');
assert(utsuroba.includes("const danceArmsUpImg = makeUtsurobaDeferredImage('./assets/img/booha_ghost_dance_arms_up.webp');"), 'dance arms-up art must not request at boot');
assert(utsuroba.includes("const danceSwayImg   = makeUtsurobaDeferredImage('./assets/img/booha_ghost_dance_sway.webp');"), 'dance sway art must not request at boot');
assert(utsuroba.includes("const danceWaveImg   = makeUtsurobaDeferredImage('./assets/img/booha_ghost_dance_wave.webp');"), 'dance wave art must not request at boot');
assert(utsuroba.includes('DANCE_FRAMES.forEach(frame => ensureUtsurobaImage(frame.img));'), 'dance art must request at celebration start');
assert(utsuroba.includes('drawImg   = ensureUtsurobaImage(frame.img);'), 'dance rendering must use the deferred image result');
assert(!/const load = src => \{ const img = new Image\(\); img\.src = src; return img; \};/.test(utsuroba), 'Utsuroba must not preload every drifter at declaration time');
assert(!/const dance(?:ArmsUp|Sway|Wave)Img\s*= new Image\(\);[^\n]*\.src\s*=/.test(utsuroba), 'dance frames must not assign src at declaration time');
assert(sw.includes('booha-assets-2026-458'), 'service-worker asset cache must include the current Marietta help-gating bump');

console.log('Utsuroba 25C image-loading audit passed: drifter and dance artwork requests are deferred until needed.');
