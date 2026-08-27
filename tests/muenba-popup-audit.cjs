#!/usr/bin/env node
'use strict';

// Pass 17A: popup positioning and scroll-reset regression guard.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

assert(source.includes('#muenba-lobby-overlay { position:fixed; inset:0; z-index:210; display:none; align-items:flex-start;'),
  'lobby popups must open from the top of the viewport');
assert(source.includes('#muenba-capture-overlay { position:fixed; inset:0; z-index:215; display:none; align-items:flex-start;'),
  'capture popups must open from the top of the viewport');
assert(source.includes('overflow-y:auto; background:rgba(0,0,0,0); transition:background .4s ease; padding:max(20px,env(safe-area-inset-top,0px))'),
  'popup overlays must preserve a safe top inset and remain scrollable');
assert(source.includes('max-height:calc(100dvh - 40px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))'),
  'popup cards must fit between mobile safe-area insets');
assert(source.includes('function focusLobbyControl(selector)'), 'lobby scenes need a shared focus/reset helper');
assert(source.includes('box.scrollTop = 0;\n      box.scrollLeft = 0;'),
  'lobby scene replacements must reset to their first line');
assert(source.includes('captureOverlay.appendChild(box);\n    // Every capture scene is a fresh reading/game card.'),
  'capture scene replacements must reset their scroll container');
assert(source.includes('box.scrollTop = 0;\n    box.scrollLeft = 0;') && source.includes('return box;'),
  'capture cards must start at scroll position zero');
assert(source.includes('captureOverlay.scrollTop = 0;\n    captureOverlay.scrollLeft = 0;'),
  'capture scene replacements must also reset the overlay scroll container');
assert(source.includes("control.focus({ preventScroll: true })"),
  'capture control focus must not scroll a long popup away from its opening position');
assert(source.includes('function clearCaseReadGate(session)'),
  'capture reading timers must have an explicit cancellation boundary');
assert(source.includes('muenba-case-energy-start'),
  'solved capture cards must expose an explicit energy-collection action');
assert(source.includes('id = \'muenba-dev-capture-hold\''),
  'DEV capture popups must expose a screenshot hold control');
assert(source.includes('Pause timed reading or transition callbacks for screenshots'),
  'the DEV screenshot control must explain what it pauses');
assert(source.includes('function setDevCaptureHold(held)'),
  'DEV screenshot hold must be session-scoped and reversible');
assert(source.includes('min-height:120px; box-sizing:border-box; padding:20px 20px 19px;'),
  'case reading records must reserve a stable, spacious English surface');
assert(source.includes('font-size:clamp(1.18rem,2.1vw,1.625rem) !important; line-height:1.85 !important;'),
  'case reading records must use the 19C hero typography and line spacing');
assert(source.includes('.muenba-case-choice { min-height:62px !important; padding:16px 20px !important;'),
  'case answer choices must remain comfortable touch targets');
assert(!source.includes('appendCaseGlossary') && !source.includes('muenba-case-glossary'),
  'case popups must not repeat highlighted vocabulary in a competing chip row');
assert(source.includes('id="muenba-mission-hint-toggle"') && source.includes('missionHint.hidden = !showing'),
  'the welcome mission must keep Japanese scaffolding behind an explicit hint');
assert(source.includes('id="muenba-case-board-eyebrow"') && source.includes('CASE FILE ${String(caseNumber).padStart(2, \'0\')}'),
  'the case board must use one numbered eyebrow above the case title');
assert(!source.includes("'muenba-case-record-instruction muenba-case-read-instruction'") && !source.includes("'muenba-case-read-instruction'"),
  'case intro and clue scenes must not render an empty READ instruction card');
assert(source.includes('.muenba-lobby-box { overflow-x:hidden; }') && source.includes('overflow-wrap:anywhere;'),
  'responsive popup content must wrap instead of clipping at narrow widths');
assert(source.includes('.muenba-lobby-box.is-case-board { width:min(100%,calc(100vw - 24px)); padding:24px 16px 22px; }'),
  'the de-cluttered case board must keep safe mobile insets');
assert(source.includes('.muenba-mission-hint-toggle { min-height:42px; }'),
  'the mission hint must remain a comfortable mobile touch target');
assert(source.includes('.muenba-case-check-panel.is-locked'),
  'locked and unlocked check panels must have distinct visual states');

console.log('Muenba popup audit passed: top anchoring, safe-area spacing, scrollability, scene reset, DEV hold, ESL layout, 19C typography, 19D decluttering, and 19E responsive contracts.');
