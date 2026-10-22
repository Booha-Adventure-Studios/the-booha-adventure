/* ══════════════════════════════════════════════════════════════
   game-scorecard.js  —  One shared score card for all 9 games
   (Games Pass 3). Loaded by game.html after game-utils.js.

   Each engine keeps its own results code (score math, emitGameEnd,
   its Replay / Back handlers). theme/game.css hides the engine's old
   results panel, and the engine calls GAME_UTILS.showScorecard(...)
   at the end of showResults(). The card's buttons press the engine's
   own (hidden) Replay / Back buttons, so no reset logic moved.

   Five tiers by correct answers out of 15 (half points supported):
     0–5 TRY AGAIN · 6–10 KEEP GOING · 11–14 GREAT · 15 PERFECT
     LEGEND = 15 and a full combo (every answer right on the first try),
     from opts.run (GAME_UTILS.createRun summary, Games Pass 4).
   Stars are unchanged: BoohaGameRegistry.starsForScore(gameId, pct).
   Rainbow Pass B: earned stars turn RAINBOW for a ready-pace run
   (GAME_UTILS.readyPace on run.pace). Gold = completed, rainbow = prepared.
   The first rainbow ever shows a short explanation; after that a chip.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BoohaScorecard) return;

  var TIERS = {
    try:     { label: 'TRY AGAIN',  sound: 'result_0-5.mp3',   en: "Rough start, but you've got this!", kana: 'だいじょうぶ！もういっかい やってみよう。', kanji: 'だいじょうぶ！もう一回やってみよう。' },
    keep:    { label: 'KEEP GOING', sound: 'result_6-10.mp3',  en: 'Nice effort. You are getting stronger!', kana: 'いいかんじ！どんどん じょうずに なってる。', kanji: 'いい感じ！どんどん上手になってる。' },
    great:   { label: 'GREAT',      sound: 'result_11-14.mp3', en: 'So close to perfect!', kana: 'すごい！あと すこしで パーフェクト。', kanji: 'すごい！あと少しでパーフェクト。' },
    perfect: { label: 'PERFECT',    sound: 'result_15.mp3',    en: 'Every answer right!', kana: 'パーフェクト！ぜんぶ せいかい！', kanji: 'パーフェクト！全部正解！' },
    legend:  { label: 'LEGEND',     sound: 'result_15.mp3',    en: 'Perfect, and not a single slip.', kana: 'レジェンド！いっかいも ミスなし！', kanji: 'レジェンド！一回もミスなし！' }
  };
  var STAR_PATH = 'M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z';
  var CROWN_PATH = 'M2 17h22l-2-12-5.5 5L13 2 9.5 10 4 5z';

  var RAINBOW_SEEN = 'booha_rainbow_seen';
  function rainbowDefs() {
    if (document.getElementById('booha-rainbow-defs')) return;
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.id = 'booha-rainbow-defs'; s.setAttribute('aria-hidden', 'true');
    s.setAttribute('width', '0'); s.setAttribute('height', '0');
    s.style.position = 'absolute';
    s.innerHTML = '<defs><linearGradient id="booha-rainbow" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#ff5f6d"/><stop offset="17%" stop-color="#ffb347"/><stop offset="33%" stop-color="#fff36b"/><stop offset="50%" stop-color="#5cffb0"/><stop offset="67%" stop-color="#5cc8ff"/><stop offset="83%" stop-color="#a77bff"/><stop offset="100%" stop-color="#ff7ad9"/>' +
      '</linearGradient></defs>';
    document.body.appendChild(s);
  }

  var overlay = null;
  var tierAudio = null;
  var timers = [];

  function tierFor(correct, total, fullCombo) {
    var s = total > 0 ? (correct / total) * 15 : 0;
    if (s >= 15) return fullCombo === true ? 'legend' : 'perfect';
    if (s > 10.5) return 'great';
    if (s > 5.5) return 'keep';
    return 'try';
  }

  function starsFor(gameId, pct) {
    var reg = window.BoohaGameRegistry;
    if (reg && typeof reg.starsForScore === 'function') return reg.starsForScore(gameId, pct);
    var t = String(gameId || '').indexOf('speed') > -1 ? [30, 60, 90] : [40, 70, 90];
    return t.reduce(function (n, v) { return n + (pct >= v ? 1 : 0); }, 0);
  }

  function priorBest(gameId) {
    try {
      var scores = window.BoohaAdventure && window.BoohaAdventure.scores;
      if (scores && typeof scores.getHighScore === 'function') {
        var v = Number(scores.getHighScore(gameId));
        return Number.isFinite(v) ? v : 0;
      }
    } catch (_) {}
    return 0;
  }

  function priorWeeklyPoints(gameId) {
    try {
      var scores = window.BoohaAdventure && window.BoohaAdventure.scores;
      if (scores && typeof scores.weeklyPointsForGame === 'function') {
        var v = Number(scores.weeklyPointsForGame(gameId));
        return Number.isFinite(v) ? v : 0;
      }
    } catch (_) {}
    return 0;
  }

  function reduced() { return !!(window.BoohaMotion && window.BoohaMotion.reduced()); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svg(path, cls, size) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', size || '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', cls);
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    s.appendChild(p);
    return s;
  }

  function stopSound() {
    timers.forEach(clearTimeout);
    timers = [];
    if (tierAudio) {
      try { tierAudio.pause(); tierAudio.currentTime = 0; } catch (_) {}
      tierAudio = null;
    }
  }

  function close() {
    stopSound();
    try { window.GAME_UTILS && window.GAME_UTILS.stopReviewAudio && window.GAME_UTILS.stopReviewAudio(); } catch (_) {}
    if (overlay) { overlay.remove(); overlay = null; }
    document.documentElement.classList.remove('bsc-open');
  }

  function press(id) {
    var b = id ? document.getElementById(id) : null;
    if (b) { b.click(); return true; }
    return false;
  }

  /*
   * opts: {
   *   gameId: 'pb:vocab_tap', title: 'Vocabulary Tap',
   *   correct: 13, total: 15, pct: 87,
   *   stats: [{label, value}], reviewItems: [], audioBase,
   *   replayId: 'vt-replay', backId: 'vt-back',
   *   fullCombo (Pass 4), points (Pass 4)
   * }
   */
  function show(opts) {
    opts = opts || {};
    close();
    var cfg = window.GAME_CONFIG || {};
    var U = window.GAME_UTILS;
    var total = Number(opts.total) > 0 ? Number(opts.total) : 15;
    var correct = Math.max(0, Number(opts.correct) || 0);
    var pct = Number.isFinite(Number(opts.pct)) ? Math.round(Number(opts.pct)) : Math.round(correct / total * 100);
    var run = opts.run && typeof opts.run === 'object' ? opts.run : null;
    var fullCombo = opts.fullCombo === true || !!(run && run.fullCombo);
    var key = tierFor(correct, total, fullCombo);
    var tier = TIERS[key];
    var stars = starsFor(opts.gameId, pct);
    var rainbow = stars >= 1 && !!(run && run.pace && U && typeof U.readyPace === 'function' && U.readyPace(run.pace, opts.gameId));
    var before = priorBest(opts.gameId);
    var best = Math.max(before, pct);
    var newBest = pct > before && before > 0;
    var kana = cfg.curriculum === 'pb';
    var calm = reduced();

    overlay = el('div', 'bsc-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bsc-tier');
    var card = el('div', 'bsc-card bsc-tier-' + key);

    var head = el('div', 'bsc-head');
    head.appendChild(el('span', 'bsc-game', opts.title || ''));
    head.appendChild(el('span', 'bsc-week', cfg.weekLabel || ''));
    card.appendChild(head);

    if (key === 'legend') {
      var crown = svg(CROWN_PATH, 'bsc-crown', '0 0 26 20');
      crown.setAttribute('aria-hidden', 'false');
      crown.setAttribute('role', 'img');
      crown.setAttribute('aria-label', 'Booha Crown');
      card.appendChild(crown);
    }

    var starRow = el('div', 'bsc-stars' + (rainbow ? ' bsc-rainbow' : ''));
    starRow.setAttribute('role', 'img');
    starRow.setAttribute('aria-label', stars + ' of 3 stars' + (rainbow ? ', rainbow: ready pace' : ''));
    if (rainbow) rainbowDefs();
    for (var i = 0; i < 3; i++) {
      var st = svg(STAR_PATH, 'bsc-star' + (i === 1 ? ' bsc-star-mid' : '') + (i < stars ? ' on' : ' off'));
      st.style.setProperty('--d', (calm ? 0 : 250 + i * 260) + 'ms');
      starRow.appendChild(st);
    }
    card.appendChild(starRow);
    if (rainbow) {
      var firstRainbow = false;
      try { firstRainbow = !localStorage.getItem(RAINBOW_SEEN); localStorage.setItem(RAINBOW_SEEN, '1'); } catch (_) {}
      var rb = el('div', 'bsc-rainbow-chip' + (firstRainbow ? ' first' : ''));
      rb.appendChild(el('b', null, '🌈 Rainbow stars = ready pace · じゅんび OK'));
      if (firstRainbow) {
        rb.appendChild(el('span', null, kana
          ? 'じゅんびして きたね！ さいしょで せいかい、いい ペース。'
          : '準備してきたね！最初で正解、いいペース。'));
        rb.appendChild(el('span', null, 'You came ready: right first try, at a steady pace.'));
      }
      card.appendChild(rb);
    }

    var h = el('h2', 'bsc-tier', tier.label);
    h.id = 'bsc-tier';
    card.appendChild(h);
    card.appendChild(el('p', 'bsc-jp', kana ? tier.kana : tier.kanji));
    card.appendChild(el('p', 'bsc-en', tier.en));

    var score = el('div', 'bsc-score');
    var shown = Math.round(correct * 2) / 2;
    score.appendChild(el('b', 'bsc-correct', shown + ' / ' + total));
    score.appendChild(el('span', 'bsc-pct', pct + '%'));
    // NEW BEST only for beating a real earlier score; a first run is celebrated
    // as a start, never presented as a record.
    if (before <= 0) score.appendChild(el('span', 'bsc-best bsc-first', 'FIRST SCORE · はじめて'));
    else score.appendChild(el('span', newBest ? 'bsc-best bsc-new' : 'bsc-best', newBest ? 'NEW BEST!' : 'Best ' + best + '%'));
    card.appendChild(score);

    var pointsValue = run ? run.points : opts.points;
    if (pointsValue != null && Number.isFinite(Number(pointsValue))) {
      // Points reward knowing it first try, and quickly. Stars never depend on them.
      var weekBest = priorWeeklyPoints(opts.gameId);
      var pv = Math.round(Number(pointsValue));
      var pts = el('div', 'bsc-points');
      pts.appendChild(el('span', 'bsc-points-label', 'POINTS'));
      var pvEl = el('b', 'bsc-points-value', calm ? pv.toLocaleString('en-US') : '0');
      pts.appendChild(pvEl);
      if (weekBest <= 0) pts.appendChild(el('span', 'bsc-best bsc-first', 'FIRST SCORE · はじめて'));
      else if (pv > weekBest) pts.appendChild(el('span', 'bsc-best bsc-new', 'NEW WEEK BEST!'));
      else pts.appendChild(el('span', 'bsc-best', 'Week best ' + weekBest.toLocaleString('en-US')));
      card.appendChild(pts);
      if (!calm && pv > 0) {
        // Count up while the stars land.
        var t0 = null, dur = 900;
        var step = function (t) {
          if (!overlay) return;
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / dur);
          pvEl.textContent = Math.round(pv * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US');
          if (k < 1) requestAnimationFrame(step);
        };
        timers.push(setTimeout(function () { requestAnimationFrame(step); }, 300));
      }
      if (run) {
        var chips = el('div', 'bsc-chips');
        chips.appendChild(el('span', 'bsc-chip', 'Best combo ' + run.maxCombo));
        chips.appendChild(el('span', 'bsc-chip', 'Sharp ' + run.sharp));
        if (fullCombo) chips.appendChild(el('span', 'bsc-chip bsc-chip-crown', '♛ Crown'));
        card.appendChild(chips);
      }
    }

    var details = el('div', 'bsc-details');
    card.appendChild(details);
    if (U && typeof U.renderResultDetails === 'function') {
      U.renderResultDetails(details, { stats: opts.stats || [], reviewItems: opts.reviewItems || [], audioBase: opts.audioBase || cfg.audioBase || '' });
    }

    var actions = el('div', 'bsc-actions');
    var again = el('button', 'bsc-btn bsc-btn-primary', 'もう一回');
    again.type = 'button';
    again.appendChild(el('small', null, 'Play again'));
    var menu = el('button', 'bsc-btn bsc-btn-ghost', 'メニュー');
    menu.type = 'button';
    menu.appendChild(el('small', null, 'Menu'));
    again.addEventListener('click', function () {
      var id = opts.replayId;
      close();
      press(id);
    });
    menu.addEventListener('click', function () {
      stopSound();
      if (!press(opts.backId) && cfg.navTarget) {
        window.location.assign(cfg.navTarget + '?week=' + encodeURIComponent(cfg.weekParam || ''));
      }
    });
    actions.appendChild(again);
    actions.appendChild(menu);
    card.appendChild(actions);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.documentElement.classList.add('bsc-open');
    // Focus the card itself so screen readers land in the dialog without a
    // focus ring flashing on the button for touch players.
    card.setAttribute('tabindex', '-1');
    try { card.focus({ preventScroll: true }); } catch (_) { card.focus(); }

    // One rising ding per earned star, then the tier sound.
    var playSFX = U && typeof U.playSFX === 'function' ? U.playSFX.bind(U) : null;
    if (playSFX && !calm) {
      for (var k = 0; k < stars; k++) {
        (function (k) {
          timers.push(setTimeout(function () { playSFX('ding', { rate: 1 + k * 0.12 }); }, 250 + k * 260));
        })(k);
      }
    }
    var soundAt = calm ? 0 : 250 + stars * 260 + 120;
    if (rainbow && playSFX && !calm) {
      // Rainbow: a quick sparkling run above the star dings.
      [2, 2.25, 2.52, 3].forEach(function (r, n) {
        timers.push(setTimeout(function () { playSFX('ding', { rate: r, volume: 0.55 }); }, 250 + stars * 260 + n * 70));
      });
      soundAt += 260;
    }
    if (key === 'legend' && playSFX) {
      // LEGEND: a bright rising run of dings on top of the PERFECT stinger.
      [1.5, 1.68, 1.89, 2].forEach(function (r, n) {
        timers.push(setTimeout(function () { playSFX('ding', { rate: r, volume: 0.8 }); }, soundAt + 500 + n * 160));
      });
    }
    if (cfg.sfxBase && tier.sound) {
      timers.push(setTimeout(function () {
        try {
          tierAudio = new Audio(cfg.sfxBase + tier.sound);
          tierAudio.setAttribute('playsinline', '');
          tierAudio.setAttribute('webkit-playsinline', '');
          var p = tierAudio.play();
          if (p && p.catch) p.catch(function () {});
        } catch (_) {}
      }, soundAt));
    }
    return { tier: key, stars: stars, rainbow: rainbow, close: close };
  }

  var api = { show: show, close: close, tierFor: tierFor, TIERS: TIERS };
  window.BoohaScorecard = api;
  if (window.GAME_UTILS) {
    window.GAME_UTILS.showScorecard = function (opts) { return show(opts); };
  }
})();
