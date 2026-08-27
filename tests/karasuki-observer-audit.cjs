#!/usr/bin/env node
'use strict';

// Pass 20E: the important Karasuki Observer card exposes weekly activity
// clearly and renders every Observer line with furigana.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'js', 'karasuki-data.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'karasuki.html'), 'utf8');

function sourceSection(startName, endName) {
  const start = source.indexOf(startName);
  const end = source.indexOf(endName, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} Observer contract`);
  return source.slice(start, end);
}

const popup = sourceSection('function injectObserverPop()', 'function openObserverPop()');
const opener = sourceSection('function openObserverPop()', 'function closeObserverPop()');

assert(data.includes('OBSERVER_LINES: ['), 'Observer dialogue data must remain authored in the data file');
assert((data.match(/\ben:\s*"/g) || []).length >= 11, 'Observer should retain the complete weekly dialogue ladder');
for (const term of ['今週', '一回', '戻ってきた', '足音', '探している', '九回を超えた']) {
  assert(data.includes(`"${term}"`), `Observer furigana data should include ${term}`);
}

assert(popup.includes('THE OBSERVER'), 'Observer popup needs a clear identity heading');
assert(popup.includes('WEEKLY ACTIVITY'), 'Observer popup needs a prominent weekly activity section');
assert(popup.includes('obs-pop-meter'), 'Observer popup needs a visual activity meter');
assert(popup.includes('aria-modal="true"'), 'Observer popup must remain an accessible modal');
assert(popup.includes('width:min(520px,92vw)'), 'Observer popup should use the upgraded responsive card width');
assert(opener.includes('getGamesThisWeek()'), 'Observer must read the saved weekly game count');
assert(opener.includes('GAMES PLAYED'), 'Observer must explicitly label the games-played total');
assert(opener.includes('obs-pop-count-jp'), 'Observer must show the count with Japanese reading support');
assert(opener.includes("document.getElementById('obs-pop-meter').style.width"), 'Observer must update the activity meter from the saved count');
assert(opener.includes("innerHTML = furi(jp, line.furigana || {})"), 'Observer Japanese dialogue must render authored furigana');
assert(!opener.includes("document.getElementById('obs-pop-line-jp').textContent = jp"), 'Observer Japanese dialogue must not discard furigana markup');
assert(page.includes('<script src="js/utsu-furigana.js"></script>'), 'Karasuki must load the shared furigana renderer');

console.log('Karasuki 20E Observer audit passed: upgraded status card, weekly games-played meter, accessible structure, and furigana dialogue are wired.');
