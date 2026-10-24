#!/usr/bin/env node
// Trophy Case pass (2026-10-22): data-driven permanent trophies.
// Exercises js/core/trophy-case.js against seeded saves in a browser-like VM,
// and checks the profile and world wiring around it.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SRC = read('js/core/trophy-case.js');

function run({ curr = 'br', unlocked = [], scores = {}, meta = {}, wanderers = {}, roster = 30, juku = null } = {}) {
  let saved = { scores, meta, collection: { wanderers } };
  const store = {};
  const sb = { console, Date };
  sb.window = sb;
  sb.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  if (juku) {
    store.booha_is_juku = '1';
    sb.JUKU = { loadSave: () => juku };
  }
  const set = new Set(unlocked);
  sb.BoohaUnlockSystem = { isUnlocked: id => set.has(id) };
  sb.KARASUKI_WANDERER_DATA = Object.fromEntries(Array.from({ length: roster }, (_, i) => ['w' + i, {}]));
  sb.BoohaAdventure = { save: {
    load: () => JSON.parse(JSON.stringify(saved)),
    patchDeep: (section, key, obj) => { saved[section] = saved[section] || {}; saved[section][key] = Object.assign({}, saved[section][key], obj); return true; },
  } };
  vm.createContext(sb);
  vm.runInContext(SRC, sb);
  const T = sb.BoohaTrophies;
  return { T, res: T.evaluate(curr), saved: () => saved };
}
const item = (res, id) => res.items.find(t => t.id === id);

/* ── fresh student: four visible groups, no secrets, nothing earned ── */
{
  const { res } = run();
  assert.deepStrictEqual(Array.from(res.groups.map(g => g.id)), ['journey', 'curriculum', 'muenba', 'grimmerglen'],
    'a new student sees Journey, Curriculum, Muenba and Grimmerglen; Secret stays hidden');
  assert.strictEqual(res.earned, 0, 'nothing is grandfathered; a new save starts at zero');
  assert(!item(res, 'juku_scholar'), 'Juku Scholar is shown only to Juku students');
  assert(res.shown >= 16 && res.shown <= 18, `a curated case of about 17 trophies (got ${res.shown})`);
  const champ = item(res, 'champion');
  assert.strictEqual(champ.img, 'medal-br-champion.webp', 'Champion follows the student curriculum');
  assert.strictEqual(champ.dots.length, 9, 'Champion carries a 9-dot game row');
}

/* ── lanes, champion dots, curriculum switch ── */
{
  const { res } = run({ curr: 'pb', unlocked: ['pb:vocab_tap', 'pb:spell_word', 'pb:vocab_speed', 'pb:say_word', 'br:sentence_tap'] });
  assert.strictEqual(item(res, 'word_keeper').on, true, 'Word Keeper needs all three Words games');
  assert.strictEqual(item(res, 'sharp_listener').n, 1, 'Sharp Listener counts Listen games cleared');
  assert.strictEqual(item(res, 'sentence_builder').n, 0, "another curriculum's games do not count");
  assert.strictEqual(item(res, 'champion').n, 4, 'the 9-dot row counts own-curriculum games');
  assert.strictEqual(item(res, 'champion').img, 'medal-pb-champion.webp');
}

/* ── tiers: crowns exclude the boss; boss wins ladder separately ── */
{
  const scores = {
    'br:vocab_tap': { crowns: 7, bestCombo: 12, completed: true },
    'br:sentence_tap': { crowns: 5, bestCombo: 4 },
    'br-extra:week_boss': { crowns: 6 },
  };
  const { res } = run({ scores });
  const crowns = item(res, 'crown_collector');
  assert.strictEqual(crowns.tier, 2, '12 crowns reaches tier 2 (10)');
  assert.strictEqual(crowns.tierName, 'silver');
  assert.deepStrictEqual([crowns.n, crowns.of], [12, 25], 'progress points at the next tier');
  const boss = item(res, 'week_boss_slayer');
  assert.strictEqual(boss.tier, 2, '6 boss wins reaches tier 2 (5)');
  assert.strictEqual(item(res, 'combo_spark').on, true, 'a 10+ best combo earns Combo Spark');
}
{
  const scores = {
    'br:vocab_tap': { rainbows: 1 },
    'br:spell_word': { rainbows: 1 },
    'br-extra:booha_bites': { rainbows: 1 },
  };
  const { res } = run({ scores });
  const rainbow = item(res, 'rainbow_master');
  assert.strictEqual(rainbow.tier, 2, 'three unique rainbow games reaches tier 2');
  assert.strictEqual(rainbow.tierName, 'silver');
  assert.deepStrictEqual([rainbow.n, rainbow.of], [3, 6], 'Rainbow Master points at the next tier');
  assert.strictEqual(rainbow.en, 'Steady Starter', 'the Rainbow token is named for its tier');
}
{
  const { res } = run();
  assert.strictEqual(item(res, 'rainbow_master').en, 'Ready Explorer', 'a locked Rainbow token shows its first name');
  const all = Object.fromEntries(['vocab_tap','spell_word','vocab_speed','sentence_tap','sentence_order','sentence_speed','say_word','say_sentence','ask_question'].map(g => [`br:${g}`, { rainbows: 2 }]));
  const top = item(run({ scores: all }).res, 'rainbow_master');
  assert.strictEqual(top.en, 'Rainbow Master'); assert.strictEqual(top.maxed, true, 'nine unique rainbow games is the top tier');
}
{
  const { res } = run({ scores: { 'br-extra:week_boss': { crowns: 12 } } });
  assert.strictEqual(item(res, 'week_boss_slayer').maxed, true, 'the top boss tier is marked MAX');
  assert.strictEqual(item(res, 'crown_collector').on, false, 'boss crowns are not game crowns');
}

/* ── wanderers + worlds ── */
{
  const wanderers = Object.fromEntries(Array.from({ length: 26 }, (_, i) => ['w' + i, { visits: 1 }]));
  const { res } = run({ wanderers, roster: 30, meta: { worldsVisited: { muenba: 1, karasuki: 2 } } });
  const host = item(res, 'wanderer_host');
  assert.strictEqual(host.tier, 2, '26 of 30 wanderers is tier 2');
  assert.deepStrictEqual([host.n, host.of], [26, 30], 'the last tier is the whole roster');
  assert.deepStrictEqual([item(res, 'world_traveler').n, item(res, 'world_traveler').of], [2, 4]);
}
{
  const { T, saved } = run();
  assert.strictEqual(T.recordWorldVisit('grimmerglen'), true, 'first visit is recorded');
  const first = saved().meta.worldsVisited.grimmerglen;
  assert.strictEqual(T.recordWorldVisit('grimmerglen'), false, 'a repeat visit does not write');
  assert.strictEqual(saved().meta.worldsVisited.grimmerglen, first);
  assert.strictEqual(T.recordWorldVisit('index'), false, 'only the four worlds count');
}

/* ── secrets appear only once earned ── */
{
  const { res } = run({
    unlocked: ['bc:all_complete', 'all_complete'],
    scores: { 'pb:a': { completed: true }, 'br:a': { completed: true }, 'bc:a': { completed: true } },
  });
  const secret = res.groups.find(g => g.id === 'secret');
  assert(secret, 'an earned secret reveals the Secret shelf');
  const ids = Array.from(secret.items.map(t => t.id)).sort();
  assert.deepStrictEqual(ids, ['all_complete', 'bc:all_complete', 'three_courses'],
    'only earned secrets show; the unearned pb champion stays hidden');
  assert(secret.items.every(t => t.on));
}

/* ── juku ── */
{
  const { res } = run({ juku: { weeks: { a: { finalReport: { status: 'approved' } } } } });
  assert.strictEqual(item(res, 'juku_scholar').on, true, 'an approved or denied final report earns Juku Scholar');
}

/* ── art exists and every referenced file is a medal ── */
{
  const imgs = new Set(['medal-pb-champion.webp', 'medal-br-champion.webp', 'medal-bc-champion.webp']);
  const { T } = run();
  T.DEFS.forEach(d => { if (typeof d.img === 'string') imgs.add(d.img); });
  imgs.forEach(f => assert(fs.existsSync(path.join(ROOT, 'assets/img/profile', f)), `trophy art missing: ${f}`));
  assert(!fs.existsSync(path.join(ROOT, 'assets/img/profile/medal-word-keeper.png')), 'PNG sources are not shipped');
  assert(fs.existsSync(path.join(ROOT, 'assets/source/profile/token-rainbow-master.png')), 'Rainbow Master PNG source is present');
}

/* ── wiring ── */
const profile = read('profile.html');
assert(profile.indexOf('js/core/trophy-case.js') > profile.indexOf('js/core/unlock-system.js') &&
  profile.indexOf('js/core/trophy-case.js') < profile.indexOf('js/ui/profile-game.js'),
  'trophy-case.js loads after the unlock system and before the profile view');
const pg = read('js/ui/profile-game.js');
assert(/BoohaTrophies/.test(pg) && !/const MEDALS = \[/.test(pg), 'the profile draws from BoohaTrophies, not a hard-coded list');
assert(/loading="lazy"/.test(pg.slice(pg.indexOf('function renderTrophies'))), 'trophy art loads lazily');
assert(/WEEKLY MEDALS · THIS WEEK/.test(pg), 'weekly medals are labelled as this week only');
const core = read('js/core/adventure-core.js');
assert(/BoohaTrophies\.recordWorldVisit\(m\[1\]\)/.test(core) && !/worldsVisited/.test(core),
  'adventure-core names the world; trophy-case.js recordWorldVisit() is the only writer of worldsVisited');
['muenba', 'grimmerglen', 'utsuroba', 'karasuki'].forEach(w => {
  const html = read(`${w}.html`);
  assert(html.includes('js/core/trophy-case.js'), `${w}.html must load trophy-case.js so its first visit is recorded`);
});
const writers = ['js', 'games'].flatMap(function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.js$/.test(e.name) ? [`${dir}/${e.name}`] : []);
}).filter(f => /patchDeep\(\s*'meta',\s*'worldsVisited'/.test(read(f)));
assert.deepStrictEqual(writers, ['js/core/trophy-case.js'], 'exactly one file writes worldsVisited');

/* ── every token is the same round medal shape (square 256 canvas) ── */
{
  const { execFileSync } = require('child_process');
  const { T } = run();
  const files = new Set(['medal-pb-champion.webp', 'medal-br-champion.webp', 'medal-bc-champion.webp']);
  T.DEFS.forEach(d => { if (typeof d.img === 'string') files.add(d.img); });
  files.forEach(f => {
    const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0:s=x', path.join(ROOT, 'assets/img/profile', f)], { encoding: 'utf8' }).trim();
    assert.strictEqual(dims, '256x256', `${f} must be a round 256×256 token like the rest (got ${dims})`);
  });
}

/* ── Bonus Games: record cards, apart from the nine, not launchers ── */
assert(profile.indexOf('id="pg-trail"') < profile.indexOf('id="pg-extras"') &&
  profile.indexOf('id="pg-extras"') < profile.indexOf('id="pg-stars"'), 'Bonus Games sit right after the nine-game trail');
assert(/id="pg-extras" aria-label="Bonus games"/.test(profile), 'the panel is labelled Bonus games');
const arc = pg.slice(pg.indexOf('function renderBonusGames'), pg.indexOf('// Adventure Tokens'));
assert(/getExtraForCurriculum\(s\.curr\)/.test(arc), 'cards come from the registry extras');
assert(/ボーナス ゲーム/.test(arc) && /BONUS GAMES/.test(arc) && !/アーケード|ARCADE/.test(arc), 'named Bonus Games, not Arcade (the arcade is the chest)');
assert(!/<a\b|href=|game\.html/.test(arc), 'bonus cards are records, not links to the games');
assert(/pg-x-bonus">BONUS</.test(arc), 'stars carry a BONUS badge so they read apart from ★ / 27');
assert(/attempts/.test(arc) && /bestPoints/.test(arc), 'cards show the lifetime best and times played');
assert(/played >= 9/.test(arc) && /weeklyPlayedFor\(s\.curr\)/.test(arc), 'Week Boss opens only after all nine are played this week');
assert(/these games do not change the 9-game unlock/.test(arc), 'the note says the extras do not change the 9-game unlock');
assert(!/27/.test(arc), 'bonus stars never join the ★ / 27 tally');
assert(/\[renderBonusGames, 'pg-extras'/.test(pg), 'renderBonusGames is part of the profile render');
assert(fs.statSync(path.join(ROOT, 'assets/img/profile/arcade-week-boss.webp')).size <= 24 * 1024, 'the boss card art is a small thumbnail');
assert(!/\(\?<[=!]/.test(SRC) && !/\(\?<[=!]/.test(pg), 'no regex lookbehind (older iPads)');

console.log('Adventure Tokens + Bonus Games audit passed: groups, tiers, secrets, round tokens, one world-visit writer, bonus record cards.');
