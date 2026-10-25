#!/usr/bin/env node
'use strict';
/*
 * Karasuki Cards Pass 2b — host takeover contracts: script order, feature
 * flag, status read only on refresh, card hit test before the story popup,
 * draw order, modal wiring, weekly-reset refresh, older-iPad safety, and the
 * teaser banner copy.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const html = read('karasuki.html');
const k = read('js/karasuki.js');
const enc = read('js/karasuki-card-encounter.js');
const logic = read('js/karasuki-cards.js');
const data = read('js/karasuki-cards-data.js');

/* Script order */
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const order = ['js/calendar.js', 'js/core/save-file.js', 'js/core/booha-skins.js', 'js/utsu-furigana.js', 'games/echo.js',
  'js/karasuki-wanderer-data.js', 'js/karasuki-cards-data.js', 'js/karasuki-cards.js', 'js/karasuki-card-encounter.js', 'js/karasuki.js'];
let last = -1;
for (const src of order) {
  const at = scripts.indexOf(src);
  assert.ok(at > last, `${src} should load after ${order[order.indexOf(src) - 1] || 'the page start'}`);
  last = at;
}

/* Feature flag: off for students until Pass 2c */
assert.match(data, /window\.KARASUKI_CARDS_ENABLED = false;/, 'cards stay off for students in Pass 2b');
assert.match(k, /window\.KARASUKI_CARDS_ENABLED === true \|\| window\.__devCards === true/);

/* Status is read on refresh only, never in the frame loop */
const fn = name => {
  const start = k.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const open = k.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < k.length; i++) {
    if (k[i] === '{') depth++;
    else if (k[i] === '}' && --depth === 0) return k.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
};
assert.strictEqual((k.match(/readCardHost\(\);/g) || []).length, 1, 'readCardHost is called from exactly one place');
assert.match(fn('refreshWanderersForRoom'), /readCardHost\(\);/);
for (const hot of ['tick', 'drawFrame', 'drawWanderers', 'drawCardHosts', 'drawCardHost', 'updateWanderers']) {
  assert.ok(!/KarasukiCards\.(current|status|seen|start)\(/.test(fn(hot)), `${hot} must not read card status`);
}

/* Host injected even when outside this week's roster */
assert.match(fn('refreshWanderersForRoom'), /if \(hostDef && !roomDefs\.includes\(hostDef\)\) roomDefs\.push\(hostDef\);/);
assert.match(fn('readCardHost'), /\['card', 'teaser', 'plain'\]\.includes\(st\.map\)/, 'hidden/none states inject nothing');

/* Click: card host is checked before the normal popup */
const click = fn('clickCheckWanderers');
assert.ok(click.indexOf('cardHostHit(') >= 0 && click.indexOf('cardHostHit(') < click.indexOf('openWandererPop('),
  'card host must be detected before openWandererPop');
const hitW = Number((k.match(/const CARD_HIT_W\s*=\s*(\d+)/) || [])[1]);
const hitH = Number((k.match(/const CARD_HIT_H\s*=\s*(\d+)/) || [])[1]);
const drawW = Number((k.match(/const CARD_DRAW_W\s*=\s*(\d+)/) || [])[1]);
assert.ok(hitW * 0.55 >= 44 && hitH * 0.55 >= 44, 'hit area stays ≥44pt on a landscape phone (scale ≈0.55)');
assert.ok(hitW > drawW, 'hit area is larger than the drawn card');
assert.match(fn('cardHostHit'), /Math\.max\(CARD_HIT_W \/ 2, spriteHalf\)/, 'card hit area is never smaller than the host sprite hit box');

/* Seen only when the introduction opens, never for dev-forced states */
assert.strictEqual((k.match(/KarasukiCards\.seen\(\)/g) || []).length, 1);
assert.match(fn('openCardEncounter'), /if \(!host\.dev && window\.KarasukiCards\)/);

/* Drawn above other world sprites; sprite pass skips card hosts */
assert.match(k, /drawNuppi\(now\); drawCardHosts\(now\);/);
assert.match(fn('drawWanderers'), /if \(w\.cardMode === 'card'\) return;/);
assert.match(fn('drawWanderers'), /if \(w\.cardMode === 'teaser'\) drawCardTeaser\(w, now\);/);

/* Modal + frame pause wiring, weekly reset refresh */
assert.match(fn('anyModalOpen'), /isCardEncounterOpen\(\)/);
assert.match(fn('staticFrameOverlayOpen'), /isCardEncounterOpen\(\)/);
assert.match(k, /addEventListener\('booha:weeklyReset', \(\) => \{\s*refreshWanderersForRoom\(\);/);

/* Older-iPad safety + motion */
for (const [name, src] of [['karasuki.js', k], ['encounter', enc], ['logic', logic]]) {
  assert.ok(!/\(\?<[=!]/.test(src), `${name}: no regex lookbehind`);
}
for (const name of ['drawCardHost', 'drawCardTeaser', 'cardRoundRect']) {
  assert.ok(!/ctx\.roundRect\(/.test(fn(name)), `${name}: no ctx.roundRect (missing on older iPads)`);
}
assert.match(fn('cardMotionReduced'), /data-motion/);
assert.match(fn('cardMotionReduced'), /data-power/);
assert.match(fn('drawCardHost'), /still \? 0/);
assert.match(fn('drawCardTeaser'), /if \(!still\)/);
const transitions = [...enc.matchAll(/transition:([^;}]+)/g)].map(m => m[1]);
assert.ok(transitions.length && transitions.every(t => /^(none|(opacity|transform) [^,]+)$/.test(t.trim())), 'overlay animates opacity/transform only');
assert.match(enc, /kc-still/);

/* Teaser copy (runtime) */
const ctx = { console, window: null, document: { readyState: 'complete', addEventListener() {}, getElementById: () => null,
  createElement: () => ({}), head: { appendChild() {} }, documentElement: { getAttribute: () => null } } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('js/utsu-furigana.js'), ctx);
vm.runInContext(enc, ctx);
const E = ctx.KarasukiCardEncounter;
const locked = E.teaserHTML('locked', 'br');
assert.ok(locked.includes('Something has changed in Karasuki.'));
assert.ok(locked.includes("Finish this week&#39;s Blitz to find out why."));
assert.ok(locked.includes('<ruby>今週<rt>こんしゅう</rt></ruby>のブリッツを<ruby>終<rt>お</rt></ruby>えると、その<ruby>理由<rt>りゆう</rt></ruby>がわかる。'));
assert.ok(locked.includes('カラスキーで、<ruby>何<rt>なに</rt></ruby>かが<ruby>変<rt>か</rt></ruby>わった。'));
const pb = E.teaserHTML('locked', 'pb');
assert.ok(pb.includes('カラスキーで、なにかが かわった。') && !/<ruby>/.test(pb), 'Pre-Boo teaser is hiragana');
assert.ok(E.teaserHTML('tomorrow', 'bc').includes('one more try this week'));
assert.ok(E.teaserHTML('outOfAttempts', 'bc').includes('Try again next week'));
assert.strictEqual(E.teaserHTML('ready', 'bc'), '', 'no banner outside teaser states');
assert.ok(!/\d+\s*\/\s*\d+\s*cards|of \d+ cards/i.test(enc), 'copy never reveals the collection size');

/* Single source of truth for Wanderer lines */
assert.ok(!/let me in, dear/.test(enc + k), 'card copy is read from karasuki-wanderer-data.js, not duplicated');
assert.match(read('js/karasuki-wanderer-data.js'), /"Won't you let me in, dear\? Just for a little while\."/);

console.log('Karasuki Cards Pass 2b takeover audit passed.');
