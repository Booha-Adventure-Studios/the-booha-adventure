#!/usr/bin/env node
'use strict';
/*
 * Karasuki Cards Pass 2a — registry, host rotation, eligibility and
 * attempt limits, interruption policy, win/fail recording, Sunday
 * rollover, answer checking, word snapshot, and the save default.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Load the real scripts ─────────────────────────────────────────── */
const ctx = { console, Intl, Date, Math, JSON, Promise };
ctx.window = ctx;
vm.createContext(ctx);
for (const file of ['js/calendar.js', 'js/karasuki-wanderer-data.js', 'js/karasuki-cards-data.js', 'games/echo.js', 'js/karasuki-cards.js']) {
  vm.runInContext(read(file), ctx, { filename: file });
}
const K = ctx.KarasukiCards;
const E = ctx.EchoLogic;
const CAL = ctx.CALENDAR;
assert.ok(K && E && CAL, 'KarasukiCards, EchoLogic and CALENDAR should load');
const R = K.RULES;

/* ── Registry ──────────────────────────────────────────────────────── */
const cards = K.registry();
assert.ok(cards.length >= 8, 'registry should list the Lv.1 cards');
cards.forEach((card, i) => {
  assert.strictEqual(card.no, i + 1, `card numbers should run 1, 2, 3… without gaps (${card.id})`);
});
assert.strictEqual(cards[0].id, 'mister-happy', 'Mister Happy is No. 01');
const wandererIds = new Set(Object.values(ctx.KARASUKI_WANDERER_DATA).map(w => w.id));
const wandererByName = ctx.KARASUKI_WANDERER_DATA;
for (const card of cards) {
  assert.ok(wandererIds.has(card.id), `${card.id} should be a known Wanderer`);
  assert.strictEqual(wandererByName[card.name] && wandererByName[card.name].id, card.id, `${card.name} name should match its id`);
  if (card.art) {
    assert.match(card.art, /^assets\/img\/cards\/karasuki-card-[a-z-]+-lv1\.webp$/, `${card.id} art path`);
    assert.ok(fs.existsSync(path.join(ROOT, card.art)), `${card.art} should exist`);
  }
}
for (const file of fs.readdirSync(path.join(ROOT, 'assets/img/cards'))) {
  assert.ok(cards.some(c => c.art === `assets/img/cards/${file}`), `${file} should be registered`);
}
assert.ok(!/\/\s*\d+\s*['"`]/.test(read('js/karasuki-cards-data.js').replace(/\/\*[\s\S]*?\*\//g, '')),
  'card numbers must not be capped with a total');

/* ── Helpers ───────────────────────────────────────────────────────── */
const words = n => Array.from({ length: n }, (_, i) => ({ en: `word${String.fromCharCode(97 + i)}`, jp: '', hira: '' }));
const ctxFor = (week, day, blitz = true) => ({ weekKey: `W${week}`, todayKey: `D${day}`, blitzTriple: blitz });
function play(state, correct, now = 1) {
  let last;
  for (let i = 0; i < R.rounds; i++) {
    const w = K.currentWord(state).en;
    last = K.submitAnswer(state, i < correct ? w.toUpperCase() : 'zzz', now, E);
  }
  return last;
}

/* ── Eligibility, attempts, win ────────────────────────────────────── */
{
  const s = K.defaultState();
  assert.strictEqual(K.status(s, ctxFor(1, 1, false)).phase, 'locked', 'no host challenge before Blitz 3/3');
  assert.strictEqual(K.status(s, ctxFor(1, 1, false)).hostId, 'mister-happy');
  const ready = K.status(s, ctxFor(1, 1));
  assert.strictEqual(ready.phase, 'ready');
  assert.ok(ready.hostActive);

  assert.deepStrictEqual(K.startAttempt(s, ctxFor(1, 1), words(9), 1).error, 'notEnoughWords');
  assert.ok(K.startAttempt(s, ctxFor(1, 1), words(20), 1).ok);
  assert.strictEqual(s.attempt.words.length, R.snapshotSize, 'snapshot keeps 14 words');
  assert.strictEqual(s.attemptsThisWeek, 1, 'starting consumes an attempt');
  assert.strictEqual(K.status(s, ctxFor(1, 1)).phase, 'inProgress');

  const fail = play(s, 7);
  assert.ok(fail.done && !fail.outcome.passed && fail.outcome.score === 7, '7/10 fails');
  assert.strictEqual(s.hostId, 'mister-happy', 'failed host stays');
  assert.strictEqual(K.status(s, ctxFor(1, 1)).phase, 'tomorrow', 'one attempt per Tokyo day');
  assert.ok(!K.startAttempt(s, ctxFor(1, 1), words(14), 2).ok);

  assert.strictEqual(K.status(s, ctxFor(1, 2)).phase, 'ready', 'second attempt on the next day');
  assert.ok(K.startAttempt(s, ctxFor(1, 2), words(14), 3).ok);
  const win = play(s, 8, 5);
  assert.ok(win.outcome.passed, '8/10 passes');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.won['mister-happy'])),
    { cardId: 'mister-happy', lv: 1, wonAt: 5, try: 2, score: 8, week: 'W1' }, 'win recorded as 2nd try');
  assert.strictEqual(K.status(s, ctxFor(1, 3)).phase, 'wonThisWeek', 'one card per week');
  assert.ok(!K.status(s, ctxFor(1, 3)).hostActive, 'sprite returns after the win');

  const next = K.status(s, ctxFor(2, 8));
  assert.strictEqual(next.phase, 'ready');
  assert.strictEqual(next.hostId, 'uhibon', 'unshipped reserved numbers are skipped');
}

/* ── Out of attempts; failed host carries into next week ───────────── */
{
  const s = K.defaultState();
  K.startAttempt(s, ctxFor(1, 1), words(14), 1); play(s, 0);
  K.startAttempt(s, ctxFor(1, 2), words(14), 2); play(s, 3);
  assert.strictEqual(K.status(s, ctxFor(1, 3)).phase, 'outOfAttempts');
  assert.strictEqual(K.status(s, ctxFor(2, 8, false)).phase, 'locked', 'must reach Blitz 3/3 again');
  const nextWeek = K.status(s, ctxFor(2, 8));
  assert.strictEqual(nextWeek.phase, 'ready');
  assert.strictEqual(nextWeek.hostId, 'mister-happy', 'failed host stays active next week');
  assert.strictEqual(nextWeek.attemptsLeft, 2);
  assert.ok(K.startAttempt(s, ctxFor(2, 8), words(14), 3).ok);
  assert.strictEqual(s.attempt.try, 1, 'try counter is per week');
}

/* ── Interruptions ─────────────────────────────────────────────────── */
{
  const s = K.defaultState();
  K.startAttempt(s, ctxFor(1, 1), words(14), 1);
  const first = K.currentWord(s).en;
  const r1 = K.interruptRound(s, 1);
  assert.strictEqual(r1.kind, 'restart');
  assert.notStrictEqual(r1.word.en, first, 'restart uses a fresh word from the snapshot');
  assert.strictEqual(s.attempt.results.length, 0, 'an interruption is not a miss');
  assert.strictEqual(s.attemptsThisWeek, 1, 'an interruption does not consume an attempt');
  assert.strictEqual(K.interruptRound(s, 1).kind, 'restart');
  const r3 = K.interruptRound(s, 1);
  assert.strictEqual(r3.kind, 'miss', 'past the cap, leaving counts as a miss');
  assert.strictEqual(s.attempt.results.length, 1);
  assert.strictEqual(s.attempt.interruptions, 2, 'interruptions stay separate from results');
  // 10 rounds + 2 restarts still fit in the 14-word snapshot without repeats.
  const seen = [];
  while (s.attempt) { seen.push(K.currentWord(s).en); K.submitAnswer(s, 'x', 1, E); }
  assert.strictEqual(new Set(seen).size, seen.length, 'no word repeats within an attempt');
}

/* ── Sunday rollover closes an open attempt ────────────────────────── */
{
  const s = K.defaultState();
  K.startAttempt(s, ctxFor(1, 1), words(14), 1);
  for (let i = 0; i < 9; i++) K.submitAnswer(s, K.currentWord(s).en, 1, E);
  assert.strictEqual(K.expireStale(s, ctxFor(1, 2), 2), null, 'same week: nothing to expire');
  const out = K.expireStale(s, ctxFor(2, 8), 2);
  assert.ok(out && out.passed && out.score === 9, 'answered rounds still count');
  assert.strictEqual(out.week, 'W1');
  assert.strictEqual(s.wonWeek, 'W1');
  assert.strictEqual(s.attempt, null);
}

/* ── All won → no host ─────────────────────────────────────────────── */
{
  const s = K.defaultState();
  cards.filter(K.isShipped).forEach(c => { s.won[c.id] = { cardId: c.id, lv: 1, wonAt: 1, try: 1, score: 10, week: 'W0' }; });
  const st = K.status(s, ctxFor(9, 60));
  assert.strictEqual(st.phase, 'allWon');
  assert.strictEqual(st.hostId, null);
  assert.ok(!st.hostActive);
}

/* ── State normalisation ───────────────────────────────────────────── */
{
  const n = K.normalizeState({ attemptsThisWeek: 99, won: { x: 'bad', y: { score: 9 } }, attempt: { hostId: 'a', words: [] } });
  assert.strictEqual(n.attemptsThisWeek, R.attemptsPerWeek);
  assert.ok(!n.won.x && n.won.y.lv === 1);
  assert.strictEqual(n.attempt, null, 'an attempt without words is dropped');
  assert.deepStrictEqual(Object.keys(K.normalizeState(null)), Object.keys(K.defaultState()));
}

/* ── Answer check ──────────────────────────────────────────────────── */
{
  const c = (t, typed) => K.checkAnswer(t, typed, E);
  assert.strictEqual(c('Bicycle', 'BICYCLE'), 'exact', 'case-insensitive');
  assert.strictEqual(c('bicycle', ' bicycle. '), 'exact', 'spacing and punctuation ignored');
  assert.strictEqual(c('bicycle', 'bicycel'), 'near', 'one swap allowed at 7 letters');
  assert.strictEqual(c('bicycle', 'bycicel'), 'wrong', 'two slips are wrong');
  assert.strictEqual(c('subway', 'subwy'), 'wrong', 'under 7 letters must be exact (Echo would allow this)');
  assert.strictEqual(E.check('subway', 'subwy'), 'near', 'Echo itself stays unchanged');
  assert.strictEqual(c('cat', ''), 'wrong');
  assert.strictEqual(c('plan／think', 'think'), 'exact');
  const s = K.defaultState();
  K.startAttempt(s, ctxFor(1, 1), [{ en: 'elephant' }].concat(words(13)), 1);
  const near = K.submitAnswer(s, 'elephent', 1, E);
  assert.ok(near.correct && near.verdict === 'near', 'a near answer counts toward the pass');
}

/* ── Timers ────────────────────────────────────────────────────────── */
assert.ok(K.lookMs('elephant', 'br') > K.lookMs('cat', 'br'), 'look time scales with length');
assert.ok(K.lookMs('cat', 'pb') > K.lookMs('cat', 'br'), 'Pre-Boo looks longer');
assert.ok(K.typeMs('cat', 'pb') > K.typeMs('cat', 'bc'));
assert.ok(K.lookMs('a'.repeat(40), 'br') <= K.TIMING.lookMax);

/* ── Word snapshot ─────────────────────────────────────────────────── */
{
  const pool = (ago, n, prefix) => ({ weeksAgo: ago, cards: Array.from({ length: n }, (_, i) => ({ en: `${prefix}${String.fromCharCode(97 + i)}word` })) });
  const pools = [pool(1, 15, 'r'), pool(6, 15, 'o')];
  const a = K.pickWords(pools, K.seededRng('x'));
  const b = K.pickWords(pools, K.seededRng('x'));
  assert.deepStrictEqual(a, b, 'seeded picks are repeatable');
  assert.strictEqual(a.length, R.snapshotSize);
  assert.strictEqual(new Set(a.map(w => w.en)).size, a.length, 'no duplicates');
  let recent = 0, old = 0;
  for (let seed = 0; seed < 200; seed++) {
    K.pickWords(pools, K.seededRng(seed), 5).forEach(w => (w.weeksAgo === 1 ? recent++ : old++));
  }
  assert.ok(recent > old * 2, `recent weeks weigh more (${recent} vs ${old})`);

  const mixed = K.pickWords([{ weeksAgo: 2, cards: [
    { en: 'transportation infrastructure' }, { en: 'autonomous vehicle' }, { en: 'a very long phrase here' },
    { en: 'plan／think' }, { en: 'Mr.' }, ...Array.from({ length: 14 }, (_, i) => ({ en: `single${String.fromCharCode(97 + i)}` })),
  ] }], K.seededRng(1));
  assert.ok(mixed.every(w => !/\s/.test(w.en)), 'single words are preferred over phrases');
  assert.ok(mixed.some(w => w.en === 'plan'), 'only the first alternative is kept');
  assert.ok(!mixed.some(w => w.en === 'Mr.'), 'untypeable entries are skipped');
  const phrases = K.pickWords([{ weeksAgo: 2, cards: [{ en: 'round trip' }, { en: 'one' }] }], K.seededRng(1));
  assert.ok(phrases.some(w => w.en === 'round trip'), 'two-word phrases fill in when needed');
  assert.ok(!K.pickWords([{ weeksAgo: 2, cards: [{ en: 'transportation infrastructure' }] }], K.seededRng(1)).length,
    'phrases longer than 16 letters are skipped');

  const cards60 = Array.from({ length: 60 }, (_, i) => ({ n: i + 1, en: 'x' }));
  assert.deepStrictEqual(K.sliceForWeek(cards60, 2).map(c => c.n), Array.from({ length: 15 }, (_, i) => i + 16));
}

/* ── Previous weeks + loader against the real calendar and decks ───── */
(async () => {
  const now = new Date('2026-10-25T03:00:00Z'); // Sunday, Tokyo
  const plan = K.previousWeeks(CAL, now);
  assert.strictEqual(plan.current.monthSlug, 'october');
  assert.ok(plan.weeks.length >= 4 && plan.weeks[0].weeksAgo === 1);
  assert.ok(plan.weeks.every(w => w.weekNumber >= 1 && w.weekNumber <= 4));
  assert.strictEqual(new Set(plan.weeks.map(w => `${w.monthSlug}-w${w.weekNumber}`)).size, plan.weeks.length);
  assert.ok(!plan.weeks.some(w => w.monthSlug === 'october' && w.weekNumber === plan.current.weekNumber), 'current week excluded');

  const realFetch = url => Promise.resolve(JSON.parse(read(url)));
  for (const curr of ['pb', 'br', 'bc']) {
    const got = await K.loadSnapshotWords(curr, { fetchJson: realFetch, calendar: CAL, now, rng: K.seededRng(curr) });
    assert.strictEqual(got.length, R.snapshotSize, `${curr} snapshot from real decks`);
    assert.ok(got.every(w => w.weeksAgo >= 1), `${curr} uses previous weeks`);
  }

  const urls = [];
  const failing = url => { urls.push(url); return url.includes('/october/') ? realFetch(url) : Promise.reject(new Error('offline')); };
  const fallback = await K.loadSnapshotWords('pb', { fetchJson: failing, calendar: CAL, now: new Date('2026-10-05T03:00:00Z'), rng: K.seededRng(2) });
  assert.ok(fallback.length >= R.rounds, 'falls back to the current week');
  assert.ok(fallback.some(w => w.weeksAgo === 0));
  assert.strictEqual(new Set(urls).size, urls.length, 'each month deck is fetched once');
  assert.strictEqual((await K.loadSnapshotWords('pb', { fetchJson: () => Promise.reject(new Error('x')), calendar: CAL, now })).length, 0,
    'nothing loads → empty snapshot (no challenge)');

  /* ── Save default, migration, and rollover safety ───────────────── */
  const store = new Map();
  const sctx = {
    console: { log() {}, warn() {}, error: console.error },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    document: { dispatchEvent() {} }, Event: function Event() {}, CustomEvent: function CustomEvent() {},
    BoohaAdventure: { registerSystem() {} },
  };
  sctx.window = sctx;
  vm.createContext(sctx);
  vm.runInContext(read('js/core/save-file.js'), sctx, { filename: 'js/core/save-file.js' });
  const SF = sctx.BoohaSaveFile;
  store.set('booha_userid', 'student-a');
  const fresh = SF.load();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(fresh.karasukiCards)), JSON.parse(JSON.stringify(K.defaultState())),
    'save default matches the module default');
  const old = JSON.parse(JSON.stringify(fresh)); delete old.karasukiCards;
  store.set(SF.key(), JSON.stringify(old));
  assert.ok(SF.load().karasukiCards && SF.load().karasukiCards.won, 'older saves gain the section');
  const withCard = SF.load();
  withCard.karasukiCards.won['mister-happy'] = { cardId: 'mister-happy', lv: 1, wonAt: 1, try: 1, score: 9, week: 'W1' };
  withCard.karasukiCards.hostId = 'uhibon';
  SF.save(withCard);
  SF.resetWeekly('2026-11-01|november-w1');
  const after = SF.load().karasukiCards;
  assert.ok(after.won['mister-happy'], 'Sunday reset keeps won cards');
  assert.strictEqual(after.hostId, 'uhibon', 'Sunday reset keeps the host');
  store.set('booha_userid', 'student-b');
  assert.strictEqual(Object.keys(SF.load().karasukiCards.won).length, 0, 'cards are per student on a shared iPad');

  console.log('Karasuki Cards Pass 2a tests passed.');
})().catch(err => { console.error(err); process.exit(1); });
