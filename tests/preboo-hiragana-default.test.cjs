#!/usr/bin/env node
'use strict';

// Pre-Boo games start in hiragana (Nov 2026). The listening games already did;
// Vocabulary Tap, Sentence Tap and Sentence Order now follow the same rule.
// The あ switch still flips to kanji, and Replay returns to the curriculum
// default rather than to kanji.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

for (const f of ['games/vocab-tap.js', 'games/sentence-tap.js', 'games/sentence-order.js']) {
  const src = read(f);
  assert.match(src, /const HIRA_DEFAULT = \(document\.documentElement\.dataset\.curriculum \|\| CFG\.curriculum\) === 'pb';/,
    `${f}: Pre-Boo is the hiragana default`);
  assert.match(src, /function setHiraMode\(on\) \{\s*hiraMode = on;\s*document\.body\.classList\.toggle\('hira-mode', hiraMode\);\s*hiraLabel\.textContent = hiraMode \? '漢字' : 'ひらがな';\s*\}/,
    `${f}: one helper keeps the body class and button label in step`);
  assert.match(src, /hiraBtn\.addEventListener\('click', \(\) => setHiraMode\(!hiraMode\)\);\s*setHiraMode\(HIRA_DEFAULT\);/,
    `${f}: the switch still works and the first card shows the default`);
  assert.doesNotMatch(src, /document\.body\.classList\.remove\('hira-mode'\)/, `${f}: Replay no longer forces kanji`);
  assert.strictEqual((src.match(/setHiraMode\(HIRA_DEFAULT\);/g) || []).length, 2, `${f}: start and Replay both use the default`);
}

// The listening games keep their existing Pre-Boo rule.
for (const f of ['games/say-word.js', 'games/say-sentence.js', 'games/ask-question.js']) {
  assert.match(read(f), /const KANJI_DEFAULT = CFG\.curriculum !== 'pb';/, `${f}: Pre-Boo still starts in hiragana`);
}

console.log('Pre-Boo hiragana default passed: 3 tap/order games + 3 listening games start in hiragana for Pre-Boo.');
