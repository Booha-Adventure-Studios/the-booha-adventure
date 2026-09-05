#!/usr/bin/env node
'use strict';

// Utsuroba Pass 1: keep the world, app shell, modal surfaces, and phone
// orientation fallback tied to the visible mobile viewport.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('function currentUtsurobaViewport()'),
  'Utsuroba must centralize visible viewport measurements');
assert(runtime.includes('window.visualViewport'),
  'Utsuroba must prefer the visual viewport on mobile browsers');
assert(runtime.includes("document.documentElement.style.setProperty('--utsuroba-viewport-height'"),
  'Utsuroba must expose live viewport CSS variables');
assert(runtime.includes('const scale = Math.max(width/WORLD_W, height/WORLD_H);'),
  'Utsuroba stage fitting must use the visible viewport');
assert(runtime.includes('function bindUtsurobaViewportMetrics()'),
  'Utsuroba must bind one coalesced viewport refresh path');
assert(runtime.includes("window.visualViewport.addEventListener('scroll', refresh"),
  'visual viewport scroll changes must refresh fixed mobile surfaces');
assert(runtime.includes('function isUtsurobaPhoneViewport()') && runtime.includes('Math.min(width, height) <= 540'),
  'Utsuroba orientation fallback must remain phone-only');
assert(runtime.includes('function updateUtsurobaOrientationGate()') && runtime.includes("classList.toggle('is-visible', needsLandscape)"),
  'Utsuroba orientation fallback must be controlled by runtime state');
assert(runtime.includes("#rotate-overlay.is-visible{display:flex !important;}"),
  'Utsuroba must not use a universal portrait media-query gate');
assert(!runtime.includes('@media screen and (orientation:portrait) and (max-width:1023px)'),
  'Utsuroba must remove the broad portrait media-query gate');
assert(runtime.includes('env(safe-area-inset-top,0px)') && runtime.includes('env(safe-area-inset-bottom,0px)'),
  'Utsuroba modal surfaces and rotate gate must respect safe areas');
assert(!runtime.includes('max-height:calc(100vh - 36px)'),
  'Utsuroba modal cards must not size from the stale layout viewport');
assert(serviceWorker.includes("assets: 'booha-assets-2026-524'"),
  'Utsuroba viewport changes must bump the asset cache');
assert(verify.includes('tests/utsuroba-pass1-viewport-audit.cjs'),
  'verify.sh must run the Utsuroba Pass 1 viewport audit');

console.log('Utsuroba Pass 1 viewport audit passed: visible viewport sizing, safe-area modal bounds, and phone-only orientation fallback are wired.');
