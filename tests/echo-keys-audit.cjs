#!/usr/bin/env node
'use strict';
/*
 * Echo Pass E1 — Echo types on the shared on-screen keyboard
 * (js/booha-keys.js), like Grimmerglen and the Karasuki cards: no text box,
 * so no iPad keyboard, suggestions, autofill, IME or paste. Checks the
 * set-up, the typing rules (a wrong try is replaced by the next letter),
 * when the keys come and go, the game-theme colours and motion rules.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const echo = read('games/echo.js');
const game = read('game.html');
const fn = name => {
  const start = echo.search(new RegExp(`function ${name}\\(`));
  assert.ok(start >= 0, `${name} exists`);
  const open = echo.indexOf('{', echo.indexOf(')', start));
  let depth = 0;
  for (let i = open; i < echo.length; i++) {
    if (echo[i] === '{') depth++;
    else if (echo[i] === '}' && --depth === 0) return echo.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
};

/* Loading: game.html carries the shared keyboard before the game engine */
assert.ok(game.indexOf('js/booha-keys.js') > 0 && game.indexOf('js/booha-keys.js') < game.indexOf('js/game-core.js'));

/* No text box anywhere; the answer is a display */
assert.ok(!/<input\b|<textarea\b|contenteditable|\.focus\(\{ preventScroll: true \}\); \} catch \(_\) \{ input\.focus/.test(echo), 'no text box, no focusing it');
assert.ok(!/ec-check|form\.addEventListener/.test(echo), 'Check lives on the keyboard');
assert.match(echo, /<div class="ec-input" id="ec-input" role="textbox" aria-readonly="true" aria-label="Type what you hear">/);
assert.match(echo, /\.ec-input\{[^}]*-webkit-user-select:none;user-select:none;-webkit-touch-callout:none\}/, 'the answer cannot be selected or copied');

/* The keyboard */
const sk = fn('showKeys');
assert.match(sk, /window\.BoohaKeys\.create\(\{\s*className: 'ec-keys', marks: \["'", '-'\], okHTML: 'Check<small lang="ja">けってい<\/small>',\s*label: 'Keyboard', repeatBack: true, bubble: true, sound: keyClick, onKey,\s*\}\)/);
assert.match(sk, /document\.body\.appendChild\(dock\)/);
for (const v of ['--kc:var(--game-primary)', '--cap:var(--game-surface)', '--kt:var(--game-ink)', '--kbg:var(--game-bg,#fff)']) assert.ok(echo.includes(v), `keys take the game colours (${v})`);
assert.match(echo, /#ec-keys-dock \.bk-key\.is-ok\{background:linear-gradient\(135deg,var\(--game-primary\),var\(--game-secondary\)\)\}/, 'Check matches the old Check button');
assert.match(fn('measureKeys'), /wrap\.style\.paddingBottom = dock\.classList\.contains\('is-open'\) \? `\$\{dock\.offsetHeight \+ 16\}px` : ''/, 'the card is never hidden behind the keys');

const kv = fn('keepCardVisible');
assert.match(kv, /window\.innerHeight - dock\.offsetHeight - 12/, 'the card (answer, feedback, Hint) sits above the keys');
assert.match(kv, /Math\.min\(over, Math\.max\(0, top - 8\)\)/, '…without scrolling the card top off screen');
assert.match(fn('showKeys'), /setTimeout\(keepCardVisible, 320\)/);
assert.match(fn('submit'), /keepCardVisible\(\);/, 'a wrong-try message is never behind the keys');

/* Typing rules */
const ok = fn('onKey');
assert.match(ok, /if \(done\) return false;/, 'no typing once a card is finished');
assert.match(ok, /if \(k === 'ok'\) \{ submit\(\); return true; \}/);
assert.match(ok, /if \(restartWord\) \{ typed = ''; restartWord = false; \}/, 'after a wrong try the next letter starts the word again');
assert.match(ok, /if \(k === 'back'\) \{ restartWord = false; typed = typed\.slice\(0, -1\); \}/, '…backspace edits it instead');
assert.match(ok, /typed\.length < MAX_TYPED/);
const sub = fn('submit');
assert.match(sub, /const verdict = check\(card\.en, typed\);/, 'the typed keys are what gets checked');
assert.match(sub, /restartWord = true;/);
assert.match(echo, /document\.addEventListener\('keydown', e => \{\s*if \(!keys \|\| !dock \|\| !dock\.classList\.contains\('is-open'\) \|\| done\) return;\s*const k = keys\.keyFromEvent\(e\);/, 'a physical keyboard types the same keys (Cmd+V is never a key)');

/* When the keys come and go */
assert.match(fn('showCard'), /showKeys\(\);/, 'each card brings the keys up');
assert.match(fn('finishItem'), /if \(result === 'miss'\) \{\s*hideKeys\(\);/, 'a missed card puts them away so the answer and Next show');
assert.match(fn('showResults'), /hideKeys\(\);/, 'no keys on the results screen');
assert.ok(!/input\.focus/.test(fn('play')), 'the clip ending no longer jumps to a text box');

/* Pass E2: pop design */
assert.match(sk, /label: 'Keyboard', repeatBack: true, bubble: true, sound: keyClick, onKey,/, 'keys pop their letter and click');
assert.match(fn('keyClick'), /window\.BoohaSFX\.context\(\)/, 'the click uses the game\'s own audio context');
assert.match(fn('keyClick'), /if \(!c \|\| c\.state !== 'running'\) return;/, 'never starts audio on its own');
const st = fn('showTyped');
assert.match(st, /`<span class="ec-tile\$\{popLast && i === typed\.length - 1 \? ' is-new' : ''\}"><b>\$\{esc\(ch\)\}<\/b><\/span>`/, 'each letter is a tile; the newest pops in');
assert.match(st, /'<span class="ec-gap"><\/span>'/, 'spaces are gaps');
assert.match(ok, /showTyped\(added && !stillMotion\(\)\);/, 'no pop with reduced motion');
const mt = fn('markTiles');
assert.match(mt, /t\.style\.animationDelay = `\$\{i \* 55\}ms`/, 'right: a green wave, one tile after another');
assert.match(mt, /t\.classList\.add\(c - lead < goodCount \? 'is-good' : 'is-bad'\)/, 'a miss keeps the right start green, the rest red');
assert.match(mt, /if \(typed\[c\] === ' '\) continue;/, 'spaces are gaps, not tiles, so the colours stay lined up');
assert.match(mt, /input\.classList\.add\('is-drop'\)/);
assert.match(sub, /markTiles\('right'\);/);
assert.match(sub, /if \(tries >= 2\) \{ markTiles\('drop'\); finishItem\('miss'\); return; \}/, 'a missed card\'s tiles tumble away');
assert.match(sub, /markTiles\('miss', rightPrefix\(card\.en, typed\)\);/);
assert.match(sub, /run\.hit\(\); score \+= 1;\s*U\.confetti\(input, 18\);/, 'a first-try answer sparkles (U.confetti respects motion settings)');
assert.match(fn('showCard'), /playBtn\.classList\.add\('is-waiting'\);/, '▶ pulses until heard');
assert.match(fn('play'), /playBtn\.classList\.remove\('playing', 'is-waiting'\);/);
const hs = fn('hintSlots');
assert.match(hs, /i === 0 \? `<span class="ec-slot is-first"/, 'the hint shows the first letter in a tile…');
assert.match(hs, /`<span class="ec-slot" \$\{delay\}><\/span>`/, '…and empty slots for the rest');
assert.match(echo, /hintEl\.setAttribute\('aria-label', hintFor\(order\[idx\]\.en\)\);/, 'screen readers still hear the hint');
for (const sel of ['.ec-tile', '.ec-tile::before', '.ec-slot', '.ec-play .ec-pulse']) assert.ok(echo.includes(`html[data-motion="reduced"] ${sel}`), `reduced motion stops ${sel}`);
assert.match(echo, /@media \(prefers-reduced-motion:reduce\)\{\.ec-tile,\.ec-tile::before,\.ec-slot,\.ec-play \.ec-pulse,\.ec-input\.is-drop \.ec-tile\{animation:none !important\}/);
assert.ok(!/animation-delay:calc/.test(echo), 'per-tile delays are inline (no calc() times for older iPads)');

/* Motion: the dock slides with transform/opacity; reduced motion fades */
assert.match(echo, /#ec-keys-dock\{[^}]*transition:transform \.28s ease-out,opacity \.2s ease-out\}/);
assert.match(echo, /@media \(prefers-reduced-motion:reduce\)\{#ec-keys-dock\{transform:none\}/);
assert.match(echo, /html\[data-motion="reduced"\] #ec-keys-dock,html\[data-power\]:not\(\[data-power="full"\]\) #ec-keys-dock\{transform:none\}/);
const css = echo.slice(echo.indexOf('const STYLE = `'), echo.indexOf('`;', echo.indexOf('const STYLE = `')));
for (const m of css.matchAll(/@keyframes ([\w-]+)\{((?:[^{}]*\{[^}]*\})*)\}/g)) {
  for (const d of m[2].matchAll(/\{([^}]*)\}/g)) d[1].split(';').filter(Boolean).forEach(p => assert.ok(/^(opacity|transform):/.test(p.trim()), `@keyframes ${m[1]}: ${p}`));
}
assert.ok(!/\(\?<[=!]/.test(echo), 'no regex lookbehind');

console.log('Echo on-screen keyboard audit passed.');
