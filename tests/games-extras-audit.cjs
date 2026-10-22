#!/usr/bin/env node
'use strict';

// Games Pass 6: extra games sit outside the nine. The 9-game bonus unlock,
// the weekly world gate, per-curriculum counts and level stars must not move
// when an extra game is played; Booha Bites must build fair rounds from
// every real week of content.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. Registry: the nine stay nine ───────────────────────────────────────
{
  const ctx = { window: {}, BoohaAdventure: { registerSystem() {} } };
  vm.createContext(ctx);
  vm.runInContext(`${read('js/core/game-registry.js')}; this.R = BoohaGameRegistry;`, ctx);
  const R = ctx.R;
  for (const c of ['pb', 'br', 'bc']) {
    assert.strictEqual(R.getForCurriculum(c).length, 9, `${c}: getForCurriculum must keep exactly the nine`);
    const extra = R.getExtraForCurriculum(c);
    assert(extra.length >= 1, `${c}: Booha Bites must be registered as an extra`);
    for (const g of extra) {
      assert.strictEqual(g.core, false);
      assert(g.saveId.startsWith(`${c}-extra:`), `${g.saveId} must use the -extra: prefix`);
      assert(!g.saveId.startsWith(`${c}:`), `${g.saveId} must never look like a core id`);
      assert.strictEqual(R.starsForScore(g.saveId, 90), 3, `${g.saveId} must have star thresholds`);
    }
  }
  assert.strictEqual(R.getAll().length, 27, 'getAll keeps the 27 core entries');
}

// ── 2. Save: an extra game moves none of the nine-game counts ────────────
{
  const key = 'booha_save:v3:extras-student';
  let stored = { version: 2, scores: {}, unlocks: {}, meta: { lastWeeklyKey: '2026-10-25|october-w4', allTimeStars: 0 }, weekly: {} };
  const localStorage = {
    getItem(n) { if (n === 'booha_userid') return 'extras-student'; if (n === key) return JSON.stringify(stored); return null; },
    setItem(n, v) { if (n === key) stored = JSON.parse(v); },
    removeItem() {},
  };
  const listeners = {};
  const document = {
    readyState: 'loading',
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    dispatchEvent(e) { (listeners[e.type] || []).forEach(f => f(e)); },
  };
  class CustomEvent { constructor(t, i = {}) { this.type = t; this.detail = i.detail; } }
  class Event { constructor(t) { this.type = t; } }
  const context = {
    window: { BOOHA_SYNC_READY: false, CALENDAR: {
      getCurrentCurriculumWeek() { return { year: 2026, monthSlug: 'october', weekNumber: 4, weekId: 'october-w4', weekStart: '2026-10-25', occurrenceKey: '2026-10-25|october-w4' }; },
      getCurriculumWeekOccurrenceKey(cw) { return cw.occurrenceKey; },
    } },
    localStorage, document, CustomEvent, Event, console: { log() {}, warn() {}, error: console.error }, Date, setTimeout, clearTimeout,
  };
  context.window.BoohaSync = { checkpoint() {} };
  context.BoohaSync = context.window.BoohaSync;
  vm.createContext(context);
  for (const f of ['js/core/adventure-core.js', 'js/core/save-file.js', 'js/core/game-registry.js', 'js/core/score-system.js', 'js/core/unlock-system.js']) {
    vm.runInContext(read(f), context, { filename: f });
  }
  const BA = context.window.BoohaAdventure;
  BA.init();
  const fire = d => document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail: d }));

  // Eight core games at three stars, plus a perfect extra game.
  const CORE = ['vocab_tap', 'spell_word', 'vocab_speed', 'sentence_tap', 'sentence_order', 'sentence_speed', 'say_word', 'say_sentence'];
  CORE.forEach(id => fire({ saveId: `pb:${id}`, score: 100, completed: true }));
  for (let i = 0; i < 3; i++) fire({ saveId: 'pb-extra:booha_bites', score: 100, completed: true, points: 3625, crown: true });

  const s = BA.scores;
  assert.strictEqual(s.weeklyCompletedFor('pb'), 8, 'an extra game must not count toward the nine');
  assert.strictEqual(s.totalCompletedFor('pb'), 8, 'an extra game must not count toward the champion achievement');
  assert.strictEqual(s.weeklyStarsFor('pb'), 24, 'extra stars must stay out of the curriculum star total');
  assert.strictEqual(BA.unlocks.isWeeklyWorldGateOpen(), false, 'eight core games + an extra must not open the world gate');
  assert(!(stored.weekly.unlockedBonusGames || {}).booha_invaders, 'eight core games + an extra must not unlock the bonus games');
  assert.strictEqual(s.weeklyStarsForGame('pb-extra:booha_bites'), 3, 'the extra game still records its own stars');
  assert.strictEqual(s.weeklyPointsForGame('pb-extra:booha_bites'), 3625, 'the extra game still records its own points');

  fire({ saveId: 'pb:ask_question', score: 100, completed: true });
  assert.strictEqual(s.weeklyCompletedFor('pb'), 9, 'the ninth core game completes the nine');
  assert.strictEqual(BA.unlocks.isWeeklyWorldGateOpen(), true, 'the nine core games open the world gate as before');
  assert((stored.weekly.unlockedBonusGames || {}).booha_invaders, 'the nine core games at ★★ unlock the bonus games as before');
}

// ── 3. Wiring ─────────────────────────────────────────────────────────────
const gameCore = read('js/game-core.js');
assert.match(gameCore, /'booha-bites':\s+'sentences'/, 'game-core must load sentences for Booha Bites');
assert.match(gameCore, /'booha-bites': \['vocab'\]/, 'game-core must also load the week’s vocab for Booha Bites');
const bites = read('games/booha-bites.js');
assert.match(bites, /const SAVE_ID = `\$\{CFG\.curriculum\}-extra:booha_bites`;/, 'Booha Bites must save under the extra id');
assert.match(bites, /U\.createRun\(\{ total: 15, recoverPoints: 0 \}\)/, 'Booha Bites is multiple choice: second tries earn 0');
for (const call of ['run.hit()', 'run.miss()', 'run.recover()', 'run.reset()', 'run.ready(', 'U.showScorecard(', 'U.emitGameEnd(', "U.loadSFX('ding'"]) {
  assert(bites.includes(call), `Booha Bites must use ${call}`);
}
assert(!/@keyframes[^{]*\{[^}]*(box-shadow|filter)\s*:/.test(bites), 'Booha Bites animations must stay transform/opacity');
assert.match(bites, /gap\.textContent = '\\u00a0';/, 'the gap must be empty until answered (no hidden answer for screen readers or text selection)');
assert.match(bites, /gapEl\.textContent = r\.bite\.word;/, 'the word appears only once it is chosen');
assert(!/\.bb-gap\{[^}]*color:transparent/.test(bites), 'the answer must never sit in the gap as transparent text');
const menu = read('js/menu-core.js');
assert.match(menu, /getExtraForCurriculum\(CURR\)/, 'the menu must list extras from the registry');
assert.match(menu, /setAttribute\('data-extra'/, 'extra tiles must not use data-game (keeps the nine contract)');

// ── 4. Fair rounds for every real week ────────────────────────────────────
{
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(bites, ctx, { filename: 'games/booha-bites.js' });
  const L = ctx.window.BoohaBitesLogic;
  assert(L, 'Booha Bites must export its round logic');
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  let rounds = 0;
  for (const c of ['pb', 'br', 'bc']) {
    for (const m of months) {
      const vf = path.join(ROOT, `content/${c}/${m}/vocab.json`), sf = path.join(ROOT, `content/${c}/${m}/sentences.json`);
      if (!fs.existsSync(vf) || !fs.existsSync(sf)) continue;
      const V = JSON.parse(fs.readFileSync(vf, 'utf8')).cards, S = JSON.parse(fs.readFileSync(sf, 'utf8')).cards;
      for (let w = 0; w < 4; w++) {
        const vs = V.slice(w * 15, w * 15 + 15).map(v => v.en);
        const ss = S.slice(w * 15, w * 15 + 15);
        const pool = [];
        ss.forEach(x => L.contentWords(x.en).forEach(cw => pool.push(L.displayForm(cw.word, cw.start === 0))));
        ss.forEach((x, i) => {
          rounds++;
          const b = L.pickBite(x.en, vs[i], vs);
          assert(b, `${c}/${m} w${w + 1}: no bite for "${x.en}"`);
          assert.strictEqual(x.en.slice(b.start, b.end), b.word, `${c}/${m}: bite span must match the sentence`);
          const ans = L.displayForm(b.word, b.start === 0);
          const dec = L.buildOptions(ans, b.source, vs, pool.filter(p => !x.en.toLowerCase().includes(p.toLowerCase())));
          const opts = [ans, ...dec];
          assert.strictEqual(opts.length, 4, `${c}/${m}: "${x.en}" needs four options`);
          assert.strictEqual(new Set(opts.map(o => o.toLowerCase())).size, 4, `${c}/${m}: options must be distinct`);
          if (/^[A-Z]/.test(ans)) assert(dec.every(d => /^[A-Z]/.test(d)), `${c}/${m}: a capitalised answer must not stand out ("${x.en}")`);
        });
      }
    }
  }
  assert(rounds >= 2000, `expected the full year of content, checked ${rounds} rounds`);
}

console.log('Games extras audit passed: the nine stay nine, unlocks untouched by extras, Booha Bites wired and fair on every week.');
