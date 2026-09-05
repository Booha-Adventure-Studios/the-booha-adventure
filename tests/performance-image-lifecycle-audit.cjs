#!/usr/bin/env node
'use strict';

// Performance Passes 6–7: room-scoped Drifter art and celebration-scoped
// Grimmerglen dance art must release decoded image resources after use.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const utsuroba = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const grimmerglen = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(utsuroba.includes('function releaseUtsurobaImage(image)'), 'Utsuroba must provide an explicit Drifter image release helper');
assert(utsuroba.includes("image.img.removeAttribute('src')"), 'Utsuroba release must clear the image source safely');
assert(utsuroba.includes('image.requested = false'), 'released Drifter descriptors must be reusable on room re-entry');
assert(utsuroba.includes('function trimDrifterImagesToRoom(roomId)'), 'Utsuroba must define room-scoped Drifter image trimming');
assert(utsuroba.includes('trimDrifterImagesToRoom(roomId);'), 'Utsuroba room changes must trim departed Drifter images');

assert(grimmerglen.includes('function releaseGrimmerglenDanceImages()'), 'Grimmerglen must provide a dance-image release helper');
assert(grimmerglen.includes('grimmerglenDanceImages = null'), 'Grimmerglen must drop the dance-image descriptor after release');
assert(grimmerglen.includes('releaseGrimmerglenDanceImages();'), 'Grimmerglen must release dance images when the celebration finishes');
assert(grimmerglen.includes('ensureGrimmerglenDanceImages();'), 'Grimmerglen must rebuild dance images for a later celebration');

assert(verify.includes('tests/performance-image-lifecycle-audit.cjs'), 'verify.sh must run the image-lifecycle audit');
assert(sw.includes('booha-assets-2026-525'), 'image lifecycle changes must bump the asset cache');

console.log('Performance Passes 6–7 image lifecycle audit passed: Drifter art is room-scoped and Grimmerglen dance art is celebration-scoped.');
