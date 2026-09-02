/**
 * profile-progress.js
 * The canonical detailed progress renderer for profile.html.
 *
 * Adventure-profile.html is reserved for collections and identity. This
 * module keeps the curriculum, achievement, and totals views in one place so
 * the student and parent have one reliable progress record.
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

  const UNLOCK_META = {
    first_game:              { icon:'star', jp:'さいしょのゲーム', k:'初ゲーム' },
    any_curriculum_complete: { icon:'medal', jp:'カリキュラムかんりょう', k:'課程完了' },
    all_complete:            { icon:'trophy', jp:'ぜんぶかんりょう', k:'全完了' },
  };

  const PROFILE_KANJI_READINGS = {
    '質問文': [['質問', 'しつもん'], ['文', 'ぶん']],
    '文を言う': [['文', 'ぶん'], ['言', 'い']],
    '単語を言う': [['単語', 'たんご'], ['言', 'い']],
    '文の順序': [['文', 'ぶん'], ['順序', 'じゅんじょ']],
    '速文': [['速文', 'そくぶん']],
    '文タップ': [['文', 'ぶん']],
    '綴り': [['綴', 'つづ']],
    '速語彙': [['速', 'そく'], ['語彙', 'ごい']],
    '語彙タップ': [['語彙', 'ごい']],
    'BC課程': [['課程', 'かてい']],
    'BR課程': [['課程', 'かてい']],
    'PB課程': [['課程', 'かてい']],
    '侵略者': [['侵略者', 'しんりゃくしゃ']],
    '積木': [['積木', 'つみき']],
    '給食': [['給食', 'きゅうしょく']],
    '破壊': [['破壊', 'はかい']],
    '初ゲーム': [['初', 'はじ']],
    '課程完了': [['課程', 'かてい'], ['完了', 'かんりょう']],
    '全完了': [['全', 'ぜん'], ['完了', 'かんりょう']],
    '王者': [['王者', 'おうじゃ']],
    '完了': [['完了', 'かんりょう']],
  };

  function furiKanji(value) {
    const parts = PROFILE_KANJI_READINGS[value];
    if (!parts || !window.UtsuFurigana) return value || '';
    return parts.map(([kanji, reading]) => window.UtsuFurigana.rb(kanji, reading)).join('');
  }

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

  function triggerStarBurst() {
    document.querySelectorAll('.bg-stars, .bg-stars-extra').forEach(node => {
      node.classList.remove('star-burst');
      node.offsetHeight;
      node.classList.add('star-burst');
      node.addEventListener('animationend', () => node.classList.remove('star-burst'), { once: true });
    });
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

  function changedValue(node, value) {
    if (!node) return;
    const next = String(value);
    const previous = node.dataset.profileValue;
    node.textContent = next;
    if (previous !== undefined && previous !== next) {
      node.classList.remove('profile-value-pop');
      node.offsetWidth;
      node.classList.add('profile-value-pop');
    }
    node.dataset.profileValue = next;
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
        <div class="highlight-card streak${valueChanged('current') ? ' profile-value-pop' : ''}"><div class="highlight-icon">${profileIcon('flame')}</div><div class="highlight-value">${current}</div><div class="highlight-en">CURRENT STREAK</div><div class="highlight-jp">いまのれんぞく</div></div>
        <div class="highlight-card longest${valueChanged('longest') ? ' profile-value-pop' : ''}"><div class="highlight-icon">${profileIcon('bolt')}</div><div class="highlight-value">${longest}</div><div class="highlight-en">LONGEST STREAK</div><div class="highlight-jp">さいこうれんぞく</div></div>
        <div class="highlight-card best${valueChanged('best') ? ' profile-value-pop' : ''}"><div class="highlight-icon">${profileIcon('medal')}</div><div class="highlight-value">${bestWeek ? bestWeek.score + '%' : '--'}</div><div class="highlight-en">BEST WEEK AVERAGE</div><div class="highlight-jp">ベストしゅうスコア</div></div>
        <a class="highlight-card wanderers${valueChanged('found') ? ' profile-value-pop' : ''}" href="adventure-profile.html" aria-label="View wanderers found"><div class="highlight-icon">${profileIcon('ghost')}</div><div class="highlight-value">${found}/${total}</div><div class="highlight-en">WANDERERS FOUND</div><div class="highlight-jp">見つけた<ruby>旅人<rt>たびびと</rt></ruby></div></a>
      </div>`;
  }

  function initAccordion(triggerId, bodyId) {
    const trigger = document.getElementById(triggerId);
    const body = document.getElementById(bodyId);
    if (!trigger || !body || trigger.dataset.bound === '1') return;
    trigger.dataset.bound = '1';
    const card = trigger.closest('.profile-progress-card');
    const shimmer = card && card.querySelector('.accordion-shimmer');
    body.setAttribute('aria-hidden', 'true');

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      body.classList.toggle('open', !expanded);
      body.setAttribute('aria-hidden', expanded ? 'true' : 'false');
      if (!expanded && shimmer) {
        shimmer.style.animation = 'none';
        shimmer.offsetHeight;
        shimmer.style.animation = '';
        triggerStarBurst();
      }
    });
  }

  function uMeta(id) {
    if (UNLOCK_META[id]) return UNLOCK_META[id];
    if (id.includes('all_complete')) return { icon:'trophy', jp:'チャンピオン', k:'王者' };
    return { icon:'check', jp:'クリア', k:'完了' };
  }

  function render() {
    const totalBar = document.getElementById('profile-totals');
    const cont = document.getElementById('curr-cards');
    const grid = document.getElementById('unlocks-grid');
    if (!totalBar || !cont || !grid || !window.BoohaAdventure) return;

    const S = BoohaAdventure.scores;
    const U = BoohaAdventure.unlocks;
    const R = BoohaAdventure.registry;
    if (!S || !U || !R) return;

    try {
      renderHighlights();
    } catch (error) {
      showRenderFallback(document.getElementById('profile-highlights'), 'Highlights', error);
    }

    try {
      changedValue(document.getElementById('total-stars'), `${S.weeklyStars()}/${27 * 3}`);
      changedValue(document.getElementById('total-completed'), `${S.weeklyCompleted()}/27`);
      changedValue(document.getElementById('total-alltime'), S.allTimeStars());
    } catch (error) {
      showRenderFallback(totalBar, 'Totals', error);
    }

    try {
      cont.textContent = '';
      R.CURRICULUMS.forEach(curriculum => {
      const info = CURR_INFO[curriculum];
      const summary = S.weeklySummaryFor(curriculum);
      const pct = summary.totalGames > 0 ? Math.round(summary.completed / summary.totalGames * 100) : 0;
      const triggerId = `acc-curr-${curriculum}`;
      const bodyId = `acc-curr-body-${curriculum}`;
      const wrap = document.createElement('div');
      wrap.className = 'accordion-wrap';
      wrap.innerHTML = `
        <div class="profile-progress-card glass curr-card-acc">
          <div class="accordion-shimmer"></div>
          <button class="accordion-trigger" aria-expanded="false" aria-controls="${bodyId}" id="${triggerId}">
            <div class="accordion-header">
              <div class="curr-badge">
                <div class="orb ${info.oc}">${curriculum.toUpperCase()}</div>
                <div>
                  <div class="curr-name-en ${info.cc}">${info.en}</div>
                  <div class="curr-name-jp">${info.jp} <span class="curr-name-k">${furiKanji(info.k)}</span></div>
                </div>
              </div>
              <div class="curr-summary"><span class="curr-stars">${profileIcon('star')} ${summary.stars}/${summary.totalStars}</span><span class="acc-chevron">▼</span></div>
            </div>
          </button>
          <div class="accordion-body" id="${bodyId}" aria-hidden="true">
            <div class="accordion-inner">
              <div class="prog-track"><div class="prog-fill ${info.fc}" data-target="${pct}"></div></div>
              <div class="game-rows">
                ${summary.entries.map(entry => {
                  const gameJP = GAME_JP[entry.id] || { jp: entry.name, k: '' };
                  return `<div class="game-row ${entry.completed ? 'done' : ''}">
                    <span class="row-chk">${profileIcon(entry.completed ? 'check' : 'square')}</span>
                    <div class="row-names"><div class="rn-en">${escapeHTML(entry.name)}</div><div class="rn-jp">${escapeHTML(gameJP.jp)}　${furiKanji(gameJP.k)}</div></div>
                    <div class="row-stars">${starsHTML(entry.stars)}</div>
                    <div class="row-sc">${entry.highScore > 0 ? escapeHTML(entry.highScore) : '—'}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>`;
        cont.appendChild(wrap);
        initAccordion(triggerId, bodyId);
      });

      requestAnimationFrame(() => document.querySelectorAll('.prog-fill[data-target]').forEach(node => {
        node.style.width = `${node.dataset.target}%`;
      }));
    } catch (error) {
      showRenderFallback(cont, 'Curriculum progress', error);
    }

    try {
      grid.textContent = '';
      [...U.getAll()].sort((a, b) => b.unlocked - a.unlocked).forEach(unlock => {
      const meta = uMeta(unlock.id);
      const chip = document.createElement('div');
      chip.className = `u-chip ${unlock.unlocked ? 'earned' : ''}`;
      chip.innerHTML = `
        <span class="u-icon">${profileIcon(unlock.unlocked ? meta.icon : 'lock')}</span>
        <div class="u-text">
          <div class="u-en">${escapeHTML(unlock.name)}</div>
          <div class="u-jp">${escapeHTML(meta.jp)}　<span class="u-k">${furiKanji(meta.k)}</span></div>
          <div class="u-desc">${escapeHTML(unlock.description)}</div>
        </div>`;
        grid.appendChild(chip);
      });
    } catch (error) {
      showRenderFallback(grid, 'Achievements', error);
    }
  }

  function boot() {
    render();
    initAccordion('acc-achievements-trigger', 'acc-achievements-body');
    document.addEventListener('booha:saved', render);
    document.addEventListener('booha:dayRecorded', render);
    document.addEventListener('booha:reset', render);
    document.addEventListener('booha:weeklyReset', render);
  }

  if (window.BOOHA_READY) boot();
  else document.addEventListener('booha:ready', boot, { once: true });
})();
