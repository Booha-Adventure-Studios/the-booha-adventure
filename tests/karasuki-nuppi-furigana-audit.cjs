#!/usr/bin/env node
'use strict';

// Pass 20D: every Nuppi dialogue line renders Japanese reading support.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const furigana = fs.readFileSync(path.join(root, 'js', 'utsu-furigana.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'karasuki.html'), 'utf8');

function sourceSection(startName, endName) {
  const start = source.indexOf(startName);
  const end = source.indexOf(endName, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} Nuppi contract`);
  return source.slice(start, end);
}

const dialogue = sourceSection('const NUPPI_LINES = [', '/* ── Nuppi state ── */');
const opener = sourceSection('function openNuppiPop()', 'function closeNuppiPop()');

assert((dialogue.match(/\ben:\s*"/g) || []).length >= 30, 'Nuppi should retain the full dialogue line set');
assert(dialogue.includes('const NUPPI_FURIGANA = {'), 'Nuppi needs an authored furigana reading map');
for (const term of ['名前', '影', '考え', '見つけた', '地図', '足音', '心配', '持ち主', '思い出', '秘密']) {
  assert(dialogue.includes(`'${term}':`), `Nuppi furigana map should include ${term}`);
}

assert(opener.includes('furi(jp, NUPPI_FURIGANA)'), 'Nuppi Japanese output must pass through the shared furigana helper');
assert(opener.includes("document.getElementById('nuppi-pop-jp').innerHTML"), 'Nuppi Japanese output must render ruby markup as HTML');
assert(!opener.includes("document.getElementById('nuppi-pop-jp').textContent = jp"), 'Nuppi Japanese output must not discard furigana markup with textContent');
assert(furigana.includes('function sentence(value, readings)'), 'shared furigana renderer must remain available');
assert(page.includes('<script src="js/utsu-furigana.js"></script>'), 'Karasuki must load the furigana renderer before dialogue');

console.log('Karasuki 20D Nuppi furigana audit passed: the full Nuppi dialogue set uses authored readings and renders them in the popup.');
