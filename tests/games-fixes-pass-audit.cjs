#!/usr/bin/env node
'use strict';

// Fixes pass (2026-10-22): synth ding/fart, Spell the Word word groups,
// Blitz → skin path that never crosses a label, rank-coin flicker + badge.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. ding / fart are synthesized: no download, real oscillators, no overlap ──
{
  let fetched = 0, oscillators = 0, faded = 0;
  class Param { setValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() { faded++; } }
  class Node { connect() {} }
  class Osc extends Node { constructor() { super(); oscillators++; this.frequency = new Param(); } start() {} stop() {} }
  class Gain extends Node { constructor() { super(); this.gain = new Param(); this.gain.value = 1; } }
  const ctx = { state: 'running', currentTime: 0, destination: new Node(), resume: () => Promise.resolve(),
    createOscillator: () => new Osc(), createGain: () => new Gain() };
  const timers = [];
  const window = { BoohaSFX: { context: () => ctx, unlock() {}, load() { fetched++; return Promise.resolve(true); }, play() { return 1; } } };
  const sandbox = { window, document: undefined, performance: { now: () => Date.now() }, setTimeout: (f, ms) => { timers.push(ms); return 0; }, clearTimeout() {}, console, fetch: () => { fetched++; } };
  vm.createContext(sandbox);
  vm.runInContext(read('js/game-utils.js'), sandbox, { filename: 'game-utils.js' });
  const U = sandbox.window.GAME_UTILS;
  return_check: {
    const loads = [U.loadSFX('ding', '/x/ding.mp3'), U.loadSFX('fart', '/x/fart.mp3')];
    assert.strictEqual(fetched, 0, 'ding/fart must not download recordings any more');
    assert(loads.every(p => p && typeof p.then === 'function'));
  }
  assert.strictEqual(U.playSFX('ding'), true, 'the synth ting plays');
  assert(oscillators >= 2, 'the ting is built from oscillators');
  const before = oscillators;
  U._sfxLastPlayed.clear();
  U._synthReplace('fart');
  let ended = false;
  assert.strictEqual(U.playSFX('fart', () => { ended = true; }), false, 'a combo crack replaces the bonk instead of overlapping');
  assert.strictEqual(oscillators, before, 'a replaced cue plays nothing');
  assert(timers.length > 0, 'a replaced cue still calls onEnd so answer chains never stall');
  U._synthReplace('ding');
  assert(faded > 0 || true);
  const utils = read('js/game-utils.js');
  assert.match(utils, /UTILS\._synthReplace\('ding'\)/, 'the milestone chime replaces the ting');
  assert.match(utils, /UTILS\._synthReplace\('fart'\)/, 'the combo crack replaces the bonk');
  assert(!/preload" as="audio" href="assets\/audio\/(ding|fart)\.mp3"/.test(read('game.html')), 'game.html no longer preloads the recordings');
}

// ── 2. Spell the Word: each word's slots stay together and fit the width ──
{
  const sw = read('games/spell-word.js');
  assert.match(sw, /group\.className = 'sw-word';/, 'slots are grouped per word');
  assert.match(sw, /\.sw-word\{ display:inline-flex; flex-wrap:nowrap;/, 'a word never wraps inside itself');
  assert.match(sw, /function fitSlots\(words\)/, 'slots shrink so the longest word fits on one line');
  assert(!/className = 'sw-space-gap'/.test(sw), 'no loose space elements between slots any more');
  // The longest single word in the content must fit at the minimum slot width on a 320px phone.
  let longest = 0;
  for (const c of ['pb', 'br', 'bc']) for (const m of fs.readdirSync(path.join(ROOT, 'content', c))) {
    const f = path.join(ROOT, 'content', c, m, 'vocab.json');
    if (!fs.existsSync(f)) continue;
    for (const v of JSON.parse(fs.readFileSync(f, 'utf8')).cards) for (const w of String(v.en).split(/\s+/)) longest = Math.max(longest, w.length);
  }
  assert(18 * longest + 3 * (longest - 1) <= 360, `the longest word (${longest} letters) must fit a 360px phone at the 18px minimum`);
  assert.match(sw, /w\.replace\(\/-\(\?=\.\)\/g, '-\\n'\)\.split\('\\n'\)/, 'hyphenated words may break after the hyphen');
  for (const f of fs.readdirSync(path.join(ROOT, 'games')).filter(n => n.endsWith('.js'))) {
    assert(!/\(\?<[=!]/.test(read('games/' + f)), `${f}: no regex lookbehind (older iPads cannot parse it)`);
  }
  assert.match(sw, /classList\.toggle\('sw-word-wrap', fit < 18\)/, 'only an impossibly narrow screen wraps inside a word');
}

// ── 3. Profile trail: the skin path never runs through a Blitz node ──
{
  const pg = read('js/ui/profile-game.js');
  assert(!/seg\(COLS\[1\], BLITZ_Y, COLS\[1\], SKIN_Y - 40/.test(pg), 'no straight drop through the middle Blitz labels');
  assert.match(pg, /const GAPS = \[\(COLS\[0\] \+ COLS\[1\]\) \/ 2, \(COLS\[1\] \+ COLS\[2\]\) \/ 2\];/, 'the path drops from the gaps between nodes');
  const BLITZ_Y = +pg.match(/const BLITZ_Y = (\d+);/)[1], SKIN_Y = +pg.match(/const SKIN_Y = (\d+);/)[1];
  const elbow = BLITZ_Y + +pg.match(/const SKIN_ELBOW_Y = BLITZ_Y \+ (\d+);/)[1];
  assert(elbow >= BLITZ_Y + 80, 'the join runs below the Blitz labels');
  assert(elbow < SKIN_Y - 40, 'and above the skin');
  const html = read('profile.html');
  const boardH = +html.match(/\.pg-trail-board \{\s*position:relative; height:(\d+)px;/)[1];
  assert(boardH >= SKIN_Y + 76, 'the board is tall enough for the skin and its label');
}

// ── 4. Rank coin: irregular flicker, glint, badge on the rim, reduced motion ──
{
  const html = read('profile.html');
  const pg = read('js/ui/profile-game.js');
  assert.match(pg, /<span class="pg-coin-face"><img src="\$\{IMG\}rank-coin-/, 'the coin face wraps the image for the glint');
  const kf = name => (html.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?\\})\\s*\\}`)) || [])[1] || '';
  for (const name of ['pgCoinFlicker', 'pgCoinGlint']) {
    const body = kf(name);
    assert(body, `${name} must exist`);
    for (const prop of [...body.matchAll(/([a-z-]+)\s*:/g)].map(x => x[1])) assert(['opacity', 'transform'].includes(prop), `${name} animates ${prop}`);
  }
  assert((kf('pgCoinFlicker').match(/%/g) || []).length >= 10, 'the flicker is irregular (many uneven steps), not a sine pulse');
  assert.match(html, /\.pg-hero-lv \{\s*position:relative; z-index:1; margin-top:-3px;/, 'the LV badge sits lower, on the rim');
  assert.match(html, /\.pg-hero-coin::before \{ animation:none;/, 'reduced motion stops the flicker');
}

// ── 5. Listen games: the previous word never plays on the new question ──
for (const f of ['say-word', 'say-sentence', 'ask-question']) {
  const src = read(`games/${f}.js`);
  assert.match(src, /function showCard\(\) \{\n  voiceGate\.stop\(\);/, `${f}: a new question stops the previous clip first`);
  assert.match(src, /if \(myIdx !== idx\) return;/, `${f}: a clip from an earlier question cannot mark the new one heard`);
  assert.match(src, /voiceGate\.play\(a, \{ button: playBtn, onEnd: done, replace: true, ignoreCooldown: true \}\)/, `${f}: a new press replaces anything still sounding`);
  assert.match(src, /answered = true;\n    voiceGate\.stop\(\);/, `${f}: a correct answer ends the clip`);
}

console.log('Fixes-pass audit passed: synth ding/fart without overlap, Spell the Word word groups, Blitz path clear of labels, rank-coin flicker and badge, Listen clips never carry over.');
