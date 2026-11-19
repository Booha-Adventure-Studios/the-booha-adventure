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
  function showing_(el) {
    return !!el && !el.hidden && !!(el.getClientRects && el.getClientRects().length);
  }

  function busy() {
    try {
      if (document.body.classList.contains('blitz-active')) return true;
      // Hub: wait for the hub screen itself (not the intro or a game scene).
      if (document.documentElement.classList.contains('scene-start')) return true;
      // Daily Check: wait until its result screen (score) is showing.
      var dc = document.querySelector('.dc-root');
      if (dc && !dc.querySelector('.dc-result-score')) return true;
      // A student's biggest moments get the screen to themselves. These are
      // named on purpose (not "any dialog"): game results and the Daily Check
      // result are dialogs too, and medals are meant to appear there.
      //  - Maze arrival card (congratulations or reminder), until it leaves.
      var arrival = document.getElementById('overlay1');
      if (arrival && !arrival.classList.contains('hidden') && !arrival.classList.contains('gone')) return true;
      //  - The Maze's weekly companion popup.
      var companion = document.getElementById('seasonalUnlockPopup');
      if (companion && companion.classList.contains('show')) return true;
      //  - The profile's "week sealed" celebration.
      if (showing_(document.querySelector('.pg-sealed-card'))) return true;
      //  - Any intro or flyover video that is playing.
      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        if (!videos[i].paused && !videos[i].ended) return true;
      }
    } catch (_) {}
    return false;
  }

  function playSound(sound) {
    try {
      if (!playTune(toastTune(sound)) && window.UtsuSfx && typeof window.UtsuSfx.popupOpen === 'function') {
        window.UtsuSfx.popupOpen();
      }
    } catch (_) {}
  }

  /* ── Reward jingles (Audio Pass 2) ────────────────────────────────
     Every reward reveal comes through this toast (REWARDS-DESIGN.md), so
     each kind gets its own short jingle, synthesized on the shared
     js/booha-sfx.js context (already unlocked by the player's taps):
       medal   bronze ta-da · silver arpeggio + shimmer · gold fanfare
       level   a coin "ka-ching" and a power-up run; the run gets longer
               and climbs higher with every level (Lv 1–9)
       find    a mysterious Karasuki wobble and twinkle; a special find
               adds a low bell
     If the context isn't running yet (no tap on this page so far), the
     toast stays quiet rather than sounding late. toastTune() is pure data
     so tests can check it without audio. */
  var PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100];
  function toastTune(sound) {
    sound = sound || {};
    var ev = [];
    var add = function (at, kind, note, len, vol, extra) {
      var e = { at: at, kind: kind, note: note, len: len, vol: vol };
      if (extra) e.notes = extra;
      ev.push(e);
    };
    if (sound.kind === 'level') {
      var lv = Math.max(1, Math.min(9, Math.round(Number(sound.level) || 1)));
      add(0, 'coin', 83, 0.08, 0.32);                       // B5 …
      add(0.08, 'coin', 88, 0.3, 0.32);                     // … E6: ka-ching
      var steps = 3 + Math.ceil(lv / 2);                    // 4–8 notes
      var top = 3 + lv;                                     // ends higher each level
      for (var i = 0; i < steps; i++) {
        add(0.42 + i * 0.065, 'pop', PENTA[Math.max(0, top - steps + 1 + i)], 0.16, 0.36);
      }
      add(0.42 + steps * 0.065, 'chord', PENTA[top], 0.6, 0.12, [PENTA[top] - 12, PENTA[top] - 8, PENTA[top] - 5]);
      add(0.42 + steps * 0.065, 'pop', PENTA[top], 0.5, 0.42);
    } else if (sound.kind === 'find') {
      // Whole-tone wobble: strange, curious, not scary.
      [74, 70, 78, 82].forEach(function (n, i) { add(i * 0.14, 'wobble', n, 0.32, 0.22); });
      [98, 102, 106].forEach(function (n, i) { add(0.62 + i * 0.09, 'spark', n, 0.24, 0.16); });
      if (sound.special) add(0.62, 'bell', 50, 1.2, 0.28);
    } else {
      var tier = sound.tier || 'gold';
      if (tier === 'bronze') {
        add(0, 'pop', 79, 0.14, 0.4); add(0.13, 'pop', 84, 0.36, 0.46);
        add(0.3, 'spark', 96, 0.22, 0.18);
      } else if (tier === 'silver') {
        [76, 79, 84].forEach(function (n, i) { add(i * 0.09, 'pop', n, 0.16, 0.4); });
        add(0.27, 'pop', 88, 0.42, 0.46);
        [96, 100, 103].forEach(function (n, i) { add(0.4 + i * 0.06, 'spark', n, 0.22, 0.18); });
      } else {
        add(0, 'pop', 67, 0.1, 0.4); add(0.09, 'pop', 67, 0.1, 0.4);
        add(0.2, 'chord', 72, 0.55, 0.12, [72, 76, 79]);
        add(0.2, 'pop', 84, 0.16, 0.44); add(0.34, 'pop', 88, 0.16, 0.44); add(0.48, 'pop', 91, 0.6, 0.5);
        [108, 103, 100, 96].forEach(function (n, i) { add(0.6 + i * 0.07, 'spark', n, 0.2, 0.16); });
      }
    }
    return ev;
  }

  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tone(c, out, type, f, t, len, peak, fromF, toF) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(fromF || f, t);
    if (fromF) o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    if (toF) o.frequency.exponentialRampToValueAtTime(toF, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 0.03);
    return o;
  }
  function voice(c, out, t, e) {
    var f = hz(e.note);
    if (e.kind === 'pop') {
      tone(c, out, 'sine', f, t, e.len, e.vol, f * 0.62);
      tone(c, out, 'sine', f * 2, t, 0.05, e.vol * 0.22);
    } else if (e.kind === 'spark') {
      tone(c, out, 'sine', f, t, e.len, e.vol);
      tone(c, out, 'sine', f * 2.76, t, e.len * 0.45, e.vol * 0.3);
    } else if (e.kind === 'coin') {
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(out);
      tone(c, lp, 'square', f, t, e.len, e.vol * 0.35);
      tone(c, out, 'sine', f, t, e.len, e.vol * 0.6);
    } else if (e.kind === 'chord') {
      e.notes.forEach(function (n) { tone(c, out, 'triangle', hz(n), t, e.len, e.vol); });
    } else if (e.kind === 'wobble') {
      var o = tone(c, out, 'triangle', f, t, e.len, e.vol);
      var lfo = c.createOscillator(), depth = c.createGain();
      lfo.frequency.value = 7; depth.gain.value = f * 0.03;
      lfo.connect(depth); depth.connect(o.frequency);
      lfo.start(t); lfo.stop(t + e.len + 0.03);
    } else if (e.kind === 'bell') {
      tone(c, out, 'sine', f, t, e.len, e.vol);
      tone(c, out, 'sine', f * 2.4, t, e.len * 0.6, e.vol * 0.35);
      tone(c, out, 'sine', f * 5.95, t, e.len * 0.3, e.vol * 0.15);
    }
  }

  /* Returns true when the jingle was scheduled. */
  function playTune(events) {
    var S = window.BoohaSFX;
    var c = S && typeof S.context === 'function' ? S.context() : null;
    if (!c || c.state !== 'running' || !events.length) return false;
    var comp = c.createDynamicsCompressor();
    comp.connect(c.destination);
    var bus = c.createGain();
    bus.gain.value = 0.55;
    bus.connect(comp);
    var t0 = c.currentTime + 0.03, end = 0;
    events.forEach(function (e) { voice(c, bus, t0 + e.at, e); end = Math.max(end, e.at + e.len); });
    setTimeout(function () { try { bus.disconnect(); comp.disconnect(); } catch (_) {} }, Math.ceil((end + 0.5) * 1000));
    return true;
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
    playSound(item.sound);
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
      sound: { kind: 'medal', tier: m.tier },
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
      stars: 0,
      sound: { kind: 'level', level: level }
    });
  }

  function findAsset(item) {
    var src = item && item.asset;
    if (!src) return ROOT + 'assets/img/oddities/ambrose-book-glasses.webp';   // Ambrose keeps the oddities
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
      sound: { kind: 'find', special: fresh.some(function (award) { return award.pool === 'special'; }) },
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

  window.BoohaMedalToast = { check: check, updateBadge: updateBadge, toastTune: toastTune };
})();
