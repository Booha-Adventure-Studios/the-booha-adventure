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
const pending = [];
// Run scheduled callbacks (in time order) — used by the chain tests.
function flush() {
  while (pending.length) {
    pending.sort((a, b) => a.ms - b.ms);
    const { fn } = pending.shift();
    fn();
  }
}
function fakeEl(tag) {
  const n = {
    tag, className: '', style: { setProperty() {} }, attrs: {}, removed: false, anims: [], dataset: {}, innerHTML: '', textContent: '',
    isConnected: true, offsetWidth: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector() { return fakeEl('span'); },
    querySelectorAll() { return []; },
    appendChild(c) { (this.children = this.children || []).push(c); nodes.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; },
    animate(frames, opts) { this.anims.push({ frames, opts }); return {}; },
    remove() { this.removed = true; },
    getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: 0, height: 0 }; },
  };
  return n;
}
let NOW = 0;
let LAST = null;
function makeCtx(motion = { reduced: false, power: 'full' }) {
  nodes.length = 0; timers.length = 0; pending.length = 0; NOW = 0;
  const ctx = {
    console, Math, performance: { now: () => NOW },
    setTimeout: (fn, ms) => { timers.push(ms); pending.push({ fn, ms }); return 1; },
    document: {
      body: { appendChild: n => nodes.push(n) },
      createElement: fakeEl, addEventListener() {}, querySelectorAll: () => [],
    },
    BoohaMotion: { reduced: () => motion.reduced, power: () => motion.power },
    innerWidth: 400, innerHeight: 800,
  };
  ctx.window = ctx;
  vm.runInNewContext(utilsSrc, ctx);
  LAST = ctx;
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
  assert(!/fxParticles\(fxOrigin\(\), 5, 'brun-spark', 60\)/.test(utilsSrc), 'per-hit sparks are the impact kit\'s job now');
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

// ── 5. Pass 2: small contact for every game on the tracker ──
{
  const kinds = () => nodes.filter(n => /\bbimp\b/.test(n.className)).map(n => n.className.replace('bimp ', '').split(' ')[0]);
  const fresh = (opts, motion) => {
    const U = makeCtx(motion);
    return { U, run: U.createRun(Object.assign({ total: 15 }, opts)), tap: el => { LAST.__brunTap = { el, t: NOW }; } };
  };

  // First-try hit: contact at the tapped answer (flash, ring, fragments), no bolt.
  let t = fresh({ recoverPoints: 0 });
  const btn = box(40, 600, 140, 60);
  t.run.ready(5000); t.tap(btn); t.run.hit();
  let k = kinds();
  assert(k.includes('bimp-flash') && k.includes('bimp-ring') && k.includes('bimp-frag'), 'every hit makes contact');
  assert(!k.includes('bimp-bolt'), 'no target known to the tracker: no bolt');
  const frag = nodes.find(n => /bimp-frag/.test(n.className));
  assert.deepStrictEqual([frag.style.left, frag.style.top], ['110px', '630px'], 'it lands on the button that was tapped');
  assert(!nodes.some(n => /brun-spark/.test(n.className)), 'no doubled per-hit sparks');
  assert.strictEqual(btn.anims.length, 0, 'the game keeps its own button animation (squash off)');

  // Miss: a small grey puff only.
  t = fresh({ recoverPoints: 0 });
  t.run.ready(5000); t.tap(btn); t.run.miss();
  k = kinds();
  assert(k.length > 0 && k.every(c => c === 'bimp-flash' || c === 'bimp-frag'), 'a miss is a puff');
  assert(nodes.filter(n => /bimp-frag/.test(n.className)).every(n => /dust/.test(n.className)), 'grey dust');

  // Recovery: rewarded only where a second try scores.
  t = fresh({ recoverPoints: 0 });
  t.run.ready(5000); t.tap(btn); t.run.miss(); nodes.length = 0; t.tap(btn); t.run.recover();
  assert.strictEqual(kinds().length, 0, 'multiple choice (recover = 0 points): no reward effect for tapping around');
  t = fresh({ recoverPoints: 50 });
  t.run.ready(5000); t.tap(btn); t.run.miss(); nodes.length = 0; t.tap(btn); t.run.recover();
  assert(nodes.some(n => /bimp-ring rec/.test(n.className)), 'a scoring recovery gets the blue-gold rebuild');

  // A stale tap (e.g. a timeout long after the last tap) draws nothing.
  t = fresh({ recoverPoints: 0 });
  t.run.ready(5000); t.tap(btn); NOW += 4000; t.run.miss();
  assert.strictEqual(kinds().length, 0, 'never draws at a stale button');

  // Games on the full kit are skipped (they call U.impact themselves).
  t = fresh({ recoverPoints: 0, impactKit: true });
  t.run.ready(5000); t.tap(btn); t.run.hit();
  assert.strictEqual(kinds().length, 0, 'impactKit games are not drawn twice');

  // Headless runs (hud:false, used by audits) draw nothing.
  t = fresh({ recoverPoints: 0, hud: false });
  t.run.ready(5000); t.tap(btn); t.run.hit();
  assert.strictEqual(kinds().length, 0, 'hud:false stays silent');

  // Streak escalation reaches the tracker path too.
  t = fresh({ recoverPoints: 0 });
  for (let i = 0; i < 10; i++) { nodes.length = 0; t.run.ready(5000); t.tap(btn); t.run.hit(); }
  assert(nodes.some(n => /bimp-ring t4/.test(n.className)), '10 in a row: the largest ring');

  // Wiring.
  assert.match(utilsSrc, /autoImpact\('hit', \{ combo: st\.combo, sharp \}\);/);
  assert.match(utilsSrc, /if \(recoverPoints > 0\) autoImpact\('recover', \{ combo: 1 \}\);/);
  assert.match(utilsSrc, /paint\(\{ broke: hadCombo \}\);\s*autoImpact\('miss'\);/);
}

// ── 6. Pass 3: Sentence Speed wave ──
{
  const U = makeCtx();
  const prompt = box(20, 120, 360, 160);
  const left = box(20, 600, 160, 60);
  U.impact({ source: left, target: prompt, outcome: 'hit', combo: 1, flavor: 'wave', squash: false });
  const clip = nodes.find(n => /bimp-wave\b/.test(n.className));
  assert(clip, 'a wave hit draws a sweeping band');
  assert.deepStrictEqual([clip.style.left, clip.style.top, clip.style.width, clip.style.height], ['20px', '120px', '360px', '160px'],
    'the wave covers the whole sentence card');
  const band = clip.children[0];
  assert.match(band.className, /bimp-wave-band t1/);
  assert(!nodes.some(n => /bimp-bolt/.test(n.className)), 'wave replaces the bolt');
  assert.match(JSON.stringify(band.anims[0].frames[0]), /translateX\(-130%\)/, 'from the left when the answer is on the left');
  const keys = new Set(); band.anims[0].frames.forEach(f => Object.keys(f).forEach(k => keys.add(k))); keys.delete('offset');
  assert.deepStrictEqual([...keys].sort(), ['opacity', 'transform'], 'transform/opacity only');
  assert(band.anims[0].opts.duration <= 320 && timers.includes(280), '≤ 320 ms, removed at 280 ms');
  assert(nodes.some(n => /bimp-ring t1/.test(n.className)), 'still lands with a ring');
}
{
  const U = makeCtx();
  const prompt = box(20, 120, 360, 160), right = box(220, 600, 160, 60);
  U.impact({ source: right, target: prompt, outcome: 'hit', combo: 10, flavor: 'wave', squash: false });
  const band = nodes.find(n => /bimp-wave-band/.test(n.className));
  assert.match(band.className, /t4/, 'broader, brighter band at 10 in a row');
  assert.match(JSON.stringify(band.anims[0].frames[0]), /translateX\(230%\)/, 'from the right when the answer is on the right');
  const css = read('theme/game.css');
  const w = t => Number((css.match(new RegExp(`\\.bimp-wave-band\\.t${t} \\{ width: (\\d+)%`)) || [])[1]);
  assert(w(2) > 30 && w(3) > w(2) && w(4) > w(3), 'band widths grow with the streak (30% → 40% → 55% → 70%)');
  assert.match(css, /\.bimp-wave \{ overflow: hidden;/, 'the band is clipped to the card');

  const R = makeCtx({ reduced: true, power: 'full' });
  R.impact({ source: right, target: prompt, outcome: 'hit', combo: 10, flavor: 'wave' });
  assert(!nodes.some(n => /bimp-wave/.test(n.className)), 'reduced motion: no sweep');

  const ss = read('games/sentence-speed.js');
  assert.match(ss, /U\.createRun\(\{ total: 15, recoverPoints: 0, impactKit: true \}\)/);
  assert.match(ss, /const hit = run\.hit\(\) \|\| \{\};\s*U\.playSFX\('ding'\);[\s\S]{0,360}U\.impact\(\{ source: btn, target: promptBox, outcome: 'hit', combo: hit\.combo \|\| 1, sharp: !!hit\.sharp, flavor: 'wave', squash: false \}\);/);
  assert.match(ss, /U\.impact\(\{ source: btn, outcome: 'miss', flavor: 'wave', squash: false \}\)/);
  assert.match(ss, /U\.impact\(\{ source: heatEl, outcome: 'timeout', flavor: 'wave' \}\)/);
  assert.match(ss, /\? \(streak === 15 \? 620 : 560\)\s*: 340;/, 'next-question timing unchanged (340 ms)');
}

// ── 7. Pass 4: listening games' sound waves ──
{
  const U = makeCtx();
  const card = box(20, 100, 360, 200), btn = box(40, 620, 150, 70);
  U.impact({ source: btn, target: card, outcome: 'hit', combo: 6, sharp: true, flavor: 'listen', squash: false });
  const arcs = nodes.filter(n => /bimp-arc/.test(n.className));
  assert.strictEqual(arcs.length, 3, 'three sound-wave arcs');
  assert(arcs.every(a => /t3/.test(a.className)), 'arcs grow with the streak');
  assert.deepStrictEqual(arcs.map(a => a.anims[0].opts.delay), [0, 45, 90], 'staggered like a sound wave');
  assert(arcs.every(a => a.style.left === '115px' && a.style.top === '655px'), 'they leave from the answer');
  assert.match(JSON.stringify(arcs[0].anims[0].frames[2]), /translate\(85px,-455px\)/, 'and arrive at the card');
  assert.strictEqual(nodes.filter(n => /bimp-ring/.test(n.className)).length, 2, 'the card absorbs them in two concentric rings');
  assert(!nodes.some(n => /bimp-bolt|bimp-wave/.test(n.className)), 'no bolt or wave in listening games');
  assert(nodes.some(n => /bimp-crit/.test(n.className)), 'sharp still crits');
  // Everything (delay + duration) ends within 320 ms, before any next clip.
  const ends = nodes.flatMap(n => n.anims.map(a => (a.opts.delay || 0) + a.opts.duration));
  assert(Math.max(...ends) <= 320, `every effect ends by 320 ms (latest ${Math.max(...ends)})`);
  assert(timers.every(ms => ms <= 360), 'and is removed by 360 ms');
  const keys = new Set(); nodes.forEach(n => n.anims.forEach(a => a.frames.forEach(f => Object.keys(f).forEach(k => keys.add(k))))); keys.delete('offset');
  assert.deepStrictEqual([...keys].sort(), ['opacity', 'transform']);

  const R = makeCtx({ reduced: true, power: 'full' });
  R.impact({ source: btn, target: card, outcome: 'hit', combo: 6, flavor: 'listen' });
  assert(!nodes.some(n => /bimp-arc|bimp-ring/.test(n.className)), 'reduced motion: no travelling waves');

  for (const [f, cardVar] of [['say-word', 'stwCard'], ['say-sentence', 'sasCard'], ['ask-question', 'aqCard']]) {
    const src = read(`games/${f}.js`);
    assert.match(src, /U\.createRun\(\{ total: 15, recoverPoints: 0, impactKit: true \}\)/, `${f}: on the full kit`);
    assert(new RegExp(`if \\(firstTry\\) \\{\\s*const hit = run\\.hit\\(\\) \\|\\| \\{\\};[\\s\\S]{0,240}U\\.impact\\(\\{ source: btn, target: ${cardVar}, outcome: 'hit', combo: hit\\.combo \\|\\| 1, sharp: !!hit\\.sharp, flavor: 'listen', squash: false \\}\\);\\s*\\} else \\{\\s*run\\.recover\\(\\);`).test(src),
      `${f}: first-try hits send waves into the card; later right answers earn no show`);
    assert.match(src, /run\.miss\(\);\s*\/\/[^\n]*\n\s*U\.impact\(\{ source: btn, outcome: 'miss', flavor: 'listen', squash: false \}\);/, `${f}: misses puff`);
    assert.match(src, /const goNext = \(\) => setTimeout\(advanceToNextCard, 220\);/, `${f}: next card timing unchanged`);
    assert.match(src, /setTimeout\(afterDing, 450\);/, `${f}: the next clip still waits for the ding`);
  }
}

// ── 8. Pass 5: built answers (Spell the Word, Sentence Order) ──
{
  const U = makeCtx();
  assert.deepStrictEqual(plain(U._chainPlan({ outcome: 'hit', rights: [true, true, true] })), ['lock', 'lock', 'lock']);
  assert.deepStrictEqual(plain(U._chainPlan({ outcome: 'miss', rights: [true, false, true, false] })), ['anchor', 'crack', 'anchor', 'crack']);

  // Correct: each piece locks in on the game's stagger, then the word releases.
  const slots = [0, 1, 2, 3, 4].map(i => box(40 + i * 60, 300, 50, 60));
  const row = box(30, 290, 320, 80);
  const ret = U.impactChain(slots, { outcome: 'hit', stagger: 55, combo: 6, sharp: false, container: row });
  assert.strictEqual(ret.releaseAt, 5 * 55 + 20, 'release lands right after the last letter (on the ding)');
  assert.deepStrictEqual(timers.slice(0, 6), [0, 55, 110, 165, 220, 295], 'follows the game\'s own 55 ms stagger');
  flush();
  const minis = nodes.filter(n => /bimp-ring mini/.test(n.className));
  assert.strictEqual(minis.length, 5, 'every letter locks in with a small ring');
  assert.deepStrictEqual([minis[0].style.left, minis[4].style.left], ['65px', '305px'], 'left to right, on each letter');
  const release = nodes.filter(n => /bimp-ring t3/.test(n.className));
  assert.strictEqual(release.length, 1, 'then the whole word releases a ring that matches the streak');
  assert.deepStrictEqual([release[0].style.left, release[0].style.top], ['190px', '330px'], 'centred on the whole answer');
  assert(!nodes.some(n => /bimp-bolt|bimp-wave|bimp-arc/.test(n.className)), 'build: no bolt, wave or arcs');

  // Recovery (these games score a second try): blue-gold.
  const U2 = makeCtx();
  U2.impactChain(slots, { outcome: 'recover', stagger: 55, container: row });
  flush();
  assert(nodes.some(n => /bimp-ring mini rec/.test(n.className)) && nodes.some(n => /bimp-ring rec/.test(n.className)), 'recovery locks in blue-gold');

  // Wrong: wrong pieces crack with dust, right ones glow (anchored); no release, no reward.
  const U3 = makeCtx();
  const r3 = U3.impactChain(slots, { outcome: 'miss', stagger: 50, isRight: (el, i) => i !== 1 && i !== 3 });
  assert.deepStrictEqual(plain(r3.kinds), ['anchor', 'crack', 'anchor', 'crack', 'anchor']);
  flush();
  assert.strictEqual(nodes.filter(n => /bimp-frag dust/.test(n.className)).length, 4, 'two dust bits per wrong piece');
  assert.strictEqual(nodes.filter(n => /bimp-flash anchor/.test(n.className)).length, 3, 'right pieces glow');
  assert(!nodes.some(n => /bimp-ring/.test(n.className)), 'a wrong answer never releases a ring');

  // Reduced motion: flashes only.
  const U4 = makeCtx({ reduced: true, power: 'full' });
  U4.impactChain(slots, { outcome: 'hit', stagger: 55, combo: 10, container: row });
  flush();
  assert(nodes.length > 0 && nodes.every(n => /bimp-flash/.test(n.className)), 'reduced motion: only flashes');

  // Every node animates transform/opacity only and is short.
  const U5 = makeCtx();
  U5.impactChain(slots, { outcome: 'hit', stagger: 55, combo: 10, sharp: true, container: row });
  flush();
  const keys = new Set(); nodes.forEach(n => n.anims.forEach(a => a.frames.forEach(f => Object.keys(f).forEach(k => keys.add(k))))); keys.delete('offset');
  assert.deepStrictEqual([...keys].sort(), ['opacity', 'transform']);
  assert(nodes.every(n => n.anims.every(a => (a.opts.delay || 0) + a.opts.duration <= 320)), 'each piece effect ≤ 320 ms');

  // Wiring.
  const sw = read('games/spell-word.js'), so = read('games/sentence-order.js');
  assert.match(sw, /U\.createRun\(\{ total: 15, recoverPoints: 50, impactKit: true \}\)/);
  assert.match(so, /U\.createRun\(\{ total: 15, recoverPoints: 50, impactKit: true \}\)/);
  assert.match(sw, /const res = \(isRecovery \? run\.recover\(\) : run\.hit\(\)\) \|\| \{\};[\s\S]{0,200}U\.impactChain\(slotEls, \{ outcome: isRecovery \? 'recover' : 'hit', stagger: 55,\s*combo: res\.combo \|\| 1, sharp: !!res\.sharp, container: slotsEl \}\);/);
  assert.match(so, /const res = \(isRecovery \? run\.recover\(\) : run\.hit\(\)\) \|\| \{\};[\s\S]{0,200}U\.impactChain\(chips, \{ outcome: isRecovery \? 'recover' : 'hit', stagger: 55,\s*combo: res\.combo \|\| 1, sharp: !!res\.sharp, container: answerEl \}\);/);
  assert.match(sw, /U\.impactChain\(slotEls, \{ outcome: 'miss', stagger: 50,\s*isRight: \(el, i\) => !!\(placed\[i\] && placed\[i\]\.letter === target\[i\]\) \}\);/, 'Spell: same 50 ms stagger as its red/green marking');
  assert.match(so, /U\.impactChain\(chips, \{ outcome: 'miss', stagger: 55,/);
  assert(!/^\s*fireConfetti\(false\);/m.test(sw), 'Spell: per-word confetti replaced by the lock-in');
  assert(!/fireSparkles\(answerEl, false\)/.test(so), 'Order: per-sentence sparkles replaced');
  assert.match(sw, /setTimeout\(\(\) => fireConfetti\(true\),  900\);/, 'Spell: end-of-game confetti stays');
  assert.match(so, /setTimeout\(\(\) => fireSparkles\(null, true\),  900\);/, 'Order: end-of-game sparkles stay');
  for (const src of [sw, so]) {
    assert.match(src, /\}, (slotEls|chips)\.length \* 55 \+ 20\);/, 'ding timing unchanged');
    assert.match(src, /const danceMs = (slotEls|chips)\.length \* 50 \+ 280;/, 'dance + word-audio timing unchanged');
  }
}

console.log('Impact kit test passed: escalation, smaller misses, sharp crit, tiers, ≤320 ms, no input delay, pilot wiring, contact for every tracker game, Sentence Speed wave, listening-game sound waves, built answers lock in.');
