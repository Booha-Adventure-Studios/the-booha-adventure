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
  var DISPLAY_MS = 4200;
  var queue = [];
  // A check can fire while earlier medals are still waiting in the queue.
  // Reserve each week/id pair at enqueue time so queued medals cannot be
  // added a second time before their popup begins and marks them as shown.
  var queuedMedalKeys = new Set();
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
      img: IMG + m.img,
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
      img: IMG + 'rank-coin-' + Math.max(1, Math.min(9, level)) + '.webp',
      kicker: 'LEVEL UP! · レベルアップ！',
      title: 'Lv ' + level + ' に なった！',
      sub: 'あたらしい ランクコイン ゲット',
      stars: 0
    });
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
  document.addEventListener('booha:medalsSeen', updateBadge);

  window.BoohaMedalToast = { check: check, updateBadge: updateBadge };
})();
