#!/usr/bin/env node
'use strict';
/*
 * Booha Bites Pass B1 — Booha comes alive: he swoops in and crunches the
 * word away each card (never showing it), bobs while waiting, burps the
 * right word back into the gap with an arms-up cheer, and gobbles wrong
 * choices with a "bleh!". The speed window starts after his bite. Motion
 * is transform/opacity only; reduced motion / low power skip the flying.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const b = fs.readFileSync(path.join(ROOT, 'games/booha-bites.js'), 'utf8');
const fn = name => {
  const start = b.search(new RegExp(`function ${name}\\(`));
  assert.ok(start >= 0, `${name} exists`);
  const open = b.indexOf('{', b.indexOf(')', start));
  let depth = 0;
  for (let i = open; i < b.length; i++) {
    if (b[i] === '{') depth++;
    else if (b[i] === '}' && --depth === 0) return b.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
};

/* Poses come from the existing Booha ghost art */
for (const f of ['booha_ghost.webp', 'booha_ghost_dance_arms_up.webp']) {
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/img', f)), `${f} exists`);
}
assert.match(b, /const POSE = \{ idle: IMG \+ 'booha_ghost\.webp', cheer: IMG \+ 'booha_ghost_dance_arms_up\.webp' \};/);

/* Each card: the bite, never the word */
const sc = fn('showCard');
assert.match(sc, /gap\.classList\.add\('is-hidden'\);/, 'the gap appears where Booha bites');
assert.match(sc, /busy = true;/, 'no picks while Booha is biting');
assert.match(sc, /introBite\(token, gap, \(\) => \{\s*busy = false;\s*run\.ready\(2000 \+ 160 \* s\.split\(\/\\s\+\/\)\.length\);/, 'the speed window starts after the bite');
const ib = fn('introBite');
assert.match(ib, /if \(calm\(\)\) \{\s*gap\.classList\.remove\('is-hidden'\);/, 'reduced motion: the gap just appears');
assert.match(ib, /sfx\('crunch'\);\s*crumbs\(g\);/, 'crunch and crumbs at the gap');
assert.match(ib, /later\(token, INTRO_MS, \(\) => \{ boohaEl\.classList\.add\('is-idle'\); done\(\); \}\);/);
assert.ok(!/textContent = r\.bite\.word|bite\.word/.test(ib), 'the intro never shows the eaten word');
assert.match(ib, /moveBooha\(30 - home\.x,/, 'Booha starts inside the card (never widens the page)');

/* Right: burped back, then the existing fill */
const pk = fn('pick');
assert.match(pk, /burpBack\(cardToken, r\.bite\.word, gapEl, \(\) => \{\s*gapEl\.textContent = r\.bite\.word;/);
const bb = fn('burpBack');
assert.match(bb, /pose\('cheer'\);/, 'Booha throws his arms up');
assert.match(bb, /if \(calm\(\)\) \{ land\(\); sfx\('pop'\); return; \}/);
assert.match(bb, /U\.confetti\(gap, 14\)/, 'a sparkle where the word lands (U.confetti respects motion)');

assert.match(pk, /const wait = Math\.max\(260, FLY_MS \+ 450 - \(Date\.now\(\) - answeredAt\)\);/, 'the word always lands and shows before the next card');

/* Wrong: gobbled */
assert.match(pk, /btn\.classList\.add\('wrong'\);\s*gobble\(btn\);/, 'Booha eats wrong choices');
const gb = fn('gobble');
assert.match(gb, /btn\.classList\.add\('eaten'\);/);
assert.match(gb, /if \(!calm\(\)\) btn\.style\.transform = `translate\(/, 'the button flies into Booha (not with reduced motion)');
assert.match(gb, /btn\.classList\.add\('gone'\);\s*replayClass\(boohaEl, 'bleh'\);\s*sfx\('gulp'\);/);
assert.match(b, /\.bb-choice\.eaten\{[^}]*pointer-events:none\}/, 'an eaten choice can never be picked');
assert.match(b, /\.bb-choice\.gone\{visibility:hidden\}/, 'its slot stays, so the other choices never jump');

/* Timers belong to their card */
assert.match(fn('later'), /if \(token === cardToken\) fn\(\);/);
assert.match(b, /\$\('bb-replay'\)\.addEventListener\('click', \(\) => \{\s*cardToken\+\+;/);

/* Sounds: the game's own Web Audio context, never started by us */
assert.match(fn('sfx'), /window\.BoohaSFX\.context\(\)/);
assert.match(fn('sfx'), /if \(!c \|\| c\.state !== 'running'\) return;/);

/* Motion: transform/opacity only; reduced motion and low power respected */
const css = b.slice(b.indexOf('const STYLE = `'), b.indexOf('`;', b.indexOf('const STYLE = `')));
for (const m of css.matchAll(/@keyframes ([\w-]+)\{((?:[^{}]*\{[^}]*\})*)\}/g)) {
  for (const d of m[2].matchAll(/\{([^}]*)\}/g)) d[1].split(';').filter(Boolean).forEach(p => assert.ok(/^(opacity|transform):/.test(p.trim()), `@keyframes ${m[1]}: ${p}`));
}
for (const m of css.matchAll(/transition:([^;}]+)/g)) {
  if (m[1].trim() === 'none') continue;
  m[1].split(/,(?![^(]*\))/).forEach(p => assert.ok(/^(opacity|transform) /.test(p.trim()), `transition must be opacity/transform: ${p}`));
}
assert.match(fn('calm'), /m\.reduced && m\.reduced\(\)\) \|\| \(m\.lowPower && m\.lowPower\(\)\)/, 'BoohaMotion reduced or low power → no flying');
assert.match(fn('calm'), /prefers-reduced-motion: reduce/);
assert.match(css, /html\[data-power\]:not\(\[data-power="full"\]\) \.bb-booha\.is-idle/, 'the idle bob stops on low power');
assert.ok(!/\(\?<[=!]/.test(b), 'no regex lookbehind');

console.log('Booha Bites fun audit passed.');
