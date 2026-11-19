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

// The old per-engine panels and tier tables are gone; only the two hidden
// buttons the card presses remain.
for (const [file, px] of [['vocab-tap.js', 'vt'], ['sentence-tap.js', 'st'], ['sentence-speed.js', 'ssp'], ['vocab-speed.js', 'vs'],
  ['sentence-order.js', 'so'], ['spell-word.js', 'sw'], ['ask-question.js', 'aq'], ['say-sentence.js', 'sas'], ['say-word.js', 'stw']]) {
  const src = read(`games/${file}`);
  assert(!src.includes(`${px}-results`), `${file}: the old results panel must be removed`);
  assert(!/const TIERS = \[|getTier\(/.test(src), `${file}: tier tables live in game-scorecard.js only`);
  assert(!/renderResultMeta|renderResultDetails/.test(src), `${file}: the card renders details, not the engine`);
  assert(new RegExp(`<div class="${px}-actions" hidden>\\s*<button type="button" id="${px}-replay">[^<]*</button>\\s*<button type="button" id="${px}-back">`).test(src),
    `${file}: keeps hidden ${px}-replay / ${px}-back for the score card`);
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

// Scorecard sound: synthesized on the shared Web Audio context, scheduled on
// the audio clock. No <audio> element is started late outside a tap (iPad
// Safari blocks that), and the jingle follows the score inside each tier.
{
  assert(!/new Audio\(/.test(cardSrc), 'score card must not start an <audio> element for its sounds');
  assert(!/result_\d/.test(cardSrc), 'score card must not use the old result mp3s');
  assert(/window\.BoohaSFX/.test(cardSrc) && /function playTune\(/.test(cardSrc), 'score card plays on the shared BoohaSFX context');
  assert(/Date\.now\(\) - opened > 1500/.test(cardSrc), 'a sound that could not start in time never bursts out late');
  const vm = require('vm');
  const sb = { window: {}, document: {} }; sb.window.window = sb.window;
  vm.runInNewContext(cardSrc, sb);
  const B = sb.window.BoohaScorecard;
  const top = (c, stars) => {
    const ev = B.scoreTune(B.tierFor(c, 15, false), c, 15, stars, false, false);
    return Math.max(...ev.filter(e => e.kind === 'pop').map(e => e.note));
  };
  assert(top(12, 2) > top(11, 2) && top(14, 2) > top(12, 2), 'GREAT climbs with every correct answer');
  assert(top(10, 1) > top(6, 1), 'KEEP GOING ends higher closer to 10');
  const pops = (stars, calm) => B.scoreTune('great', 12, 15, stars, false, calm).filter(e => e.at < 2 && e.kind === 'pop' && [79, 84, 88].includes(e.note) && e.len === 0.22).length;
  assert.strictEqual(pops(3, false), 3, 'one star pop per earned star');
  assert.strictEqual(B.scoreTune('try', 2, 15, 0, false, true)[0].at, 0, 'reduced motion: the jingle plays straight away, no star pops');
  const legend = B.scoreTune('legend', 15, 15, 3, true, false), perfect = B.scoreTune('perfect', 15, 15, 3, true, false);
  assert(legend.length > perfect.length, 'LEGEND adds a crown flourish on top of PERFECT');
  // The staged reveal: a count-up tick per correct answer, a clunk per missed star, a boom when the tier lands,
  // a stamp for a new best, and nothing of the build-up when motion is reduced.
  const great2 = B.scoreTune('great', 12, 15, 2, false, false, true);
  assert.strictEqual(great2.filter(e => e.kind === 'tick').length, 12, 'one count-up tick per correct answer');
  assert.strictEqual(great2.filter(e => e.kind === 'clunk').length, 1, 'a missed star lands with a clunk');
  assert(great2.some(e => e.kind === 'boom' && Math.abs(e.at - B.REVEAL.tier) < 0.01), 'the tier word lands on a boom');
  assert(great2.some(e => e.kind === 'stamp'), 'NEW BEST gets a stamp');
  assert(!B.scoreTune('great', 12, 15, 2, false, false, false).some(e => e.kind === 'stamp'), 'no stamp without a new best');
  assert(!B.scoreTune('great', 12, 15, 2, false, true, true).some(e => ['tick', 'roll', 'boom', 'clunk', 'stamp'].includes(e.kind)), 'reduced motion keeps the plain jingle');
  assert(Math.max(...great2.map(e => e.at)) < 6, 'the whole reveal stays short');
  assert(/bsc-later/.test(cardSrc) && /addEventListener\('pointerdown', onSkip, true\)/.test(cardSrc), 'buttons arrive last and a tap skips the reveal');
  assert(!/new Audio\(/.test(cardSrc) && /boo-dance\.mp3/.test(cardSrc) && /decodeAudioData/.test(cardSrc), 'the dance tune is decoded on the shared context');
}

console.log('Games score-card audit passed: nine engines open the shared card, old panels hidden, shims safe, five tiers mapped.');
