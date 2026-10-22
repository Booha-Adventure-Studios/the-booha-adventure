#!/usr/bin/env node
'use strict';

// Every engine's mounted markup must be balanced. Sentence Speed once left
// #ssp-results-wrap unclosed, so its start screen, help button and dialog
// were nested inside the old results panel; when Pass 3 hid that panel the
// game could no longer be started.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'games');
let checked = 0;
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  let at = 0;
  while ((at = src.indexOf('U.mount(`', at)) > -1) {
    const end = src.indexOf('`);', at);
    const markup = src.slice(at, end).replace(/\$\{[^}]*\}/g, '').replace(/<!--[\s\S]*?-->/g, '');
    for (const tag of ['div', 'button', 'section', 'span', 'form']) {
      const open = (markup.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
      const close = (markup.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.strictEqual(close, open, `${f}: <${tag}> opened ${open} times but closed ${close}`);
    }
    checked++; at = end;
  }
}
assert(checked >= 12, `expected every engine's mount, checked ${checked}`);

// Start screens must never sit inside a results panel that game.css hides.
const css = fs.readFileSync(path.join(ROOT, 'theme/game.css'), 'utf8');
const hidden = (css.match(/#[a-z]+-results-wrap/g) || []).map(s => s.slice(1));
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const id of hidden) {
    const start = src.indexOf(`id="${id}"`);
    if (start < 0) continue;
    // Walk the markup from the wrapper and find where it closes.
    let depth = 0, i = src.lastIndexOf('<div', start), closeAt = -1;
    const re = /<div\b|<\/div>/g; re.lastIndex = i;
    let m;
    while ((m = re.exec(src))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) { closeAt = m.index; break; } }
    const inside = src.slice(start, closeAt);
    assert(!/start-overlay|start-btn|help-btn|modal-overlay/.test(inside), `${f}: ${id} is hidden by game.css but contains the start screen, help or dialog`);
  }
}
console.log(`Games markup audit passed: ${checked} engine mounts balanced; no start screen or dialog inside a hidden results panel.`);
