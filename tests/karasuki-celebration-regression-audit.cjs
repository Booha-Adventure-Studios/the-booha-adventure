#!/usr/bin/env node
'use strict';

// Pass 20G: final integration guard for the Karasuki celebration sequence.
// This keeps the 20A-20F pieces from drifting apart during later edits.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'js', 'karasuki-data.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'karasuki.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function section(startName, endName) {
  const start = source.indexOf(startName);
  const end = source.indexOf(endName, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName}`);
  return source.slice(start, end);
}

const discovery = section('function showWandererDiscovery(w)', 'function showWandererReturn(w)');
const reunion = section('function showWandererReturn(w)', 'function spawnGlitter(w, now)');
const opener = section('function openWandererPop(w)', 'function closeWandererPop()');
const observer = section('function openObserverPop()', 'function closeObserverPop()');
const nuppi = section('function openNuppiPop()', 'function closeNuppiPop()');

assert(page.indexOf('js/karasuki-data.js') < page.indexOf('js/karasuki.js'), 'Karasuki data must load before its runtime');
assert(page.indexOf('js/utsu-card.js') < page.indexOf('js/utsu-sfx.js'), 'shared card must load before its optional audio helper');
assert(page.indexOf('js/utsu-sfx.js') < page.indexOf('js/utsu-furigana.js'), 'audio and furigana helpers must load before Karasuki');
assert(page.indexOf('js/utsu-furigana.js') < page.indexOf('js/karasuki.js'), 'Karasuki must load after the furigana helper');

assert(card.includes('role="dialog" aria-modal="true"'), 'celebration card must remain an accessible modal');
assert(card.includes('showCelebrationPop: showCelebrationPop'), 'shared celebration API must remain public');
assert(card.includes('if (opts.sfx && window.UtsuSfx'), 'shared card must retain the optional SFX integration');
assert(!/showCelebrationPop[\s\S]{0,500}setTimeout\(/.test(card), 'stable celebration card must not auto-dismiss');

assert(discovery.includes("title: 'NEW WANDERER FOUND!'"), 'first discovery must keep its celebration title');
assert(discovery.includes("sfx: 'wandererFound'"), 'first discovery must use its procedural motif');
assert(reunion.includes("title: 'HELLO AGAIN!'"), 'return visit must keep its welcome-back title');
assert(reunion.includes("sfx: 'wandererReturn'"), 'return visit must use its procedural motif');
assert(opener.includes("if (visit && visit.popupKind === 'discovery') showWandererDiscovery(w);"), 'first-visit branch must open the discovery card');
assert(opener.includes("else if (visit && visit.popupKind === 'return') showWandererReturn(w);"), 'new-week branch must open the welcome-back card');

assert(nuppi.includes("innerHTML = furi(jp, NUPPI_FURIGANA)"), 'Nuppi dialogue must preserve furigana markup');
assert(observer.includes('getGamesThisWeek()'), 'Observer must read the weekly activity count');
assert(observer.includes('GAMES PLAYED'), 'Observer must show the games-played label');
assert(observer.includes("innerHTML = furi(jp, line.furigana || {})"), 'Observer dialogue must preserve authored furigana');
assert(observer.includes("style.width = `${percent}%`"), 'Observer progress meter must reflect the saved count');

assert(sfx.includes('wandererFound: function ()'), 'discovery audio motif must remain available');
assert(sfx.includes('wandererReturn: function ()'), 'return audio motif must remain available');
assert(sfx.includes('window.AudioContext || window.webkitAudioContext'), 'procedural audio must use the lightweight WebAudio path');

const observerStart = data.indexOf('OBSERVER_LINES: [');
const observerEnd = data.indexOf('\n],', observerStart);
assert(observerStart >= 0 && observerEnd > observerStart, 'Observer data block must remain present');
const observerData = data.slice(observerStart, observerEnd);
const observerEntries = (observerData.match(/\ben:\s*"/g) || []).length;
const observerFurigana = (observerData.match(/\n\s*furigana:\s*\{/g) || []).length;
assert(observerEntries >= 11, 'Observer must retain the full activity dialogue ladder');
assert(observerFurigana === observerEntries, 'every Observer dialogue line must have furigana data');

assert(sw.includes('${BASE}/karasuki.html'), 'service worker must precache Karasuki');
assert(/booha-pages-2026-\d+/.test(sw), 'service worker must declare a page cache version');
assert(verify.includes('tests/karasuki-celebration-regression-audit.cjs'), 'verify.sh must run the final integration audit');

for (const file of [
  'utsu-card-celebration-audit.cjs',
  'karasuki-wanderer-celebration-audit.cjs',
  'karasuki-wanderer-return-celebration-audit.cjs',
  'karasuki-nuppi-furigana-audit.cjs',
  'karasuki-observer-audit.cjs',
  'karasuki-celebration-audio-audit.cjs',
]) {
  assert(fs.existsSync(path.join(root, 'tests', file)), `20${file.startsWith('utsu') ? 'A' : 'B-F'} audit file must remain available: ${file}`);
}

console.log('Karasuki 20G regression audit passed: celebration branches, accessibility, furigana, Observer progress, procedural audio, load order, and verification wiring remain integrated.');
