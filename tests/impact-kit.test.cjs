#!/usr/bin/env node
'use strict';

// Razzle-dazzle Pass 1 (2026-11-08): shared impact kit (U.impact) and the
// Vocab Speed pilot. Every answer makes contact; streaks escalate; a miss is
// never the best show; nothing delays input; motion/power tiers respected.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const utilsSrc = read('js/game-utils.js');

// ── Load GAME_UTILS with a tiny fake DOM that records every effect node ──
const nodes = [];
const timers = [];
function fakeEl(tag) {
  const n = {
    tag, className: '', style: {}, attrs: {}, removed: false, anims: [],
    setAttribute(k, v) { this.attrs[k] = v; },
    animate(frames, opts) { this.anims.push({ frames, opts }); return {}; },
    remove() { this.removed = true; },
    getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: 0, height: 0 }; },
  };
  return n;
}
function makeCtx(motion = { reduced: false, power: 'full' }) {
  nodes.length = 0; timers.length = 0;
  const ctx = {
    console, Math, performance: { now: () => 0 },
    setTimeout: (fn, ms) => { timers.push(ms); return 1; },
    document: {
      body: { appendChild: n => nodes.push(n) },
      createElement: fakeEl, addEventListener() {}, querySelectorAll: () => [],
    },
    BoohaMotion: { reduced: () => motion.reduced, power: () => motion.power },
    innerWidth: 400, innerHeight: 800,
  };
  ctx.window = ctx;
  vm.runInNewContext(utilsSrc, ctx);
  return ctx.GAME_UTILS;
}
const box = (left, top, width, height) => { const e = fakeEl('button'); e.rect = { left, top, width, height }; return e; };
const plain = o => JSON.parse(JSON.stringify(o));

// ── 1. The plan: escalation, misses, sharp, tiers ──
{
  const U = makeCtx();
  const P = o => plain(U._impactPlan(o));
  const frags = [1, 2, 3, 4].map(tier => P({ outcome: 'hit', tier }).fragments);
  assert.deepStrictEqual(frags, [4, 5, 6, 6], 'fragments grow with the streak, capped at 6');
  const rings = [1, 2, 3, 4].map(tier => P({ outcome: 'hit', tier }).ringScale);
  assert(rings.every((r, i) => i === 0 || r > rings[i - 1]), 'the ring grows every tier');
  const hit = P({ outcome: 'hit', tier: 1 });
  assert(hit.bolt && hit.ring && hit.flash && hit.sound === 'hit', 'a first hit already makes contact');
  const miss = P({ outcome: 'miss', tier: 4 });
  assert(!miss.bolt && !miss.ring && !miss.crit, 'a miss has no bolt, ring or crit');
  assert.strictEqual(miss.sound, 'none', 'a miss keeps the game\'s own sound (no extra layer)');
  assert(miss.fragments <= hit.fragments && miss.spread < hit.spread, 'a miss is smaller than the smallest hit');
  assert.strictEqual(miss.fragClass, 'dust');
  assert.strictEqual(P({ outcome: 'timeout' }).flash, 'bad', 'timeout flashes red');
  assert(P({ outcome: 'hit', tier: 1, sharp: true }).crit, 'sharp adds a critical spark');
  assert(!P({ outcome: 'miss', sharp: true }).crit, 'never on a miss');
  assert.strictEqual(P({ outcome: 'recover', tier: 2 }).flash, 'rec', 'recovery has its own blue-gold look');

  const red = P({ outcome: 'hit', tier: 4, sharp: true, reduced: true });
  assert(!red.squash && !red.bolt && !red.ring && !red.crit && red.fragments === 0, 'reduced motion: nothing moves');
  assert(red.flash && red.sound === 'hit', 'reduced motion: flash and sound only');
  const minimal = P({ outcome: 'hit', tier: 4, power: 'minimal' });
  assert(minimal.fragments === 0 && !minimal.bolt, 'minimal power: no particles, no bolt');
  assert.strictEqual(P({ outcome: 'hit', tier: 3, power: 'reduced' }).fragments, 3, 'reduced power: half the fragments');
}

// ── 2. impact(): synchronous, local, self-cleaning, transform/opacity only ──
{
  const U = makeCtx();
  const btn = box(40, 600, 140, 60), prompt = box(20, 120, 360, 160);
  const ret = U.impact({ source: btn, target: prompt, outcome: 'hit', combo: 10, sharp: true, squash: false });
  assert(ret && typeof ret.then !== 'function', 'returns immediately (never delays the next question)');
  assert(nodes.length > 0 && nodes.every(n => /\bbimp\b/.test(n.className) && n.attrs['aria-hidden'] === 'true'), 'all effect nodes are .bimp, hidden from screen readers');
  assert(nodes.filter(n => /bimp-frag/.test(n.className)).length <= 6, '≤ 6 fragments');
  assert(nodes.some(n => /bimp-bolt t4/.test(n.className)), 'combo 10 fires the largest bolt');
  assert(nodes.some(n => /bimp-crit/.test(n.className)), 'sharp: crit star');
  assert.strictEqual(btn.anims.length, 0, 'squash:false leaves the game\'s own button animation alone');
  const keys = new Set();
  nodes.forEach(n => n.anims.forEach(a => a.frames.forEach(f => Object.keys(f).forEach(k => keys.add(k)))));
  keys.delete('offset');
  assert.deepStrictEqual([...keys].sort(), ['opacity', 'transform'], 'animates transform and opacity only');
  assert(Math.max(...nodes.flatMap(n => n.anims.map(a => a.opts.duration))) <= 320, 'every effect ≤ 320 ms');
  assert(timers.every(ms => ms <= 360), 'every node is removed within ~360 ms');
  // Fragments burst at the prompt (target), not the screen centre.
  const frag = nodes.find(n => /bimp-frag/.test(n.className));
  assert.deepStrictEqual([frag.style.left, frag.style.top], ['200px', '200px'], 'impact lands on the prompt');

  const U2 = makeCtx();
  const b2 = box(40, 600, 140, 60);
  U2.impact({ source: b2, outcome: 'miss' });
  assert.strictEqual(b2.anims.length, 1, 'a miss recoils the answer (when the game allows)');
  assert(/translateX/.test(JSON.stringify(b2.anims[0].frames)), 'recoil is sideways, not a bounce');
  assert(nodes.every(n => !/bimp-bolt|bimp-ring|bimp-crit/.test(n.className)), 'no bolt/ring/crit on a miss');

  const U3 = makeCtx({ reduced: true, power: 'full' });
  U3.impact({ source: box(40, 600, 140, 60), target: box(20, 120, 360, 160), outcome: 'hit', combo: 12, sharp: true });
  assert.deepStrictEqual(nodes.map(n => n.className.replace('bimp ', '').split(' ')[0]), ['bimp-flash'], 'reduced motion: only the flash');
}

// ── 3. Sound: short, layered, nothing for misses ──
{
  const kit = utilsSrc.slice(utilsSrc.indexOf('_impactSound(kind'), utilsSrc.indexOf('createRun({ total = 15'));
  const stops = [...kit.matchAll(/\.stop\(t \+ ([0-9.]+)\)/g)].map(m => Number(m[1]));
  assert(stops.length >= 2 && Math.max(...stops) <= 0.12, 'every voice stops within 120 ms (before learning audio)');
  assert.match(kit, /if \(kind === 'none'\) return;/, 'misses add no sound layer');
  assert.match(kit, /if \(!c \|\| c\.state !== 'running'\) return;/, 'silent until the shared audio is unlocked');
}

// ── 4. Tracker and pilot wiring ──
{
  assert.match(utilsSrc, /\} else if \(fx\.gained && st\.combo >= 3 && !impactKit\) \{/, 'kit games skip the tracker\'s small per-hit sparks');
  assert.match(utilsSrc, /fxParticles\(fxOrigin\(\), fx\.milestone >= 3 \? 18 : 14/, 'milestones (banner, chime, sparks) unchanged');
  const vs = read('games/vocab-speed.js');
  assert.match(vs, /U\.createRun\(\{ total: 15, recoverPoints: 0, impactKit: true \}\)/);
  assert.match(vs, /const hit = run\.hit\(\) \|\| \{\};\s*U\.playSFX\('ding'\);[\s\S]{0,260}U\.impact\(\{ source: btn, target: promptBox, outcome: 'hit', combo: hit\.combo \|\| 1, sharp: !!hit\.sharp/,
    'a hit fires from the button into the prompt with the real combo and sharpness');
  assert.match(vs, /U\.impact\(\{ source: btn, outcome: 'miss'/, 'wrong answers recoil');
  assert.match(vs, /U\.impact\(\{ source: heatEl, outcome: 'timeout'/, 'timeouts jolt the heat bar');
  assert.match(vs, /\? \(streak === 15 \? 620 : 560\)\s*: 320;/, 'next-question timing unchanged (320 ms)');
  for (const f of ['vocab-tap', 'sentence-tap']) {
    const src = read(`games/${f}.js`);
    assert.strictEqual((src.match(/window\.__brunTap = \{ el, t: performance\.now\(\) \};\s*run\.(hit\(checkedAt\)|miss\(\));/g) || []).length, 2,
      `${f}: combo sparks come from each graded slot (hit and miss), not the Check button`);
  }
  const css = read('theme/game.css');
  assert.match(css, /\.bimp \{ position: fixed; z-index: 68; pointer-events: none;/, 'effects never block taps');
}

console.log('Impact kit test passed: escalation, smaller misses, sharp crit, tiers, ≤320 ms, no input delay, pilot wiring.');
