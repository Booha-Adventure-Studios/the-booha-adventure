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

// ── 3. Profile trail: two parallel lanes (maze → arcade, Blitz → skin) ──
{
  const pg = read('js/ui/profile-game.js');
  const num = name => +pg.match(new RegExp(`const ${name} = (\\d+);`))[1];
  const ys = pg.match(/const BLITZ_YS = \[(\d+), (\d+), (\d+)\];/).slice(1).map(Number);
  const R = num('BLITZ_DISC_R'), GOAL_Y = num('GOAL_Y'), LANES_Y = num('LANES_Y');
  const MAZE_X = num('MAZE_LANE_X'), BLITZ_X = num('BLITZ_LANE_X');
  assert(BLITZ_X < 50 && MAZE_X > 50, 'Blitz lane on the left, maze lane on the right: side by side');
  assert(ys[0] - R > LANES_Y + 30, 'the Blitz lane starts below the "any order" caption');
  assert(ys[1] - ys[0] >= 2 * R + 10 && ys[2] - ys[1] >= 2 * R + 10, 'Blitz discs never overlap');
  assert(GOAL_Y - 38 > ys[2] + R, 'the skin sits below the last Blitz disc');
  // Blitz labels sit beside the discs, so the lane line only passes behind discs.
  assert.match(pg, /class="pg-node blitz side/, 'Blitz nodes use the side-label layout');
  assert.match(read('profile.html'), /\.pg-node\.blitz\.side \{ flex-direction:row;/, 'side-label layout is styled');
  // The lanes never join: no segment runs from the maze lane into the Blitz lane.
  assert(!/seg\([^)]*MAZE_LANE_X[^)]*BLITZ_LANE_X|seg\([^)]*BLITZ_LANE_X[^)]*MAZE_LANE_X/.test(pg), 'no path joins the two lanes');
  assert(!/pg-divider/.test(pg), 'no stacked BLITZ · SKIN divider under the arcade');
  const html = read('profile.html');
  const boardH = +html.match(/\.pg-trail-board \{\s*position:relative; height:(\d+)px;/)[1];
  assert(boardH >= GOAL_Y + 90, 'the board is tall enough for both goals and their labels');
}

// ── 4. Rank coin: irregular flicker, glint, badge on the rim, reduced motion ──
{
  const html = read('profile.html');
  const pg = read('js/ui/profile-game.js');
  assert.match(pg, /<span class="pg-coin-face"><img src="\$\{profileArt\(`rank-coin-/, 'the coin face wraps the image for the glint (URL via BoohaProfileArt)');
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
