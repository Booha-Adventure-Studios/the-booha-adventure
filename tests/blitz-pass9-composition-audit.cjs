const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const vocab = fs.readFileSync('js/vocab-blitz.js', 'utf8');
const sentence = fs.readFileSync('js/sentence-blitz.js', 'utf8');
const question = fs.readFileSync('js/question-blitz.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /\.booha-blitz-feedback\s*\{/, 'shared engine must reserve a feedback zone');
assert.match(engine, /overlay\.insertBefore\(feedback, contentStart \|\| null\)/,
  'feedback must be inserted between the HUD and the prompt/answer content');
assert.match(engine, /\.booha-blitz-nameplate\s*\{[\s\S]*?position: absolute;/,
  'streak feedback must live inside the reserved feedback zone');
assert.match(engine, /\.booha-blitz-callout\s*\{[\s\S]*?position: absolute;/,
  'callout feedback must live inside the reserved feedback zone');
assert.match(engine, /@media \(orientation: landscape\) and \(max-height: 620px\)/,
  'shared layout must include short-landscape responsive rules');

assert.match(vocab, /id="vb-timer-bar" class="booha-blitz-hud"/);
assert.match(vocab, /id="vb-stage" class="booha-blitz-prompt"/);
assert.match(vocab, /id="vb-options" class="booha-blitz-answer"/);
assert.match(vocab, /#vb-options\s*\{[\s\S]*?overflow-y: auto;/,
  'vocab answers must remain reachable when a short viewport cannot fit the stack');
assert.match(vocab, /max-height: 720px[\s\S]*?#vb-options\s*\{[\s\S]*?grid-template-columns: 1fr 1fr;/,
  'vocab must switch to a two-column fallback on short landscape screens');

for (const [source, prefix] of [[sentence, 'sb'], [question, 'qb']]) {
  assert.match(source, new RegExp(`id="${prefix}-timer-bar" class="booha-blitz-hud"`),
    `${prefix} must expose a stable HUD zone`);
  assert.match(source, new RegExp(`id="${prefix}-prompt" class="booha-blitz-prompt"`),
    `${prefix} must isolate the prompt zone from answers`);
  assert.match(source, new RegExp(`id="${prefix}-options" class="booha-blitz-answer"`),
    `${prefix} must expose a stable answer zone`);
  assert.match(source, new RegExp(`#${prefix}-prompt\\s*\\{[\\s\\S]*?flex: 0 0 auto;`),
    `${prefix} prompt must not collapse into the answer area`);
  assert.match(source, new RegExp(`#${prefix}-options\\s*\\{[\\s\\S]*?overflow-y: auto;`),
    `${prefix} answers must remain reachable when a short viewport cannot fit the stack`);
  assert.match(source, new RegExp(`max-height: 720px[\\s\\S]*?#${prefix}-options\\s*\\{[\\s\\S]*?grid-template-columns: 1fr 1fr;`),
    `${prefix} must switch to a two-column fallback on short landscape screens`);
}

assert.match(index, /const hubEventHandlers = \{[\s\S]*?saveId\.startsWith\('blitz:'\)[\s\S]*?renderPills\(\)/,
  'the HUB must refresh Blitz completion pills immediately after a saved perfect run');
assert.match(index, /document\.addEventListener\('booha:gameEnd', hubEventHandlers\.gameEnd\)/,
  'the HUB must register the Blitz completion refresh handler');
assert.match(index, /document\.addEventListener\('booha:weeklyReset', hubEventHandlers\.weeklyReset\)/,
  'the HUB must refresh Blitz pills after a weekly reset');

assert.match(verify, /tests\/blitz-pass9-composition-audit\.cjs/,
  'verify.sh must run the screen-composition audit');

console.log('Blitz Pass 3 composition audit passed: HUD, prompt, answer, and feedback zones are separated.');
