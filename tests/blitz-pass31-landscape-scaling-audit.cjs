const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = [
  ['js/vocab-blitz.js', 'vb'],
  ['js/sentence-blitz.js', 'sb'],
  ['js/question-blitz.js', 'qb'],
].map(([file, prefix]) => [fs.readFileSync(file, 'utf8'), prefix]);
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /@media \(orientation: landscape\) and \(max-height: 700px\)/,
  'shared Blitz styles must include a short-landscape tablet breakpoint');
assert.match(engine, /\.booha-blitz-feedback \{ flex-basis: 44px; min-height: 44px; \}/,
  'short landscape must reserve a compact feedback row');
assert.match(engine, /#vb-timer, #sb-timer, #qb-timer \{ font-size: clamp\(32px, 8vh, 58px\); \}/,
  'short landscape must make timer size height-aware');
assert.match(engine, /#vb-stage \{ gap: 4px; padding-inline: 16px; \}/,
  'short landscape must tighten the vocabulary stage without changing its structure');
assert.match(engine, /#sb-scroll, #qb-scroll \{ padding-top: 4px; gap: 8px; \}/,
  'short landscape must tighten scrollable sentence and question layouts');

const expectedSizing = {
  vb: [
    'font-size: clamp(36px, min(9vw, 8vh), 72px)',
    'font-size: clamp(52px, min(14vw, 13vh), 110px)',
  ],
  sb: [
    'font-size: clamp(32px, min(8vw, 8vh), 64px)',
    'font-size: clamp(22px, min(5vw, 5.5vh), 44px)',
  ],
  qb: [
    'font-size: clamp(32px, min(8vw, 8vh), 64px)',
    'font-size: clamp(20px, min(4.5vw, 5vh), 40px)',
  ],
};
for (const [source, prefix] of modes) {
  for (const declaration of expectedSizing[prefix]) {
    assert.ok(source.includes(declaration),
      `${prefix} sizing must consider viewport height: ${declaration}`);
  }
}

assert.match(verify, /tests\/blitz-pass31-landscape-scaling-audit\.cjs/,
  'verify.sh must run the landscape scaling audit');

console.log('Blitz landscape-scaling audit passed: wide short screens now use height-aware prompt, HUD, and answer sizing.');
