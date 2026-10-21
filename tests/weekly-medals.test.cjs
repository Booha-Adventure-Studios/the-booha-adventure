#!/usr/bin/env node
// Weekly medals: rules, best-curriculum counting, fresh start, one popup per
// medal, bonus stars, and the pages that show the popups.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const L = require(path.join(ROOT, 'js/core/level-stars.js'));
const W = require(path.join(ROOT, 'js/core/weekly-medals.js'));

const IDS = ['ask_question', 'say_sentence', 'say_word', 'sentence_order', 'sentence_speed', 'sentence_tap', 'spell_word', 'vocab_speed', 'vocab_tap'];
const gamesByCurr = { pb: IDS, br: IDS, bc: IDS };
const adv = (curr, pcts) => Object.fromEntries(IDS.map((id, i) => [`${curr}:${id}`, pcts[i]]).filter(([, v]) => v != null));
const byId = rows => Object.fromEntries(rows.map(r => [r.id, r]));

/* ── tiers ─────────────────────────────────────────────────────── */
assert.strictEqual(W.MEDALS.length, 8, 'there are eight weekly medals');
assert.deepStrictEqual(W.MEDALS.map(m => m.tier).reduce((t, x) => (t[x] = (t[x] || 0) + 1, t), {}),
  { bronze: 2, silver: 3, gold: 3 }, 'two bronze, three silver and three gold medals');
assert.strictEqual(W.bonusFor('warm_up'), 3, 'bronze is +3 stars');
assert.strictEqual(W.bonusFor('arcade_open'), 5, 'silver is +5 stars');
assert.strictEqual(W.bonusFor('perfect_week'), 10, 'gold is +10 stars');
assert.strictEqual(W.bonusFor('made_up'), 0, 'unknown medals are worth nothing');
W.MEDALS.forEach(m => assert(fs.existsSync(path.join(ROOT, 'assets/img/profile', m.img)), `medal art must exist: ${m.img}`));

/* ── progress: best curriculum, never summed ───────────────────── */
const weekStart = '2026-10-18';
const startMs = Date.parse('2026-10-18T00:00:00+09:00');
const week = {
  adv: Object.assign(
    adv('br', [95, 95, 95, 95, 95, 80, null, null, null]),   // 5 played at ★★+, 4 links
    adv('bc', [75, 75, 75, 75, null, null, null, null, null])),
  blitz: { 'br:vocab': { ms: 40000, tier: 'clean' }, 'bc:sentence': 39000, 'bc:question': { ms: 1, tier: 'clean' } },
};
const checkIn = {};
for (let i = 0; i < 7; i++) checkIn[new Date(startMs + 9 * 3600000 + i * 86400000).toISOString().slice(0, 10)] = { st: 'done' };
const wanderers = {
  a: { lastFoundAt: startMs + 1000 },
  b: { lastFoundAt: startMs + 6 * 86400000 },
  c: { lastFoundAt: startMs - 1000 },            // Saturday night before: last week
  d: { firstFoundAt: startMs + 7 * 86400000 },   // next Sunday: not this week
};
const rows = byId(W.progress({ week, checkIn, weekStart, wanderers, gamesByCurr, L }));
assert.deepStrictEqual([rows.warm_up.n, rows.warm_up.earned], [3, true], 'warm up caps at its goal and is earned');
assert.strictEqual(rows.arcade_open.n, 6, 'arcade progress uses the best curriculum, not BR + BC together');
assert.strictEqual(rows.link_master.n, 5, 'link progress uses the best curriculum');
assert.strictEqual(rows.blitz_triple.n, 2, 'Blitz Triple needs three clears in one curriculum');
assert.strictEqual(rows.blitz_perfect.earned, true, 'a legacy numeric Blitz stamp counts as a perfect clear');
assert.strictEqual(rows.lantern_week.earned, true, 'seven Daily Checks earn Lantern Week');
assert.strictEqual(rows.wanderer_week.n, 2, 'only wanderers met inside the Tokyo Sunday week count');
assert.strictEqual(rows.perfect_week.n, 5, 'perfect week counts three-star games');

/* ── stars ─────────────────────────────────────────────────────── */
const log = {
  '2026-10-11|october-w2': { warm_up: { at: 1 }, link_master: { at: 2 } },
  '2026-10-18|october-w3': { arcade_open: { at: 3 }, bogus: { at: 4 } },
};
assert.strictEqual(W.logStars(log), 3 + 10 + 5, 'bonus stars come from the medal log, ignoring unknown ids');
assert.strictEqual(W.weekStars(log, '2026-10-18|october-w3'), 5, 'weekly bonus is per week');
assert.strictEqual(W.weekCount(log, '2026-10-11|october-w2'), 2, 'past weeks report their medal count');

/* ── sync: fresh start, once per medal, flags ──────────────────── */
let stored = {
  meta: {
    weekLog: {
      '2026-10-11|october-w2': { adv: adv('br', [99, 99, 99, 99, 99, 99, 99, 99, 99]) },  // a perfect PAST week
      '2026-10-18|october-w3': { adv: adv('br', [80, 80, 80, null, null, null, null, null, null]) },
    },
    checkIn: {},
  },
  collection: { wanderers: {} },
};
const events = [];
global.window = {
  CALENDAR: {
    getCurrentCurriculumWeek: () => ({ weekStart, occurrenceKey: '2026-10-18|october-w3' }),
    getCurriculumWeekOccurrenceKey: cw => cw.occurrenceKey,
  },
  BoohaAdventure: { save: { load: () => JSON.parse(JSON.stringify(stored)), save: d => { stored = d; return true; } } },
  BoohaLevelStars: L,
};
global.document = { dispatchEvent: e => events.push(e) };
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };

const first = W.sync();
assert.deepStrictEqual(first.map(m => m.id), ['warm_up'], 'only medals earned in the current week are recorded');
assert.deepStrictEqual(Object.keys(stored.meta.medalLog), ['2026-10-18|october-w3'],
  'fresh start: past weeks are never back-filled');
assert.strictEqual(events[0].type, 'booha:medalEarned', 'a newly recorded medal is announced');
assert.deepStrictEqual(W.sync(), [], 'a medal is recorded only once per week');
assert.deepStrictEqual(W.pendingPopups().map(m => m.id), ['warm_up'], 'the new medal waits for its popup');
W.markShown(['warm_up']);
assert.deepStrictEqual(W.pendingPopups(), [], 'a medal pops up exactly once');
assert.strictEqual(W.unseenCount(), 1, 'the hub badge counts medals not yet seen on the profile');
W.markSeen();
assert.strictEqual(W.unseenCount(), 0, 'opening the profile clears the hub badge');
const snap = W.snapshot();
assert.strictEqual(snap.medalStars, 3, 'the bronze medal adds three bonus stars');
assert.strictEqual(snap.lifetimeStars, L.lifetime(stored.meta.weekLog, {}, gamesByCurr, (id, p) => p >= 90 ? 3 : p >= 70 ? 2 : p >= 40 ? 1 : 0).total + 3,
  'medal bonus stars count toward the level');
delete global.window;
delete global.document;
delete global.CustomEvent;

/* ── wiring ────────────────────────────────────────────────────── */
['index.html', 'maze.html', 'game.html', 'profile.html'].forEach(page => {
  const html = read(page);
  ['js/core/level-stars.js', 'js/core/weekly-medals.js', 'js/ui/medal-toast.js'].forEach(src => {
    assert(html.includes(src), `${page} must load ${src}`);
  });
  assert(html.indexOf('js/core/weekly-medals.js') < html.indexOf('js/ui/medal-toast.js'), `${page} must load medals before popups`);
});
assert.match(read('index.html'), /id="alog-icon-btn"[\s\S]{0,400}data-medal-badge/, 'the hub profile button carries the new-medal badge');
const toast = read('js/ui/medal-toast.js');
assert.match(toast, /blitz-active/, 'popups must wait while a Blitz run is active');
assert.match(toast, /dc-result-score/, 'popups must wait until Daily Check shows its result');
assert.match(toast, /Fresh start/, 'the first visit records the current level without a level-up popup');

console.log('Weekly medals test passed: rules, best curriculum, fresh start, single popups, bonus stars, wiring.');
