const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

// The weekly curriculum speed games are timed practice, not all-or-nothing
// perfect-run tests. A completed 15-card pass must submit its real score so
// the normal registry thresholds can award 0–3 stars.
const vocab = fs.readFileSync('games/vocab-speed.js', 'utf8');
const sentence = fs.readFileSync('games/sentence-speed.js', 'utf8');
const utils = fs.readFileSync('js/game-utils.js', 'utf8');
const weeklyEngines = [
  'ask-question.js', 'say-sentence.js', 'say-word.js',
  'sentence-order.js', 'sentence-speed.js', 'sentence-tap.js',
  'spell-word.js', 'vocab-speed.js', 'vocab-tap.js',
].map(file => fs.readFileSync(`games/${file}`, 'utf8'));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(utils, /emitGameEnd\(detail\)/,
  'shared game utilities must provide guarded result submission');
assert.match(utils, /renderResultMeta\(container,/,
  'shared game utilities must provide the Pass 1 result summary');
assert.match(utils, /game-result-stars/,
  'Pass 1 result summary must include an accessible star row');
assert.match(utils, /renderResultDetails\(container,/,
  'shared game utilities must provide the Pass 2 learning summary');
assert.match(utils, /game-result-review/,
  'Pass 2 result summary must include a missed-item review drawer');
assert.match(utils, /furiganaHTML\(jp, hira, authoredReadings/,
  'Pass 4 must support authored Furigana maps for review items');
assert.match(utils, /item\.readings \|\| item\.furigana \|\| item\.readingMap/,
  'Pass 4 must accept the documented reading-map aliases from content cards');
assert.match(utils, /<ruby>\$\{escape\(kanjiRun\)\}/,
  'Pass 3 Furigana must attach readings to Kanji runs');

const furiganaSandbox = {
  window: {},
  document: {},
  navigator: { userAgent: '', platform: '', maxTouchPoints: 0 },
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
};
vm.runInNewContext(utils, furiganaSandbox);
const furigana = furiganaSandbox.window.GAME_UTILS.furiganaHTML;
assert.equal(
  furigana('今日', 'きょう', { 今日: 'きょう' }),
  '<ruby>今日<rt>きょう</rt></ruby>',
  'authored reading maps must override heuristic segmentation',
);
assert.match(
  furigana('これは私の机です。', 'これ は わたし の つくえ です'),
  /<ruby>私<rt>わたし<\/rt><\/ruby>[の].*<ruby>机<rt>つくえ<\/rt><\/ruby>/,
  'flat readings must still render separate ruby runs for sentences',
);

function listContentFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...listContentFiles(full));
    else if (/(vocab|sentences|questions)\.json$/.test(full)) files.push(full);
  }
  return files;
}

const furiganaContentProblems = [];
for (const file of listContentFiles('content')) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const card of data.cards || []) {
    const jp = String(card.jp || '');
    const hira = String(card.hira || '');
    const hasKanji = /[一-龯々]/.test(jp);
    if (hasKanji && !hira) furiganaContentProblems.push(`${file}: ${jp} has no hira`);
    const map = card.readings || card.furigana || card.readingMap || null;
    if (map && typeof map === 'object') {
      for (const [term, reading] of Object.entries(map)) {
        if (!jp.includes(term) || !String(reading || '').trim()) {
          furiganaContentProblems.push(`${file}: invalid map for ${jp}`);
        }
      }
    }
    if (hasKanji && hira && !/<ruby>/.test(furigana(jp, hira, map))) {
      furiganaContentProblems.push(`${file}: no ruby output for ${jp}`);
    }
  }
}
assert.deepEqual(furiganaContentProblems, [], 'content Furigana audit found invalid or unreadable cards');

for (const source of weeklyEngines) {
  assert.match(source, /U\.renderResultMeta\(/,
    'every weekly engine must render the shared score/best/star summary');
  assert.match(source, /U\.renderResultDetails\(/,
    'every weekly engine must render the Pass 2 learning summary');
}

for (const [source, prefix] of [[vocab, 'vs'], [sentence, 'ssp']]) {
  assert.match(source, /U\.shuffle\(CFG\.cards\.slice\(0, 15\)\)/,
    `${prefix} must use the weekly 15-card deck`);
  assert.match(source, /function bindSingleActivation\(element, handler\)/,
    `${prefix} must standardize answer activation`);
  assert.match(source, new RegExp(`function showResults\\(\\)\\s*\\{[\\s\\S]*?idx !== 15 \\|\\| feedbackState !== 'playing'`),
    `${prefix} must finish after all 15 questions, regardless of score`);
  assert.doesNotMatch(source, /idx !== 15 \|\| score !== 15 \|\| streak !== 15/,
    `${prefix} must not require a perfect run to show results`);
  assert.match(source, /completed: true,[\s\S]*?mistakes/,
    `${prefix} must mark a finished normal pass complete and retain mistakes`);
  assert.match(source, /U\.emitGameEnd\(/,
    `${prefix} must submit through the paint-safe result helper`);
  assert.match(source, /mistakes\+\+;\s*setTimeout\(\(\) => \{ idx\+\+; renderQ\(\); \}/,
    `${prefix} must advance after a wrong or timed-out answer`);
  assert.match(source, /score\+\+;/,
    `${prefix} must count correct answers rather than using the question index as score`);
  assert.doesNotMatch(source, /score\s*=\s*idx\s*\+\s*1/,
    `${prefix} must not inflate score after a missed question`);
  assert.match(source, /function onTimeout\(\)\s*\{[\s\S]*?stopHeat\(\);/,
    `${prefix} must cancel the timer RAF when time expires`);
  assert.doesNotMatch(source, /One mistake resets the run\./,
    `${prefix} instructions must describe normal playthrough scoring`);
}

assert.match(verify, /tests\/blitz-perfect-run-contract\.test\.cjs/,
  'verify.sh must run the weekly speed-game scoring contract test');
console.log('Weekly speed-game contract passed: normal 15-card runs submit their score and can earn stars without a perfect streak.');
