/**
 * profile-game.js
 * The Booha Adventure — the game view at the top of the Adventure Log.
 *
 * Mounts (profile.html):
 *   #pg-hero        companion card: seasonal/selected Booha, name, rank coin, level bar
 *   #pg-skin        this week's Blitz skin
 *   #pg-trail       this week's trail: 9 maze games → arcade chest → 3 Blitz → skin
 *   #pg-stars       this week's star breakdown
 *   #pg-collection  wanderer collection (friendly / mischievous / dangerous)
 *   #pg-travelers   travelers the player has tapped (Nuppi, seasonal travelers)
 *   #pg-medals      achievement shelf
 *   #pg-sealed      one-time "week sealed" celebration
 *
 * Read-only: every number comes from existing save data. Levels come from
 * BoohaLevelStars, which derives them from meta.weekLog and meta.checkIn.
 * Each section fails soft on its own so one bad record cannot blank the page.
 */
const BoohaProfileGame = (() => {
  'use strict';

  const IMG = 'assets/img/profile/';
  const LANTERN = 'assets/img/blitz/medal-spooky.webp';
  const BLITZ_ART = {
    vocab: 'assets/img/blitz/medal-circus.webp',
    sentence: 'assets/img/blitz/medal-spooky.webp',
    question: 'assets/img/blitz/medal-fireflies.webp',
  };
  const BLITZ_LABEL = { vocab: 'VOCAB BLITZ', sentence: 'SENTENCE BLITZ', question: 'QUESTION BLITZ' };
  const CURR_NAME = { pb: 'Pre-Boo', br: 'Boo-riculum', bc: 'Boo-continuum' };

  const WANDERER_KINDS = new Set(['friendly', 'mischievous', 'dangerous']);
  const KIND_LABEL = {
    friendly: ['なかま', 'FRIENDLY'],
    mischievous: ['いたずら', 'MISCHIEVOUS'],
    dangerous: ['きけん', 'DANGEROUS'],
  };
  // Same image-name exceptions as the adventure profile collection.
  const IMAGE_SLUGS = {
    'gorogui': 'gorogane', 'mister-happy': 'mr_happy', 'tom-katsu': 'tom_katsu',
    'sumiyo-horaguchi': 'sumiyo_horaguchi', 'takachika-green': 'takachika_green',
    'october-moriyama': 'october_moriyama', 'jubei-tsukigase': 'tsukigase_jubei',
    'kara-ageha': 'kara-ageha', 'jinguru-kan': 'jinguru-kan',
  };
  const TRAVELERS = [
    { id: 'nuppi', name: 'Nuppi', img: 'assets/img/wanderers/nuppi-1.webp',
      note: 'いつも たびしている · ALWAYS TRAVELING', hint: 'からすき や むえんば で さがしてね', always: true },
    { id: 'barba', name: 'Barba', img: 'assets/img/wanderers/barba.webp', seasonId: 'halloween-2026',
      note: 'ハロウィン 2026 · SEASONAL', hint: 'ハロウィンの からすき に いるよ' },
  ];

  let collectionFilter = 'all';

  /* ── helpers ─────────────────────────────────────────────────── */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function kindFor(item) {
    return item && WANDERER_KINDS.has(item.kind) ? item.kind : 'friendly';
  }

  function fallback(host, label, error) {
    console.error(`[ProfileGame] ${label} failed:`, error);
    if (!host) return;
    host.innerHTML = `<div class="profile-render-fallback pg-fallback" role="status"><strong>${esc(label)} is temporarily unavailable.</strong><small>Try refreshing this page.</small></div>`;
  }

  function firstName() {
    try {
      const raw = (localStorage.getItem('booha_first_name') || '').trim().slice(0, 12);
      return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
    } catch (_) {
      return '';
    }
  }

  function heroSprite() {
    const S = window.BoohaSkins;
    if (!S) return { src: 'assets/img/booha_ghost.webp', name: 'Booha' };
    try {
      const id = (S.selectedId && S.selectedId()) || (S.menuCharacterId && S.menuCharacterId()) || null;
      const skin = id && S.get ? S.get(id) : null;
      if (skin && skin.assets) {
        return { src: skin.assets.danceWave || skin.assets.maze || skin.assets.static, name: skin.name };
      }
      const mascot = S.seasonMascot ? S.seasonMascot() : null;
      if (mascot && mascot.assets && mascot.assets.static) return { src: mascot.assets.static, name: mascot.name };
      return { src: S.BASE || 'assets/img/booha_ghost.webp', name: 'Booha' };
    } catch (_) {
      return { src: 'assets/img/booha_ghost.webp', name: 'Booha' };
    }
  }

  function gamesFor(curr) {
    // Trail stops follow the maze (Vocab Tap first), not the registry order.
    const entries = (typeof BoohaGameRegistry.getForCurriculumInMazeOrder === 'function'
      ? BoohaGameRegistry.getForCurriculumInMazeOrder(curr)
      : BoohaGameRegistry.getForCurriculum(curr)) || [];
    return entries.map(g => {
      const id = g.baseId || String(g.id || '').split(':').pop();
      return { id, name: g.name || id, saveId: `${curr}:${id}` };
    });
  }

  function starsFor(saveId, pct) {
    return BoohaGameRegistry.starsForScore(saveId, pct);
  }

  /** Everything the sections need, gathered once per render. */
  function snapshot() {
    const data = BoohaAdventure.save.load() || {};
    const meta = isObject(data.meta) ? data.meta : {};
    const keys = BoohaDayRecord.getCurrentKeys();
    if (!keys || typeof keys.week !== 'string') throw new Error('calendar keys unavailable');
    const weekLog = BoohaDayRecord.getWeekLog() || {};
    const dayLog = BoohaDayRecord.getDayLog() || {};
    let curr = null;
    try {
      const saved = localStorage.getItem('booha_profile_curr');
      if (['pb', 'br', 'bc'].includes(saved)) curr = saved;
    } catch (_) {}
    if (!curr && window.BoohaAdventureLog && BoohaAdventureLog._test) {
      curr = BoohaAdventureLog._test.inferCurriculum(weekLog, keys.week);
    }
    if (!curr) curr = 'br';

    const games = gamesFor(curr);
    const ids = games.map(g => g.id);
    const gamesByCurr = { pb: gamesFor('pb').map(g => g.id), br: gamesFor('br').map(g => g.id), bc: gamesFor('bc').map(g => g.id) };
    const L = BoohaLevelStars;
    const week = L.weekStars(weekLog[keys.week], curr, ids, starsFor);
    const checkIn = isObject(meta.checkIn) ? meta.checkIn : {};
    const life = L.lifetime(weekLog, checkIn, gamesByCurr, starsFor);
    const cw = window.CALENDAR && CALENDAR.getCurrentCurriculumWeek ? CALENDAR.getCurrentCurriculumWeek() : null;
    const dailyThisWeek = cw && cw.weekStart ? L.dailyDoneInWeek(checkIn, cw.weekStart) : 0;
    const weekTotal = week.total + dailyThisWeek * L.RULES.daily;
    const levelWeekTotal = L.weekTotalAllCurricula
      ? L.weekTotalAllCurricula(weekLog[keys.week], checkIn, cw && cw.weekStart, gamesByCurr, starsFor)
      : week.total + dailyThisWeek * L.RULES.daily;

    // Weekly medal bonus stars come from the medal log (fresh start: only
    // weeks since medals launched have entries) and count toward levels.
    const W = window.BoohaWeeklyMedals;
    const medalLog = isObject(meta.medalLog) ? meta.medalLog : {};
    const medalStarsAll = W ? W.logStars(medalLog) : 0;
    const medalStarsWeek = W ? W.weekStars(medalLog, keys.week) : 0;
    life.medals = medalStarsAll;
    life.total += medalStarsAll;
    const weekTotalWithMedals = weekTotal + medalStarsWeek;

    // Most recently played maze game this week for Booha's trail token.
    const scores = isObject(data.scores) ? data.scores : {};
    // Rainbow Pass B: ready-pace runs this week (weekly bucket, live week).
    const rainbow = isObject(data.weekly) && isObject(data.weekly.gameRainbow) ? data.weekly.gameRainbow : {};
    let lastIndex = -1;
    let lastAt = 0;
    games.forEach((g, i) => {
      const at = Number(scores[g.saveId] && scores[g.saveId].lastPlayedAt) || 0;
      if (week.stars[i] != null && at > lastAt) { lastAt = at; lastIndex = i; }
    });

    let arcadeOpen = week.twoStarCount === games.length;
    try {
      if (window.BoohaUnlockSystem && BoohaUnlockSystem.BONUS_GAMES) {
        arcadeOpen = arcadeOpen || BoohaUnlockSystem.isBonusGameUnlocked(BoohaUnlockSystem.BONUS_GAMES[0]);
      }
    } catch (_) {}

    const adv = isObject(weekLog[keys.week] && weekLog[keys.week].adv) ? weekLog[keys.week].adv : {};
    const pcts = games.map(g => adv[g.saveId]).filter(v => v != null && Number.isFinite(Number(v))).map(Number);
    const weekPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;

    const S = window.BoohaSkins;
    let weeklySkin = null;
    try {
      const skinId = S && S.rotationCharacterId ? S.rotationCharacterId() : null;
      const skin = skinId && S.get ? S.get(skinId) : null;
      if (skin) {
        weeklySkin = {
          id: skinId,
          name: skin.name,
          src: skin.assets.maze || skin.assets.static,
          unlocked: !!(S.hasCurrentBlitzTriple && S.hasCurrentBlitzTriple(data)),
        };
      }
    } catch (_) {}

    const daysPlayed = Object.keys(dayLog).filter(k => isObject(dayLog[k]) && (dayLog[k].s > 0 || dayLog[k].g > 0)).length;

    return {
      data, meta, keys, curr, games, week, life, weekTotal: weekTotalWithMedals, dailyThisWeek, medalStarsWeek,
      level: L.levelFor(life.total), levelBefore: L.levelFor(life.total - levelWeekTotal - medalStarsWeek),
      lastIndex, arcadeOpen, weekPct, weeklySkin, daysPlayed, rainbow,
      name: firstName(), sprite: heroSprite(),
    };
  }

  /* ── hero ───────────────────────────────────────────────────── */

  function speech(s) {
    const left = s.games.length - s.week.twoStarCount;
    if (!s.week.played) return 'きょうも いっしょに ぼうけん しよう！';
    if (!s.arcadeOpen) return `あと ${left}つ ★★ で アーケード だよ！`;
    if (s.week.blitzCount < 3) {
      return s.weeklySkin
        ? `アーケード オープン！ Blitz あと ${3 - s.week.blitzCount}つ で スキン！`
        : `アーケード オープン！ Blitz にも ちょうせん しよう！`;
    }
    return 'こんしゅう ぜんぶ クリア！ すごい！';
  }

  function renderHero(s) {
    const host = document.getElementById('pg-hero');
    if (!host) return;
    const lv = s.level;
    const pct = lv.max ? 100 : Math.max(3, Math.round(lv.into / lv.span * 100));
    const greet = s.name ? `${s.name}、おかえり！` : 'おかえり！';
    const nextLine = lv.max
      ? 'さいこう ランク！ MAX RANK'
      : `Lv ${lv.level + 1} で あたらしい コイン`;
    host.innerHTML = `
      <div class="pg-hero-coin">
        <span class="pg-coin-face"><img src="${IMG}rank-coin-${lv.level}.webp" alt="Rank coin, level ${lv.level}" width="72" height="72"></span>
        <span class="pg-hero-lv">LV ${lv.level}</span>
      </div>
      <p class="pg-hero-speech">${esc(greet)}<br><span>${esc(speech(s))}</span></p>
      <div class="pg-hero-stage">
        <span class="pg-hero-shadow" aria-hidden="true"></span>
        <img class="pg-hero-sprite" src="${esc(s.sprite.src)}" alt="${esc(s.sprite.name)}, your companion" width="220" height="220">
      </div>
      <div class="pg-hero-foot">
        <h2 class="pg-hero-name">${esc(s.name || 'Booha')}</h2>
        <p class="pg-hero-sub">ぼうけん ${s.daysPlayed}日 · ${esc(s.sprite.name)}</p>
        <div class="pg-level">
          <div class="pg-level-row"><span>${lv.max ? 'ランク MAX' : `Lv ${lv.level + 1} まで`}</span><span class="pg-level-num">${lv.max ? `${s.life.total.toLocaleString()} ★` : `${s.life.total.toLocaleString()} / ${lv.next.toLocaleString()} ★`}</span></div>
          <div class="pg-level-track" role="progressbar" aria-label="Level progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
          <p class="pg-level-next">${esc(nextLine)}${lv.max ? '' : ` <img src="${IMG}rank-coin-${lv.level + 1}.webp" alt="" width="22" height="22">`}</p>
        </div>
      </div>`;
  }

  /* ── weekly Blitz skin ──────────────────────────────────────── */

  function renderSkin(s) {
    const host = document.getElementById('pg-skin');
    if (!host) return;
    const skin = s.weeklySkin;
    if (!skin) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    const bars = ['vocab', 'sentence', 'question']
      .map(t => `<span class="pg-skin-pip${s.week.blitzDone[t] ? ' on' : ''}"></span>`).join('');
    host.innerHTML = `
      <div class="pg-skin-art${skin.unlocked ? ' unlocked' : ''}">
        <img src="${esc(skin.src)}" alt="This week's Blitz skin: ${esc(skin.name)}${skin.unlocked ? '' : ' (locked)'}" width="64" height="64">
      </div>
      <div class="pg-skin-copy">
        <span class="pg-kicker">THIS WEEK'S SKIN</span>
        <span class="pg-skin-name">${esc(skin.name)}</span>
        <div class="pg-skin-bar">${bars}<span>${skin.unlocked ? 'ゲット！ UNLOCKED' : `Blitz ${s.week.blitzCount}/3`}</span></div>
      </div>`;
  }

  /* ── trail ──────────────────────────────────────────────────── */

  const COLS = [16.5, 50, 83.5];
  const ROW_Y = [60, 180, 300];
  const GATE_Y = 425;
  const BLITZ_Y = 575;
  const SKIN_Y = 720;
  const SKIN_ELBOW_Y = BLITZ_Y + 86;   // below every Blitz label

  function nodePos(i) {
    const row = Math.floor(i / 3);
    const inRow = i % 3;
    const col = row % 2 === 0 ? inRow : 2 - inRow;
    return { x: COLS[col], y: ROW_Y[row] };
  }

  function seg(x1, y1, x2, y2, lit) {
    const cls = `pg-seg${lit ? ' lit' : ''}`;
    if (y1 === y2) {
      return `<span class="${cls}" style="left:${Math.min(x1, x2)}%;top:${y1 - 4}px;width:${Math.abs(x2 - x1)}%;height:8px"></span>`;
    }
    return `<span class="${cls}" style="left:calc(${x1}% - 4px);top:${Math.min(y1, y2)}px;width:8px;height:${Math.abs(y2 - y1)}px"></span>`;
  }

  function renderTrail(s) {
    const host = document.getElementById('pg-trail');
    if (!host) return;
    const w = s.week;
    const parts = [];
    // Maze links: lit only when both neighbours have ★★ or better.
    for (let i = 0; i < s.games.length - 1; i++) {
      const a = nodePos(i);
      const b = nodePos(i + 1);
      parts.push(seg(a.x, a.y, b.x, b.y, w.links[i]));
      if (w.links[i]) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        // Vertical links: the chip sits on the line in the gap between the
        // upper node's nameplate and the lower disc, never over a name.
        const style = a.y === b.y
          ? `left:calc(${mx}% - 22px);top:${my - 28}px`
          : `left:calc(${a.x}% - 22px);top:${Math.min(a.y, b.y) + 64}px`;
        parts.push(`<span class="pg-chip" style="${style}">+1★</span>`);
      }
    }
    const last = nodePos(s.games.length - 1);
    parts.push(seg(last.x, last.y, last.x, GATE_Y, s.arcadeOpen));
    parts.push(seg(COLS[1], GATE_Y, last.x, GATE_Y, s.arcadeOpen));
    // Blitz row and the skin at the end.
    const bd = ['vocab', 'sentence', 'question'].map(t => w.blitzDone[t]);
    parts.push(seg(COLS[0], BLITZ_Y, COLS[1], BLITZ_Y, bd[0] && bd[1]));
    parts.push(seg(COLS[1], BLITZ_Y, COLS[2], BLITZ_Y, bd[1] && bd[2]));
    // The skin path drops from the gaps between the Blitz nodes, never
    // through a node's labels, and joins below them (a funnel).
    const allBlitz = w.blitzCount === 3;
    const GAPS = [(COLS[0] + COLS[1]) / 2, (COLS[1] + COLS[2]) / 2];
    GAPS.forEach(x => parts.push(seg(x, BLITZ_Y, x, SKIN_ELBOW_Y + 4, allBlitz)));
    parts.push(seg(GAPS[0], SKIN_ELBOW_Y, GAPS[1], SKIN_ELBOW_Y, allBlitz));
    parts.push(seg(COLS[1], SKIN_ELBOW_Y, COLS[1], SKIN_Y - 40, allBlitz));

    s.games.forEach((g, i) => {
      const p = nodePos(i);
      const st = w.stars[i];
      const state = st == null ? 'todo' : st >= 2 ? 'done' : 'one';
      const rainbow = st != null && st >= 1 && !!s.rainbow[g.saveId];
      const starText = st == null ? 'PLAY' : st === 1 ? '★☆☆ あと1★' : '★'.repeat(st) + '☆'.repeat(3 - st);
      const label = `${g.name}: ${st == null ? 'not played yet' : `${st} of 3 stars`}`;
      parts.push(`
        <div class="pg-node ${state}${rainbow ? ' rainbow' : ''}" style="left:${p.x}%;top:${p.y - 29}px" role="listitem" aria-label="${esc(label + (rainbow ? ', rainbow stars: ready pace' : ''))}">
          <span class="pg-disc">${i + 1}</span>
          <span class="pg-label"><span class="pg-stars">${esc(starText)}</span><span class="pg-name">${esc(g.name)}</span></span>
        </div>`);
    });
    if (s.lastIndex >= 0) {
      const p = nodePos(s.lastIndex);
      parts.push(`<img class="pg-token" src="${esc(s.sprite.src)}" alt="" aria-hidden="true" style="left:calc(${p.x}% + 20px);top:${p.y - 50}px" width="42" height="42">`);
    }
    parts.push(`
      <div class="pg-gate${s.arcadeOpen ? ' open' : ''}" style="top:${GATE_Y - 50}px">
        <img src="${IMG}treasure-chest-${s.arcadeOpen ? 'open' : 'closed'}.webp" alt="Arcade chest${s.arcadeOpen ? ' (open)' : ' (locked)'}" width="120" height="80">
        <span class="pg-gate-title">${s.arcadeOpen ? 'アーケード オープン！' : 'アーケード たからばこ'}</span>
        <span class="pg-gate-sub">${s.arcadeOpen ? 'ARCADE GAMES UNLOCKED' : 'ぜんぶ ★★ で ひらく'}</span>
      </div>
      <div class="pg-divider" style="top:${GATE_Y + 72}px" aria-hidden="true"><span>BLITZ · SKIN</span></div>`);
    ['vocab', 'sentence', 'question'].forEach((t, i) => {
      const done = w.blitzDone[t];
      parts.push(`
        <div class="pg-node blitz${done ? ' done' : ''}" style="left:${COLS[i]}%;top:${BLITZ_Y - 35}px" role="listitem" aria-label="${BLITZ_LABEL[t]}: ${done ? 'cleared' : 'not cleared yet'}">
          <span class="pg-disc"><img src="${BLITZ_ART[t]}" alt="" width="52" height="52"></span>
          <span class="pg-stars">${done ? 'CLEAR · +3★' : 'PLAY'}</span>
          <span class="pg-name">${BLITZ_LABEL[t]}</span>
        </div>`);
    });
    if (s.weeklySkin) {
      parts.push(`
        <div class="pg-trail-skin${s.weeklySkin.unlocked ? ' unlocked' : ''}" style="top:${SKIN_Y - 40}px">
          <img src="${esc(s.weeklySkin.src)}" alt="${esc(s.weeklySkin.name)}${s.weeklySkin.unlocked ? '' : ' (locked)'}" width="76" height="76">
          <span>${esc(s.weeklySkin.name)} · ${s.weeklySkin.unlocked ? 'ゲット！' : `${w.blitzCount}/3`}</span>
        </div>`);
    }

    host.innerHTML = `
      <div class="pg-section-head">
        <div><h2>こんしゅうのぼうけん</h2><span class="pg-kicker">THIS WEEK'S TRAIL · ${esc(CURR_NAME[s.curr] || s.curr.toUpperCase())}</span></div>
        <span class="pg-head-num">${s.weekTotal}★</span>
      </div>
      <p class="pg-note">どの じゅんばんでも OK！ となりどうしが ★★ に なると みちが ひかって <b>+1★</b>。</p>
      <div class="pg-trail-stats">
        <div class="pg-stat teal"><span>アーケードまで ★★×${s.games.length}</span><b>${w.twoStarCount} / ${s.games.length}</b></div>
        <div class="pg-stat gold"><span>つながりボーナス</span><b>+${w.linkStars}★ <small>(${w.linkCount}/${s.games.length - 1})</small></b></div>
      </div>
      ${s.games.some((g, i) => w.stars[i] != null && s.rainbow[g.saveId]) ? '<p class="pg-rainbow-key"><b>🌈 ★★★</b> Rainbow stars = ready pace · じゅんび OK</p>' : ''}
      <div class="pg-trail-board" role="list" aria-label="This week's games">${parts.join('')}</div>`;
  }

  function renderStars(s) {
    const host = document.getElementById('pg-stars');
    if (!host) return;
    const R = BoohaLevelStars.RULES;
    const n = s.games.length;
    const rows = [
      ['めいろゲーム Maze (3★ × ' + n + ')', `${s.week.maze} / ${n * 3}`],
      ['つながり Links (+1★ × ' + (n - 1) + ')', `${s.week.linkStars} / ${n - 1}`],
      ['Blitz (+3★ × 3)', `${s.week.blitzStars} / 9`],
      ['まいにちチェック Daily (+2★ × 7)', `${s.dailyThisWeek * R.daily} / 14`],
      ['メダル Medals (+3 / +5 / +10★)', `+${s.medalStarsWeek}`],
    ];
    host.innerHTML = `
      <span class="pg-kicker">THIS WEEK'S STARS · こんしゅうの ★</span>
      ${rows.map(r => `<div class="pg-star-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}
      <div class="pg-star-row total"><span>ごうけい TOTAL</span><b>${s.weekTotal}★</b></div>`;
  }

  /* ── collection ─────────────────────────────────────────────── */

  function wandererImage(id) {
    return `assets/img/wanderers/${IMAGE_SLUGS[id] || id.replace(/-/g, '_')}-1.webp`;
  }

  function renderCollection(s) {
    const host = document.getElementById('pg-collection');
    if (!host) return;
    const source = window.KARASUKI_WANDERER_DATA || {};
    const records = isObject(s.data.collection) && isObject(s.data.collection.wanderers) ? s.data.collection.wanderers : {};
    const items = Object.keys(source).map(name => {
      const id = source[name].id;
      const rec = records[id];
      return {
        id, name,
        kind: kindFor(source[name]),
        found: !!rec,
        visits: rec ? Math.max(1, Number(rec.visits) || 1) : 0,
      };
    });
    const total = items.length;
    const found = items.filter(i => i.found);
    const count = kind => ({
      found: found.filter(i => i.kind === kind).length,
      total: items.filter(i => i.kind === kind).length,
    });
    const c = { friendly: count('friendly'), mischievous: count('mischievous'), dangerous: count('dangerous') };
    const shown = found
      .filter(i => collectionFilter === 'all' || i.kind === collectionFilter)
      .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
    const topId = found.length ? found.slice().sort((a, b) => b.visits - a.visits)[0].id : null;
    const cards = shown.slice(0, 9).map(i => `
      <article class="pg-w ${i.kind}${i.id === topId ? ' top' : ''}">
        ${i.id === topId ? '<span class="pg-w-ribbon">いちばん なかよし</span>' : ''}
        <span class="pg-w-visits" aria-label="${i.visits} visits">×${i.visits}</span>
        <img src="${esc(wandererImage(i.id))}" alt="${esc(i.name)}" width="80" height="80" loading="lazy" decoding="async">
        <span class="pg-w-name">${esc(i.name)}</span>
        <span class="pg-w-tag">${KIND_LABEL[i.kind][0]}<br>${KIND_LABEL[i.kind][1]}</span>
      </article>`);
    const missing = collectionFilter === 'all'
      ? total - found.length
      : c[collectionFilter].total - c[collectionFilter].found;
    for (let k = 0; k < Math.min(3, missing) && cards.length < 9; k++) {
      cards.push(`
      <article class="pg-w unknown" aria-label="Not found yet">
        <span class="pg-w-q" aria-hidden="true">?</span>
        <span class="pg-w-name">???</span>
        <span class="pg-w-tag">ヒント<br>からすき</span>
      </article>`);
    }
    const chip = (key, label, n) =>
      `<button type="button" class="pg-filter ${key}" data-pg-filter="${key}" aria-pressed="${collectionFilter === key}">${label}${n ? ` · ${n}` : ''}</button>`;
    host.innerHTML = `
      <div class="pg-section-head">
        <div><h2>たびびとずかん</h2><span class="pg-kicker">WANDERER COLLECTION</span></div>
        <span class="pg-head-num violet">${found.length}/${total}</span>
      </div>
      <div class="pg-meter violet" aria-hidden="true"><span style="width:${total ? Math.round(found.length / total * 100) : 0}%"></span></div>
      <div class="pg-filters" role="group" aria-label="Filter wanderers">
        ${chip('all', 'ぜんぶ', '')}
        ${chip('friendly', 'なかま FRIENDLY', `${c.friendly.found}/${c.friendly.total}`)}
        ${chip('mischievous', 'いたずら MISCHIEVOUS', `${c.mischievous.found}/${c.mischievous.total}`)}
        ${chip('dangerous', 'きけん DANGEROUS', `${c.dangerous.found}/${c.dangerous.total}`)}
      </div>
      <div class="pg-w-grid">${cards.join('') || '<p class="pg-note">からすき で たびびと を さがそう！</p>'}</div>
      <a class="pg-more" href="adventure-profile.html">ずかん を ぜんぶ みる · FULL COLLECTION →</a>`;
    host.querySelectorAll('[data-pg-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        collectionFilter = btn.getAttribute('data-pg-filter');
        try { renderCollection(s); } catch (e) { fallback(host, 'Wanderer collection', e); }
        const again = host.querySelector(`[data-pg-filter="${collectionFilter}"]`);
        if (again) again.focus();
      });
    });
  }

  function renderTravelers(s) {
    const host = document.getElementById('pg-travelers');
    if (!host) return;
    const met = window.BoohaTravelers ? BoohaTravelers.all() : {};
    let season = null;
    try { season = window.BoohaSkins && BoohaSkins.seasonIdForDate ? BoohaSkins.seasonIdForDate() : null; } catch (_) {}
    const rows = TRAVELERS
      .filter(t => t.always || met[t.id] || t.seasonId === season)
      .map(t => {
        const rec = met[t.id];
        if (!rec) {
          return `
          <div class="pg-tr unknown">
            <span class="pg-tr-q" aria-hidden="true">?</span>
            <div><b>???</b><span>${esc(t.hint)}</span></div>
          </div>`;
        }
        return `
          <div class="pg-tr ${t.always ? 'always' : 'seasonal'}">
            <img src="${esc(t.img)}" alt="${esc(t.name)}" width="64" height="64" loading="lazy" decoding="async">
            <div><b>${esc(t.name)}</b><span>${esc(t.note)}</span></div>
            <em aria-label="${Number(rec.visits) || 1} visits">×${Number(rec.visits) || 1}</em>
          </div>`;
      });
    rows.push(`
      <div class="pg-tr unknown">
        <span class="pg-tr-q" aria-hidden="true">?</span>
        <div><b>???</b><span>つぎの きせつに あえるかも · NEXT SEASON</span></div>
      </div>`);
    host.innerHTML = `
      <div class="pg-section-head">
        <div><h2>たびのきろく</h2><span class="pg-kicker">TRAVELERS MET</span></div>
        <span class="pg-note-small">タップして あいさつ</span>
      </div>
      <div class="pg-tr-list">${rows.join('')}</div>`;
  }

  function renderMedals(s) {
    const host = document.getElementById('pg-medals');
    if (!host) return;
    const W = window.BoohaWeeklyMedals;
    const snap = W ? W.snapshot() : null;
    if (!snap) { host.hidden = true; return; }
    host.hidden = false;
    const TIER = { bronze: ['ブロンズ', 'BRONZE'], silver: ['シルバー', 'SILVER'], gold: ['ゴールド', 'GOLD'] };
    const rows = snap.rows.map(r => {
      const m = W.MEDALS.find(x => x.id === r.id);
      // A medal counts once it is in this week's log (the log never shrinks
      // mid-week even if a score were later replaced).
      const on = !!snap.logged[r.id] || r.earned;
      return Object.assign({}, m, r, { on });
    });
    const earned = rows.filter(r => r.on);
    const bonus = earned.reduce((sum, r) => sum + W.bonusFor(r.id), 0);
    // Days left until the Sunday reset (Tokyo calendar).
    let daysLeft = null;
    try {
      const start = Date.parse(`${snap.week.weekStart}T00:00:00+09:00`);
      daysLeft = Math.max(1, Math.ceil((start + 7 * 86400000 - Date.now()) / 86400000));
    } catch (_) {}
    let lastWeekCount = 0;
    let lastWeekKey = null;
    try {
      const keys = Object.keys(snap.medalLog).filter(k => k < snap.week.key).sort();
      lastWeekKey = keys.length ? keys[keys.length - 1] : null;
      lastWeekCount = lastWeekKey ? W.weekCount(snap.medalLog, lastWeekKey) : 0;
    } catch (_) {}
    host.innerHTML = `
      <div class="pg-section-head">
        <div><h2>こんしゅうのメダル</h2><span class="pg-kicker">WEEKLY MEDALS · THIS WEEK · ${earned.length} / ${rows.length}</span></div>
        ${daysLeft ? `<span class="pg-reset-chip">あと${daysLeft}日 · にちようリセット</span>` : ''}
      </div>
      <div class="pg-meter medal" aria-hidden="true"><span style="width:${Math.round(earned.length / rows.length * 100)}%"></span></div>
      <p class="pg-medal-key"><span class="bronze">ブロンズ +3★</span> · <span class="silver">シルバー +5★</span> · <span class="gold">ゴールド +10★</span><b>+${bonus}★</b></p>
      <div class="pg-shelf">
        <div class="pg-wm-grid">
          ${rows.map(r => `
            <div class="pg-wm ${r.tier}${r.on ? ' on' : ''}">
              ${r.on ? '<span class="pg-wm-get">GET!</span>' : ''}
              <img src="${IMG}${esc(r.img)}" alt="${esc(r.en)}${r.on ? ' (earned)' : ' (not yet)'}" width="96" height="96" loading="lazy" decoding="async">
              <span class="pg-wm-name">${esc(r.jp)}</span>
              <span class="pg-wm-tier">${TIER[r.tier][1]} · +${W.bonusFor(r.id)}★</span>
              <span class="pg-wm-how">${esc(r.how)}</span>
              <span class="pg-wm-bar" aria-hidden="true"><span style="width:${r.of ? Math.round(r.n / r.of * 100) : 0}%"></span></span>
              <span class="pg-wm-count">${r.on ? `ゲット！ +${W.bonusFor(r.id)}★` : `${r.n} / ${r.of}`}</span>
            </div>`).join('')}
        </div>
        <span class="pg-shelf-board" aria-hidden="true"></span>
      </div>
      ${lastWeekKey ? `<p class="pg-last-week">せんしゅうは ${lastWeekCount}こ ゲット！ <span>LAST WEEK · ${lastWeekCount} MEDALS · +${W.weekStars(snap.medalLog, lastWeekKey)}★</span></p>` : ''}`;
    // The student has now seen this week's medals; clear the hub badge.
    if (W.unseenCount() > 0 && W.markSeen()) {
      document.dispatchEvent(new Event('booha:medalsSeen'));
    }
  }

  // Bonus Games (ボーナス ゲーム): Booha Bites, Echo and the Week Boss as
  // record cards, not launchers (students play them from the game menu).
  // Each shows this week's bonus stars and done / not-yet, plus the
  // lifetime best and times played. None of it enters ★ / 27 or the 9-game
  // unlock. The boss opens once all nine are played this week (menu rule).
  const BONUS_ICON = {
    'booha-bites': '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="3"/><path d="M27 9a6 6 0 0 0 4 9 6 6 0 0 0 3 4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M13 21h9" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 3"/></svg>',
    echo: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 16h6l8-6v20l-8-6H8z" fill="currentColor"/><path d="M27 14a8 8 0 0 1 0 12M31 10a13 13 0 0 1 0 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  };
  function renderBonusGames(s) {
    const host = document.getElementById('pg-extras');
    if (!host) return;
    const R = window.BoohaGameRegistry;
    const games = R && R.getExtraForCurriculum ? R.getExtraForCurriculum(s.curr) : [];
    if (!games.length) { host.hidden = true; return; }
    host.hidden = false;
    const scores = window.BoohaAdventure && BoohaAdventure.scores;
    const call = (fn, id) => { try { return scores && typeof scores[fn] === 'function' ? scores[fn](id) : 0; } catch (_) { return 0; } };
    let weekly = {};
    try { weekly = (BoohaAdventure.save.load().weekly || {}).gameScores || {}; } catch (_) {}
    let played = 0;
    try { played = scores && scores.weeklyPlayedFor ? Math.min(9, scores.weeklyPlayedFor(s.curr) || 0) : 0; } catch (_) {}
    const card = g => {
      const stars = Math.max(0, Math.min(3, call('weeklyStarsForGame', g.saveId) || 0));
      const crown = !!call('weeklyCrownForGame', g.saveId);
      const rainbow = stars >= 1 && !!call('weeklyRainbowForGame', g.saveId);
      const done = Object.prototype.hasOwnProperty.call(weekly, g.saveId);
      const entry = (scores && scores.getEntry ? call('getEntry', g.saveId) : null) || {};
      const best = Number(entry.bestPoints) || Number(entry.highScore) || 0;
      const times = Number(entry.attempts) || 0;
      const open = !g.boss || played >= 9;
      const status = g.boss && !open ? `<span class="pg-x-tag lock">🔒 ${played} / 9 played · あと ${9 - played}</span>`
        : g.boss && crown ? '<span class="pg-x-tag win">♛ たおした！ BEATEN</span>'
        : done ? '<span class="pg-x-tag done">✓ クリア · DONE</span>'
        : g.boss ? '<span class="pg-x-tag open">OPEN! ひらいた！</span>'
        : '<span class="pg-x-tag skip">まだ · NOT YET</span>';
      const art = g.boss
        ? `<img class="pg-x-boss" src="${IMG}arcade-week-boss.webp" alt="" width="72" height="80" loading="lazy" decoding="async">`
        : `<span class="pg-x-icon">${BONUS_ICON[g.gameKey] || ''}</span>`;
      const label = `${g.name}: ${stars} of 3 bonus stars this week${done ? ', done' : ''}; best ${best}; played ${times} times`;
      return `
        <div class="pg-x-card${g.boss ? ' boss' : ''}${open ? '' : ' locked'}${done || crown ? ' done' : ''}" role="listitem" aria-label="${esc(label)}">
          ${art}
          <span class="pg-x-copy">
            <b>${esc(g.name)}${!g.boss && crown ? ' <i class="pg-x-crown">♛</i>' : ''}</b>
            <span class="pg-x-hira">${esc(g.hira || '')}</span>
            <span class="pg-x-starline"><span class="pg-x-stars${rainbow ? ' rainbow' : ''}">${'★'.repeat(stars)}</span>${stars < 3 ? `<span class="pg-x-stars off">${'☆'.repeat(3 - stars)}</span>` : ''}<span class="pg-x-bonus">BONUS</span></span>
            ${status}
            <span class="pg-x-rec"><span>ベスト <b>${best ? best.toLocaleString('en-US') : '—'}</b></span><span>あそんだ <b>${times}</b>かい</span></span>
          </span>
        </div>`;
    };
    const small = games.filter(g => !g.boss);
    const boss = games.filter(g => g.boss);
    host.innerHTML = `
      <div class="pg-section-head">
        <div><h2>ボーナス ゲーム</h2><span class="pg-kicker">BONUS GAMES · ${esc(CURR_NAME[s.curr] || s.curr.toUpperCase())} · THIS WEEK</span></div>
      </div>
      <p class="pg-x-note">Bonus practice — these games do not change the 9-game unlock. <span>ボーナス れんしゅう — ★ と 9ゲームの じょうけんには はいらないよ</span></p>
      <div class="pg-x-list" role="list" aria-label="Bonus games">
        <div class="pg-x-row">${small.map(card).join('')}</div>
        ${boss.map(card).join('')}
      </div>`;
  }

  // Adventure Tokens (the permanent Trophy Case). The tokens themselves (groups, art, rules,
  // tiers) live in js/core/trophy-case.js; this only draws what it returns.
  function trophyProgress(t) {
    if (t.dots) {
      return `<span class="rb-dots" aria-label="${t.n} / 9">${t.dots.map(d => `<i${d ? ' class="on"' : ''}></i>`).join('')}</span>`;
    }
    if (t.tiers) {
      const pips = Array.from({ length: t.tiers }, (_, i) => `<i${i < t.tier ? ' class="on"' : ''}></i>`).join('');
      const count = t.maxed ? 'MAX' : `${t.n} / ${t.of}`;
      return `<span class="rb-pips" aria-hidden="true">${pips}</span><span class="rb-count">${count}</span>`;
    }
    if (!t.on && t.of) {
      return `<span class="rb-bar" aria-hidden="true"><b style="width:${Math.round(Math.min(1, t.n / t.of) * 100)}%"></b></span><span class="rb-count">${t.n} / ${t.of}</span>`;
    }
    return '';
  }

  function renderTrophies(s) {
    const host = document.getElementById('pg-trophies');
    if (!host) return;
    const T = window.BoohaTrophies;
    if (!T || !T.evaluate) { host.innerHTML = ''; return; }
    const res = T.evaluate(s.curr);
    const next = res.items.find(t => !t.on && !t.secret)
      || res.items.find(t => t.tiers && !t.maxed && !t.secret);
    host.innerHTML = `
      <div class="rb-sec-head"><h3>ぼうけん トークン</h3><span class="rb-en">ADVENTURE TOKENS · ずっと のこる · ${res.earned} / ${res.shown}</span></div>
      ${res.groups.map(g => `
        <div class="rb-tgroup rb-tg-${esc(g.id)}">
          <h4>${esc(g.jp)} <span>${esc(g.en)}</span></h4>
          <div class="rb-trophies">
            ${g.items.map(t => `
              <div class="rb-trophy${t.on ? ' on' : ''}${t.tierName ? ' t-' + t.tierName : ''}${t.secret ? ' secret' : ''}" title="${esc(t.how)}">
                <span class="rb-tframe"><img src="${esc(IMG + t.img)}" alt="${esc(t.en)}${t.on ? '' : ' (locked)'}" width="72" height="72" loading="lazy" decoding="async"></span>
                <b class="rb-tjp">${esc(t.jp)}</b>
                <span class="rb-ten">${esc(t.en)}</span>
                ${trophyProgress(t)}
              </div>`).join('')}
          </div>
        </div>`).join('')}
      ${next ? `<p class="rb-next">つぎの トークン: <b>${esc(next.jp)}</b> — ${esc(next.howJp || '')} <span>${esc(next.en)} · ${esc(next.how)}</span></p>` : ''}`;
  }


  /* ── week sealed ────────────────────────────────────────────── */

  function sealedKey(s) {
    let user = '';
    try { user = localStorage.getItem('booha_userid') || ''; } catch (_) {}
    return `${user}|${s.keys.week}`;
  }

  function maybeCelebrate(s) {
    const host = document.getElementById('pg-sealed');
    if (!host) return;
    const complete = s.week.twoStarCount === s.games.length && s.week.blitzCount === 3;
    if (!complete) return;
    let seen = '';
    try { seen = localStorage.getItem('booha_week_sealed_seen') || ''; } catch (_) {}
    if (seen === sealedKey(s)) return;
    const pct = s.weekPct == null ? '—' : `${s.weekPct}%`;
    const tier = s.weekPct == null ? 'SEAL' : s.weekPct >= 90 ? 'GOLD SEAL' : s.weekPct >= 75 ? 'SILVER SEAL' : 'BRONZE SEAL';
    const rewards = [
      `<li class="gold"><span>こんしゅうのスター · WEEK TOTAL</span><b>${s.weekTotal}★</b></li>`,
    ];
    if (s.level.level > s.levelBefore.level) {
      rewards.push(`<li class="coin"><img src="${IMG}rank-coin-${s.level.level}.webp" alt="" width="34" height="34"><span>レベルアップ！ Lv ${s.levelBefore.level} → ${s.level.level}</span><b>NEW COIN</b></li>`);
    }
    if (s.weeklySkin && s.weeklySkin.unlocked) {
      rewards.push(`<li class="skin"><img src="${esc(s.weeklySkin.src)}" alt="" width="34" height="34"><span>${esc(s.weeklySkin.name)} ゲット！</span><b>BLITZ 3/3</b></li>`);
    }
    host.innerHTML = `
      <div class="pg-sealed-card" role="dialog" aria-modal="true" aria-labelledby="pg-sealed-title">
        <span class="pg-sealed-rays" aria-hidden="true"></span>
        <span class="pg-kicker gold">WEEK SEALED</span>
        <h2 id="pg-sealed-title">${esc(s.name ? `${s.name}、` : '')}こんしゅう クリア！</h2>
        <div class="pg-sealed-stage">
          <img class="pg-sealed-chest" src="${IMG}treasure-chest-open.webp" alt="Open treasure chest" width="280" height="187">
          <img class="pg-sealed-booha" src="${esc(s.sprite.src)}" alt="${esc(s.sprite.name)} cheering" width="150" height="150">
        </div>
        <div class="pg-sealed-score"><span class="pg-seal">${esc(pct)}</span><div><b>${tier}</b><span>12/12 クリア</span></div></div>
        <ul class="pg-sealed-rewards">${rewards.join('')}</ul>
        <button type="button" class="pg-sealed-close">やったー！ ログにもどる</button>
      </div>`;
    host.hidden = false;
    const close = () => {
      host.hidden = true;
      host.innerHTML = '';
      try { localStorage.setItem('booha_week_sealed_seen', sealedKey(s)); } catch (_) {}
      document.removeEventListener('keydown', onKey);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    host.querySelector('.pg-sealed-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    host.querySelector('.pg-sealed-close').focus();
  }

  /* ── boot ───────────────────────────────────────────────────── */

  function render() {
    let s;
    try {
      if (!window.BoohaAdventure || !window.BoohaDayRecord || !window.BoohaGameRegistry || !window.BoohaLevelStars) {
        throw new Error('profile dependencies are unavailable');
      }
      s = snapshot();
    } catch (error) {
      fallback(document.getElementById('pg-hero'), 'Your adventure card', error);
      return;
    }
    [
      [renderHero, 'pg-hero', 'Your adventure card'],
      [renderSkin, 'pg-skin', 'This week’s skin'],
      [renderTrail, 'pg-trail', 'This week’s trail'],
      [renderBonusGames, 'pg-extras', 'Bonus games'],
      [renderStars, 'pg-stars', 'This week’s stars'],
      [renderCollection, 'pg-collection', 'Wanderer collection'],
      [renderTravelers, 'pg-travelers', 'Travelers'],
      [renderMedals, 'pg-medals', 'Weekly medals'],
      [renderTrophies, 'pg-trophies', 'Trophy case'],
      [maybeCelebrate, 'pg-sealed', 'Week celebration'],
    ].forEach(([fn, id, label]) => {
      try { fn(s); } catch (error) { fallback(document.getElementById(id), label, error); }
    });
  }

  if (window.BOOHA_READY) render();
  else document.addEventListener('booha:ready', render, { once: true });
  document.addEventListener('booha:dayRecorded', render);
  document.addEventListener('booha:checkIn', render);
  document.addEventListener('booha:profileCurr', render);
  document.addEventListener('booha:medalEarned', render);

  return { render, _test: { kindFor, nodePos, speech, sealedKey } };
})();

window.BoohaProfileGame = BoohaProfileGame;
