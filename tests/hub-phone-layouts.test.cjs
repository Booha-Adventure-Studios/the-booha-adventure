#!/usr/bin/env node
'use strict';

// Hub Pass 6: phone layouts (CSS only).
//   B — phones held upright: slimmer one-line week doors under the card.
//   C — phones held sideways (short screens): two columns, title block on
//       the left, week card (corner doors) + Maze + Homework + Blitz on the
//       right, so the Maze is on the first screen. Measured in headless
//       Chrome: 667×375, 740×360, 844×390 and 932×430 all fit with no
//       scrolling; iPads (1024×768, 768×1024) are unaffected.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function mediaBlock(query) {
  const start = index.indexOf(`@media ${query} {`);
  assert.ok(start >= 0, `${query} block exists`);
  let depth = 0, i = index.indexOf('{', start);
  for (; i < index.length; i++) {
    if (index[i] === '{') depth++;
    else if (index[i] === '}' && --depth === 0) break;
  }
  return { start, css: index.slice(start, i + 1) };
}

const C = mediaBlock('(orientation: landscape) and (max-height: 500px) and (max-width: 999px)');
const B = mediaBlock('(max-width: 600px) and (orientation: portrait)');

// Both blocks come after the Blitz and Maze rules they override, inside the
// main stylesheet.
['.blitzRecordsBtn { width: 64px', '.mazeCta {', '.hubHomeworkBtn {', '@media (max-width: 999px)'].forEach(rule => {
  const at = index.indexOf(rule);
  assert.ok(at > 0 && at < B.start && at < C.start, `phone rules come after ${rule}`);
});
assert.ok(C.start < index.indexOf('<div id="app">'), 'phone rules live in the main stylesheet');

// ── C: two columns ───────────────────────────────────────────────────────
assert.match(C.css, /\.hub \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.45fr\);[^}]*grid-template-areas: "head hero" "head blitz";/);
assert.match(C.css, /\.hubHeader \{[^}]*grid-area: head;/);
assert.match(C.css, /\.hubHero \{ grid-area: hero; \}/);
assert.match(C.css, /\.hubBlitzMount \{ grid-area: blitz; \}/);
assert.doesNotMatch(C.css, /display:\s*contents/, 'no display: contents (keeps section semantics on older Safari)');

// Week doors return to the card's corners, still touch-sized.
assert.match(C.css, /#hubPrevWeekBtn \{ grid-area: current; justify-self: start; \}/);
assert.match(C.css, /#hubNextWeekBtn \{ grid-area: current; justify-self: end;/);
assert.match(C.css, /\.hubWeekTab \{[^}]*min-height: 44px;/);
assert.match(C.css, /\.hubWeekTabLabel, \.hubWeekTabDate \{ display: none; \}/);

// Maze and Homework side by side; Maze stays big; everything ≥44px.
assert.match(C.css, /\.hubHeroActions \{ margin-top: 10px; flex-wrap: nowrap;/);
assert.match(C.css, /\.hubHeroActions \.mazeCta \{[^}]*min-height: 48px;/);
assert.match(C.css, /\.blitzMedal \{[^}]*min-height: 44px;/);
assert.match(C.css, /\.blitzRecordsBtn \{[^}]*min-height: 44px;/);
assert.match(C.css, /\.hubCurriculumBtn \{[^}]*min-height: 44px;/);

// Compact title block; the ornament banner shrinks but stays.
assert.match(C.css, /\.ornamentBanner \{ --ob-h: 32px;/);
assert.match(C.css, /\.hubHeading \{ font-size: clamp\(20px, 3\.3vw, 28px\);/);
assert.match(C.css, /\.hubProgressHint \{ display: none; \}/);

// No new motion in the phone rules.
assert.doesNotMatch(C.css + B.css, /animation|@keyframes|transition/, 'phone rules add no motion');

// ── B: slim doors ────────────────────────────────────────────────────────
assert.match(B.css, /\.hubWeekTab \{ min-height: 48px;/);
assert.match(B.css, /\.hubWeekTabDate \{ display: none; \}/);

console.log('hub phone layouts: ok');
