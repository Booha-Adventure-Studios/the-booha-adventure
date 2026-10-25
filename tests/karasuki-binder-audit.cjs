#!/usr/bin/env node
'use strict';
/*
 * Karasuki Cards Pass 3 — binder contracts on adventure-profile.html: hidden
 * until the first win, no totals or hints, NEW kept in the student's save,
 * shared face renderer, zoom, motion and script order.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const html = read('adventure-profile.html');
const b = read('js/ui/karasuki-binder.js');

/* Section exists, hidden by default, after the Wanderer Atlas */
assert.match(html, /<section class="cards-section" id="karasuki-cards" aria-labelledby="cards-title" hidden><\/section>/);
assert.ok(html.indexOf('id="atlas"') < html.indexOf('id="karasuki-cards"'), 'binder follows the Wanderer Atlas');
assert.match(b, /host\.hidden = cards\.length === 0;/, 'stays hidden until the first card is won');

/* Scripts */
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1].replace(/^\.\//, ''));
const order = ['js/utsu-furigana.js', 'js/karasuki-wanderer-data.js', 'js/core/save-file.js', 'js/karasuki-cards-data.js',
  'js/karasuki-cards.js', 'js/karasuki-card-face.js', 'js/ui/karasuki-binder.js'];
let last = -1;
for (const src of order) { const at = scripts.indexOf(src); assert.ok(at > last, `${src} order`); last = at; }
assert.ok(scripts.includes('js/core/booha-skins.js'), 'booha-skins (Blitz helper) is on the page');

/* No totals, no hints */
assert.ok(!/registry\(\)\.length|KARASUKI_CARDS\.length|\/ \$\{/.test(b), 'never shows how many cards exist');
assert.ok(!/cards\.length\}|count\(key\)\}|adv-head-num|· \$\{/.test(b), 'no owned-card counts in the header or the filters');
assert.match(b, /\.filter\(c => s\.won\[c\.id\]\)/, 'only owned cards are listed');
assert.match(b, /key === 'all' \|\| count\(key\) > 0/, 'kind chips appear only for kinds the student owns');
assert.ok(!/unknown|\?\?\?|kb-slot/.test(b), 'no empty slots');

/* NEW lives in the student's save */
assert.match(b, /KarasukiCards\.viewed\(card\.id\)/);
assert.ok(!/localStorage/.test(b), 'no device-wide storage');
assert.match(read('js/karasuki-cards.js'), /viewed\(cardId\) \{ return transact/);

/* Shared face, zoom, accessibility, motion */
assert.match(b, /window\.KarasukiCardFace\.fromRegistry\(card\.id, \{ width, result:/);
assert.match(b, /role', 'dialog'/);
assert.match(b, /e\.key === 'Escape'/);
assert.match(b, /min-height:44px/, 'filter chips are ≥44px');
assert.match(b, /min-width:48px;min-height:48px/, 'zoom buttons are ≥44px');
const css = b.slice(b.indexOf('style.textContent = `'), b.indexOf('`;', b.indexOf('style.textContent = `')));
for (const m of css.matchAll(/transition:([^;}]+)/g)) {
  m[1].split(/,(?![^(]*\))/).forEach(part => assert.ok(/^(opacity|transform) /.test(part.trim()), `transition must be opacity/transform: ${part}`));
}
assert.ok(!/\(\?<[=!]/.test(b), 'no regex lookbehind');
assert.match(html, /@media \(prefers-reduced-motion: reduce\)/, 'page-wide reduced-motion rule covers the binder');

/* Pass 4b: flip the enlarged card to the shared back */
const fn = name => {
  const start = b.indexOf(`function ${name}(`);
  const open = b.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < b.length; i++) {
    if (b[i] === '{') depth++;
    else if (b[i] === '}' && --depth === 0) return b.slice(start, i + 1);
  }
  return '';
};
const show = fn('show');
assert.match(show, /zoom\.back = false;/, 'every card opens face up (arrows land on faces)');
assert.match(show, /<button type="button" class="kb-flip-btn" aria-pressed="false">Flip<small lang="ja">うらがえす<\/small><\/button>/, 'a real Flip button');
assert.match(show, /window\.KarasukiCardFace\.back\(\{ width \}\)/, 'the back is the shared card back');
assert.match(show, /\.kb-flip-btn'\)\.addEventListener\('click', flip\)/);
assert.match(show, /\.kb-zoom-card'\)\.addEventListener\('click', flip\)/, 'tapping the card flips it');
const flip = fn('flip');
assert.match(flip, /setAttribute\('aria-pressed', String\(zoom\.back\)\)/);
assert.match(flip, /\.kb-front'\)\.setAttribute\('aria-hidden', String\(zoom\.back\)\)/, 'screen readers hear only the visible side');
assert.match(flip, /UtsuSfx\.cardFlip\(\)/, 'flip sound');
assert.match(fn('onKey'), /e\.key === 'f' \|\| e\.key === 'F'/);
assert.match(b, /#kb-zoom \.kb-side\{position:absolute;left:0;top:0;backface-visibility:hidden;-webkit-backface-visibility:hidden\}/);
assert.match(b, /#kb-zoom \.kb-side\.kb-front\{transform:rotateY\(0deg\)\}/, 'explicit 3D planes on both sides');
const shelf = b.slice(b.indexOf('function render()'), b.indexOf('/* ── zoom'));
assert.ok(!/KarasukiCardFace\.back|kb-flip/.test(shelf), 'the shelf always shows faces');
assert.ok(scripts.indexOf('js/utsu-sfx.js') >= 0 && scripts.indexOf('js/utsu-sfx.js') < scripts.indexOf('js/ui/karasuki-binder.js'), 'sounds load before the binder');
assert.match(read('js/utsu-sfx.js'), /cardFlip: function/);

console.log('Karasuki binder audit passed.');
