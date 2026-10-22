#!/usr/bin/env node
'use strict';

// Games Pass 3: one shared score card for the nine curriculum engines.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const shell = read('game.html');
const css = read('theme/game.css');
const cardSrc = read('js/game-scorecard.js');

const ENGINES = {
  'vocab-tap.js':      ['vocab_tap', 'vt'],
  'spell-word.js':     ['spell_word', 'sw'],
  'vocab-speed.js':    ['vocab_speed', 'vs'],
  'sentence-tap.js':   ['sentence_tap', 'st'],
  'sentence-order.js': ['sentence_order', 'so'],
  'sentence-speed.js': ['sentence_speed', 'ssp'],
  'say-word.js':       ['say_word', 'stw'],
  'say-sentence.js':   ['say_sentence', 'sas'],
  'ask-question.js':   ['ask_question', 'aq'],
};

// Load order: after game-utils (it attaches GAME_UTILS.showScorecard), before engines.
const at = shell.indexOf('js/game-scorecard.js');
assert(at > shell.indexOf('js/game-utils.js'), 'game.html must load game-scorecard.js after game-utils.js');
assert(at < shell.indexOf('js/game-core.js'), 'game.html must load game-scorecard.js before game-core.js');

for (const [file, [id, px]] of Object.entries(ENGINES)) {
  const src = read(`games/${file}`);
  assert(src.includes(`gameId:   \`\${CFG.curriculum}:${id}\``), `${file} must open the shared card with its save id`);
  assert(src.includes(`replayId: '${px}-replay'`) && src.includes(`backId:   '${px}-back'`),
    `${file} must hand the card its own replay/back buttons`);
  assert(src.includes(`'${px}-replay'`), `${file} must still define ${px}-replay`);
  assert(!/new Audio\(CFG\.sfxBase \+ tier\.sound\)/.test(src),
    `${file} must not play its own tier sound (the shared card plays it)`);
  const sc = src.indexOf('U.showScorecard(');
  const emit = src.indexOf('U.emitGameEnd(');
  assert(sc > -1 && emit > -1, `${file} must still submit its result and open the card`);
}

// The old per-engine panels stay hidden.
for (const sel of ['#vt-results-wrap', '#st-results-wrap', '#ssp-results-wrap', '#vs-results',
  '#so-results', '#sw-results', '.aq-results-outer', '.sas-results-outer', '.stw-results-outer']) {
  assert(css.includes(sel), `game.css must hide the old ${sel} panel`);
}
assert.match(css, /\.bsc-overlay \{[^}]*z-index: 1500/, 'score card must sit above gameplay but below confetti and medals');

// Old callback shims must not treat an options object as a callback.
for (const file of ['spell-word.js', 'sentence-order.js']) {
  const src = read(`games/${file}`);
  assert.match(src, /if \(typeof onEnd !== 'function'\) return _orig\(name, onEnd\);/,
    `${file} SFX shim must pass non-function options straight through`);
  const re = /if \((replayBtn|backBtn)\) \1\.addEventListener\('click', \(\) => \{[\s\S]*?\n {2}\}, \{ once: true \}\);/g;
  assert.strictEqual((src.match(re) || []).length, 2, `${file} replay/back handlers re-added per game must be { once: true }`);
}

// A first run is labelled as a start, never as a record (percent and points).
assert.strictEqual((cardSrc.match(/FIRST SCORE · はじめて/g) || []).length, 2,
  'score card must show FIRST SCORE · はじめて for a first percent and a first weekly points result');
assert.match(cardSrc, /if \(before <= 0\)[^\n]*FIRST SCORE/, 'NEW BEST must be reserved for beating an earlier score');

// Tier mapping (half points supported; LEGEND needs a full combo).
const sandbox = { window: {}, document: {}, console };
sandbox.window.window = sandbox.window;
vm.runInNewContext(cardSrc, sandbox);
const tierFor = sandbox.window.BoohaScorecard.tierFor;
const cases = [[0, 'try'], [5, 'try'], [5.5, 'try'], [6, 'keep'], [10, 'keep'], [10.5, 'keep'],
  [11, 'great'], [14, 'great'], [14.5, 'great'], [15, 'perfect']];
for (const [n, want] of cases) assert.strictEqual(tierFor(n, 15), want, `${n}/15 must be ${want}`);
assert.strictEqual(tierFor(15, 15, true), 'legend', '15/15 with a full combo must be LEGEND');
assert.strictEqual(tierFor(15, 15, false), 'perfect', '15/15 without a full combo stays PERFECT');
assert.strictEqual(tierFor(12, 12), 'perfect', 'a perfect run on a shorter deck must be PERFECT');

console.log('Games score-card audit passed: nine engines open the shared card, old panels hidden, shims safe, five tiers mapped.');
