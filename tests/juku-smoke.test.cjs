#!/usr/bin/env node
// CommonJS on purpose: the Desktop parent project declares ESM globally.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function storage() {
  const data = new Map();
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
}

const localStorage = storage();
const sessionStorage = storage();
localStorage.setItem('booha_userid', 'student-a');

const document = {
  dispatchEvent() {},
  addEventListener() {}
};

class MockAudio {
  constructor() {
    this.readyState = 4;
    this.preload = '';
    this.src = '';
  }
  addEventListener() {}
  removeEventListener() {}
  load() {}
}

class FailingAudio extends MockAudio {
  constructor() {
    super();
    this.readyState = 0;
    this.listeners = {};
  }
  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }
  removeEventListener(type, handler) {
    if (this.listeners[type] === handler) delete this.listeners[type];
  }
  load() {
    if (this.listeners.error) this.listeners.error();
  }
}

const context = {
  window: {},
  document,
  localStorage,
  sessionStorage,
  console,
  Date,
  Intl,
  Math,
  JSON,
  Event: class Event { constructor(type) { this.type = type; } },
  CustomEvent: class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; }
  },
  Audio: MockAudio,
  setInterval() { return 1; },
  setTimeout,
  clearTimeout
};
context.window.window = context.window;
context.window.CALENDAR = {
  getCurrentCurriculumWeek() {
    return {
      year: 2026, monthSlug: 'july', weekNumber: 4,
      weekId: 'july-w4', weekStart: '2026-07-26'
    };
  }
};
context.CALENDAR = context.window.CALENDAR;

vm.createContext(context);
for (const file of ['js/juku-config.js', 'js/juku-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
}

const CFG = context.window.JUKU_CONFIG;
const J = context.window.JUKU;
const slotA = CFG.slots[0];
const slotB = CFG.slots[1];
const tk = (weekday, h, mi, s = 0) => ({
  weekday, secOfDay: h * 3600 + mi * 60 + s,
  dateStr: '2026-08-01'
});

assert.strictEqual(J.TOTAL_MIN, 90, 'phase schedule must total 90 minutes');
assert.strictEqual(J.resolve(slotB, tk(3, 18, 58)).state, 'before-day',
  'weekday access must stay locked');
assert.strictEqual(J.resolve(slotA, tk(6, 16, 54, 59)).state, 'before');
assert.strictEqual(J.resolve(slotA, tk(6, 16, 55)).state, 'lobby');
assert.strictEqual(J.resolve(slotA, tk(6, 17, 0)).phase.id, 'dictation');
assert.strictEqual(J.resolve(slotA, tk(6, 18, 25)).phase.id, 'results');
assert.strictEqual(J.resolve(slotA, tk(6, 18, 30)).state, 'closed');
assert.strictEqual(J.resolve(slotB, tk(6, 18, 55)).state, 'lobby');
assert.strictEqual(J.resolve(slotB, tk(6, 19, 0)).phase.id, 'dictation');
assert.strictEqual(J.resolve(slotB, tk(6, 20, 30)).state, 'closed');

J.selectSlot('slot-a');
const record = J.weekRecord();
assert.ok(record.occurrenceKey.includes('2026-07-26'),
  'record occurrence key must include a year-safe week date');
assert.strictEqual(record.week.curriculum, 'pb',
  'week records must freeze the selected curriculum');
assert.ok(Object.keys(record.save.weeks)[0].includes('2026-07-26'),
  'saved record key must not collide annually');

const html = fs.readFileSync(path.join(ROOT, 'juku.html'), 'utf8');
assert.ok(html.includes("'js/juku-results.js'"),
  'juku-results.js must be loaded before phases');
assert.strictEqual(CFG.content.allowDemo, false,
  'production juku must not silently fall back to demo questions');
assert.strictEqual(CFG.teacherReview.purpose, 'juku-report-review',
  'teacher review must use a purpose-scoped server authorization');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(CFG.content.dictation.audioPreflight)),
  { timeoutMs: 12000, concurrency: 4 },
  'the lobby must preload selected dictation audio before class');
assert.strictEqual(CFG.content.responseModes.pb.dictationWord, 'tiles',
  'Pre-Boo should retain letter-tile dictation scaffolding');
assert.strictEqual(CFG.content.responseModes.br.dictationWord, 'text',
  'Boo-riculum should use open dictation');
assert.strictEqual(CFG.content.responseModes.br.translation, 'text-review',
  'Boo-riculum translation must be preserved for human review');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(CFG.content.dictation.profiles.br)),
  { words: 8, wordSec: 35, sentences: 6, sentenceSec: 90 },
  'Boo-riculum dictation should favor fewer, deeper open responses');

for (const curriculum of ['br', 'pb']) {
  const base = path.join(ROOT, 'content', curriculum, 'july');
  const juku = JSON.parse(fs.readFileSync(path.join(base, 'juku.json'), 'utf8'));
  const vocab = JSON.parse(fs.readFileSync(path.join(base, 'vocab.json'), 'utf8')).cards;
  const sentences = JSON.parse(fs.readFileSync(path.join(base, 'sentences.json'), 'utf8')).cards;
  assert.strictEqual(juku.weeks.length, 4, `${curriculum}: four juku weeks`);
  assert.strictEqual(vocab.length, 60, `${curriculum}: 60 vocabulary cards`);
  assert.strictEqual(sentences.length, 60, `${curriculum}: 60 sentence cards`);
  for (const week of juku.weeks) {
    assert.strictEqual(week.definitions.length, 15,
      `${curriculum} week ${week.week}: 15 definitions`);
    for (const question of [
      ...(week.passage.comprehension || []),
      ...(week.questions || []).filter(q => q.type === 'read')
    ]) {
      assert.ok(question.correct >= 0 && question.correct < question.choices.length,
        `${curriculum} week ${week.week}: valid correct-answer index`);
    }
    if (curriculum === 'br') {
      assert.ok(week.writingPrompt && week.writingPrompt.targets.length >= 2,
        `BR week ${week.week}: open writing prompt with curriculum targets`);
      for (const item of week.questions.filter(q => q.type === 'translate')) {
        assert.ok(Array.isArray(item.accepted) && item.accepted.length,
          `BR week ${week.week} translation ${item.n}: accepted alternatives`);
      }
    }
  }
}

context.fetch = async function (url) {
  const clean = String(url).split('?')[0];
  const filename = path.join(ROOT, clean);
  try {
    const text = fs.readFileSync(filename, 'utf8');
    return { ok: true, status: 200, text: async () => text };
  } catch (error) {
    return { ok: false, status: 404, text: async () => '' };
  }
};
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'js/juku-tests.js'), 'utf8'),
  context,
  { filename: 'js/juku-tests.js' }
);

J.selectSlot('slot-b');
context.window.JUKU_TESTS.preflight(slotB).then(async result => {
  assert.strictEqual(result.ok, true, `BR July preflight failed: ${result.issues}`);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(result.audio)),
    { required: 14, ready: 14, failures: [] },
    'BR preflight must confirm all 8 word and 6 sentence clips');
  assert.ok(result.manifest && result.manifest.split('.').length === 3,
    'preflight must record exact vocab/sentence/juku revisions');
  const saved = J.weekRecord().week;
  assert.strictEqual(saved.contentStatus.ready, true);
  assert.strictEqual(saved.contentStatus.manifest, result.manifest);
  J.patchWeek(week => {
    week.survey = { expect: '70-79', hardest: 'reading', submitted: true };
    week.prediction = { expect: '80-89', worst: 'dictation' };
    week.teacherReview = {
      reading: {
        mode: 'teacher-observed', complete: true,
        scores: { accuracy: 3, selfCorrection: 2, phrasing: 2, pace: 3 }
      }
    };
    week.sections = {
      dictation: {
        total: 2, subTotals: { word: 1, sent: 1 },
        items: [{ tier: 'word', ok: true }, { tier: 'sent', ok: false }]
      },
      order: { total: 1, items: [{ ok: true }] },
      vocab: {
        total: 2, subTotals: { mean: 1, def: 1 },
        items: [{ kind: 'mean', ok: true }, { kind: 'def', ok: true }]
      },
      mixed: {
        total: 3,
        reviewTotal: 2,
        subTotals: { comp: 1, read: 1, translate: 1, write: 1, openWriting: 1 },
        items: [
          { kind: 'comp', ok: true }, { kind: 'read', ok: true },
          { kind: 'translate', ok: false, reviewOnly: true, reviewStatus: 'pending',
            ans: 'A valid alternative translation' },
          { kind: 'write', ok: true, accuracy: 0.9 },
          { kind: 'openWriting', ok: false, reviewOnly: true, reviewStatus: 'pending',
            ans: 'My original story.' }
        ]
      }
    };
  });
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'js/juku-results.js'), 'utf8'),
    context,
    { filename: 'js/juku-results.js' }
  );
  const task = { innerHTML: '', textContent: '', querySelector() { return null; } };
  context.window.JUKU_RESULTS.render(task, {}, slotB);
  const report = J.weekRecord().week.report;
  assert.strictEqual(report.schema, 3);
  assert.strictEqual(report.skills.listeningWords.percent, 100);
  assert.strictEqual(report.skills.listeningSentences.percent, 0);
  assert.strictEqual(report.skills.translationBuild.pending, 1);
  assert.strictEqual(report.skills.openWriting.pending, 1);
  assert.strictEqual(report.skills.spellingBuild.meanAccuracy, 90);
  assert.strictEqual(report.readingRound.complete, true);
  assert.strictEqual(report.reviewSummary.pending, 2);
  assert.strictEqual(report.provisional, true);
  assert.ok(task.innerHTML.includes('じどうチェック'));
  assert.ok(task.innerHTML.includes('せいかくさ 3/3'));
  assert.ok(task.innerHTML.includes('Skill evidence'));
  assert.ok(task.innerHTML.includes('PINで かくにん'),
    'a provisional result must require teacher PIN finalization');

  const resultsSource = fs.readFileSync(path.join(ROOT, 'js/juku-results.js'), 'utf8');
  assert.ok(resultsSource.includes('ほんとうに？ / Are you sure?'),
    'score denial must require an explicit second confirmation');
  const syncSource = fs.readFileSync(path.join(ROOT, 'js/sync-client.js'), 'utf8');
  assert.ok(syncSource.includes('/teacherPinVerify'),
    'teacher PIN must be verified by a non-mutating server endpoint');
  const profileSource = fs.readFileSync(path.join(ROOT, 'profile.html'), 'utf8');
  assert.ok(profileSource.includes('juku-report-log.js'),
    'the student profile must load the finalized Juku report viewer');
  assert.ok(html.includes('booha:identityReady'),
    'the Juku gate must wait for freshly verified token identity');
  assert.ok(!html.includes('var poll = setInterval'),
    'the Juku gate must not authorize from a stale cached membership flag');

  localStorage.setItem('booha_userid', 'late-student');
  J.selectSlot('slot-a');
  const lateTask = { innerHTML: '', textContent: '', querySelector() { return null; } };
  context.window.JUKU_RESULTS.render(lateTask, {}, slotA);
  assert.strictEqual(J.weekRecord().week.report, null,
    'opening during results without assessment evidence must not mint a zero report');
  assert.ok(lateTask.textContent.includes('No assessment evidence'));

  context.Audio = FailingAudio;
  const audioFailure = await context.window.JUKU_TESTS.preflight(slotA);
  assert.strictEqual(audioFailure.ok, false,
    'a lesson with unavailable selected audio must fail closed');
  assert.strictEqual(audioFailure.audio.required, 12,
    'PB audio preflight must select 8 word and 4 sentence clips');
  assert.strictEqual(audioFailure.audio.ready, 0);
  assert.ok(audioFailure.issues.some(issue =>
    String(issue).includes('audio preflight failed')),
  'audio failure must be visible in preflight issues');

  console.log('Juku smoke checks passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
