#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

// A persisted, per-game mute preference (mirrors Booha Destruction's
// per-game localStorage key, not a shared/global one).
assert.match(engine, /const INVADERS_MUTE_KEY = "booha_invaders_muted"/);
assert.match(engine, /let muted = false/);
assert.match(engine, /function readMutePreference\(\)/);
assert.match(engine, /readMutePreference\(\);/);

const toggleFn = (() => {
  const from = engine.indexOf('function toggleMute()');
  assert.notStrictEqual(from, -1, 'missing toggleMute()');
  const to = engine.indexOf('\n}', from);
  return engine.slice(from, to);
})();
assert.match(toggleFn, /localStorage\?\.setItem\(INVADERS_MUTE_KEY/, 'toggleMute must persist the preference');
assert.match(toggleFn, /pauseAllMusic\(\)/, 'muting must stop bgm/boss music immediately');
assert.match(toggleFn, /candySfxPool/, 'muting should also stop any in-flight candy SFX');
assert.match(toggleFn, /resumeAllMusic\(\)/, 'unmuting mid-run must resume music');

// Every playback entry point must be gated on `muted` — this is what
// actually makes the toggle silence the game, not just flip a flag.
const playSfxFn = engine.slice(engine.indexOf('function playSfx(kind)'), engine.indexOf('function playSfx(kind)') + 200);
assert.match(playSfxFn, /if \(muted\) return;/, 'playSfx (synthesized tones) must be gated');

const playAudioElFn = engine.slice(engine.indexOf('function playAudioElement(el)'), engine.indexOf('function playAudioElement(el)') + 200);
assert.match(playAudioElFn, /if \(!el \|\| paused \|\| muted\) return;/, 'playAudioElement (bgm/bossBgm) must be gated');

const playCandyFn = engine.slice(engine.indexOf('function playCandySfx()'), engine.indexOf('function playCandySfx()') + 200);
assert.match(playCandyFn, /if \(muted\) return;/, 'playCandySfx must be gated');

// UI: SAVE and MUTE share one row (not a 4th stacked full-width row) so
// the already-tight pause menu doesn't get pushed further past short
// landscape viewport heights.
assert.match(engine, /const PAUSE_MUTE_BTN = \{ x: 0, y: 0, w: 0, h: 0 \}/);
const pauseDraw = engine.slice(engine.indexOf('function drawPauseOverlay'), engine.indexOf('function getStarRating'));
assert.match(pauseDraw, /PAUSE_SAVE_BTN\.y=saveY; PAUSE_SAVE_BTN\.w=halfW/, 'save button must share the row (half width)');
assert.match(pauseDraw, /PAUSE_MUTE_BTN\.x=muteX; PAUSE_MUTE_BTN\.y=saveY; PAUSE_MUTE_BTN\.w=halfW/, 'mute button must be on the same row as save');
assert.match(pauseDraw, /muted \? "🔇 OFF" : "🔊 ON"/);
assert.match(pauseDraw, /muted \? "サウンドオフ" : "サウンドオン"/);
// Exit must still stack below the shared save/mute row, not a 4th row.
assert.match(pauseDraw, /const exitY=saveY\+rowH\+clamp/);

// Both pointerdown paths (canvas + mobileHoldControls) must wire the mute
// hit-test, calling toggleMute() without unpausing/exiting.
const muteHandlers = engine.match(/if \(e\.clientX>=mt\.x&&e\.clientX<=mt\.x\+mt\.w&&e\.clientY>=mt\.y&&e\.clientY<=mt\.y\+mt\.h\) \{\n\s*toggleMute\(\);\n\s*return;\n\s*\}/g);
assert.strictEqual(muteHandlers ? muteHandlers.length : 0, 2, 'mute hit-test must be wired in both the canvas and mobileHoldControls pointerdown handlers');

console.log('Booha Invaders pass 10 checks passed.');
