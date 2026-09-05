#!/usr/bin/env node
'use strict';

// Utsuroba Pass 3: avoid paying desktop canvas and animation costs on touch
// devices, and stop the world loop while a DOM modal owns the foreground.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('const TOUCH_MAX_DPR = Math.min(MAX_DPR, 1.5);'),
  'touch devices must have a lower canvas DPR ceiling than desktop');
assert(runtime.includes('function targetCanvasDpr()')
  && runtime.includes('return isTouchDevice ? TOUCH_MAX_DPR : MAX_DPR;'),
  'canvas sizing must select the touch-aware DPR before allocation');
assert(runtime.includes('function pauseUtsurobaFrameLoop()')
  && runtime.includes('cancelAnimationFrame(rafHandle)'),
  'Utsuroba must cancel the world frame loop when a modal opens');
assert(runtime.includes('!staticFrameOverlayOpen() && !state.exitingToKarasuki'),
  'the scheduler must not restart the world behind a static modal or exit transition');
assert(runtime.includes('if (staticFrameOverlayOpen() || state.exitingToKarasuki) {')
  && runtime.includes('pauseUtsurobaFrameLoop();\n      return;'),
  'the frame loop must pause before simulation or drawing under a modal');
assert(runtime.includes('onClose: () => { state.inputLocked = false; scheduleUtsurobaFrame(); }')
  && runtime.includes('state.inputLocked = false;\n        scheduleUtsurobaFrame();'),
  'reading surfaces must explicitly resume the world loop on close');
assert(runtime.includes('scheduleUtsurobaFrame();\n    try { playUtsurobaMusic(); }'),
  'drifter popup close must resume scheduling');
assert(runtime.includes("serviceWorkerCacheVersion: 'booha-assets-2026-525'"),
  'the performance overlay must report the current asset cache version');
assert(serviceWorker.includes("assets: 'booha-assets-2026-525'"),
  'Utsuroba performance changes must bump the asset cache');
assert(verify.includes('tests/utsuroba-pass3-performance-audit.cjs'),
  'verify.sh must run the Utsuroba Pass 3 performance audit');

console.log('Utsuroba Pass 3 performance audit passed: touch DPR budgeting and modal frame-loop suspension/resume are wired.');
