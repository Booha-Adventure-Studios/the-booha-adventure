/**
 * medal-toast.js
 * The Booha Adventure — "something happened!" popups for weekly medals and
 * level-ups, shown at natural breaks (hub, maze, game results, profile).
 *
 * Non-blocking: a banner drops in at the top, plays for a few seconds, and
 * queues if several arrive together. Tap or Escape dismisses it early.
 * It never opens during an active Blitz run, a Daily Check question, or the
 * hub's intro and game scenes; it waits for the next quiet moment instead.
 *
 * Optional hub badge: an element with [data-medal-badge] inside the profile
 * button gets the count of this week's medals not yet seen on the profile.
 */
(function () {
  'use strict';

  if (window.BoohaMedalToast) return;

  // Resolve art relative to this script so pages in subfolders work too.
  var script = document.currentScript;
  var ROOT = script && script.src ? script.src.replace(/js\/ui\/medal-toast\.js(\?.*)?$/, '') : '';
  var IMG = ROOT + 'assets/img/profile/';
  // Profile art URLs carry the shared revision tag (js/core/profile-art.js).
  function profileArt(file) { return window.BoohaProfileArt ? window.BoohaProfileArt.url(file, ROOT) : IMG + file; }
  var DISPLAY_MS = 4200;
  var queue = [];
  // A check can fire while earlier medals are still waiting in the queue.
  // Reserve each week/id pair at enqueue time so queued medals cannot be
  // added a second time before their popup begins and marks them as shown.
  var queuedMedalKeys = new Set();
  var queuedFindKeys = new Set();
  var showing = false;
  var host = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function injectStyles() {
    if (document.getElementById('booha-medal-toast-style')) return;
    var style = document.createElement('style');
    style.id = 'booha-medal-toast-style';
    style.textContent = [
      '.bmt-host{position:fixed;left:0;right:0;top:calc(10px + env(safe-area-inset-top,0px));z-index:2147483000;display:flex;justify-content:center;pointer-events:none;padding:0 12px;}',
      '.bmt{pointer-events:auto;display:flex;align-items:center;gap:12px;width:min(420px,100%);padding:10px 16px 10px 10px;border-radius:20px;cursor:pointer;',
      'font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif;font-weight:700;color:#f3e6c8;text-align:left;',
      'background:linear-gradient(135deg,#2a1f12,#16121f 70%);border:2px solid #ffd77a;box-shadow:0 10px 30px rgba(0,0,0,.6),0 0 24px rgba(255,215,122,.45);',
      'animation:bmtIn .5s cubic-bezier(.2,1.4,.4,1) both;}',
      '.bmt.out{animation:bmtOut .35s ease-in both;}',
      '.bmt.bronze{border-color:#e8a070;box-shadow:0 10px 30px rgba(0,0,0,.6),0 0 24px rgba(232,160,112,.45);}',
      '.bmt.silver{border-color:#d4dce4;box-shadow:0 10px 30px rgba(0,0,0,.6),0 0 24px rgba(212,220,228,.45);}',
      '.bmt img{width:64px;height:64px;flex:0 0 64px;object-fit:contain;animation:bmtSpin .9s ease-out both;}',
      '.bmt-copy{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}',
      '.bmt-kicker{font-family:Cinzel,serif;font-size:10px;letter-spacing:.18em;color:#ffd77a;}',
      '.bmt-title{font-size:17px;font-weight:900;color:#fff6dc;line-height:1.25;}',
      '.bmt-sub{font-size:12px;color:#d9cbb0;}',
      '.bmt-stars{font-family:"Cinzel Decorative",Cinzel,serif;font-size:20px;color:#ffd77a;white-space:nowrap;}',
      '@keyframes bmtIn{from{opacity:0;transform:translateY(-40px) scale(.9);}to{opacity:1;transform:none;}}',
      '@keyframes bmtOut{to{opacity:0;transform:translateY(-30px) scale(.95);}}',
      '@keyframes bmtSpin{from{transform:rotateY(180deg) scale(.4);}to{transform:none;}}',
      '@media (prefers-reduced-motion:reduce){.bmt,.bmt.out,.bmt img{animation:none;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureHost() {
    if (host && document.body.contains(host)) return host;
    injectStyles();
    host = document.createElement('div');
    host.className = 'bmt-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
    return host;
  }

  // Wait while a Blitz run or a Daily Check question is on screen.
  function busy() {
    try {
      if (document.body.classList.contains('blitz-active')) return true;
      // Hub: wait for the hub screen itself (not the intro or a game scene).
      if (document.documentElement.classList.contains('scene-start')) return true;
      // Daily Check: wait until its result screen (score) is showing.
      var dc = document.querySelector('.dc-root');
      if (dc && !dc.querySelector('.dc-result-score')) return true;
    } catch (_) {}
    return false;
  }

  function playSound() {
    try {
      if (window.UtsuSfx && typeof window.UtsuSfx.popupOpen === 'function') window.UtsuSfx.popupOpen();
    } catch (_) {}
  }

  function next() {
    if (showing || !queue.length) return;
    if (busy()) { setTimeout(next, 1500); return; }
    showing = true;
    var item = queue.shift();
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'bmt ' + (item.tier || 'gold');
    el.innerHTML =
      '<img src="' + esc(item.img) + '" alt="">' +
      '<span class="bmt-copy"><span class="bmt-kicker">' + esc(item.kicker) + '</span>' +
      '<span class="bmt-title">' + esc(item.title) + '</span>' +
      '<span class="bmt-sub">' + esc(item.sub) + '</span></span>' +
      (item.stars ? '<span class="bmt-stars">+' + item.stars + '★</span>' : '');
    el.setAttribute('aria-label', item.title + '. ' + item.sub + (item.stars ? '. +' + item.stars + ' stars' : ''));
    ensureHost().appendChild(el);
    playSound();
    if (item.onShow) item.onShow();
    var done = false;
    function close() {
      if (done) return;
      done = true;
      el.classList.add('out');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        showing = false;
        next();
      }, 360);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    el.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    setTimeout(close, DISPLAY_MS);
  }

  function enqueueMedal(m) {
    var W = window.BoohaWeeklyMedals;
    var snap = W && typeof W.snapshot === 'function' ? W.snapshot() : null;
    var weekKey = snap && snap.week ? snap.week.key : '';
    var medalKey = weekKey + '|' + m.id;
    if (queuedMedalKeys.has(medalKey)) return;
    queuedMedalKeys.add(medalKey);
    var tierJp = { bronze: 'ブロンズ', silver: 'シルバー', gold: 'ゴールド' }[m.tier] || '';
    queue.push({
      tier: m.tier,
      img: profileArt(m.img),
      kicker: 'MEDAL GET! · メダル ゲット！',
      title: m.jp,
      sub: tierJp + ' · ' + m.how,
      stars: W ? W.bonusFor(m.id) : 0,
      onShow: function () { if (W) W.markShown([m.id]); }
    });
  }

  function enqueueLevel(level) {
    queue.push({
      tier: 'gold',
      img: profileArt('rank-coin-' + Math.max(1, Math.min(9, level)) + '.webp'),
      kicker: 'LEVEL UP! · レベルアップ！',
      title: 'Lv ' + level + ' に なった！',
      sub: 'あたらしい ランクコイン ゲット',
      stars: 0
    });
  }

  function findAsset(item) {
    var src = item && item.asset;
    if (!src) return profileArt('portal-adventure.webp');
    return /^(https?:|\/)/.test(src) ? src : ROOT + src;
  }

  function markFindsRevealed(awards) {
    if (!window.BoohaAdventure || !BoohaAdventure.save) return;
    try {
      var data = BoohaAdventure.save.load() || {};
      var meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
      var log = meta.findsLog && typeof meta.findsLog === 'object' ? meta.findsLog : {};
      var changed = false;
      awards.forEach(function (award) {
        var entry = log[award.week];
        var record = entry && entry[award.pool];
        if (record && record.itemId === (award.record && award.record.itemId) && !record.revealedAt) {
          record.revealedAt = Date.now();
          changed = true;
        }
      });
      if (changed) {
        meta.findsLog = log;
        data.meta = meta;
        BoohaAdventure.save.save(data);
      }
    } catch (e) { console.warn('[MedalToast] oddity reveal could not be marked:', e); }
  }

  function enqueueFinds(awards) {
    var fresh = awards.filter(function (award) {
      if (!award || !award.week || !award.pool) return false;
      var key = award.week + '|' + award.pool;
      if (queuedFindKeys.has(key)) return false;
      queuedFindKeys.add(key);
      return true;
    });
    if (!fresh.length) return;
    // The earn moment is a mystery: the item is waiting in Karasuki, so the
    // toast never names it or shows its art. The pickup reveals it.
    var items = fresh.filter(function (award) { return award.item; }).map(function (award) { return award.item; });
    var title = items.length > 1 ? "THIS WEEK'S FINDS" : 'SOMETHING STRANGE';
    var sub;
    if (items.length > 1) {
      sub = 'Two strange things appeared in Karasuki. Go and find them! · からすきに ふしぎな ものが 2つ あらわれたよ。さがしに いこう！';
    } else if (items.length === 1) {
      sub = 'Something strange appeared in Karasuki. Go and find it! · からすきに ふしぎな ものが あらわれたよ。さがしに いこう！';
    } else {
      sub = 'A future reward has been added to your oddity record.';
    }
    queue.push({
      tier: fresh.some(function (award) { return award.pool === 'special'; }) ? 'gold' : 'bronze',
      img: findAsset(null),
      kicker: 'ODDITY FIND · ふしぎなもの ゲット！',
      title: title,
      sub: sub,
      onShow: function () { markFindsRevealed(fresh); },
    });
    next();
  }

  function pendingFindsFromSave() {
    if (!window.BoohaAdventure || !BoohaAdventure.save) return [];
    try {
      var data = BoohaAdventure.save.load() || {};
      var meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
      var log = meta.findsLog && typeof meta.findsLog === 'object' ? meta.findsLog : {};
      var catalogue = Array.isArray(window.BoohaCollectiblesData) ? window.BoohaCollectiblesData : [];
      var out = [];
      Object.keys(log).forEach(function (week) {
        var entry = log[week];
        ['standard', 'special'].forEach(function (pool) {
          var record = entry && entry[pool];
          if (!record || record.revealedAt) return;
          out.push({ week: week, pool: pool, record: record, item: catalogue.find(function (item) { return item.id === record.itemId; }) || null });
        });
      });
      return out;
    } catch (_) { return []; }
  }

  function updateLevel() {
    var W = window.BoohaWeeklyMedals;
    var s = W && W.snapshot ? W.snapshot() : null;
    if (!s || !window.BoohaAdventure || !BoohaAdventure.save) return;
    var level = s.level.level;
    var seen = s.meta && Number(s.meta.levelSeen);
    if (Number.isFinite(seen) && seen > 0 && level <= seen) return;
    try {
      var data = BoohaAdventure.save.load() || {};
      if (!data.meta || typeof data.meta !== 'object') data.meta = {};
      data.meta.levelSeen = level;
      BoohaAdventure.save.save(data);
    } catch (_) { return; }
    // Fresh start: the first visit records the current level without a popup.
    if (Number.isFinite(seen) && seen > 0) enqueueLevel(level);
  }

  function updateBadge() {
    var W = window.BoohaWeeklyMedals;
    var n = 0;
    try { n = W ? W.unseenCount() : 0; } catch (_) {}
    var badges = document.querySelectorAll('[data-medal-badge]');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = n ? String(n) : '';
      badges[i].hidden = !n;
      var owner = badges[i].closest('a,button');
      if (owner) owner.classList.toggle('has-new-medals', !!n);
    }
  }

  function check() {
    var W = window.BoohaWeeklyMedals;
    if (!W || !window.BoohaLevelStars) return;
    try {
      W.sync();
      W.pendingPopups().forEach(enqueueMedal);
      enqueueFinds(pendingFindsFromSave());
      updateLevel();
      updateBadge();
      next();
    } catch (e) {
      console.warn('[MedalToast] check failed:', e);
    }
  }

  var timer = null;
  function soon(delay) {
    clearTimeout(timer);
    timer = setTimeout(check, delay);
  }

  if (window.BOOHA_READY) soon(600);
  else document.addEventListener('booha:ready', function () { soon(600); }, { once: true });
  // Game and Blitz results are recorded on booha:gameEnd → booha:dayRecorded.
  document.addEventListener('booha:dayRecorded', function () { soon(700); });
  document.addEventListener('booha:checkIn', function () { soon(900); });
  document.addEventListener('booha:collectibleEarned', function (event) {
    var awards = event.detail && Array.isArray(event.detail.awards) ? event.detail.awards : [];
    enqueueFinds(awards);
  });
  document.addEventListener('booha:medalsSeen', updateBadge);

  window.BoohaMedalToast = { check: check, updateBadge: updateBadge };
})();
