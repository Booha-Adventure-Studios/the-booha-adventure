/**
 * profile-progress.js
 * The canonical detailed progress renderer for profile.html.
 *
 * Adventure-profile.html is reserved for collections and identity. This
 * module renders the record book's highlight tiles and the game-records
 * table. Achievements now live on the weekly medal shelf and trophy case
 * (profile-game.js); the old totals row was replaced by levels.
 */
(() => {
  'use strict';

  const GAME_JP = {
    ask_sentence:   { jp:'しつもんをする',   k:'質問文' },
    say_sentence:   { jp:'ぶんをいう',       k:'文を言う' },
    say_word:       { jp:'たんごをいう',     k:'単語を言う' },
    sentence_order: { jp:'ぶんならべかえ',   k:'文の順序' },
    sentence_speed: { jp:'すぴーどぶん',     k:'速文' },
    sentence_tap:   { jp:'ぶんをたっぷ',     k:'文タップ' },
    spell_word:     { jp:'もじをかく',       k:'綴り' },
    vocab_speed:    { jp:'すぴーどごい',     k:'速語彙' },
    vocab_tap:      { jp:'ごいをたっぷ',     k:'語彙タップ' },
  };

  const CURR_INFO = {
    bc:{ en:'BC Curriculum', jp:'BCカリキュラム', k:'BC課程', cc:'c-bc', oc:'orb-bc', fc:'pf-bc' },
    br:{ en:'BR Curriculum', jp:'BRカリキュラム', k:'BR課程', cc:'c-br', oc:'orb-br', fc:'pf-br' },
    pb:{ en:'PB Curriculum', jp:'PBカリキュラム', k:'PB課程', cc:'c-pb', oc:'orb-pb', fc:'pf-pb' },
  };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
  }

  function profileIcon(name, className = '') {
    return window.BoohaProfileIcons ? BoohaProfileIcons.svg(name, className) : '';
  }

  function starsHTML(n, max = 3) {
    return Array.from({ length: max }, (_, i) =>
      `<span class="sp ${i < n ? 'lit' : ''}">★</span>`
    ).join('');
  }

  function currentStreak(dayLog, todayKey) {
    if (window.BoohaAdventureLog && BoohaAdventureLog._test && BoohaAdventureLog._test.streak) {
      return BoohaAdventureLog._test.streak(dayLog, todayKey);
    }
    return 0;
  }

  function longestStreak(dayLog) {
    const keys = Object.keys(dayLog || {}).filter(key => dayLog[key] && dayLog[key].g > 0).sort();
    let best = 0;
    let run = 0;
    let previous = null;
    const dayBefore = key => {
      const date = new Date(`${key}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - 1);
      return date.toISOString().slice(0, 10);
    };
    keys.forEach(key => {
      run = previous && dayBefore(key) === previous ? run + 1 : 1;
      best = Math.max(best, run);
      previous = key;
    });
    return best;
  }

  function weekAverage(week) {
    const values = Object.values((week && week.adv) || {}).filter(value => Number.isFinite(value));
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  }

  function showRenderFallback(host, label, error) {
    console.error(`[ProfileProgress] ${label} section failed:`, error);
    if (!host) return;
    host.innerHTML = `<div class="profile-render-fallback" role="status"><strong>${label} is temporarily unavailable.</strong><small>Try refreshing this page.</small></div>`;
  }

  function renderHighlights() {
    const host = document.getElementById('profile-highlights');
    if (!host || !window.BoohaDayRecord) return;
    const keys = BoohaDayRecord.getCurrentKeys();
    if (!keys) return;
    const dayLog = BoohaDayRecord.getDayLog();
    const weekLog = BoohaDayRecord.getWeekLog();
    const current = currentStreak(dayLog, keys.day);
    const longest = longestStreak(dayLog);
    const weekEntries = Object.entries(weekLog)
      .map(([key, value]) => ({ key, value, score: weekAverage(value) }))
      .filter(entry => entry.score != null);
    const bestWeek = weekEntries.reduce((best, entry) => !best || entry.score > best.score ? entry : best, null);
    const data = BoohaAdventure.save.load();
    const collection = data.collection && data.collection.wanderers;
    const found = collection && typeof collection === 'object' && !Array.isArray(collection)
      ? Object.keys(collection).length : 0;
    const total = Object.keys(window.KARASUKI_WANDERER_DATA || {}).length || 36;
    const snapshot = {
      current,
      longest,
      best: bestWeek ? bestWeek.score : '--',
      found,
    };
    let previous = {};
    try { previous = JSON.parse(host.dataset.highlightSnapshot || '{}'); } catch (_) {}
    const valueChanged = key => previous[key] !== undefined && String(previous[key]) !== String(snapshot[key]);
    host.dataset.highlightSnapshot = JSON.stringify(snapshot);
    host.innerHTML = `
      <div class="highlight-grid">
        <div class="highlight-card streak${valueChanged('current') ? ' profile-value-pop' : ''}"><div class="highlight-icon">${profileIcon('flame')}</div><div class="highlight-value">${current}日</div><div class="highlight-en">CURRENT STREAK</div><div class="highlight-jp">いまのれんぞく</div></div>
        <div class="highlight-card longest${valueChanged('longest') ? ' profile-value-pop' : ''}"><div class="highlight-icon">${profileIcon('bolt')}</div><div class="highlight-value">${longest}日</div><div class="highlight-en">LONGEST STREAK</div><div class="highlight-jp">さいこうれんぞく</div></div>
        <div class="highlight-card best${valueChanged('best') ? ' profile-value-pop' : ''}"><div class="highlight-icon">${profileIcon('medal')}</div><div class="highlight-value">${bestWeek ? bestWeek.score + '%' : '--'}</div><div class="highlight-en">BEST WEEK AVERAGE</div><div class="highlight-jp">ベストしゅうスコア</div></div>
        <a class="highlight-card wanderers${valueChanged('found') ? ' profile-value-pop' : ''}" href="adventure-profile.html" aria-label="View wanderers found"><div class="highlight-icon">${profileIcon('ghost')}</div><div class="highlight-value">${found}/${total}</div><div class="highlight-en">WANDERERS FOUND</div><div class="highlight-jp">みつけた たびびと</div></a>
      </div>`;
  }

  function currentCurr() {
    try {
      const saved = localStorage.getItem('booha_profile_curr');
      if (['pb', 'br', 'bc'].includes(saved)) return saved;
    } catch (_) {}
    return 'br';
  }

  /* One table for the curriculum the student is using: this week's best
     score per game, plus the best-ever stars. Other curricula are one tap
     away on the weekly curriculum tabs, which re-render this table. */
  function renderGameRecords(cont, R) {
    const curr = currentCurr();
    const data = BoohaAdventure.save.load() || {};
    const scores = data.scores && typeof data.scores === 'object' ? data.scores : {};
    let week = {};
    try {
      const keys = window.BoohaDayRecord ? BoohaDayRecord.getCurrentKeys() : null;
      const weekLog = window.BoohaDayRecord ? BoohaDayRecord.getWeekLog() : {};
      week = keys && weekLog && weekLog[keys.week] && weekLog[keys.week].adv ? weekLog[keys.week].adv : {};
    } catch (_) {}
    // Record book rows follow the maze order (Vocab Tap first).
    const games = (typeof R.getForCurriculumInMazeOrder === 'function'
      ? R.getForCurriculumInMazeOrder(curr)
      : R.getForCurriculum(curr)) || [];
    const info = CURR_INFO[curr];
    const rows = games.map(g => {
      const id = g.baseId || String(g.id || '').split(':').pop();
      const saveId = `${curr}:${id}`;
      const gameJP = GAME_JP[id] || GAME_JP[id === 'ask_question' ? 'ask_sentence' : ''] || { jp: '' };
      const pct = week[saveId];
      const has = pct != null && Number.isFinite(Number(pct));
      const best = Math.max(0, Math.min(3, Number(scores[saveId] && scores[saveId].stars) || 0));
      const tone = !has ? 'none' : pct >= 70 ? 'good' : 'low';
      return `<div class="gr-row">
        <div class="gr-name"><span>${escapeHTML(g.name || id)}</span><small>${escapeHTML(gameJP.jp)}</small></div>
        <div class="gr-week ${tone}"><span class="gr-bar"><span style="width:${has ? Math.max(0, Math.min(100, pct)) : 0}%"></span></span><b>${has ? escapeHTML(pct) + '%' : 'まだ'}</b></div>
        <div class="gr-best" aria-label="best ${best} of 3 stars">${starsHTML(best)}</div>
      </div>`;
    }).join('');
    cont.innerHTML = `
      <div class="gr-table" role="table" aria-label="${escapeHTML(info ? info.en : curr)} game records">
        <div class="gr-head" role="row"><span>GAME</span><span>THIS WEEK</span><span>BEST</span></div>
        ${rows}
      </div>`;
  }

  function render() {
    const cont = document.getElementById('curr-cards');
    if (!cont || !window.BoohaAdventure) return;
    const R = BoohaAdventure.registry || window.BoohaGameRegistry;
    if (!R) return;

    try {
      renderHighlights();
    } catch (error) {
      showRenderFallback(document.getElementById('profile-highlights'), 'Highlights', error);
    }

    try {
      renderGameRecords(cont, R);
    } catch (error) {
      showRenderFallback(cont, 'Game records', error);
    }
  }

  function boot() {
    render();
    document.addEventListener('booha:saved', render);
    document.addEventListener('booha:dayRecorded', render);
    document.addEventListener('booha:reset', render);
    document.addEventListener('booha:weeklyReset', render);
    document.addEventListener('booha:profileCurr', render);
  }

  if (window.BOOHA_READY) boot();
  else document.addEventListener('booha:ready', boot, { once: true });
})();
