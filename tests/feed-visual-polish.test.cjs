#!/usr/bin/env node
'use strict';
// Focused unit test for three of the small visual-polish additions:
// the milestone confetti burst scaling, the trail's pink→gold color lerp,
// and Booha's idle-sway math (only active while genuinely idle, and a
// no-op — same geometry as before this pass — otherwise).

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

// ── spawnConfetti: a milestone burst should be a real step up, not a
// cosmetic tweak — more particles and a wider speed range. ──────────────
{
  const CONFETTI_COLORS = ['#ff5fa8', '#ffdd44', '#44ddff', '#ff8fd1', '#ffe066', '#a8ffee'];
  void CONFETTI_COLORS;
  let confetti = [];
  // eslint-disable-next-line no-eval
  const spawnConfetti = eval(`(${extractFn('spawnConfetti')})`);

  spawnConfetti(0, 0, false);
  const normalCount = confetti.length;
  spawnConfetti(0, 0, true);
  const bigCount = confetti.length;

  assert.strictEqual(normalCount, 60, 'a normal 3★ burst should spawn 60 particles');
  assert.strictEqual(bigCount, 110, 'a milestone burst should spawn 110 particles');
  assert.ok(bigCount > normalCount * 1.5, 'the milestone burst should be a clear step up, not a minor tweak');
}

// ── lerpHexColor: exact endpoints, and a real blend in between. ─────────
{
  // eslint-disable-next-line no-eval
  const lerpHexColor = eval(`(${extractFn('lerpHexColor')})`);
  assert.strictEqual(lerpHexColor('#ff88cc', '#ffcc44', 0), 'rgb(255,136,204)', 't=0 should be exactly the first color');
  assert.strictEqual(lerpHexColor('#ff88cc', '#ffcc44', 1), 'rgb(255,204,68)', 't=1 should be exactly the second color');
  const mid = lerpHexColor('#ff88cc', '#ffcc44', 0.5);
  assert.strictEqual(mid, 'rgb(255,170,136)', 't=0.5 should be the midpoint blend');
}

// ── drawBooha: idle sway only applies when genuinely idle (waiting,
// not mid-hop), and is a true no-op — identical geometry to before this
// pass — the rest of the time. ───────────────────────────────────────
{
  let state, ctx, images;
  function makeCtx(record) {
    return {
      save() {}, restore() {},
      translate(x, y) { record.translate = [x, y]; },
      scale(x, y) { record.scale = [x, y]; },
      drawImage(img, x, y, w, h) { record.drawImage = [x, y, w, h]; },
      fillStyle: null, beginPath() {}, arc() {}, fill() {}
    };
  }
  function run(overrides) {
    state = Object.assign({
      booha: { x: 300, y: 900, w: 160, h: 160 },
      boohaSprite: 'booWait', boohaJumpFrame: 0, boohaJumpOffset: 0,
      lastTime: 0, lost: false, missDir: 0
    }, overrides);
    images = { booWait: {}, booEat: {} };
    const record = {};
    ctx = makeCtx(record);
    // eslint-disable-next-line no-eval
    const drawBooha = eval(`(${extractFn('drawBooha')})`);
    drawBooha();
    return record;
  }

  // sin(lastTime * 0.0025) = 1 at lastTime = (π/2)/0.0025
  const peakLastTime = (Math.PI / 2) / 0.0025;

  const idle = run({ boohaSprite: 'booWait', boohaJumpFrame: 0, lastTime: peakLastTime });
  assert.ok(Math.abs(idle.translate[1] - (900 + 3)) < 0.01, 'idle should bob up to +3px at the sway peak');
  assert.ok(Math.abs(idle.scale[0] - 1.015) < 0.001, 'idle should breathe up to 1.015x scale at the sway peak');

  const eating = run({ boohaSprite: 'booEat', boohaJumpFrame: 0, lastTime: peakLastTime });
  assert.strictEqual(eating.translate[1], 900, 'a non-idle sprite must not sway, even at the sway-peak timestamp');
  assert.deepStrictEqual(eating.scale, [1, 1], 'a non-idle sprite must not breathe-scale');

  const midHop = run({ boohaSprite: 'booWait', boohaJumpFrame: 5, lastTime: peakLastTime });
  assert.strictEqual(midHop.translate[1], 900, 'mid-hop must take precedence over idle sway even with boohaSprite still booWait');
}

console.log('Feed Booha visual-polish test passed: 3 sections, all assertions green');
