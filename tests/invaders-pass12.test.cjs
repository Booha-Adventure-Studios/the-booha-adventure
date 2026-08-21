#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'booha_invaders.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'theme/invaders.css'), 'utf8');

// Living allowlist of every distinct English WORD found in a ctx.fillText()
// literal that does not already carry Japanese in the same literal. Each
// entry here has been manually verified (pass 12) to have a Japanese line
// drawn immediately after it on screen. If a brand-new English word shows
// up in a fillText call that isn't in this list, this test fails on
// purpose -- that forces a human decision (translate it, or extend this
// list with a reason) instead of letting an untranslated string slip by.
const ALLOWLIST = new Set([
  'BOSS', 'WAVE', 'BEST:', 'KILLS:', 'DOTTY',       // HUD labels + boss/wave banners (JP line follows)
  'STREAK', 'ENERGY',                                // HUD labels (JP line follows)
  'GUN',                                             // timed-weapon HUD: "<mode> GUN Ns" + JP line below
  'PAUSE', 'RESUME', 'SAVE', 'OFF', 'ON', 'EXIT',    // pause menu buttons (JP line follows each)
  'Tap', 'anywhere', 'else', 'to', 'resume',         // pause menu hint (JP line follows)
  'GAME', 'OVER',                                    // game-over headline (JP line follows)
  'KILLS', 'BEST',                                   // pause/game-over summary lines (JP line follows)
  'SCORE',                                           // "SCORE / スコア" combined label + score headline
  'NEW', 'HIGH', 'SCORE!',                           // "NEW HIGH SCORE" toast (新記録！ follows)
  'Press', 'Restart',                                // "Press R to Restart" (JP line follows)
]);

// Extract the literal (non-interpolated) text from every ctx.fillText call
// -- handles plain strings, template literals, and the one ternary case
// (mute button label) by pulling both branches.
const calls = [];
const re = /ctx\.fillText\(\s*(muted \? "[^"]*" : "[^"]*"|`[^`]*`|"[^"]*")/g;
let m;
while ((m = re.exec(engine))) calls.push(m[1]);
assert.ok(calls.length > 15, 'sanity check: expected to find the usual crop of fillText calls');

function literalWords(expr) {
  const stripped = expr.replace(/\$\{[^}]*\}/g, ' '); // blank out interpolations
  const branches = stripped.split(' : ').map((s) => s.replace(/^muted \? /, ''));
  const words = [];
  for (const branch of branches) {
    const bare = branch.replace(/[`"]/g, '');
    for (const w of bare.split(/\s+/)) {
      const trimmed = w.trim();
      if (trimmed) words.push(trimmed);
    }
  }
  return words;
}

const hasLatin = (s) => /[A-Za-z]{2,}/.test(s);
const hasCJK = (s) => /[぀-ゟ゠-ヿ一-鿿]/.test(s);

const unexpected = [];
for (const call of calls) {
  for (const word of literalWords(call)) {
    if (hasLatin(word) && !hasCJK(word) && !ALLOWLIST.has(word)) unexpected.push(word);
  }
}
assert.deepStrictEqual(
  unexpected,
  [],
  `found English fillText text not in the pass-12 allowlist (translate it, or add it to ALLOWLIST with a reason): ${JSON.stringify(unexpected)}`
);

// Structural check on the title screen: every .save-en span must have a
// .save-jp sibling right after it (covers Continue and the pass-9 Save
// Menu button, and any future button following the same markup pattern).
const enSpans = [...page.matchAll(/<span class="save-en">([^<]*)<\/span>\s*\n?\s*<span class="save-jp">/g)];
const enSpanCount = (page.match(/class="save-en"/g) || []).length;
assert.strictEqual(
  enSpans.length,
  enSpanCount,
  'every .save-en span must be immediately followed by a .save-jp span'
);
assert.ok(enSpanCount >= 2, 'expected at least Continue + Save Menu buttons');

// CSS must not carry any visible English text via content: (buttons and
// labels all come from the DOM/canvas, not CSS-generated content).
assert.doesNotMatch(css, /content:\s*["'][A-Za-z]/);

console.log(
  `Booha Invaders pass 12 checks passed (${calls.length} fillText calls swept, ${enSpanCount} save-en/save-jp pairs verified).`
);
console.log('NOTE: js/ui/save-menu.js and js/ui/memory-code-ui.js (shared with Booha Destruction) show');
console.log('English-only status toasts ("Save file downloaded!", "Adventure reset.", "Copied! ✓", etc.)');
console.log('Left untouched here since editing them affects Destruction too -- flagged for a separate decision.');
