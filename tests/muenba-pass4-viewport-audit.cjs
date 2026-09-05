#!/usr/bin/env node
'use strict';

// Pass 4: Muenba's world shell and stage fit must follow the visible mobile
// viewport, while its existing phone popup/orientation handoff remains intact.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('#muenba-app { position:relative; width:var(--muenba-viewport-width,100vw); height:var(--muenba-viewport-height,100dvh);'),
  'Muenba app shell must use the visible viewport dimensions');
assert(runtime.includes("document.documentElement.style.setProperty('--muenba-viewport-width'"),
  'Muenba must publish visible viewport width for shell sizing');
assert(runtime.includes('const { width, height } = currentMuenbaViewport();\n    const scale = Math.max(width / WORLD_W, height / WORLD_H);'),
  'Muenba stage fitting must use the visible viewport');
assert(runtime.includes('let muenbaViewportRefreshFrame = 0;')
  && runtime.includes('if (muenbaViewportRefreshFrame) return;'),
  'Muenba viewport refreshes must be coalesced');
assert(runtime.includes("window.visualViewport.addEventListener('scroll', refreshMuenbaViewport"),
  'Muenba must refresh fixed surfaces when the visual viewport scrolls');
assert(!runtime.includes("window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });"),
  'Muenba must keep one coordinated viewport refresh path');
assert(runtime.includes('env(safe-area-inset-top,0px)')
  && runtime.includes('overscroll-behavior:none; touch-action:none;'),
  'Muenba rotate guidance must respect safe areas and own the gesture');
assert(runtime.includes("serviceWorkerCacheVersion: 'booha-assets-2026-524'"),
  'Muenba performance telemetry must report the current asset cache version');
assert(serviceWorker.includes("assets: 'booha-assets-2026-524'"),
  'Muenba viewport changes must bump the asset cache');
assert(verify.includes('tests/muenba-pass4-viewport-audit.cjs'),
  'verify.sh must run the Muenba Pass 4 viewport audit');

console.log('Muenba Pass 4 viewport audit passed: visible-viewport shell sizing, coalesced stage fitting, and safe-area rotate guidance are wired.');
