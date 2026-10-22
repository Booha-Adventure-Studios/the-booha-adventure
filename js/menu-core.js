/* ══════════════════════════════════════════════════════════════
   menu-core.js — shared curriculum game menu (Games Pass 5)

   Each curriculum/pb|br|bc/games-index.html is a thin shell: the token
   gate, the core save scripts, <html data-curriculum="…"> and the nine
   <a class="tile" data-game="…"> links in maze order. This file upgrades
   those links in place into the new menu, so the shells keep every
   contract (tile ids, launch URL, back-to-maze handoff, sw.js paths).

   Stars are shown for the LIVE curriculum week only (weekly.gameStars via
   weeklyStarsForGame), exactly like the old overlay; any other week shows
   empty sockets and a "practice" note.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var BASE = '/the-booha-adventure';

  /* Placeholder art: swap these paths for the new grove backgrounds and
     tree art when they are ready (keep each image under 700 KB). */
  var MENU_ART = {
    pb: { title: 'Pre-Boo', jp: 'プレ・ブー ゲームズ', tree: 'assets/img/pre-boo.webp', bg: 'assets/img/maze.webp', bgPos: 'center 30%' },
    br: { title: 'Boo-riculum', jp: 'ブー・リキュラム ゲームズ', tree: 'assets/img/boo-tree.webp', bg: 'assets/img/profile/adventure-trail-forest.webp', bgPos: 'center 40%' },
    bc: { title: 'Boo-Continuum', jp: 'ブー・コンティニュアム ゲームズ', tree: 'assets/img/cont-tree.webp', bg: 'assets/img/maze.webp', bgPos: 'center 75%' },
  };
  var LANES = [
    { en: 'WORDS', jp: 'たんご', from: 0 },
    { en: 'SENTENCES', jp: 'ぶん', from: 3 },
    { en: 'LISTEN', jp: 'きく', from: 6 },
  ];
  var LINES = {
    'vocab-tap': 'Match them up!', 'spell-word': "Let's spell!", 'vocab-speed': 'Fast, fast!',
    'sentence-tap': 'Tap the pairs!', 'sentence-order': 'Line them up!', 'sentence-speed': 'Zoom!',
    'say-word': 'Listen closely!', 'say-sentence': 'Ears ready?', 'ask-question': 'Listen and choose!',
    'booha-bites': 'I ate a word! Find it!', 'echo': 'Listen, then type it!', 'week-boss': 'Beat the boss for the week crown!',
  };
  var MONTHS = { jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', jun: 'June',
    jul: 'July', aug: 'August', sep: 'September', oct: 'October', nov: 'November', dec: 'December' };
  var STAR = 'M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z';
  var CROWN = 'M2 17h22l-2-12-5.5 5L13 2 9.5 10 4 5z';

  /* ── Pure helpers (also used by tests/weekly-star-display.test.cjs) ── */
  function liveWeekSlug(curr, calendar) {
    var current = calendar && calendar.getCurrentCurriculumWeek ? calendar.getCurrentCurriculumWeek() : null;
    return current ? curr + '_' + current.monthSlug.slice(0, 3) + '_w' + current.weekNumber : '';
  }
  function saveIdFor(curr, game) { return curr + ':' + String(game).replace(/-/g, '_'); }
  /* Stars for one tile: weekly stars on the live week, otherwise 0. */
  function tileStars(curr, week, game, calendar, scores) {
    if (!week || week !== liveWeekSlug(curr, calendar)) return 0;
    if (!scores || typeof scores.weeklyStarsForGame !== 'function') return 0;
    var n = 0;
    try { n = scores.weeklyStarsForGame(saveIdFor(curr, game)) || 0; } catch (_) { n = 0; }
    return Math.max(0, Math.min(3, n));
  }
  function weekLabel(week) {
    var p = String(week || '').split('_');
    var m = MONTHS[p[1]] || p[1] || '';
    var n = (p[2] || '').replace('w', '');
    return { en: m + ' Week ' + n, jp: (Object.keys(MONTHS).indexOf(p[1]) + 1) + '月 第' + n + '週' };
  }

  window.BoohaMenu = { liveWeekSlug: liveWeekSlug, tileStars: tileStars, saveIdFor: saveIdFor, weekLabel: weekLabel, MENU_ART: MENU_ART };
  if (typeof document === 'undefined' || !document.documentElement || !document.body) return;

  var root = document.documentElement;
  var CURR = root.getAttribute('data-curriculum');
  var art = MENU_ART[CURR];
  if (!art) return;
  var week = new URLSearchParams(window.location.search).get('week') || '';
  if (!/^(pb|br|bc)_[a-z]{3}_w[1-5]$/.test(week)) { window.location.assign(BASE + '/index.html#hub'); return; }
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── Sound: tiny synthesized UI cues on the shared engine (js/booha-sfx.js) ── */
  var MUTE_KEY = 'booha_menu_sfx_muted';
  var muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) {}
  var lastHover = 0;
  function ctx() {
    var S = window.BoohaSFX;
    var c = S && S.context ? S.context() : null;
    return c && c.state === 'running' ? c : null;
  }
  function tone(c, f, at, dur, type, vol) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + dur + 0.05);
  }
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  var BASE_HZ = { pb: 523.25, br: 392, bc: 587.33 }[CURR] || 523.25;
  function cue(kind, i) {
    if (muted) return;
    var c = ctx(); if (!c) return;
    var t = c.currentTime + 0.01, f = BASE_HZ * Math.pow(2, PENTA[(i || 0) % 9] / 12);
    if (kind === 'hover') { tone(c, f, t, 0.28, 'sine', 0.12); tone(c, f * 4, t, 0.05, 'sine', 0.02); }
    else if (kind === 'select') { tone(c, f, t, 0.22, 'sine', 0.16); tone(c, f * 2, t + 0.07, 0.4, 'sine', 0.13); tone(c, f * 3, t + 0.14, 0.45, 'triangle', 0.04); }
    else if (kind === 'back') { tone(c, BASE_HZ * 1.5, t, 0.18, 'sine', 0.14); tone(c, BASE_HZ, t + 0.09, 0.3, 'sine', 0.14); }
    else if (kind === 'toggle') { tone(c, BASE_HZ * 2, t, 0.12, 'sine', 0.1); }
  }

  /* ── Build ── */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function svg(path, cls, box) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    s.setAttribute('viewBox', box || '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', cls);
    p.setAttribute('d', path); s.appendChild(p); return s;
  }
  function icon(d, w) { var s = svg(d, '', '0 0 24 24'); s.setAttribute('width', w || 20); s.setAttribute('height', w || 20);
    var p = s.firstChild; p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2.4');
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); return s; }

  var tiles = Array.prototype.slice.call(document.querySelectorAll('.bm-static .tile[data-game]'));
  var mainEl = document.querySelector('.bm-root');
  if (!mainEl || tiles.length !== 9) return;

  var bg = el('div', 'bm-bg');
  bg.style.backgroundImage = 'url("' + BASE + '/' + art.bg + '")';
  bg.style.setProperty('--bm-bg-pos', art.bgPos);
  document.body.insertBefore(el('div', 'bm-shade'), document.body.firstChild);
  document.body.insertBefore(bg, document.body.firstChild);
  if (!reducedMotion) {
    [[12, 30, 7, 0], [26, 70, 9, 2], [48, 22, 8, 4], [70, 60, 10, 1], [84, 34, 7, 3], [60, 84, 11, 5]].forEach(function (f) {
      var d = el('div', 'bm-fly');
      d.style.left = f[0] + 'vw'; d.style.top = f[1] + 'vh';
      d.style.setProperty('--t', f[2] + 's'); d.style.setProperty('--d', f[3] + 's');
      document.body.appendChild(d);
    });
  }

  var wl = weekLabel(week);
  var head = el('header', 'bm-head');
  var back = el('button', 'bm-back'); back.type = 'button'; back.setAttribute('aria-label', 'Back to the maze / もどる');
  back.appendChild(icon('M15 5l-7 7 7 7', 20));
  var tree = el('img', 'bm-tree'); tree.src = BASE + '/' + art.tree; tree.alt = ''; tree.decoding = 'async';
  var treeWrap = el('span', 'bm-tree-wrap'); treeWrap.appendChild(tree);   // the Week Boss crown sits on the tree
  var titles = el('div', 'bm-titles');
  titles.appendChild(el('h1', 'bm-title', art.title));
  titles.appendChild(el('div', 'bm-sub', art.jp + ' · ' + wl.en + ' · ' + wl.jp));
  var tools = el('div', 'bm-tools');
  var tally = el('div', 'bm-tally');
  var booha = el('div', 'bm-booha');
  var bimg = el('img'); bimg.src = BASE + '/assets/img/booha_ghost.webp'; bimg.alt = ''; bimg.decoding = 'async'; bimg.loading = 'lazy';
  var bubble = el('div', 'bm-bubble', 'Pick a game! / ゲームをえらぼう！');
  booha.appendChild(bimg); booha.appendChild(bubble);
  var sound = el('button', 'bm-sound'); sound.type = 'button';
  sound.appendChild(icon('M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7', 20));
  var paintSound = function () { sound.setAttribute('aria-pressed', muted ? 'false' : 'true'); sound.setAttribute('aria-label', muted ? 'Sound off / おと なし' : 'Sound on / おと あり'); };
  paintSound();
  tools.appendChild(tally); tools.appendChild(booha); tools.appendChild(sound);
  head.appendChild(back); head.appendChild(treeWrap); head.appendChild(titles); head.appendChild(tools);

  var lanesEl = el('div', 'bm-lanes');
  LANES.forEach(function (L) {
    var lane = el('section', 'bm-lane');
    lane.setAttribute('aria-label', L.en);
    var lab = el('div', 'bm-lane-label'); lab.appendChild(el('b', null, L.en)); lab.appendChild(el('span', null, L.jp));
    lane.appendChild(lab);
    for (var k = 0; k < 3; k++) lane.appendChild(tiles[L.from + k]);
    lanesEl.appendChild(lane);
  });

  // Extra games (Games Pass 6+): built from the registry, outside the nine.
  // They use data-extra (not data-game) and their own saveId, so nothing that
  // counts the nine — this menu's tally included — ever sees them.
  var R = window.BoohaGameRegistry;
  var extras = R && typeof R.getExtraForCurriculum === 'function' ? R.getExtraForCurriculum(CURR) : [];
  var extraTiles = [];
  if (extras.length) {
    var xl = el('section', 'bm-lane bm-lane-extra');
    xl.setAttribute('aria-label', 'Extra games');
    var xlab = el('div', 'bm-lane-label');
    xlab.appendChild(el('b', null, 'EXTRA'));
    xlab.appendChild(el('span', null, 'おまけ'));
    xl.appendChild(xlab);
    extras.forEach(function (g) {
      var a = el('a', 'tile tile-extra', g.name);
      a.setAttribute('data-extra', g.gameKey);
      if (g.hira) a.setAttribute('data-hira', g.hira);
      a._saveId = g.saveId;
      if (g.boss) { a._boss = true; a.classList.add('tile-boss'); }
      xl.appendChild(a);
      extraTiles.push(a);
    });
    var note = el('p', 'bm-extra-note', 'Extra games don’t change the 9-game bonus unlock. · ボーナスの じょうけんは 9つの ゲームだけ');
    xl.appendChild(note);
    lanesEl.appendChild(xl);
  }

  // Upgrade each static link in place (keeps .tile[data-game] for every consumer).
  var allTiles = tiles.concat(extraTiles);
  allTiles.forEach(function (t, i) {
    var name = t.textContent.trim(), hira = t.getAttribute('data-hira') || '';
    var gameKey = t.dataset.game || t.dataset.extra;
    t.textContent = '';
    t.style.setProperty('--i', i);
    t.href = BASE + '/game.html?week=' + encodeURIComponent(week) + '&game=' + encodeURIComponent(gameKey);
    var stars = el('div', 'bm-stars'); stars.setAttribute('role', 'img');
    for (var s = 0; s < 3; s++) stars.appendChild(svg(STAR, 'bm-star off' + (s === 1 ? ' mid' : '')));
    t.appendChild(stars);
    t.appendChild(el('span', 'bm-name', name));
    if (hira) t.appendChild(el('span', 'bm-hira', hira));
    t.appendChild(el('span', 'bm-best', ''));
    t._bm = { name: name, stars: stars, best: t.lastChild };
  });

  var staticNav = document.querySelector('.bm-static');
  mainEl.insertBefore(head, staticNav);
  mainEl.insertBefore(lanesEl, staticNav);
  if (staticNav) staticNav.remove();
  if (!reducedMotion) { mainEl.classList.add('bm-enter'); setTimeout(function () { mainEl.classList.remove('bm-enter'); }, 1400); }

  /* ── Fill from the save (after booha:ready) ── */
  function paint() {
    var BA = window.BoohaAdventure, scores = BA && BA.scores, live = week === liveWeekSlug(CURR, window.CALENDAR);
    var total = 0, atTwo = 0, crowns = 0, firstOpen = -1;
    var playedIds = {};   // any score this week, even 0 (the Week Boss counts these)
    if (live) { try { playedIds = (BA.save.load().weekly || {}).gameScores || {}; } catch (_) {} }
    tiles.forEach(function (t, i) {
      var game = t.dataset.game, id = saveIdFor(CURR, game);
      var n = tileStars(CURR, week, game, window.CALENDAR, scores);
      total += n; if (n >= 2) atTwo++;
      var starEls = t._bm.stars.children;
      for (var s = 0; s < 3; s++) starEls[s].setAttribute('class', 'bm-star ' + (s < n ? 'on' : 'off') + (s === 1 ? ' mid' : ''));
      t._bm.stars.setAttribute('aria-label', n + ' of 3 stars this week');
      t.classList.toggle('gold3', n === 3);
      var crowned = false, pts = 0;
      if (live && scores) {
        try { crowned = !!(scores.weeklyCrownForGame && scores.weeklyCrownForGame(id)); } catch (_) {}
        try { pts = (scores.weeklyPointsForGame && scores.weeklyPointsForGame(id)) || 0; } catch (_) {}
      }
      var oldCrown = t.querySelector('.bm-crown'); if (oldCrown) oldCrown.remove();
      if (crowned) { crowns++; var c = svg(CROWN, 'bm-crown', '0 0 26 20'); c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Crown'); t.insertBefore(c, t.firstChild); }
      var played = Object.prototype.hasOwnProperty.call(playedIds, id);
      t._bm.best.textContent = !live ? '' : pts > 0 ? 'BEST ' + pts.toLocaleString('en-US') : (n || played ? '' : 'NOT PLAYED YET');
      var oldTag = t.querySelector('.bm-tag'); if (oldTag) oldTag.remove();
      if (live && n === 0 && !played && firstOpen < 0) firstOpen = i;
    });
    if (firstOpen >= 0) tiles[firstOpen].appendChild(el('span', 'bm-tag', 'Try me!'));

    // Extra tiles: same live-week rule, their own save ids, never in the tally.
    extraTiles.forEach(function (t) {
      var id = t._saveId, n = 0, crowned = false, pts = 0;
      if (live && scores) {
        try { n = Math.max(0, Math.min(3, scores.weeklyStarsForGame(id) || 0)); } catch (_) {}
        try { crowned = !!(scores.weeklyCrownForGame && scores.weeklyCrownForGame(id)); } catch (_) {}
        try { pts = (scores.weeklyPointsForGame && scores.weeklyPointsForGame(id)) || 0; } catch (_) {}
      }
      var starEls = t._bm.stars.children;
      for (var s = 0; s < 3; s++) starEls[s].setAttribute('class', 'bm-star ' + (s < n ? 'on' : 'off') + (s === 1 ? ' mid' : ''));
      t._bm.stars.setAttribute('aria-label', n + ' of 3 stars this week');
      t.classList.toggle('gold3', n === 3);
      var oc = t.querySelector('.bm-crown'); if (oc) oc.remove();
      if (crowned) { var cr = svg(CROWN, 'bm-crown', '0 0 26 20'); cr.setAttribute('role', 'img'); cr.setAttribute('aria-label', 'Crown'); t.insertBefore(cr, t.firstChild); }
      t._bm.best.textContent = live && pts > 0 ? 'BEST ' + pts.toLocaleString('en-US') : '';
      var ot = t.querySelector('.bm-tag'); if (ot) ot.remove();
      if (t._boss) {
        // Week Boss: opens once all nine are played this week, live week only.
        var played = 0;
        try { played = live && scores && scores.weeklyPlayedFor ? Math.min(9, scores.weeklyPlayedFor(CURR)) : 0; } catch (_) {}
        var open = live && played >= 9;
        t._bossLeft = 9 - played;
        t.classList.toggle('is-locked', !open);
        if (open) t.removeAttribute('aria-disabled'); else t.setAttribute('aria-disabled', 'true');
        if (!open) t._bm.best.textContent = live ? played + ' / 9 played · あと ' + (9 - played) : 'This week only · こんしゅうだけ';
        else if (pts === 0) t.appendChild(el('span', 'bm-tag', 'OPEN!'));
        var oldTc = treeWrap.querySelector('.bm-tree-crown'); if (oldTc) oldTc.remove();
        if (live && crowned) {
          var tc = svg(CROWN, 'bm-tree-crown', '0 0 26 20'); tc.setAttribute('role', 'img'); tc.setAttribute('aria-label', 'Week crown: boss beaten');
          treeWrap.appendChild(tc);
        }
        return;
      }
      if (live && n === 0 && pts === 0) t.appendChild(el('span', 'bm-tag', 'NEW'));
    });

    tally.textContent = '';
    if (!live) {
      tally.className = 'bm-practice';
      tally.textContent = 'Practice week · れんしゅう — stars count on this week’s page';
      bubble.textContent = 'Practice any game! / れんしゅうしよう！';
      return;
    }
    tally.className = 'bm-tally';
    var st = el('div', 'bm-tally-stars');
    var big = el('div', 'bm-tally-big', '★ ' + total); big.appendChild(el('small', null, ' / 27'));
    st.appendChild(big); st.appendChild(el('div', 'bm-tally-lab', 'THIS WEEK · こんしゅう'));
    tally.appendChild(st);
    tally.appendChild(el('div', 'bm-tally-rule'));
    var bonus = el('div', 'bm-tally-bonus');
    var unlocked = false;
    try { var w = BA.save.load().weekly || {}; unlocked = !!(w.unlockedBonusGames && w.unlockedBonusGames.booha_invaders); } catch (_) {}
    var row = el('div', 'bm-row'); row.appendChild(el('span', null, 'Bonus games'));
    row.appendChild(el('b', null, unlocked ? 'Open ✓' : atTwo + ' / 9 at ★★'));
    var bar = el('div', 'bm-bar'); var fill = el('i'); bar.appendChild(fill);
    bonus.appendChild(row); bonus.appendChild(bar);
    if (crowns) bonus.appendChild(el('div', 'bm-crowns', '♛ ' + crowns + (crowns === 1 ? ' crown' : ' crowns')));
    tally.appendChild(bonus);
    requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.setProperty('--p', unlocked ? 1 : atTwo / 9); }); });
    bubble.textContent = total === 27 ? 'Perfect week! 27 stars! / パーフェクト！'
      : unlocked ? 'Bonus games are open! / ボーナス オープン！'
      : (9 - atTwo) + ' more at ★★ for bonus games! / あと ' + (9 - atTwo) + ' つ！';
  }
  paint();
  document.addEventListener('booha:ready', paint);
  document.addEventListener('booha:scoreSubmitted', paint);

  /* ── Interaction ── */
  var locked = false;
  var swipe = document.getElementById('swipeScreen');
  allTiles.forEach(function (t, i) {
    var key = t.dataset.game || t.dataset.extra;
    t.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      bubble.textContent = LINES[key] || t._bm.name;
      var now = Date.now(); if (now - lastHover > 70) { lastHover = now; cue('hover', i); }
    });
    t.addEventListener('focus', function () { bubble.textContent = LINES[key] || t._bm.name; });
    t.addEventListener('click', function (e) {
      e.preventDefault();
      if (t.classList.contains('is-locked')) {
        bubble.textContent = t._bossLeft > 0
          ? 'Play all 9 games first! あと ' + t._bossLeft + 'つ！'
          : 'The boss is only on this week’s page! / こんしゅうだけ！';
        t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope');
        return;
      }
      if (locked) return;
      locked = true;
      cue('select', i);
      t.classList.add('is-picked');
      var href = t.href;
      setTimeout(function () { if (swipe) swipe.classList.add('go'); }, reducedMotion ? 0 : 220);
      setTimeout(function () { window.location.href = href; }, reducedMotion ? 60 : 420);
    });
  });
  back.addEventListener('click', function () {
    if (locked) return;
    locked = true;
    cue('back');
    sessionStorage.setItem('booha_reopen_popup', '1');
    sessionStorage.setItem('booha_return_week', week);
    if (swipe) swipe.classList.add('go');
    setTimeout(function () { window.location.href = BASE + '/maze.html?week=' + encodeURIComponent(week); }, reducedMotion ? 60 : 320);
  });
  sound.addEventListener('click', function () {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (_) {}
    paintSound();
    if (!muted) setTimeout(function () { cue('toggle'); }, 30);
  });
  // Coming back from a game with the browser Back button (bfcache).
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { locked = false; if (swipe) swipe.classList.remove('go'); allTiles.forEach(function (t) { t.classList.remove('is-picked'); }); paint(); }
  });
})();
