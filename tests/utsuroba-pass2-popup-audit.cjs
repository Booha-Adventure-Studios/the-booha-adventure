#!/usr/bin/env node
'use strict';

// Utsuroba Pass 2: popup surfaces should be comfortable to scroll, easy to
// tap, and consistent about focus, Escape, and backdrop dismissal.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('scrollbar-gutter:stable') && runtime.includes('overscroll-behavior:contain'),
  'Utsuroba scrollable cards must contain momentum and reserve a stable scrollbar gutter');
assert(runtime.includes('#utsuroba-drifter-panel .dp-btn{min-height:44px;}'),
  'drifter actions must meet the mobile touch target minimum');
assert(runtime.includes('#utsuroba-exit-overlay button{min-width:44px;min-height:44px;}'),
  'exit popup controls must meet the mobile touch target minimum');
assert(runtime.includes('.memory-convergence-clue-choice,.memory-convergence-choice,.reading-journal-word,.reading-word-practice-option{min-height:44px;}'),
  'reading and convergence choices must meet the mobile touch target minimum');
assert(runtime.includes("trapOverlayFocus(utsuProfileOverlay, event)")
  && runtime.includes("trapOverlayFocus(gardenOverlay, event)")
  && runtime.includes("trapOverlayFocus(convergenceOverlay, event)"),
  'Utsuroba full-screen popups must trap keyboard focus');
assert(runtime.includes("trapOverlayFocus(drifterPanel, e)")
  && runtime.includes("trapOverlayFocus(exitPopOverlay, e)"),
  'Utsuroba compact popups must also trap keyboard focus');
assert(runtime.includes("setAttribute('aria-modal', 'true')")
  && runtime.includes("setAttribute('aria-hidden', 'false')"),
  'Utsuroba popup state must be exposed to assistive technology');
assert(runtime.includes('PreviousFocus = document.activeElement')
  && runtime.includes('focus({ preventScroll: true })'),
  'Utsuroba popups must restore focus without jumping the viewport');
assert(runtime.includes('requestAnimationFrame(() => document.getElementById(\'utsuroba-exit-close\')?.focus())'),
  'exit popup must focus its close control on open');
assert(runtime.includes("requestAnimationFrame(() => gardenOverlay?.querySelector('.memory-garden-close')?.focus())")
  && runtime.includes("requestAnimationFrame(() => convergenceOverlay?.querySelector('.memory-convergence-close')?.focus())"),
  'memory popups must focus their close control on open');
assert(serviceWorker.includes("assets: 'booha-assets-2026-518'"),
  'Utsuroba popup changes must bump the asset cache');
assert(verify.includes('tests/utsuroba-pass2-popup-audit.cjs'),
  'verify.sh must run the Utsuroba Pass 2 popup audit');

console.log('Utsuroba Pass 2 popup audit passed: touch targets, scroll containment, focus traps, and popup focus restoration are wired.');
