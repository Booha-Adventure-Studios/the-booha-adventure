#!/usr/bin/env node
'use strict';

// Hub Pass 4: layout A + notebook Homework button.
//   · Wide screens: the week card is full width; last/next week are compact
//     doors in its top corners (one shared grid cell). 999px and below keeps
//     the stacked doors under the card.
//   · The Blitz strip matches the full-width card.
//   · Homework is ruled notebook paper. (Its Pass 4 NEW badge was replaced
//     in Pass 10 by a quiet count — see homework-count-badge.test.cjs.) Was: a NEW badge that showed until
//     this student opens this week's homework (stored in their own save).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Top-level rule only (start of line, 4-space indent), not media overrides
// or descendant selectors such as ".hubHeroActions .hubHomeworkBtn".
function block(selector) {
  const needle = '\n    ' + selector + ' {';
  const at = index.indexOf(needle);
  assert.ok(at >= 0, `${selector} rule exists`);
  const start = at + 1;
  return index.slice(start, index.indexOf('}', start) + 1);
}
function mediaBlock(query) {
  const start = index.indexOf(`@media (${query}) {\n      .hubWeekLayout`);
  assert.ok(start >= 0, `${query} week layout block exists`);
  let depth = 0, i = index.indexOf('{', start);
  for (; i < index.length; i++) {
    if (index[i] === '{') depth++;
    else if (index[i] === '}' && --depth === 0) break;
  }
  return index.slice(start, i + 1);
}

// ── Layout A (wide) ──────────────────────────────────────────────────────
const layout = block('.hubWeekLayout');
assert.match(layout, /grid-template-columns: minmax\(0, 1fr\);/, 'one full-width column');
assert.match(layout, /grid-template-areas: "current";/);
const tab = block('.hubWeekTab');
assert.match(tab, /min-height: 44px;/, 'doors stay touch-sized');
assert.match(tab, /z-index: 2;/, 'doors sit above the card');
assert.match(tab, /border-radius: 999px;/);
assert.match(index, /#hubPrevWeekBtn \{ grid-area: current; justify-self: start;/);
assert.match(index, /#hubNextWeekBtn \{ grid-area: current; justify-self: end;/);
assert.match(block('.hubWeekTabDate'), /display: none;/, 'dates hide in the compact doors');
assert.match(block('.hubBlitzMount'), /display: block;/, 'Blitz matches the full-width card');

// ── 999px and below: stacked doors restored ─────────────────────────────
const medium = mediaBlock('max-width: 999px');
assert.match(medium, /grid-template-areas: "current current" "previous next";/);
assert.match(medium, /#hubPrevWeekBtn \{ grid-area: previous; justify-self: stretch; \}/);
assert.match(medium, /#hubNextWeekBtn \{ grid-area: next; justify-self: stretch;/);
assert.match(medium, /\.hubWeekTab \{[^}]*margin: 0;[^}]*border-radius: 20px;/, 'doors lose the corner inset and pill shape');
assert.match(medium, /\.hubWeekTabDate \{ display: block; \}/, 'dates return under the card');

// Markup order and ids the rest of the hub relies on are unchanged.
assert.match(index, /class="hubWeekLayout"[\s\S]*?id="hubPrevWeekBtn"[\s\S]*?id="weekCards" class="hubCurrentWeekMount"[\s\S]*?id="hubNextWeekBtn"/);

// ── Homework: notebook paper ─────────────────────────────────────────────
const hw = block('.hubHomeworkBtn');
assert.match(hw, /background-color: #fbf6e8;/, 'cream paper');
assert.match(hw, /rgba\(214,84,84,\.85\)/, 'red margin line');
assert.match(hw, /repeating-linear-gradient\(180deg/, 'ruled lines');
assert.match(hw, /min-height: 44px;/, 'touch-sized');
assert.doesNotMatch(hw, /#fff2a0|#ffd45f|#f5ae24/, 'no longer the Blitz gold');
assert.match(index, /\.hubHomeworkBtn::after \{[\s\S]*?linear-gradient\(225deg/, 'folded corner');
const button = index.match(/<button id="hubHomeworkBtn"[\s\S]*?<\/button>/)[0];
assert.match(button, /<span id="hubHomeworkCount" class="hubHomeworkCount" hidden><\/span>/, 'the count badge starts hidden (Pass 10)');
assert.match(button, /<svg class="hubHomeworkPencil"[^>]*aria-hidden="true"/, 'pencil icon is decorative');
assert.match(button, /HOMEWORK <span>しゅくだい<\/span>/, 'bilingual label kept');

// Clicking opens the list (the count badge has its own test).
assert.match(index, /hubHomeworkBtn\.addEventListener\('click', \(\) => \{\s*openHomeworkList\(\);/);

console.log('hub layout A + homework: ok');
