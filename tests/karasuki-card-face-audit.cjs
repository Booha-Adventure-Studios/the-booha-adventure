#!/usr/bin/env node
'use strict';
/*
 * Karasuki Cards Pass 2b.1 — shared card face/back renderer, face-down map
 * card and introduction, and the cards image budget.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const ctx = { console, Intl, Date, Math, JSON };
ctx.window = ctx;
ctx.document = {
  readyState: 'complete', addEventListener() {}, getElementById: () => null,
  createElement: () => ({ setAttribute() {}, addEventListener() {}, remove() {} }),
  head: { appendChild() {} }, body: { appendChild() {} }, documentElement: { getAttribute: () => null },
};
vm.createContext(ctx);
for (const f of ['js/utsu-furigana.js', 'js/karasuki-wanderer-data.js', 'js/karasuki-cards-data.js', 'js/karasuki-cards.js', 'js/karasuki-card-face.js']) {
  vm.runInContext(read(f), ctx, { filename: f });
}
const F = ctx.KarasukiCardFace;
assert.ok(F, 'KarasukiCardFace loads');

/* Three kinds, one renderer */
const won = { score: 9, wonAt: Date.UTC(2026, 9, 25, 3), try: 2 };
const mh = F.fromRegistry('mister-happy', { result: won, width: 190 });
const pk = F.fromRegistry('poopika', { result: { score: 8, wonAt: 1, try: 1 } });
const sm = F.fromRegistry('sumiyo-horaguchi', { result: { score: 10, wonAt: 1, try: 1 } });
assert.ok(mh.includes('kcf--friendly') && pk.includes('kcf--mischievous') && sm.includes('kcf--dangerous'), 'kind comes from the Wanderer data');
assert.ok(mh.includes('No. 01') && pk.includes('No. 10') && sm.includes('No. 11'), 'numbers are zero-padded');
for (const html of [mh, pk, sm]) {
  assert.ok(!/No\. \d+\s*\/\s*\d+/.test(html), 'numbers are never capped with a total');
  assert.ok(html.includes('<small>Lv.</small><b>1</b>'), 'Lv.1 badge');
}
assert.ok(mh.includes('Mister Happy') && mh.includes('ミスター・ハッピー'));
assert.ok(mh.includes("“I&#39;m glad you came to see me.”"), 'flavour line from the Wanderer data');
assert.ok(sm.includes('<ruby>洞口<rt>ほらぐち</rt></ruby>すみよ'), 'kanji name gets furigana');
assert.ok(sm.includes('let me in, dear'), 'Sumiyo uses the corrected line');
assert.ok(sm.includes('kcf-name is-long'), 'long names step down a size');
assert.ok(mh.includes('Words recalled <b>9 / 10</b>') && mh.includes('2026.10.25') && mh.includes('2nd try'), 'personal result strip');
assert.ok(!F.fromRegistry('mister-happy', {}).includes('kcf-result'), 'no result strip without a result');
assert.ok(mh.includes('width:190px;height:285px') && mh.includes('transform:scale(0.5000)'), 'scales from 380×570 to any width');
assert.ok(mh.includes('role="img"') && mh.includes('aria-label="Mister Happy — No. 01, Lv.1, friendly card, 9 of 10 words"'));
assert.ok(mh.includes('loading="lazy"'), 'face art is lazy-loaded');
assert.strictEqual(F.fromRegistry('nobody', {}), '');

/* Teacher preview sizes every card (regression: an empty width once overrode the default) */
let previewEl = null;
ctx.document.body.appendChild = el => { previewEl = el; };
F.preview();
assert.ok(previewEl && /<div class="kcf-fit"[^>]*width:220px/.test(previewEl.innerHTML), 'preview cards are 220px wide');
assert.ok(!/width:380px;height:570px/.test(previewEl.innerHTML), 'no preview card falls back to full size');
assert.strictEqual((previewEl.innerHTML.match(/class="kcf kcf--/g) || []).length, 2 * ctx.KarasukiCards.registry().filter(ctx.KarasukiCards.isShipped).length, 'every face twice: full art, then info up');
assert.strictEqual((previewEl.innerHTML.match(/class="kcf kcf--\w+ is-info"/g) || []).length, ctx.KarasukiCards.registry().filter(ctx.KarasukiCards.isShipped).length);

/* Back */
const back = F.back({ width: 150 });
assert.ok(back.includes(`src="${ctx.KARASUKI_CARD_BACK}"`) && back.includes('face down'));
assert.ok(!/kcf-name|No\. /.test(back), 'the back reveals nothing');

/* Older-iPad + motion safety in the face CSS */
const src = read('js/karasuki-card-face.js');
assert.ok(!/\(\?<[=!]/.test(src), 'no regex lookbehind');
// Pass C1: the info panel slides (transform) and fades (opacity) — nothing else moves
assert.ok(!/animation|@keyframes/.test(src), 'no animations on the face');
for (const m of src.matchAll(/transition:([^;}]+)/g)) {
  if (m[1].trim() === 'none') continue;
  m[1].split(/,(?![^(]*\))/).forEach(part => assert.ok(/^(opacity|transform) /.test(part.trim()), `face transition must be opacity/transform: ${part}`));
}
assert.ok(src.includes('@media (prefers-reduced-motion:reduce){.kcf .kcf-plate{transition:none}}'), 'reduced motion: the panel does not slide');
assert.ok(src.includes('html[data-motion="reduced"] .kcf .kcf-plate,html[data-power]:not([data-power="full"]) .kcf .kcf-plate{transition:none}'), 'html[data-motion]/[data-power] respected');

/* Pass C1: full-art face — badges and the name ribbon always, details on demand */
assert.ok(src.includes('.kcf .kcf-plate{position:absolute;z-index:1;') && src.includes('transform:translateY(calc(100% - 78px))'), 'only the name ribbon shows until the info is up');
assert.ok(src.includes('.kcf.is-info .kcf-plate{transform:none}') && src.includes('.kcf.is-info .kcf-plate::before,.kcf.is-info .kcf-detail{opacity:1}'));
assert.ok(/<div class="kcf-detail">[\s\S]*kcf-quote[\s\S]*kcf-quotejp[\s\S]*kcf-result/.test(mh), 'quote, Japanese line and stats are the details');
assert.ok(/kcf-lv[\s\S]*kcf-kind[\s\S]*kcf-no[\s\S]*kcf-plate/.test(mh), 'Lv., kind and No. badges stay on the art');
assert.ok(mh.includes('<div class="kcf-fade"></div>'), 'a soft fade keeps the name readable on any art');
assert.ok(!mh.includes('is-info'), 'faces start full-art');
assert.ok(F.fromRegistry('mister-happy', { info: true, width: 100 }).includes('class="kcf kcf--friendly is-info"'));
{
  const classes = new Set(['kcf']);
  const kcfEl = { classList: { contains: c => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } };
  const wrap = { querySelector: () => kcfEl };
  assert.strictEqual(F.setInfo(wrap, true), true);
  assert.ok(classes.has('is-info'));
  assert.strictEqual(F.setInfo(wrap), false, 'no argument toggles');
  assert.ok(!classes.has('is-info'));
  assert.strictEqual(F.setInfo(null, true), false);
}
assert.ok(/-webkit-clip-path/.test(src), 'clip-path has the -webkit- prefix for older Safari');

/* Face down until won: map + introduction never request the card's own art */
const k = read('js/karasuki.js');
const enc = read('js/karasuki-card-encounter.js');
assert.ok(!/\.art\b/.test(enc), 'introduction never shows the card art');
assert.match(enc, /KarasukiCardFace\.back\(/, 'introduction shows the card back');
assert.match(k, /wandererImageCache\.get\('card:back', \{ src: window\.KARASUKI_CARD_BACK/, 'map card is the card back');
assert.ok(!/cardHost\.card\.art|card\.art/.test(k), 'Karasuki never loads a card face before it is won');
const scripts = [...read('karasuki.html').matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
assert.ok(scripts.indexOf('js/karasuki-cards.js') < scripts.indexOf('js/karasuki-card-face.js')
  && scripts.indexOf('js/karasuki-card-face.js') < scripts.indexOf('js/karasuki-card-encounter.js'), 'face loads before the encounter');

/* Budget */
assert.match(read('tests/performance-asset-budget-audit.cjs'), /\['cards', 1 \* 1024 \* 1024\]/);
assert.match(read('PERFORMANCE-BUDGETS.md'), /Karasuki Cards image-directory payload/);

console.log('Karasuki card face audit passed.');
