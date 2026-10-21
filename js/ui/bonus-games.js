/**
 * Shared Bonus Games renderer for the profile pages.
 *
 * Bonus games keep their weekly unlock rules and score records, but live on
 * the Adventure profile as a neon arcade: one cabinet per game, with its
 * high score and a PLAY button once this week's maze gate is open.
 */
(() => {
  'use strict';

  // Display copy for each bonus game. The Family Room is called "Akiya" in
  // the game itself, so the arcade uses that name and its flashlight art.
  const BONUS_GAME_META = {
    booha_invaders:    { icon:'assets/invaders/bug-1.webp',                         label:'INVADERS',    jp:'ブーハー・インベーダーズ',  neon:'#b6ff4a' },
    booha_blocks:      { icon:'assets/blocks/red_block.webp',                       label:'BLOCKS',      jp:'ブーハー・ブロック',        neon:'#ff5f6d' },
    feed_booha:        { icon:'assets/feed/boo-eat.webp',                          label:'FEED BOOHA',  jp:'キャンディを あげよう',      neon:'#ffe45c' },
    booha_destruction: { icon:'assets/destruction/optimized/booha_helmet_256.webp', label:'DESTRUCTION', jp:'ブーハー・デストラクション', neon:'#3de8ff' },
    family_room:       { icon:'assets/img/family-room/flashlight.webp',             label:'AKIYA',       jp:'あきや の かんさつ',          neon:'#ff9fe0', name:'Akiya', wide:true },
  };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
  }

  function shelfStatus(game) {
    const meta = game.shelfMeta || {};
    if (game.id !== 'family_room') return meta.status || 'Case file';
    try {
      const data = window.BoohaAdventure?.save?.load?.() || {};
      const familyRoom = data.weekly?.worlds?.familyRoom;
      const sealed = Boolean(Object.keys(familyRoom?.completedCases || {}).length || data.weekly?.completedGames?.[game.saveId]);
      return sealed ? (meta.statusCompleted || meta.status || 'Case file') : (meta.status || 'Case file');
    } catch (_) {
      return meta.status || 'Case file';
    }
  }

  /** Best curriculum's count of maze games at two stars or more this week. */
  function twoStarProgress(R) {
    try {
      const data = window.BoohaAdventure?.save?.load?.() || {};
      const stars = data.weekly?.gameStars || {};
      let best = 0;
      let total = 9;
      (R.CURRICULUMS || ['pb', 'br', 'bc']).forEach(curr => {
        const games = R.getForCurriculum(curr) || [];
        total = games.length || total;
        best = Math.max(best, games.filter(g => (stars[g.saveId] || 0) >= 2).length);
      });
      return { best, total };
    } catch (_) {
      return { best: 0, total: 9 };
    }
  }

  function renderGate(open, R) {
    const status = document.getElementById('arcade-status');
    if (status) {
      status.textContent = open ? 'OPEN!' : 'LOCKED';
      status.classList.toggle('open', open);
    }
    const note = document.getElementById('bonus-games-requirement');
    const progress = document.getElementById('arcade-progress');
    if (note) note.hidden = open;
    if (progress) {
      progress.hidden = open;
      if (!open) {
        const p = twoStarProgress(R);
        const fill = progress.querySelector('.arcade-progress-fill');
        const text = progress.querySelector('.arcade-progress-text');
        if (fill) fill.style.width = `${Math.round(p.best / p.total * 100)}%`;
        if (text) text.textContent = `★★ ${p.best} / ${p.total} · あと ${Math.max(0, p.total - p.best)}つ`;
      }
    }
  }

  function render(host = document.getElementById('games-grid')) {
    const R = window.BoohaAdventure && BoohaAdventure.registry;
    const S = window.BoohaAdventure && BoohaAdventure.scores;
    const U = window.BoohaAdventure && BoohaAdventure.unlocks;
    if (!host || !R || !S || !U) return false;

    host.textContent = '';
    let anyOpen = false;
    R.getBonusGames().forEach(game => {
      const meta = BONUS_GAME_META[game.id] || { label: game.name, jp: '', neon: '#3de8ff' };
      const unlocked = U.isBonusGameUnlocked(game.id);
      if (unlocked) anyOpen = true;
      const entry = S.getEntry(game.saveId);
      const played = entry.attempts > 0;
      const name = meta.name || game.name;
      const scoreText = !unlocked ? 'LOCKED'
        : game.shelfMeta?.showScore === false ? shelfStatus(game).replace('CASE FILE', 'CASE')
        : played ? `HI ${entry.highScore.toLocaleString()}` : 'まだ';
      const cab = document.createElement(unlocked ? 'a' : 'div');
      cab.className = `arcade-cab${unlocked ? ' unlocked' : ' locked'}${meta.wide ? ' wide' : ''}`;
      cab.style.setProperty('--neon', meta.neon);
      if (unlocked) cab.href = game.file;
      cab.setAttribute('aria-label', `${name}: ${unlocked ? scoreText + ', play' : 'locked this week'}`);
      cab.innerHTML = `
        <span class="arcade-marquee">${escapeHTML(meta.label)}</span>
        <span class="arcade-screen"><img src="${escapeHTML(meta.icon || '')}" alt="" loading="lazy" decoding="async"></span>
        <span class="arcade-jp">${escapeHTML(meta.jp)}</span>
        <span class="arcade-foot">
          <span class="arcade-score">${escapeHTML(scoreText)}</span>
          <span class="arcade-play">${unlocked ? 'PLAY ▶' : 'まだ'}</span>
        </span>`;
      host.appendChild(cab);
    });
    renderGate(anyOpen, R);
    return true;
  }

  function boot() {
    if (!document.getElementById('games-grid')) return;
    render();
    document.addEventListener('booha:saved', () => render());
    document.addEventListener('booha:weeklyReset', () => render());
    document.addEventListener('booha:newWeek', () => render());
  }

  window.BoohaBonusGames = Object.freeze({ render, boot, META: BONUS_GAME_META });
  if (window.BOOHA_READY) boot();
  else document.addEventListener('booha:ready', boot, { once: true });
})();
