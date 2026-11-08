#!/usr/bin/env node
'use strict';

// Maze entrance (2026-11-08 product decision): Blitz is an OPTIONAL warm-up,
// never a gate. "Enter the Maze" is the primary action in every state and
// "Play Blitz" the secondary one. Maze and Blitz are parallel tracks.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'maze.html'), 'utf8');

// ── 1. Gate wording is gone for good ──
for (const phrase of [
  'Enter anyway', 'BLITZ BEFORE THE MAZE', 'ACCESS GRANTED', 'earned your way in',
  'Finish the 3 Blitz games first', 'Finish the warm-up before you enter', 'クリアしてから',
]) assert(!html.includes(phrase), `maze.html must not say "${phrase}" (Blitz is optional)`);

// ── 2. Static markup (what shows before the script runs) ──
const overlay = html.slice(html.indexOf('<div id="overlay1"'), html.indexOf('<div id="videoWrap"'));
assert.match(overlay, /id="mazeStatusKicker">OPTIONAL WARM-UP</, 'kicker says the warm-up is optional');
assert.match(overlay, /id="mazeQuestion">Want a quick warm-up\?</, 'title invites, does not require');
assert.match(overlay, /id="mazeEntryMessageEn">You can enter the Maze now, or sharpen up with Blitz first\.</, 'message offers both routes');
assert.match(overlay, /<button id="continueBtn" class="entryAction primary"/, 'Enter the Maze is primary in markup');
assert.match(overlay, /<button id="returnBtn" class="entryAction secondary"/, 'Play Blitz is secondary in markup');
assert.match(overlay, /id="continueBtnEn">Enter the Maze</, 'primary button reads Enter the Maze');
assert.match(overlay, /id="returnBtnEn">Play Blitz</, 'secondary button reads Play Blitz');

// ── 3. Behaviour: run personalizeMazeIntro() for 0, 2 and 3 Blitz clears ──
const start = html.indexOf('function personalizeMazeIntro() {');
assert(start > 0, 'personalizeMazeIntro exists');
let depth = 0, end = -1;
for (let i = html.indexOf('{', start); i < html.length; i++) {
  if (html[i] === '{') depth++;
  else if (html[i] === '}' && --depth === 0) { end = i + 1; break; }
}
const fnSource = html.slice(start, end);

function fakeEl(id, classes) {
  const set = new Set(classes);
  return {
    id, textContent: '', innerHTML: '', listeners: 0,
    classList: {
      add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : on ? set.add(c) : set.delete(c)),
    },
    addEventListener() { this.listeners++; },
  };
}

function run(cleared) {
  const types = ['vocab', 'sentences', 'questions'];
  const progress = Object.fromEntries(types.map((t, i) => [t, i < cleared]));
  const els = {
    overlay1: fakeEl('overlay1', ['overlay', 'entryOverlay', 'blitz-incomplete']),
    returnBtn: fakeEl('returnBtn', ['entryAction', 'secondary']),
    continueBtn: fakeEl('continueBtn', ['entryAction', 'primary']),
  };
  const document = {
    getElementById: id => els[id] || (els[id] = fakeEl(id, [])),
    querySelector: () => null,
  };
  const ctx = {
    document, sessionStorage: { setItem() {} },
    getBoohaFirstName: () => 'Aiko',
    readBlitzCompletionState: () => ({ progress, completedCurriculum: cleared === 3 ? 'br' : null }),
  };
  vm.runInNewContext(`${fnSource}\npersonalizeMazeIntro();`, ctx);
  return els;
}

for (const cleared of [0, 2, 3]) {
  const els = run(cleared);
  const tag = `${cleared}/3 Blitz`;
  assert(els.continueBtn.classList.contains('primary') && !els.continueBtn.classList.contains('secondary'), `${tag}: Enter the Maze is primary`);
  assert(els.returnBtn.classList.contains('secondary') && !els.returnBtn.classList.contains('primary'), `${tag}: the Blitz/hub button is secondary`);
  assert.strictEqual(els.continueBtnEn.textContent, 'Enter the Maze', `${tag}: primary label`);
  const all = Object.values(els).map(e => `${e.textContent} ${e.innerHTML}`).join(' ');
  assert(!/anyway|before you enter|first\. You|ACCESS GRANTED|earned your way/i.test(all), `${tag}: no gate wording at runtime`);
  if (cleared < 3) {
    assert.strictEqual(els.mazeStatusKicker.textContent, 'OPTIONAL WARM-UP', `${tag}: kicker`);
    assert.strictEqual(els.mazeQuestion.textContent, 'Want a quick warm-up?', `${tag}: title`);
    assert.strictEqual(els.returnBtnEn.textContent, 'Play Blitz', `${tag}: secondary label`);
  } else {
    assert.strictEqual(els.mazeStatusKicker.textContent, 'WARM-UP COMPLETE', `${tag}: kicker`);
  }
}

console.log('Maze entry audit passed: Blitz is an optional warm-up; Enter the Maze is primary at 0, 2 and 3 Blitz clears.');
