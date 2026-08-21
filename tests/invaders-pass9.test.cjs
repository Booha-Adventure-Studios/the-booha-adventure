#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'booha_invaders.html'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'theme/invaders.css'), 'utf8');

// The full save-menu stack must be loaded, in the same order Destruction
// loads it, after unlock-system.js and before the bonus-gate check (so the
// core stack + save systems are ready before that gate evaluates).
const unlockIdx = page.indexOf('core/unlock-system.js');
const gateIdx = page.indexOf("GAME_ID = 'booha_invaders'");
assert.notStrictEqual(unlockIdx, -1);
assert.notStrictEqual(gateIdx, -1);
for (const src of ['core/save-utils.js', 'core/save-code.js', 'ui/memory-code-ui.js', 'ui/save-menu.js']) {
  const idx = page.indexOf(src);
  assert.notStrictEqual(idx, -1, `missing script: ${src}`);
  assert.ok(idx > unlockIdx && idx < gateIdx, `${src} must load after unlock-system.js and before the bonus gate`);
}
assert.match(page, /<link rel="stylesheet" href="\.\/theme\/save-ui\.css"\/>/);

// save-ui.css must be linked before invaders.css so invaders.css's :root
// z-index override (below) actually wins the cascade.
assert.ok(page.indexOf('theme/save-ui.css') < page.indexOf('theme/invaders.css'));

// BoohaSaveMenu.init() must run on boot, skipping the floating toggle
// (Invaders has its own dedicated buttons instead), same as Destruction.
assert.match(page, /BoohaSaveMenu\.init\(\)\.then/);
assert.match(page, /booha-save-toggle/);

// Title screen: a SAVE MENU button lives beside Continue and opens the
// panel directly (not gated behind having a checkpoint).
assert.match(page, /id="invadersSaveMenuBtn"/);
const savePanelHtml = page.slice(page.indexOf('id="invadersSavePanel"'), page.indexOf('id="startBtn"'));
assert.match(savePanelHtml, /id="invadersSaveMenuBtn"/, 'save menu button must be inside #invadersSavePanel');
assert.doesNotMatch(savePanelHtml.slice(savePanelHtml.indexOf('invadersSaveMenuBtn') - 40, savePanelHtml.indexOf('invadersSaveMenuBtn')), /hidden/,
  'save menu button should not be hidden the way the checkpoint-only Continue button is');
assert.match(engine, /getElementById\("invadersSaveMenuBtn"\)/);
assert.match(engine, /saveMenuBtn\.addEventListener\("click", \(\) => \{ if \(window\.BoohaSaveMenu\) BoohaSaveMenu\.open\(\); \}\)/);

// Pause menu: a SAVE row sits between RESUME and EXIT, drawn with its own
// hit-rect, and wired in both pointerdown paths (desktop canvas + the
// coarse-pointer mobileHoldControls listener) without unpausing/exiting.
assert.match(engine, /const PAUSE_SAVE_BTN = \{ x: 0, y: 0, w: 0, h: 0 \}/);
const pauseDraw = engine.slice(engine.indexOf('function drawPauseOverlay'), engine.indexOf('function getStarRating'));
assert.match(pauseDraw, /PAUSE_SAVE_BTN\.x=saveX/);
assert.match(pauseDraw, /💾 SAVE/);
assert.match(pauseDraw, /セーブ/);
// Save button must be positioned between resume and exit.
assert.ok(pauseDraw.indexOf('PAUSE_SAVE_BTN.x=saveX') < pauseDraw.indexOf('PAUSE_EXIT_BTN.x=exitX'));

const saveHandlers = engine.match(/if \(e\.clientX>=sv\.x&&e\.clientX<=sv\.x\+sv\.w&&e\.clientY>=sv\.y&&e\.clientY<=sv\.y\+sv\.h\) \{\n\s*if \(window\.BoohaSaveMenu\) BoohaSaveMenu\.open\(\);\n\s*return;\n\s*\}/g);
assert.strictEqual(saveHandlers ? saveHandlers.length : 0, 2, 'save hit-test must be wired in both the canvas and mobileHoldControls pointerdown handlers');

// Opening the save menu from pause must not itself unpause/navigate — that
// branch returns before the resume/exit logic runs.
const canvasPause = engine.slice(engine.indexOf('canvas.addEventListener("pointerdown"'), engine.indexOf('canvas.addEventListener("pointermove"'));
assert.match(canvasPause, /sv\.x[\s\S]*?BoohaSaveMenu\.open\(\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*if \(e\.clientX>=ex\.x/);

// z-index override: save-ui.css's stack must be raised above both
// #mobileHoldControls (9990) and #startOverlay (9999) or the save panel
// would be visually correct but untappable on coarse/touch devices.
assert.match(css, /--booha-z-panel:\s*99901/);
assert.match(css, /--booha-z-overlay:\s*99900/);

console.log('Booha Invaders pass 9 checks passed.');
