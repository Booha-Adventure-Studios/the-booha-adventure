#!/usr/bin/env node
'use strict';
// Focused unit test for the bounce-chain combo readout (pass 6): a floating
// ×2/×3 popup should appear once the candy chains a *second* consecutive
// top-face bounce-pad launch, not on the first bounce alone, and side/
// underside hits (which aren't the pad's actual launch mechanic — see
// pass 2) must not advance the combo at all.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(ROOT, 'js/feed_booha_1.js'), 'utf8');

function extractFn(name) {
  const re = new RegExp(`function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n  \\}`);
  const match = engineSource.match(re);
  assert.ok(match, `${name}() must exist in the engine`);
  return match[0];
}

let state, comboTexts; // handleBouncePads/spawnComboText close over these.

function makeHandleBouncePads() {
  // eslint-disable-next-line no-eval
  const sweptBoxHit = eval(`(${extractFn('sweptBoxHit')})`);
  void sweptBoxHit;
  // eslint-disable-next-line no-eval
  const spawnComboText = eval(`(${extractFn('spawnComboText')})`);
  void spawnComboText;
  // playSfxBounce is audio-only and irrelevant to combo bookkeeping.
  function playSfxBounce() {}
  void playSfxBounce;
  // eslint-disable-next-line no-eval
  return eval(`(${extractFn('handleBouncePads')})`);
}

function pad(x, y) {
  return { type: 'bounce', x, y, width: 100, height: 24, used: false, pushX: 0 };
}

function freshState(candy, objects) {
  return {
    candy, objects,
    bounceCombo: 0, bounceCooldown: 0,
    shakeFrames: 0, shakeAmt: 0,
    currentLevel: { noBounce: false }, hitBounce: false
  };
}

// 1) A single top-face bounce advances the combo to 1 but shows no popup —
// ×1 isn't worth celebrating.
{
  const p1 = pad(270, 500);
  state = freshState({ x: 270, y: 470, vx: 0, vy: 30, r: 26 }, [p1]);
  comboTexts = [];
  makeHandleBouncePads()();
  assert.strictEqual(state.bounceCombo, 1, 'a single bounce should set the combo to 1');
  assert.strictEqual(p1.used, true, 'a top-face hit should consume the pad');
  assert.strictEqual(comboTexts.length, 0, 'the first bounce in a chain should not spawn a popup');
}

// 2) A second consecutive top-face bounce (a different pad — the first is
// already used) advances the combo to 2 and spawns a "×2" popup.
{
  const handleBouncePads = makeHandleBouncePads();
  const p2 = pad(270, 700);
  state.objects.push(p2);
  state.candy = { x: 270, y: 670, vx: 0, vy: 30, r: 26 };
  handleBouncePads();
  assert.strictEqual(state.bounceCombo, 2, 'a second chained bounce should advance the combo to 2');
  assert.strictEqual(comboTexts.length, 1, 'the second bounce in a chain should spawn exactly one popup');
  assert.strictEqual(comboTexts[0].text, '×2', 'the popup should read ×2');
}

// 3) A side hit (not the launch mechanic) must not advance the combo or
// spawn a popup, and must not consume the pad — matches pass 2's design.
{
  const p3 = pad(270, 500);
  state = freshState({ x: 250, y: 500, vx: 100, vy: 0, r: 26 }, [p3]);
  comboTexts = [];
  makeHandleBouncePads()();
  assert.strictEqual(state.bounceCombo, 0, 'a side hit must not advance the bounce combo');
  assert.strictEqual(p3.used, false, 'a side hit must not consume the pad');
  assert.strictEqual(comboTexts.length, 0, 'a side hit must not spawn a combo popup');
}

console.log('Feed Booha bounce-combo test passed: 3/3 cases');
