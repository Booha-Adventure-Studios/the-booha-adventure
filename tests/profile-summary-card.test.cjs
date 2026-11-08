#!/usr/bin/env node
'use strict';

// Step 5 (2026-11-08): child-first summary card at the top of the Adventure
// Log — next action (with a button that goes there), this week's progress,
// and the nearest unlock. The rest of the log is unchanged.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const ctx = { console, document: { addEventListener() {} } };
ctx.window = ctx;
vm.runInNewContext(read('js/ui/profile-game.js'), ctx);
const summaryFor = (s, dc) => JSON.parse(JSON.stringify(ctx.BoohaProfileGame._test.summaryFor(s, dc)));

const NAMES = ['Vocabulary Tap', 'Spell the Word', 'Vocab Speed', 'Sentence Tap', 'Sentence Order',
  'Sentence Speed', 'Say the Word', 'Say the Sentence', 'Ask the Question'];
function state({ stars = Array(9).fill(null), blitz = 0, skin = { name: 'Batty Booha', src: 'b.webp', unlocked: false },
  arcadeOpen, rainbow = 0, daily = 2, level = { level: 3, max: false, span: 100, toNext: 60 } } = {}) {
  const games = NAMES.map((name, i) => ({ id: 'g' + i, name, saveId: 'br:g' + i }));
  const two = stars.filter(v => v != null && v >= 2).length;
  const rb = {};
  games.slice(0, rainbow).forEach(g => { rb[g.saveId] = true; });
  return {
    curr: 'br', games, rainbow: rb, dailyThisWeek: daily, level, weeklySkin: skin,
    arcadeOpen: arcadeOpen == null ? two === 9 : arcadeOpen,
    week: { stars, twoStarCount: two, blitzCount: blitz },
  };
}

// ── Next action ──
{
  const s = state();
  assert.strictEqual(summaryFor(s, 'pending').next.kind, 'daily', 'a pending Daily Check comes first');
  for (const st of ['done', 'skipped', 'failed']) {
    assert.notStrictEqual(summaryFor(s, st).next.kind, 'daily', `${st}: the summary does not push the check again`);
  }
  // Parallel tracks: while both have work, Maze and Blitz are offered side by
  // side (never maze-first); a single track only when the other is done.
  const fresh = summaryFor(s, 'done').next;
  assert.strictEqual(fresh.kind, 'choice', 'fresh week: Maze or Blitz, any order');
  assert.strictEqual(fresh.jp, 'どちらからでも OK！');
  assert.deepStrictEqual(fresh.options.map(o => [o.kind, o.jp, o.sub]), [
    ['games', 'Vocabulary Tap を あそぼう', 'あと 9つ ★★ で アーケード'],
    ['blitz', 'Blitz を あそぼう', 'あと 3つ で Batty Booha'],
  ]);
  const mid = summaryFor(state({ stars: [2, 3, null, 1, null, null, null, null, null], blitz: 1 }), 'done').next;
  assert.deepStrictEqual(mid.options.map(o => o.sub), ['あと 7つ ★★ で アーケード', 'あと 2つ で Batty Booha']);
  assert.strictEqual(mid.options[0].jp, 'Vocab Speed を あそぼう', 'next unplayed game');
  const allPlayed = summaryFor(state({ stars: [2, 2, 2, 1, 2, 2, 2, 2, 2] }), 'done').next;
  assert.strictEqual(allPlayed.options[0].jp, 'Sentence Tap を あそぼう', 'all played: the first one below ★★');
  const blitz = summaryFor(state({ stars: Array(9).fill(2), blitz: 1 }), 'done').next;
  assert.deepStrictEqual([blitz.kind, blitz.sub], ['blitz', 'あと 2つ で Batty Booha'], 'maze done → only Blitz');
  const mazeOnly = summaryFor(state({ stars: [2, null, null, null, null, null, null, null, null], blitz: 3,
    skin: { name: 'Batty Booha', src: 'b', unlocked: true } }), 'done').next;
  assert.deepStrictEqual([mazeOnly.kind, mazeOnly.jp], ['games', 'Spell the Word を あそぼう'], 'Blitz done first → only the maze');
  const noSkin = summaryFor(state({ stars: Array(9).fill(2), blitz: 1, skin: null }), 'done').next;
  assert.deepStrictEqual([noSkin.kind, noSkin.sub], ['blitz', 'あと 2つ · +3★ each'], 'Blitz still offered without a weekly skin');
  const rainbow = summaryFor(state({ stars: Array(9).fill(3), blitz: 3, skin: { name: 'Batty Booha', src: 'b', unlocked: true }, rainbow: 4 }), 'done').next;
  assert.deepStrictEqual([rainbow.kind, rainbow.sub], ['games', 'じゅんび 4 / 9'], 'then rainbow stars');
  const all = summaryFor(state({ stars: Array(9).fill(3), blitz: 3, skin: { name: 'B', src: 'b', unlocked: true }, rainbow: 9 }), 'done').next;
  assert.strictEqual(all.kind, 'none', 'everything done: no button');
  const opened = summaryFor(state({ stars: [2, null, null, null, null, null, null, null, null], arcadeOpen: true, blitz: 0 }), 'done').next;
  assert.strictEqual(opened.kind, 'blitz', 'an arcade opened another way is not re-suggested');
}

// ── Progress pills ──
{
  const p = summaryFor(state({ stars: [2, 3, 1, null, null, null, null, null, null], blitz: 2, daily: 4 }), 'done').progress;
  assert.deepStrictEqual(p.map(x => [x.key, x.value, x.done]),
    [['maze', '2/9', false], ['blitz', '2/3', false], ['daily', '4日', false]]);
}

// ── Nearest unlock: smallest fraction left ──
{
  const u1 = summaryFor(state({ stars: [2, 2, 2, 2, 2, 2, 2, 2, null], blitz: 1, level: { level: 3, max: false, span: 100, toNext: 30 } }), 'done').unlock;
  assert.deepStrictEqual([u1.key, u1.left], ['arcade', 1], '1/9 left beats 2/3 and 30/100');
  const u2 = summaryFor(state({ stars: [2, 2, 2, 2, null, null, null, null, null], blitz: 2, level: { level: 3, max: false, span: 100, toNext: 50 } }), 'done').unlock;
  assert.deepStrictEqual([u2.key, u2.jp, u2.left], ['skin', 'Batty Booha', 1], '1/3 left beats 5/9 and 50/100');
  const u3 = summaryFor(state({ stars: Array(9).fill(2), blitz: 3, skin: null, level: { level: 4, max: false, span: 200, toNext: 12 } }), 'done').unlock;
  assert.deepStrictEqual([u3.key, u3.jp, u3.left, u3.unit], ['level', 'Lv 5 コイン', 12, '★']);
  const none = summaryFor(state({ stars: Array(9).fill(2), blitz: 3, skin: null, level: { level: 10, max: true, span: 0, toNext: 0 } }), 'done').unlock;
  assert.strictEqual(none, null, 'nothing left: no unlock row');
}

// ── Placement and wiring ──
{
  const html = read('profile.html');
  const hero = html.indexOf('id="pg-hero"');
  const sum = html.indexOf('id="pg-summary"');
  const skin = html.indexOf('id="pg-skin"');
  assert(hero > 0 && sum > hero && sum < skin, 'summary sits right under the companion card');
  const pg = read('js/ui/profile-game.js');
  assert.match(pg, /\[renderHero, 'pg-hero', [^\]]+\],\s*\[renderSummary, 'pg-summary', 'Next step'\],/, 'rendered right after the hero, failing soft');
  assert.match(pg, /document\.addEventListener\('booha:dailyCheckEvent', render\);/, 'a skip updates the card');
  assert.match(pg, /games-index\.html\?week=\$\{encodeURIComponent\(slug\)\}/, 'the button goes to this week\'s board');
  assert.match(pg, /sessionStorage\.setItem\('booha_scroll_to_blitz', '1'\)/, 'Blitz goes to the hub arcade');
  // The card must know today's Daily Check state on its first render.
  const dcAt = html.indexOf('<script src="./js/daily-check.js"></script>');
  const pgAt = html.indexOf('<script src="./js/ui/profile-game.js"></script>');
  assert(dcAt > 0 && pgAt > dcAt, 'daily-check.js loads before profile-game.js');
  assert(!/let dcState = 'done';/.test(pg), 'never assume the check is done');
  assert.match(pg, /if \(!window\.BoohaDailyCheck \|\| typeof BoohaDailyCheck\.todayState !== 'function'\) \{\s*host\.hidden = true;/,
    'without the module the card waits (hidden) instead of guessing');
  assert.match(pg, /window\.addEventListener\('load', \(\) => \{ renderSummary\._waiting = false; render\(\); \}, \{ once: true \}\);/,
    'and repaints once the page has loaded');
}

console.log('Profile summary card test passed: next action, progress, nearest unlock, placement.');
