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
  const all = R.getAllSaveIds();
  for (const c of ['pb', 'br', 'bc']) assert(all.includes(`${c}-extra:booha_bites`), 'getAllSaveIds must list the extra games too');
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
      getTodayKey() { return '2026-10-27'; },
    } },
    localStorage, document, CustomEvent, Event, console: { log() {}, warn() {}, error: console.error }, Date, setTimeout, clearTimeout,
  };
  context.window.BoohaSync = { checkpoint() {} };
  context.BoohaSync = context.window.BoohaSync;
  context.CALENDAR = context.window.CALENDAR;   // day-record reads the bare global
  vm.createContext(context);
  for (const f of ['js/core/adventure-core.js', 'js/core/save-file.js', 'js/core/game-registry.js', 'js/core/score-system.js', 'js/core/unlock-system.js', 'js/core/day-record.js']) {
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

  // Unfiltered aggregates must not count extras either.
  assert.strictEqual(s.totalStars(), 24, 'totalStars must skip extra games');
  assert.strictEqual(s.weeklyStars(), 24, 'weeklyStars must skip extra games');
  assert.strictEqual(s.totalCompleted(), 8, 'totalCompleted must skip extra games');
  assert.strictEqual(s.weeklyCompleted(), 8, 'weeklyCompleted must skip extra games');
  assert.strictEqual(stored.meta.allTimeStars, 24, 'meta.allTimeStars must not grow from extra games');
  assert.strictEqual(s.isExtraId('pb-extra:booha_bites'), true);
  assert.strictEqual(s.isExtraId('pb:vocab_tap'), false);
  assert.strictEqual(s.isExtraId('bonus:booha_blocks'), false, 'bonus games keep their existing behaviour');

  // Weekly understanding % averages the nine only (not extras, not bonus raw scores).
  fire({ saveId: 'bonus:booha_blocks', score: 25000, completed: true });
  const DR = context.window.BoohaDayRecord || context.BoohaDayRecord;
  assert(DR && typeof DR.weeklyPct === 'function', 'day-record must load in the harness');
  const wkKey = DR.getCurrentKeys().week;
  const advLog = stored.meta.weekLog[wkKey].adv;
  assert.strictEqual(advLog['bonus:booha_blocks'], 25000, 'the log still records the bonus raw score');
  assert.strictEqual(advLog['pb-extra:booha_bites'], 100, 'the log still records the extra game');
  assert.strictEqual(DR.weeklyPct(wkKey), 100, 'weeklyPct must average only the nine curriculum games');

  // Week Boss gate: "played" counts any score, even 0, and never opens an unlock.
  assert.strictEqual(s.weeklyPlayedFor('pb'), 8, 'an extra game must not count as one of the nine played');
  fire({ saveId: 'pb:ask_question', score: 0, completed: false });
  assert.strictEqual(s.weeklyPlayedFor('pb'), 9, 'a 0% run still counts as played for the Week Boss');
  assert.strictEqual(s.weeklyCompletedFor('pb'), 8, 'a 0% run is played, not completed');
  assert.strictEqual(BA.unlocks.isWeeklyWorldGateOpen(), false, 'the boss gate must not open the world gate');
  fire({ saveId: 'pb-extra:week_boss', score: 93, completed: true, points: 4200, crown: true });
  assert.strictEqual(s.weeklyCrownForGame('pb-extra:week_boss'), true, 'beating the boss saves the week crown');
  assert.strictEqual(s.weeklyCrownsFor('pb'), 0, 'the boss crown must stay out of the nine-game crown count');
  assert.strictEqual(s.weeklyStarsFor('pb'), 24, 'boss stars must stay out of the curriculum star total');
  assert(!(stored.weekly.unlockedBonusGames || {}).booha_invaders, 'the boss must not unlock the bonus games');
  globalThis.__bossScores = s;

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
const progress = read('js/ui/profile-progress.js');
assert.match(progress, /filter\(\(\[id, value\]\) => \/\^\(pb\|br\|bc\):\/\.test\(id\)/,
  'Best week average must use the nine curriculum games only');
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

// ── 5. Echo: wiring and a strict-but-fair checker on every vocab item ────
{
  const echo = read('games/echo.js');
  assert.match(gameCore, /'echo':\s+'vocab'/, 'game-core must load vocab for Echo');
  assert.match(echo, /const SAVE_ID = `\$\{CFG\.curriculum\}-extra:echo`;/, 'Echo must save under the extra id');
  assert.match(echo, /U\.createRun\(\{ total: 15, recoverPoints: 50 \}\)/, 'Echo second tries earn +50 (typing cannot be guessed)');
  assert.match(echo, /run\.ready\(2500 \+ 900 \* words, \{ waitAudio: true \}\)/, 'the sharp window starts after the clip');
  for (const call of ['run.hit()', 'run.miss()', 'run.recover()', 'run.reset()', 'run.audioDone()', 'U.showScorecard(', 'U.emitGameEnd(', "U.loadSFX('fart'", 'autocorrect="off"', 'spellcheck="false"', 'autocapitalize="off"']) {
    assert(echo.includes(call), `Echo must use ${call}`);
  }
  assert.match(echo, /hinted = true;[\s\S]{0,80}run\.miss\(\)/, 'a hint must end the combo (never a first-try answer)');
  assert(!/@keyframes[^{]*\{[^}]*(box-shadow|filter)\s*:/.test(echo), 'Echo animations must stay transform/opacity');
  assert(/font:800 18px/.test(echo), 'the Echo input must be ≥16px so iOS does not zoom');
  assert.match(menu, /if \(g\.hira\) a\.setAttribute\('data-hira', g\.hira\)/, 'extra tiles take their Japanese line from the registry');

  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(echo, ctx, { filename: 'games/echo.js' });
  const E = ctx.window.EchoLogic;
  assert(E, 'Echo must export its checker');
  const cases = [
    ['car', 'car', 'exact'], ['car', 'Car', 'exact'], ['car', '  car. ', 'exact'], ['car', 'cat', 'wrong'],
    ['train', 'trian', 'near'], ['train', 'tran', 'near'], ['train', 'plane', 'wrong'], ['bus', 'bas', 'wrong'],
    ['plan／think', 'think', 'exact'], ['plan／think', 'plan', 'exact'], ['plan／think', 'plan think', 'wrong'],
    ['Maintain a balanced diet.', 'maintain a balanced diet', 'exact'], ['Maintain a balanced diet.', 'maintain a balanced deit', 'near'],
    ["don't", 'don’t', 'exact'], ['round-trip ticket', 'round trip ticket', 'exact'], ['contactless payment', 'contactles paymnt', 'near'],
    ['contactless payment', 'contact payment', 'wrong'], ['car', '', 'wrong'],
  ];
  for (const [t, typed, want] of cases) assert.strictEqual(E.check(t, typed), want, `check(${JSON.stringify(t)}, ${JSON.stringify(typed)})`);
  assert.strictEqual(E.rightPrefix('train', 'trian'), 2);
  assert.strictEqual(E.hintFor('car'), 'c _ _');

  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  // Known content exceptions: two cards in one week share a typed answer.
  // Acceptable only if their audio differs; not a clean dictation test.
  const SHARED_ANSWERS = new Set(['pb/june w3: plan | plan／think']);
  const sharedSeen = new Set();
  let items = 0;
  for (const c of ['pb', 'br', 'bc']) {
    for (const m of months) {
      const vf = path.join(ROOT, `content/${c}/${m}/vocab.json`);
      if (!fs.existsSync(vf)) continue;
      const V = JSON.parse(fs.readFileSync(vf, 'utf8')).cards;
      for (let w = 0; w < 4; w++) {
        const week = V.slice(w * 15, w * 15 + 15);
        for (const v of week) {
          items++;
          assert(v.mp3, `${c}/${m}: "${v.en}" needs audio for Echo`);
          const first = String(v.en).split(/[／/]/)[0];
          assert.strictEqual(E.check(v.en, v.en), 'exact', `${c}/${m}: "${v.en}" typed exactly must pass`);
          assert.strictEqual(E.check(v.en, first.toUpperCase()), 'exact', `${c}/${m}: "${v.en}" must ignore case`);
          // A different word from the same week must never be accepted as exact,
          // except the content pairs listed by name in SHARED_ANSWERS.
          for (const o of week) {
            if (o === v || E.normalize(o.en) === E.normalize(v.en)) continue;
            if (E.targetsOf(o.en).some(x => E.targetsOf(v.en).includes(x))) {
              const key = `${c}/${m} w${w + 1}: ${[o.en, v.en].sort().join(' | ')}`;
              assert(SHARED_ANSWERS.has(key), `unlisted shared dictation answer ${key} (fix the content or add it to SHARED_ANSWERS)`);
              sharedSeen.add(key);
              continue;
            }
            assert.notStrictEqual(E.check(v.en, o.en), 'exact', `${c}/${m}: "${o.en}" must not pass for "${v.en}"`);
          }
        }
      }
    }
  }
  assert(items >= 2000, `expected the full year of vocab, checked ${items}`);
  assert.deepStrictEqual([...sharedSeen].sort(), [...SHARED_ANSWERS].sort(), 'SHARED_ANSWERS must list only exceptions still in the content');

  // Echo: a newer card owns the audio; Pre-Boo reads hiragana.
  assert.match(echo, /function showCard\(\) \{\s*stopVoice\(\);/, 'showCard must stop the previous clip first');
  assert.match(echo, /if \(myIdx !== idx\) return;/, 'an old clip’s onEnd must not mark the new card heard');
  assert.match(echo, /CFG\.curriculum === 'pb' \? \(card\.hira \|\| card\.jp\)/, 'Pre-Boo must show hiragana under the audio');
}

// ── 6. Week Boss: gate, fair rounds on every week, damage rules ─────────────
{
  const boss = read('games/week-boss.js');
  assert.match(gameCore, /'week-boss':\s+'vocab'/, 'game-core must load vocab for the Week Boss');
  assert.match(gameCore, /'week-boss':\s+\['sentences', 'questions'\]/, 'game-core must also load sentences and questions');
  assert.match(boss, /const SAVE_ID = `\$\{CFG\.curriculum\}-extra:week_boss`;/, 'the boss must save under the extra id');
  assert.match(boss, /crown: beaten/, 'beating the boss is what earns its crown');
  assert.match(boss, /if \(!gate\.open\) \{/, 'the game page must enforce the gate too (direct links)');
  assert(boss.indexOf("addEventListener('booha:ready'") < boss.indexOf('const gate = gateFor('), 'the gate must wait for the save to boot (weekly reset) first');
  for (const call of ['run.hit()', 'run.miss()', 'run.recover()', 'run.reset()', 'run.audioDone()', 'U.showScorecard(', 'U.emitGameEnd(', 'voiceGate.stop()']) {
    assert(boss.includes(call), `Week Boss must use ${call}`);
  }
  assert(/if \(my !== token\) return;/.test(boss), 'an old clip must not touch a newer round');
  assert(!/@keyframes[^{]*\{[^}]*(box-shadow|filter|width)\s*:/.test(boss), 'boss animations must stay transform/opacity');
  assert(/hpFill\.style\.transform = `scaleX/.test(boss), 'the HP bar must animate with transform');
  const mcss = read('theme/menu.css');
  assert(/\.bm-tree-crown/.test(mcss) && /is-locked/.test(mcss), 'menu.css must style the locked boss tile and tree crown');
  assert.match(menu, /scores\.weeklyPlayedFor\(CURR\)/, 'the menu must open the boss tile from weeklyPlayedFor');
  assert.match(menu, /if \(t\.classList\.contains\('is-locked'\)\) \{/, 'a locked boss tile must not launch');

  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(boss, ctx, { filename: 'games/week-boss.js' });
  const B = ctx.window.WeekBossLogic;
  const E = (() => { const c2 = { window: {}, console }; vm.createContext(c2); vm.runInContext(read('games/echo.js'), c2); return c2.window.EchoLogic; })();
  assert(B, 'the Week Boss must export its logic');

  // Gate
  const cal = { getCurrentCurriculumWeek: () => ({ monthSlug: 'october', weekNumber: 4 }) };
  const sc = n => ({ weeklyPlayedFor: () => n });
  assert.strictEqual(B.gateFor('pb', 'pb_oct_w4', cal, sc(8)).open, false, '8 played keeps the boss closed');
  assert.strictEqual(B.gateFor('pb', 'pb_oct_w4', cal, sc(9)).open, true, '9 played opens the boss');
  assert.strictEqual(B.gateFor('pb', 'pb_oct_w3', cal, sc(9)).open, false, 'practice weeks never open the boss');
  assert.strictEqual(B.gateFor('pb', 'pb_oct_w4', cal, null).open, false, 'no save means closed');
  assert.strictEqual(B.gateFor('pb', 'pb_oct_w4', cal, globalThis.__bossScores).open, true, 'the real score system opens the gate at nine played');

  // Damage: a perfect run wins, a 12/15 run with short streaks does not.
  const runDamage = pattern => { let combo = 0, dmg = 0; for (const ch of pattern) { if (ch === 'x') { combo = 0; continue; } if (ch === 'r') { combo = 0; dmg += B.damageFor('recover', 0); continue; } combo++; dmg += B.damageFor('hit', combo); } return dmg; };
  assert(runDamage('ooooooooooooooo') >= B.BOSS_HP, 'a perfect run beats the boss');
  assert(runDamage('oooxoooxoooxooo') < B.BOSS_HP, '12/15 with short streaks must not beat the boss');
  assert(runDamage('ooooxooooxooooo') >= B.BOSS_HP, '13/15 with streaks beats the boss');
  assert(runDamage('ooooooooooxxxxx') < B.BOSS_HP, '10/15 must not beat the boss');

  // Plan: 15 rounds, 4/4/3/4, never the same format three times in a row.
  for (let k = 0; k < 300; k++) {
    const p = Array.from(B.planRounds());
    assert.strictEqual(p.length, 15);
    const count = x => p.filter(y => y === x).length;
    assert.deepStrictEqual([count('CHECK'), count('TYPE'), count('SPOT'), count('HEAR')], [4, 4, 3, 4]);
    p.forEach((x, i) => assert(i < 2 || !(p[i - 1] === x && p[i - 2] === x), 'no format three times in a row'));
  }

  // Typed answers follow Echo’s rules exactly.
  for (const [t, typed] of [['car', 'Car'], ['train', 'trian'], ['bus', 'bas'], ['plan／think', 'think'], ['round-trip ticket', 'round trip ticket'], ['contactless payment', 'contactles paymnt'], ['Maintain a balanced diet.', 'maintain a balanced diet']]) {
    assert.strictEqual(B.check(t, typed), E.check(t, typed), `boss and Echo must agree on ${t} / ${typed}`);
  }
  assert.strictEqual(B.skeleton('contactless payment'), 'c _ _ _ _ _ _ _ _ _ _   p _ _ _ _ _ _', 'TYPE shows the first letter of each word');

  // Every real week: SPOT swaps exactly one word for a word not in the sentence.
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  let spots = 0, weeks = 0;
  let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const c of ['pb', 'br', 'bc']) {
    for (const m of months) {
      const dir = path.join(ROOT, `content/${c}/${m}`);
      if (!fs.existsSync(path.join(dir, 'sentences.json'))) continue;
      const V = JSON.parse(fs.readFileSync(path.join(dir, 'vocab.json'), 'utf8')).cards;
      const S = JSON.parse(fs.readFileSync(path.join(dir, 'sentences.json'), 'utf8')).cards;
      const Q = JSON.parse(fs.readFileSync(path.join(dir, 'questions.json'), 'utf8')).cards;
      for (let w = 0; w < 4; w++) {
        weeks++;
        const vs = V.slice(w * 15, w * 15 + 15), ss = S.slice(w * 15, w * 15 + 15), qs = Q.slice(w * 15, w * 15 + 15);
        assert(ss.length === 15 && qs.length >= 4 && vs.length === 15, `${c}/${m} w${w + 1}: the boss needs a full week`);
        assert(qs.every(q => q.mp3 && q.en), `${c}/${m} w${w + 1}: every question needs text and audio`);
        assert.strictEqual(new Set(qs.map(q => q.en)).size, qs.length, `${c}/${m} w${w + 1}: HEAR options must be distinct`);
        const pool = [...new Set([].concat(...ss.map(x => B.contentWordsOf(x.en)), vs.filter(v => !/\s/.test(v.en)).map(v => v.en)))];
        let built = 0;
        for (const x of ss) {
          const sp = B.makeSpot(x.en, pool.filter(p => !B.contentWordsOf(x.en).includes(p)), rand);
          if (!sp) continue;
          built++; spots++;
          const orig = x.en.split(/\s+/).filter(Boolean);
          assert.strictEqual(sp.tokens.length, orig.length, `${c}/${m}: SPOT keeps the word count`);
          const diff = Array.from(sp.tokens).map((t, i) => (t !== orig[i] ? i : -1)).filter(i => i >= 0);
          assert.deepStrictEqual(diff, [sp.at], `${c}/${m}: SPOT changes exactly one word in "${x.en}"`);
          assert(!orig.map(t => t.toLowerCase().replace(/[^a-z']/g, '')).includes(sp.swapped.toLowerCase()), `${c}/${m}: the swapped word must not already be in "${x.en}"`);
          assert(!B.STOP.has(sp.original.toLowerCase()), `${c}/${m}: SPOT must swap a content word`);
        }
        assert(built >= 3, `${c}/${m} w${w + 1}: at least 3 sentences must make a SPOT round (got ${built})`);
      }
    }
  }
  assert(weeks >= 140 && spots >= 1500, `expected the full year, got ${weeks} weeks / ${spots} spot rounds`);
}

console.log('Games extras audit passed: the nine stay nine, unlocks untouched by extras, Booha Bites wired and fair on every week, Echo strict and fair on every vocab item, Week Boss gated and fair on every week.');
