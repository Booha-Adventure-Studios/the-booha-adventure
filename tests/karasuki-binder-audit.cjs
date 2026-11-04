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
  if (m[1].trim() === 'none') continue;
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
assert.match(show, /\.kb-zoom-card'\)\.addEventListener\('click', \(\) => \{\s*if \(zoom && zoom\.dragged\) \{ zoom\.dragged = false; return; \}[^\n]*\n\s*toggleInfo\(\);/, 'Pass C1: tapping the card shows/hides its info (a drag is not a tap)');
/* Pass C2: foil shine on open, drag to tilt and move the foil */
assert.match(show, /wireFoil\(el\.querySelector\('\.kb-zoom-card'\)\);/);
assert.match(show, /window\.KarasukiCardFace\.shine\(front\)/, 'the foil shines once as a card opens');
const wf = fn('wireFoil');
assert.match(wf, /if \(!window\.PointerEvent \|\| !cardEl\) return;/);
assert.match(wf, /if \(!zoom \|\| zoom\.back \|\| still\(\)\) return;/, 'no drag effects on the back or with reduced motion');
assert.match(wf, /Math\.hypot\(e\.clientX - down\.x, e\.clientY - down\.y\) < DRAG_PX/, 'a small wobble is still a tap');
assert.match(wf, /perspective\(900px\) rotateY\(/, 'tilt is a transform');
assert.match(wf, /KarasukiCardFace\.foil\(cardEl\.querySelector\('\.kb-front'\), x\)/);
assert.match(wf, /\['pointerup', 'pointercancel', 'pointerleave'\]\.forEach/);
assert.match(wf, /addEventListener\('dragstart', e => e\.preventDefault\(\)\)/, 'the art cannot be dragged away (that would cancel the drag)');
assert.match(wf, /cardEl\.setPointerCapture\(e\.pointerId\)/);
assert.match(fn('still'), /data-motion[\s\S]*data-power[\s\S]*prefers-reduced-motion/);
assert.match(b, /#kb-zoom \.kb-zoom-card\{touch-action:none;/, 'dragging the card never scrolls or zooms the page');
assert.match(show, /\.kb-info-btn'\)\.addEventListener\('click', toggleInfo\)/);
assert.match(show, /<button type="button" class="kb-info-btn" aria-pressed="false">Details<small lang="ja">くわしく<\/small><\/button>/, 'a real Details button');
assert.ok(!/\.kb-zoom-card'\)\.addEventListener\('click', flip\)/.test(show), 'tapping the card no longer flips it');
const info = fn('toggleInfo');
assert.match(info, /window\.KarasukiCardFace\.setInfo\(el\.querySelector\('\.kb-front'\)\)/);
assert.match(info, /setAttribute\('aria-pressed', String\(on\)\)/);
assert.match(info, /if \(zoom\.back\) \{ flip\(\); return; \}/, 'a tap on the back turns it face up');
assert.match(fn('onKey'), /e\.key === 'i' \|\| e\.key === 'I'/);
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
