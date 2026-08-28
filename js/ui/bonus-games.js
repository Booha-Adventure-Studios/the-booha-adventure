/**
 * Shared Bonus Games renderer for the profile pages.
 *
 * Bonus games keep their weekly unlock rules and score records, but live on
 * the Adventure profile as a small arcade shelf rather than inside the
 * learning progress log.
 */
(() => {
  'use strict';

  const BONUS_GAME_META = {
    booha_invaders:    { icon:'assets/invaders/bug-1.webp',                         jp:'ブーハー・インベーダーズ',       k:'侵略者' },
    booha_blocks:      { icon:'assets/blocks/red_block.png',                       jp:'ブーハー・ブロック',             k:'積木' },
    feed_booha:        { icon:'assets/feed/boo-eat.png',                           jp:'ブーハーにキャンディをあげよう', k:'給食' },
    booha_destruction: { icon:'assets/destruction/optimized/booha_helmet_256.png', jp:'ブーハー・デストラクション',     k:'破壊' },
  };

  const KANJI_READINGS = {
    '侵略者': [['侵略者', 'しんりゃくしゃ']],
    '積木': [['積木', 'つみき']],
    '給食': [['給食', 'きゅうしょく']],
    '破壊': [['破壊', 'はかい']],
  };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
  }

  function furiKanji(value) {
    const parts = KANJI_READINGS[value];
    if (!parts || !window.UtsuFurigana) return value || '';
    return parts.map(([kanji, reading]) => window.UtsuFurigana.rb(kanji, reading)).join('');
  }

  function render(host = document.getElementById('games-grid')) {
    const R = window.BoohaAdventure && BoohaAdventure.registry;
    const S = window.BoohaAdventure && BoohaAdventure.scores;
    const U = window.BoohaAdventure && BoohaAdventure.unlocks;
    if (!host || !R || !S || !U) return false;

    host.textContent = '';
    R.getBonusGames().forEach(game => {
      const meta = BONUS_GAME_META[game.id] || {};
      const unlocked = U.isBonusGameUnlocked(game.id);
      const entry = S.getEntry(game.saveId);
      const played = entry.attempts > 0;
      const scoreText = !unlocked ? 'Locked this week' : played ? entry.highScore.toLocaleString() : 'Not played';
      const chip = document.createElement(unlocked ? 'a' : 'div');
      chip.className = `g-chip ${unlocked ? 'unlocked' : ''}`;
      if (unlocked) chip.href = game.file;
      chip.setAttribute('aria-label', `${game.name}: ${scoreText}`);
      chip.innerHTML = `
        <img class="g-icon" src="${escapeHTML(meta.icon || '')}" alt="" loading="lazy">
        <div class="g-text">
          <div class="g-en">${escapeHTML(game.name)}</div>
          <div class="g-jp">${escapeHTML(meta.jp || '')}　<span class="g-k">${furiKanji(meta.k || '')}</span></div>
          <div class="g-score">${escapeHTML(scoreText)}</div>
        </div>`;
      host.appendChild(chip);
    });
    return true;
  }

  function boot() {
    if (!document.getElementById('games-grid')) return;
    render();
    document.addEventListener('booha:saved', () => render());
    document.addEventListener('booha:weeklyReset', () => render());
    document.addEventListener('booha:newWeek', () => render());
  }

  window.BoohaBonusGames = Object.freeze({ render, boot });
  if (window.BOOHA_READY) boot();
  else document.addEventListener('booha:ready', boot, { once: true });
})();
