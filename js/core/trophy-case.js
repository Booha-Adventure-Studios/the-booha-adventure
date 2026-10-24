/**
 * trophy-case.js — The Booha Adventure permanent Trophy Case (data + rules)
 *
 * One list defines every trophy the profile shows: its group, art, names,
 * how to earn it, an optional tier ladder, and how to read progress from the
 * save. The profile draws whatever evaluate() returns, so a trophy added here
 * appears in the case with nothing else to wire.
 *
 * Rules
 *   - Trophies are permanent. Weekly medals (weekly-medals.js) are separate
 *     and reset every Sunday; nothing here reads weekly data.
 *   - Everything counts from launch (2026-10-22): no grandfathering.
 *   - A student plays one curriculum, so Curriculum trophies follow theirs.
 *     Trophies that need other curricula are "secret": hidden until earned,
 *     so no one stares at a slot they can never fill.
 *   - Juku Scholar only appears for Juku students.
 *
 * Groups: journey · curriculum · muenba · grimmerglen · secret
 */
window.BoohaTrophies = (function () {
  'use strict';

  var CURRS = ['pb', 'br', 'bc'];
  var CURR_NAME = { pb: 'Pre-Boo', br: 'Boo-riculum', bc: 'Boo-Continuum' };
  var CHAMP_JP = { pb: 'プレ・ブー', br: 'ブー・リキュラム', bc: 'ブー・コンティニュアム' };
  var LANES = {
    words:     ['vocab_tap', 'spell_word', 'vocab_speed'],
    sentences: ['sentence_tap', 'sentence_order', 'sentence_speed'],
    listen:    ['say_word', 'say_sentence', 'ask_question'],
  };
  var NINE = LANES.words.concat(LANES.sentences, LANES.listen);
  var WORLDS = ['muenba', 'grimmerglen', 'utsuroba', 'karasuki'];

  var GROUPS = [
    { id: 'journey',     en: 'JOURNEY',     jp: 'ぼうけん' },
    { id: 'curriculum',  en: 'CURRICULUM',  jp: 'コース' },
    { id: 'muenba',      en: 'MUENBA',      jp: 'ムエンバ' },
    { id: 'grimmerglen', en: 'GRIMMERGLEN', jp: 'グリマーグレン' },
    { id: 'secret',      en: 'SECRET',      jp: 'ひみつ' },
  ];

  // Tier names for laddered trophies (index = tier reached - 1).
  var TIER_NAMES = ['bronze', 'silver', 'gold', 'legend'];

  /* ── context: everything the rules read, gathered once ─────────────── */
  function context(curr) {
    var save = {};
    try { save = (window.BoohaAdventure && BoohaAdventure.save && BoohaAdventure.save.load()) || {}; } catch (_) {}
    var unlocks = window.BoohaUnlockSystem;
    var isUnlocked = function (id) { try { return !!(unlocks && unlocks.isUnlocked && unlocks.isUnlocked(id)); } catch (_) { return false; } };
    var scores = save.scores || {};
    var meta = save.meta || {};
    var wanderers = (save.collection && save.collection.wanderers && typeof save.collection.wanderers === 'object') ? save.collection.wanderers : {};
    var roster = window.KARASUKI_WANDERER_DATA ? Object.keys(window.KARASUKI_WANDERER_DATA).length : 0;
    var isJuku = false;
    try { isJuku = localStorage.getItem('booha_is_juku') === '1'; } catch (_) {}
    var jukuReports = 0;
    try {
      if (isJuku && window.JUKU && JUKU.loadSave) {
        var js = JUKU.loadSave() || {};
        jukuReports = Object.keys(js.weeks || {}).filter(function (k) {
          var w = js.weeks[k];
          return w && w.finalReport && (w.finalReport.status === 'approved' || w.finalReport.status === 'denied');
        }).length;
      }
    } catch (_) {}
    var sum = function (pred, field) {
      return Object.keys(scores).reduce(function (t, id) {
        var e = scores[id];
        return t + (pred(id) && e ? (Number(e[field]) || 0) : 0);
      }, 0);
    };
    var best = function (field) {
      return Object.keys(scores).reduce(function (m, id) { return Math.max(m, Number((scores[id] || {})[field]) || 0); }, 0);
    };
    var readyGames = Object.keys(scores).filter(function (id) {
      return /^(pb|br|bc)(-extra)?:/.test(id) && scores[id] && Number(scores[id].rainbows) > 0;
    }).length;
    return {
      curr: CURRS.indexOf(curr) >= 0 ? curr : 'br',
      isUnlocked: isUnlocked,
      scores: scores,
      crowns: sum(function (id) { return !/-extra:week_boss$/.test(id); }, 'crowns'),
      bossWins: sum(function (id) { return /-extra:week_boss$/.test(id); }, 'crowns'),
      bestCombo: best('bestCombo'),
      readyGames: readyGames,
      wanderersMet: Object.keys(wanderers).length,
      roster: roster,
      worldsVisited: WORLDS.filter(function (w) { return !!(meta.worldsVisited && meta.worldsVisited[w]); }),
      isJuku: isJuku,
      jukuReports: jukuReports,
      completedIn: function (c) {
        return Object.keys(scores).some(function (id) { return id.indexOf(c + ':') === 0 && scores[id] && scores[id].completed; });
      },
    };
  }

  function laneProgress(ctx, lane) {
    var n = LANES[lane].filter(function (g) { return ctx.isUnlocked(ctx.curr + ':' + g); }).length;
    return { n: n, of: 3, on: n === 3 };
  }
  function ladder(value, steps) {
    var tier = steps.filter(function (s) { return value >= s; }).length;
    var nextStep = steps[tier];
    return { on: tier > 0, tier: tier, tiers: steps.length, n: Math.min(value, nextStep || steps[steps.length - 1]), of: nextStep || steps[steps.length - 1], steps: steps };
  }
  function unlock(id) { return function (ctx) { return { on: ctx.isUnlocked(id) }; }; }

  /* ── the list ─────────────────────────────────────────────────────── */
  var DEFS = [
    // JOURNEY
    { id: 'first_game', group: 'journey', img: 'medal-first-step.webp', en: 'Adventure Begins!', jp: 'ぼうけんの はじまり',
      how: 'Finish your first game', howJp: 'はじめて ゲームを クリア', rule: unlock('first_game') },
    { id: 'combo_spark', group: 'journey', img: 'medal-combo-spark.webp', en: 'Combo Spark', jp: 'コンボ スパーク',
      how: 'Reach a ×3 combo (10 in a row)', howJp: '10れんぞく せいかいで ×3 コンボ',
      rule: function (ctx) { return { on: ctx.bestCombo >= 10, n: Math.min(ctx.bestCombo, 10), of: 10 }; } },
    // tierNames: the token's name grows with the tier (locked shows tier 1).
    { id: 'rainbow_master', group: 'journey', img: 'token-rainbow-master.webp', en: 'Rainbow Master', jp: 'にじいろ マスター',
      tierNames: [['Ready Explorer', 'じゅんび たんけんか'], ['Steady Starter', 'コツコツ スターター'],
                  ['Prepared Adventurer', 'じゅんび ばっちり ぼうけんしゃ'], ['Rainbow Master', 'にじいろ マスター']],
      how: 'Earn Rainbow stars on 1 / 3 / 6 / 9 unique games', howJp: '1・3・6・9つの ゲームで にじいろスター',
      rule: function (ctx) { return ladder(ctx.readyGames, [1, 3, 6, 9]); } },
    { id: 'crown_collector', group: 'journey', img: 'medal-crown-collector.webp', en: 'Crown Collector', jp: 'クラウン コレクター',
      how: 'Win crowns: 15 / 15 with no mistakes', howJp: 'ノーミス 15/15 で クラウン',
      rule: function (ctx) { return ladder(ctx.crowns, [1, 10, 25, 50]); } },
    { id: 'week_boss_slayer', group: 'journey', img: 'medal-week-boss-slayer.webp', en: 'Week Boss Slayer', jp: 'ボス バスター',
      how: 'Defeat the Week Boss', howJp: 'ウィークボスを たおそう',
      rule: function (ctx) { return ladder(ctx.bossWins, [1, 5, 10]); } },
    { id: 'juku_scholar', group: 'journey', img: 'medal-juku-scholar.webp', en: 'Juku Scholar', jp: 'じゅく スカラー',
      how: 'Get your first Juku report', howJp: 'はじめての じゅく レポート', onlyIf: function (ctx) { return ctx.isJuku; },
      rule: function (ctx) { return { on: ctx.jukuReports >= 1 }; } },

    // CURRICULUM (the student's own)
    { id: 'word_keeper', group: 'curriculum', img: 'medal-word-keeper.webp', en: 'Word Keeper', jp: 'ことばの まもりて',
      how: 'Clear all 3 Words games', howJp: 'WORDS の 3ゲームを クリア', rule: function (ctx) { return laneProgress(ctx, 'words'); } },
    { id: 'sentence_builder', group: 'curriculum', img: 'medal-sentence-builder.webp', en: 'Sentence Builder', jp: 'ぶんの けんちくか',
      how: 'Clear all 3 Sentences games', howJp: 'SENTENCES の 3ゲームを クリア', rule: function (ctx) { return laneProgress(ctx, 'sentences'); } },
    { id: 'sharp_listener', group: 'curriculum', img: 'medal-sharp-listener.webp', en: 'Sharp Listener', jp: 'ききじょうず',
      how: 'Clear all 3 Listen games', howJp: 'LISTEN の 3ゲームを クリア', rule: function (ctx) { return laneProgress(ctx, 'listen'); } },
    { id: 'champion', group: 'curriculum', img: function (ctx) { return 'medal-' + ctx.curr + '-champion.webp'; },
      en: function (ctx) { return CURR_NAME[ctx.curr] + ' Champion!'; }, jp: function (ctx) { return CHAMP_JP[ctx.curr] + ' チャンピオン'; },
      how: 'Clear all 9 games', howJp: '9ゲーム ぜんぶ クリア',
      rule: function (ctx) {
        var dots = NINE.map(function (g) { return ctx.isUnlocked(ctx.curr + ':' + g); });
        var n = dots.filter(Boolean).length;
        return { on: ctx.isUnlocked(ctx.curr + ':all_complete'), n: n, of: 9, dots: dots };
      } },

    // MUENBA
    { id: 'muenba:first_briefing', group: 'muenba', img: 'medal-nuppi-trust.webp', en: "Nuppi's Trust", jp: 'ヌッピの しんらい',
      how: "Finish Nuppi's first briefing", howJp: 'ヌッピの はじめての ブリーフィング', rule: unlock('muenba:first_briefing') },
    { id: 'muenba:first_ghost', group: 'muenba', img: 'medal-first-ghost.webp', en: 'First Ghost Caught', jp: 'はじめての ゴースト',
      how: 'Catch your first ghost', howJp: 'はじめて ゴーストを つかまえる', rule: unlock('muenba:first_ghost') },
    { id: 'muenba:cleared', group: 'muenba', img: 'medal-muenba-cleared.webp', en: 'Muenba Cleared', jp: 'ムエンバ クリア',
      how: 'Clear Muenba', howJp: 'ムエンバを クリア', rule: unlock('muenba:cleared') },
    { id: 'wanderer_host', group: 'muenba', img: 'medal-wanderer-host.webp', en: 'Wanderer Host', jp: 'たびびとの ホスト',
      how: 'Meet the Wanderers', howJp: 'たびびとに あおう',
      rule: function (ctx) { return ladder(ctx.wanderersMet, ctx.roster > 25 ? [10, 25, ctx.roster] : [10, 25]); } },

    // GRIMMERGLEN
    { id: 'grimmerglen:first_memory', group: 'grimmerglen', img: 'medal-first-memory.webp', en: 'A Memory Found', jp: 'おもいで みつけた',
      how: 'Find your first memory', howJp: 'はじめての おもいでを みつける', rule: unlock('grimmerglen:first_memory') },
    { id: 'grimmerglen:all_memories', group: 'grimmerglen', img: 'medal-memory-garden.webp', en: 'Memory Garden Complete', jp: 'おもいでの にわ',
      how: 'Find every memory', howJp: 'おもいでを ぜんぶ みつける', rule: unlock('grimmerglen:all_memories') },
    { id: 'grimmerglen:rooms_explored', group: 'grimmerglen', img: 'medal-every-corner.webp', en: 'Every Corner Remembered', jp: 'すみずみまで',
      how: 'Explore every room', howJp: 'へやを ぜんぶ たんけん', rule: unlock('grimmerglen:rooms_explored') },
    { id: 'world_traveler', group: 'grimmerglen', img: 'medal-world-traveler.webp', en: 'World Traveler', jp: 'せかい りょこうか',
      how: 'Visit all 4 worlds', howJp: '4つの せかいを たずねよう',
      rule: function (ctx) { var n = ctx.worldsVisited.length; return { on: n >= WORLDS.length, n: n, of: WORLDS.length }; } },

    // SECRET — hidden until earned (they need other curricula)
    { id: 'three_courses', group: 'secret', secret: true, img: 'medal-curriculum.webp', en: 'Three Courses', jp: 'みっつの コース',
      how: 'Clear a game in all 3 curricula', howJp: '3つの コースで ゲームを クリア',
      rule: function (ctx) { return { on: CURRS.every(ctx.completedIn) }; } },
    { id: 'other_champions', group: 'secret', secret: true, multi: true },
    { id: 'all_complete', group: 'secret', secret: true, img: 'medal-booha-master.webp', en: 'Booha Master!', jp: 'ブーハ マスター',
      how: 'Clear all 27 games', howJp: '27ゲーム ぜんぶ クリア', rule: unlock('all_complete') },
  ];

  function val(v, ctx) { return typeof v === 'function' ? v(ctx) : v; }

  /* evaluate(curr) → { groups: [{ id, en, jp, items: [...] }], earned, shown } */
  function evaluate(curr) {
    var ctx = context(curr);
    var items = [];
    DEFS.forEach(function (d) {
      if (d.onlyIf && !d.onlyIf(ctx)) return;
      if (d.multi) {
        // The other curricula's Champions: secret, shown only once earned.
        CURRS.filter(function (c) { return c !== ctx.curr; }).forEach(function (c) {
          if (!ctx.isUnlocked(c + ':all_complete')) return;
          items.push({ id: c + ':all_complete', group: 'secret', secret: true, on: true,
            img: 'medal-' + c + '-champion.webp', en: CURR_NAME[c] + ' Champion!', jp: CHAMP_JP[c] + ' チャンピオン',
            how: 'Clear all 9 games', howJp: '9ゲーム ぜんぶ クリア' });
        });
        return;
      }
      var r = d.rule(ctx) || {};
      if (d.secret && !r.on) return;
      var tier = r.tier || 0;
      var tn = Array.isArray(d.tierNames) ? d.tierNames[Math.max(1, Math.min(tier, d.tierNames.length)) - 1] : null;
      items.push({
        id: d.id, group: d.group, secret: !!d.secret, on: !!r.on,
        img: val(d.img, ctx), en: tn ? tn[0] : val(d.en, ctx), jp: tn ? tn[1] : val(d.jp, ctx), how: d.how, howJp: d.howJp,
        n: r.n, of: r.of, dots: r.dots || null,
        tier: tier, tiers: r.tiers || 0, tierName: tier ? TIER_NAMES[Math.min(tier, TIER_NAMES.length) - 1] : '', steps: r.steps || null,
        maxed: !!(r.tiers && tier >= r.tiers),
      });
    });
    var groups = GROUPS.map(function (g) {
      return { id: g.id, en: g.en, jp: g.jp, items: items.filter(function (i) { return i.group === g.id; }) };
    }).filter(function (g) { return g.items.length; });
    return { groups: groups, earned: items.filter(function (i) { return i.on; }).length, shown: items.length, items: items };
  }

  /* World Traveler: adventure-core calls this once a world page has booted. */
  function recordWorldVisit(world) {
    if (WORLDS.indexOf(world) < 0) return false;
    try {
      var S = window.BoohaAdventure && BoohaAdventure.save;
      if (!S || !S.load || !S.patchDeep) return false;
      var meta = (S.load() || {}).meta || {};
      if (meta.worldsVisited && meta.worldsVisited[world]) return false;
      var p = {}; p[world] = Date.now();
      S.patchDeep('meta', 'worldsVisited', p);
      return true;
    } catch (_) { return false; }
  }

  return { evaluate: evaluate, recordWorldVisit: recordWorldVisit, GROUPS: GROUPS, DEFS: DEFS, WORLDS: WORLDS, LANES: LANES };
})();
