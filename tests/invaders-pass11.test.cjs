#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Extract and eval announceEnvelope so we can numerically verify it ──
// reproduces the exact two hand-written curves it replaced, rather than
// just asserting the source text looks right.
const envFrom = engine.indexOf('function announceEnvelope');
assert.notStrictEqual(envFrom, -1, 'missing announceEnvelope()');
const envSrc = engine.slice(envFrom, engine.indexOf('\n}', envFrom) + 2);
const announceEnvelope = new Function('clamp', `${envSrc}\nreturn announceEnvelope;`)(clamp);

// Wave banner's original formula, before the refactor:
//   enter = clamp(t/0.18, 0, 1); exit = clamp((dur-t)/0.22, 0, 1); min(enter,exit)
function waveBannerOriginal(t, dur) {
  const enter = clamp(t / 0.18, 0, 1);
  const exit = clamp((dur - t) / 0.22, 0, 1);
  return Math.min(enter, exit);
}
{
  const dur = 1.15; // WAVE_SCALE.waveCardSec
  for (let t = 0; t <= dur + 0.01; t += 0.01) {
    const got = announceEnvelope(t, dur, 0.18, 0.22);
    const want = waveBannerOriginal(t, dur);
    assert.ok(Math.abs(got - want) < 1e-9, `wave banner envelope mismatch at t=${t.toFixed(3)}: got ${got}, want ${want}`);
  }
}

// Milestone's original formula, before the refactor:
//   t<0.4 ? t/0.4 : t>2.8 ? clamp(1-(t-2.8)/0.7,0,1) : 1
function milestoneOriginal(t) {
  return t < 0.4 ? t/0.4 : t > 2.8 ? clamp(1-(t-2.8)/0.7,0,1) : 1;
}
{
  for (let t = 0; t <= 3.5; t += 0.01) {
    const got = announceEnvelope(t, 3.5, 0.4, 0.7);
    const want = milestoneOriginal(t);
    assert.ok(Math.abs(got - want) < 1e-9, `milestone envelope mismatch at t=${t.toFixed(3)}: got ${got}, want ${want}`);
  }
}

// ── Both callers must actually be wired through the shared helper ──
const waveBannerFn = engine.slice(engine.indexOf('function drawWaveBanner'), engine.indexOf('function drawWaveBanner') + 1200);
assert.match(waveBannerFn, /announceEnvelope\(t, dur, inDur, outDur\)/);
assert.doesNotMatch(waveBannerFn, /const enter = clamp\(t \/ 0\.18/, 'old inline enter/exit math should be gone');

const milestoneFn = engine.slice(engine.indexOf('function drawMilestone'), engine.indexOf('function drawMilestone') + 800);
assert.match(milestoneFn, /announceEnvelope\(t, MILESTONE_LIFETIME, 0\.4, 0\.7\)/);
assert.doesNotMatch(milestoneFn, /t < 0\.4 \? t\/0\.4/, 'old inline enter/exit math should be gone');

// MILESTONE_LIFETIME must be the single source of truth for both the
// lifetime cutoff (where the animation deactivates) and the draw envelope.
assert.match(engine, /const MILESTONE_LIFETIME = 3\.5/);
assert.match(engine, /if \(milestoneAnim\.t > MILESTONE_LIFETIME\) milestoneAnim\.active = false/);

// ── Shared card chrome ──
assert.match(engine, /function drawAnnounceCard\(x, y, w, h, r, fillStyle, strokeStyle, lineWidth\)/);
assert.match(waveBannerFn, /drawAnnounceCard\(cardX, cardY, cardW, cardH, 14,/);
assert.doesNotMatch(waveBannerFn, /roundRect\(cardX, cardY, cardW, cardH, 14\); ctx\.fill\(\);/, 'wave banner should draw its card via drawAnnounceCard now, not inline roundRect calls');

// ── Wave banner gets a subtle scale-in on top of the fade ──
assert.match(waveBannerFn, /easeOutCubic\(clamp\(t \/ inDur, 0, 1\)\)/);
assert.match(waveBannerFn, /ctx\.scale\(pop, pop\)/);

console.log('Booha Invaders pass 11 checks passed.');
