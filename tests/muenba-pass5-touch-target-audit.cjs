#!/usr/bin/env node
'use strict';

// Pass 5: finish Muenba's small-screen touch-target pass for controls that
// remain reachable outside the large reading/case buttons.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('.muenba-return-actions button { flex:1; max-width:150px; min-height:48px;'),
  'return popup actions must have a comfortable phone touch target');
assert(runtime.includes('#muenba-hide { position:fixed') && runtime.includes('min-height:44px; border:1px solid rgba(156,203,182,.72)'),
  'the free-roam Hide control must meet the touch-target minimum');
assert(runtime.includes('width:44px; height:44px; min-width:44px; min-height:44px;')
  && runtime.includes('.muenba-rhythm-help-button'),
  'rhythm help must be a full-size touch target');
assert(runtime.includes('.muenba-mission-hint-toggle { display:inline-flex')
  && runtime.includes('min-height:44px; margin:4px 0 0;'),
  'the mission hint toggle must meet the touch-target minimum');
assert(runtime.includes('html.muenba-phone-portrait .muenba-lobby-actions button,')
  && runtime.includes('min-height:48px;'),
  'portrait popup action controls must retain their larger phone target');
assert(runtime.includes("serviceWorkerCacheVersion: 'booha-assets-2026-525'"),
  'Muenba performance telemetry must report the current asset cache version');
assert(serviceWorker.includes("assets: 'booha-assets-2026-525'"),
  'Muenba touch-target changes must bump the asset cache');
assert(verify.includes('tests/muenba-pass5-touch-target-audit.cjs'),
  'verify.sh must run the Muenba Pass 5 touch-target audit');

console.log('Muenba Pass 5 touch-target audit passed: return, Hide, rhythm-help, mission-hint, and portrait popup controls meet mobile sizing contracts.');
