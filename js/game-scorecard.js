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
   A student's first rainbow ever shows a short explanation; after that a
   chip. "First ever" is read from that student's own synced save (no
   rainbows recorded yet in any game), so it holds on shared iPads and
   across devices. The run being shown is saved just after the card opens.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BoohaScorecard) return;

  var TIERS = {
    try:     { label: 'TRY AGAIN',  en: "Rough start, but you've got this!", kana: 'だいじょうぶ！もういっかい やってみよう。', kanji: 'だいじょうぶ！もう一回やってみよう。' },
    keep:    { label: 'KEEP GOING', en: 'Nice effort. You are getting stronger!', kana: 'いいかんじ！どんどん じょうずに なってる。', kanji: 'いい感じ！どんどん上手になってる。' },
    great:   { label: 'GREAT',      en: 'So close to perfect!', kana: 'すごい！あと すこしで パーフェクト。', kanji: 'すごい！あと少しでパーフェクト。' },
    perfect: { label: 'PERFECT',    en: 'Every answer right!', kana: 'パーフェクト！ぜんぶ せいかい！', kanji: 'パーフェクト！全部正解！' },
    legend:  { label: 'LEGEND',     en: 'Perfect, and not a single slip.', kana: 'レジェンド！いっかいも ミスなし！', kanji: 'レジェンド！一回もミスなし！' }
  };
  var STAR_PATH = 'M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z';
  var CROWN_PATH = 'M2 17h22l-2-12-5.5 5L13 2 9.5 10 4 5z';

  function firstRainbowEver() {
    try {
      var sc = window.BoohaAdventure.save.load().scores || {};
      return !Object.keys(sc).some(function (id) { return sc[id] && Number(sc[id].rainbows) > 0; });
    } catch (_) { return false; }
  }
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

  // Booha reacts at meaningful moments. Each fires once by nature: the first
  // rainbow ever (lifetime), and crossing 3 and 9 ready games this week
  // (the weekly count only grows). Only the nine core games count to 9.
  var READY_LINES = {
    1: { en: 'You came ready!', jp: 'じゅんび できてたね！' },
    3: { en: 'Your ready pace is glowing!', jp: 'じゅんび ペースが かがやいてる！' },
    9: { en: 'The whole trail is rainbow!', jp: 'みちが ぜんぶ にじいろ！' }
  };
  function readyMoment(gameId, firstEver) {
    if (firstEver) return 1;
    try {
      var curr = String(gameId || '').split(':')[0];
      if (!/^(pb|br|bc)$/.test(curr)) return 0;   // extras never move the 9
      var R = window.BoohaGameRegistry, S = window.BoohaAdventure && window.BoohaAdventure.scores;
      var ids = R.getForCurriculum(curr).map(function (g) { return g.saveId; });
      var before = ids.filter(function (id) { return S.weeklyRainbowForGame(id); }).length;
      var after = before + (S.weeklyRainbowForGame(gameId) ? 0 : 1);
      if (after >= 9 && before < 9) return 9;
      if (after >= 3 && before < 3) return 3;
    } catch (_) {}
    return 0;
  }

  var overlay = null;
  var timers = [];

  /* ── Score card sound (Scorecard Sound pass) ───────────────────────
     Everything is synthesized on the shared Web Audio context
     (js/booha-sfx.js) and scheduled on the audio clock. The player's taps
     during the game have already unlocked that context, so iPad Safari has
     nothing to block. (The old tier mp3s started a new <audio> element
     more than a second after the last tap, which iPad Safari refuses, and
     higher scores waited longest.)
       star pops    one bubbly pop per earned star, rising, landing with the stars
       rainbow      a quick sparkle run above the pops
       tier jingle  grows with the score; inside each tier the top note
                    climbs with every correct answer (12/15 ≠ 14/15)
     scoreTune() is pure data so tests can check it without audio. */
  var PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103];
  function penta(i) { return PENTA[Math.max(0, Math.min(PENTA.length - 1, i))]; }

  function tierTune(key, s) {
    var ev = [];
    var pop = function (at, note, len, vol) { ev.push({ at: at, kind: 'pop', note: note, len: len || 0.22, vol: vol == null ? 0.5 : vol }); };
    var spark = function (at, note, vol) { ev.push({ at: at, kind: 'spark', note: note, len: 0.2, vol: vol == null ? 0.3 : vol }); };
    var chord = function (at, notes, len, vol) { ev.push({ at: at, kind: 'chord', notes: notes, len: len, vol: vol == null ? 0.22 : vol }); };
    var k;
    if (key === 'try') {
      // A friendly bounce that still ends going up: "you've got this".
      k = 5 + Math.round(Math.max(0, Math.min(5.5, s)) / 5.5 * 2);          // C5 · D5 · E5
      pop(0, 60, 0.18, 0.42); pop(0.15, 67, 0.18, 0.42); pop(0.32, penta(k), 0.42, 0.48);
    } else if (key === 'keep') {
      k = 8 + Math.max(0, Math.min(3, Math.round((s - 6) * 0.75)));         // G5 · A5 · C6 · D6
      pop(0, 67); pop(0.11, 72); pop(0.22, 76); pop(0.36, penta(k), 0.45, 0.55);
      spark(0.5, penta(k) + 12, 0.18);
    } else if (key === 'great') {
      k = 11 + Math.max(0, Math.min(3, Math.round(s - 11)));                // D6 · E6 · G6 · A6
      pop(0, 72, 0.18); pop(0.09, 76, 0.18); pop(0.18, 79, 0.18); pop(0.27, 84, 0.2);
      chord(0.4, [72, 76, 79], 0.5, 0.13);
      pop(0.4, penta(k), 0.5, 0.58);
      [0, 1, 2].forEach(function (n) { spark(0.55 + n * 0.06, penta(k + 2 + n), 0.2); });
    } else {
      // PERFECT fanfare (LEGEND adds the crown flourish below).
      pop(0, 67, 0.12, 0.45); pop(0.1, 67, 0.12, 0.45);
      chord(0.22, [72, 76, 79, 84], 0.6, 0.14);
      pop(0.22, 84, 0.18, 0.55); pop(0.38, 88, 0.18, 0.55); pop(0.54, 91, 0.7, 0.62);
      [108, 103, 100, 96].forEach(function (n, i) { spark(0.66 + i * 0.07, n, 0.18); });
      if (key === 'legend') {
        [96, 98, 100, 103, 105, 108].forEach(function (n, i) { spark(1.1 + i * 0.05, n, 0.26); });
        chord(1.45, [84, 88, 91, 96], 0.95, 0.13);
        pop(1.45, 96, 0.9, 0.5);
      }
    }
    return ev;
  }

  /* The reveal (Scorecard Impact pass): one beat at a time, ~2.6 s, a tap
     skips to the end. The score counts up over a drumroll, each star stamps
     in with a thump (a missed star drops in grey with a soft clunk), the
     tier word slams in on a bass boom with its jingle, Booha reacts, NEW
     BEST stamps on, and only then do the stats and buttons arrive.
     Reduced motion: everything at once, as before. */
  var REVEAL = { count: 0.85, star0: 1.0, starGap: 0.3, tier: 1.95, best: 2.35, end: 2.6 };

  function scoreTune(key, correct, total, stars, rainbow, calm, newBest) {
    var s = total > 0 ? (correct / total) * 15 : 0;
    var ev = [];
    var at = 0;
    if (!calm) {
      // Count-up: a tick per correct answer, climbing, over a drumroll.
      var n = Math.max(0, Math.min(15, Math.round(correct)));
      ev.push({ at: 0, kind: 'roll', len: REVEAL.count + 0.12, vol: 0.16 });
      for (var c = 1; c <= n; c++) {
        ev.push({ at: REVEAL.count * (1 - Math.pow(1 - c / Math.max(1, n), 2)), kind: 'tick', note: penta(c), len: 0.05, vol: 0.12 });
      }
      for (var k2 = 0; k2 < 3; k2++) {
        var sat = REVEAL.star0 + k2 * REVEAL.starGap;
        if (k2 < stars) {
          ev.push({ at: sat, kind: 'thump', len: 0.3, vol: 0.55 + k2 * 0.1 });
          ev.push({ at: sat, kind: 'pop', note: [79, 84, 88][k2], len: 0.22, vol: 0.5 });
        } else {
          ev.push({ at: sat, kind: 'clunk', len: 0.2, vol: 0.22 });
        }
      }
      if (rainbow) {
        [96, 98, 100, 103].forEach(function (nn, i) {
          ev.push({ at: REVEAL.star0 + 3 * REVEAL.starGap - 0.1 + i * 0.05, kind: 'spark', note: nn, len: 0.2, vol: 0.26 });
        });
      }
      ev.push({ at: REVEAL.tier, kind: 'boom', len: key === 'try' ? 0.35 : 0.7, vol: { try: 0.22, keep: 0.4, great: 0.55, perfect: 0.65, legend: 0.75 }[key] || 0.4 });
      tierTune(key, s).forEach(function (e) { e.at += REVEAL.tier; ev.push(e); });
      if (newBest) ev.push({ at: REVEAL.best, kind: 'stamp', len: 0.25, vol: 0.5 });
      return ev;
    }
    // Reduced motion: the jingle straight away, no beats.
    tierTune(key, s).forEach(function (e) { e.at += at; ev.push(e); });
    return ev;
  }

  var sfxBus = null;
  function audioCtx() {
    try {
      var S = window.BoohaSFX;
      var c = S && typeof S.context === 'function' ? S.context() : null;
      if (!c && window.GAME_UTILS && typeof window.GAME_UTILS._synthCtx === 'function') c = window.GAME_UTILS._synthCtx();
      return c && c.state !== 'closed' ? c : null;
    } catch (_) { return null; }
  }
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function tone(c, out, type, f, t, len, peak, fromF) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type;
    if (fromF) {
      o.frequency.setValueAtTime(fromF, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    } else o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 0.03);
  }

  var noiseCache = null;
  function noiseSrc(c, len) {
    if (!noiseCache || noiseCache.sampleRate !== c.sampleRate) {
      var b = c.createBuffer(1, Math.floor(c.sampleRate * 1.2), c.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseCache = b;
    }
    var src = c.createBufferSource();
    src.buffer = noiseCache;
    return src;
  }

  function voice(c, out, t, e) {
    if (e.kind === 'pop') {
      // Bubbly pop: a quick upward bloop, a soft chiptune body, a bright click.
      var f = hz(e.note);
      tone(c, out, 'sine', f, t, e.len, e.vol, f * 0.62);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(out);
      tone(c, lp, 'square', f, t, Math.min(0.16, e.len), e.vol * 0.12);
      tone(c, out, 'sine', f * 2, t, 0.06, e.vol * 0.25);
    } else if (e.kind === 'spark') {
      var fs = hz(e.note);
      tone(c, out, 'sine', fs, t, e.len, e.vol);
      tone(c, out, 'sine', fs * 2.76, t, e.len * 0.45, e.vol * 0.3);
    } else if (e.kind === 'tick') {
      tone(c, out, 'square', hz(e.note), t, e.len, e.vol);
    } else if (e.kind === 'roll') {
      // A snare roll: noise, fluttering, swelling into the first star.
      var nr = noiseSrc(c, e.len), bp = c.createBiquadFilter(), gr = c.createGain(), am = c.createOscillator(), amg = c.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.7;
      gr.gain.setValueAtTime(e.vol * 0.25, t); gr.gain.linearRampToValueAtTime(e.vol, t + e.len * 0.9); gr.gain.linearRampToValueAtTime(0.0001, t + e.len);
      am.frequency.value = 22; amg.gain.value = e.vol * 0.5; am.connect(amg); amg.connect(gr.gain);
      nr.connect(bp); bp.connect(gr); gr.connect(out); nr.start(t); am.start(t); am.stop(t + e.len); nr.stop(t + e.len);
    } else if (e.kind === 'thump' || e.kind === 'boom') {
      // Weight underneath: a falling sine kick plus a short low noise hit.
      var big = e.kind === 'boom';
      tone(c, out, 'sine', big ? 42 : 58, t, e.len, e.vol, big ? 110 : 150);
      var nh = noiseSrc(c, big ? 0.32 : 0.09), lpn = c.createBiquadFilter(), gn = c.createGain();
      lpn.type = 'lowpass'; lpn.frequency.value = big ? 900 : 1800;
      gn.gain.setValueAtTime(e.vol * (big ? 0.5 : 0.4), t); gn.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.32 : 0.09));
      nh.connect(lpn); lpn.connect(gn); gn.connect(out); nh.start(t); nh.stop(t + 0.35);
    } else if (e.kind === 'clunk') {
      tone(c, out, 'triangle', 110, t, e.len, e.vol, 190);
    } else if (e.kind === 'stamp') {
      tone(c, out, 'sine', 70, t, 0.22, e.vol, 160);
      var ns2 = noiseSrc(c, 0.06), hp2 = c.createBiquadFilter(), g2 = c.createGain();
      hp2.type = 'highpass'; hp2.frequency.value = 2500;
      g2.gain.setValueAtTime(e.vol * 0.6, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      ns2.connect(hp2); hp2.connect(g2); g2.connect(out); ns2.start(t); ns2.stop(t + 0.08);
    } else if (e.kind === 'chord') {
      e.notes.forEach(function (n) {
        tone(c, out, 'triangle', hz(n), t, e.len, e.vol);
        tone(c, out, 'sine', hz(n) * 1.004, t, e.len * 0.8, e.vol * 0.5);
      });
    }
  }

  function playTune(events) {
    var c = audioCtx();
    if (!c || !events.length) return;
    var opened = Date.now();
    var start = function () {
      if (!overlay || sfxBus) return;
      if (c.state !== 'running' || Date.now() - opened > 1500) return;   // never burst out late
      try {
        var comp = c.createDynamicsCompressor();
        comp.connect(c.destination);
        sfxBus = c.createGain();
        sfxBus.gain.value = 0.6;
        sfxBus.connect(comp);
        sfxBus._comp = comp;
        var t0 = c.currentTime + 0.03;
        sfxBus._t0 = t0;
        events.forEach(function (e) { voice(c, sfxBus, t0 + e.at, e); });
      } catch (_) {}
    };
    if (c.state === 'running') { start(); return; }
    try {
      if (window.BoohaSFX && typeof window.BoohaSFX.unlock === 'function') window.BoohaSFX.unlock();
      var p = c.resume();
      if (p && p.then) p.then(start, function () {});
    } catch (_) {}
  }

  /* Chips under the points. Sharp = a correct answer inside the item's
     target time (+25 points each, js/game-utils.js). It is shown only when
     earned ("Sharp 0" read as a failure), bilingual, with its meaning in the
     accessible label. Pure, so tests can check it without a DOM. */
  function runChips(run, fullCombo) {
    var chips = [{ cls: 'bsc-chip', text: 'Best combo ' + run.maxCombo }];
    var n = Number(run.sharp) || 0;
    if (n > 0) {
      chips.push({
        cls: 'bsc-chip bsc-chip-sharp',
        text: 'はやい ×' + n + ' · Sharp',
        aria: 'Sharp: ' + n + ' fast correct answer' + (n === 1 ? '' : 's') +
          ', +25 points each. はやく せいかい ' + n + 'かい',
        title: 'Fast correct answers: +25 points each'
      });
    }
    if (fullCombo) chips.push({ cls: 'bsc-chip bsc-chip-crown', text: '♛ Crown' });
    return chips;
  }

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
    if (sfxBus) {
      var bus = sfxBus, c = bus.context;
      sfxBus = null;
      try { bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.03); } catch (_) {}
      setTimeout(function () {
        try { bus.disconnect(); if (bus._comp) bus._comp.disconnect(); } catch (_) {}
      }, 250);
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
  /* ── The reveal ──────────────────────────────────────────────────── */
  var BOOHA_ART = '/the-booha-adventure/assets/img/';
  var BOOHA_POSE = { try: 'booha_ghost.webp', keep: 'booha_ghost_dance_sway.webp', great: 'booha_ghost_dance_arms_up.webp', perfect: 'booha_ghost_dance_arms_up.webp', legend: 'booha_ghost_dance_arms_up.webp' };
  var DANCE_POSES = ['booha_ghost_dance_sway.webp', 'booha_ghost_dance_arms_up.webp', 'booha_ghost_dance_wave.webp'];
  var danceBuf = null;
  // PERFECT and LEGEND: Booha dances to a few seconds of boo-dance.mp3,
  // decoded on the shared Web Audio context (no <audio> element).
  function loadDance() {
    var c = audioCtx();
    if (!c || typeof fetch !== 'function') return null;
    if (danceBuf) return Promise.resolve(danceBuf);
    return fetch(BOOHA_ART.replace('img/', 'audio/') + 'boo-dance.mp3')
      .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
      .then(function (b) { return b && new Promise(function (res, rej) { var p = c.decodeAudioData(b, res, rej); if (p && p.then) p.then(res, rej); }); })
      .then(function (buf) { danceBuf = buf || null; return danceBuf; })
      .catch(function () { return null; });
  }
  function playDance(buf, delaySec) {
    if (!buf || !sfxBus) return;
    try {
      var c = sfxBus.context, g = c.createGain(), src = c.createBufferSource();
      var t = Math.max(c.currentTime + 0.02, (sfxBus._t0 || c.currentTime) + delaySec);
      src.buffer = buf;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.42, t + 0.15);
      g.gain.setValueAtTime(0.42, t + 2.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
      src.connect(g); g.connect(sfxBus);
      src.start(t, 0, 3.5);
    } catch (_) {}
  }
  function shake(node, px) {
    if (!node.animate) return;
    node.animate([{ transform: 'none' }, { transform: 'translate(' + (-px) + 'px,' + (px / 2) + 'px)' }, { transform: 'translate(' + px + 'px,' + (-px / 2) + 'px)' }, { transform: 'translate(' + (-px / 2) + 'px,0)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }
  function burst(node, n) {
    var U = window.GAME_UTILS;
    if (U && typeof U.confetti === 'function') U.confetti(node, n);
  }
  function flash(cls) {
    if (!overlay) return;
    var f = el('div', 'bsc-flash ' + (cls || ''));
    overlay.appendChild(f);
    setTimeout(function () { f.remove(); }, 900);
  }
  function runReveal(r) {
    var rt = [];
    var at = function (sec, fn) { var id = setTimeout(fn, sec * 1000); rt.push(id); timers.push(id); };
    var starsEls = Array.prototype.slice.call(r.card.querySelectorAll('.bsc-star'));
    var done = false;
    // Count-up.
    var t0 = null, dur = REVEAL.count * 1000, target = r.shown;
    var step = function (t) {
      if (done || !overlay) return;
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var v = target * (1 - Math.pow(1 - k, 2));
      r.correctEl.textContent = (k < 1 ? Math.floor(v) : target) + ' / ' + r.total;
      if (k < 1) requestAnimationFrame(step);
      else r.correctEl.classList.add('bsc-landed');
    };
    requestAnimationFrame(step);
    // Stars, one by one.
    starsEls.forEach(function (st, i) {
      at(REVEAL.star0 + i * REVEAL.starGap, function () {
        st.classList.add('bsc-stamp');
        if (i < r.stars) shake(r.card, 3 + i * 2);
      });
    });
    // The tier word slams in; Booha reacts; the size of the moment matches the tier.
    at(REVEAL.tier, function () {
      r.card.classList.add('bsc-slammed');
      shake(r.card, { try: 0, keep: 3, great: 6, perfect: 9, legend: 12 }[r.key] || 0);
      if (r.key === 'great') burst(r.card.querySelector('.bsc-tier'), 40);
      if (r.key === 'perfect' || r.key === 'legend') {
        flash(r.key === 'legend' ? 'bsc-flash-legend' : '');
        burst(r.card.querySelector('.bsc-tier'), 70);
        [0.35, 0.7, r.key === 'legend' ? 1.05 : 0, r.key === 'legend' ? 1.4 : 0].forEach(function (d, j) {
          if (!d) return;
          at(REVEAL.tier + d, function () { burst(starsEls[j % 3] || r.card, r.key === 'legend' ? 60 : 40); });
        });
        // Booha dances.
        var pose = 0;
        var dance = setInterval(function () {
          if (!overlay) { clearInterval(dance); return; }
          r.booha.src = BOOHA_ART + DANCE_POSES[pose++ % DANCE_POSES.length];
        }, 380);
        timers.push(setTimeout(function () { clearInterval(dance); r.booha.src = BOOHA_ART + 'booha_ghost_dance_arms_up.webp'; }, 3600));
        if (r.danceJob) r.danceJob.then(function (buf) { if (!done && overlay) playDance(buf, REVEAL.tier + 0.85); });
      }
    });
    if (r.newBest) at(REVEAL.best, function () { r.card.classList.add('bsc-best-stamped'); shake(r.card, 4); });
    var finish = function (skipped) {
      if (done) return;
      done = true;
      rt.forEach(clearTimeout);
      r.overlay.removeEventListener('pointerdown', onSkip, true);
      starsEls.forEach(function (st) { st.classList.add('bsc-stamp', 'bsc-instant'); });
      r.correctEl.textContent = r.shown + ' / ' + r.total;
      r.correctEl.classList.add('bsc-landed');
      r.card.classList.add('bsc-slammed', 'bsc-best-stamped', 'bsc-revealed');
      r.card.classList.remove('bsc-staged');
      if (skipped) {
        // Skipping cuts the build-up and lands the result's jingle at once.
        var events = r.tierTuneEvents;
        if (sfxBus) {
          var bus = sfxBus, c = bus.context;
          sfxBus = null;
          try { bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.02); } catch (_) {}
          setTimeout(function () { try { bus.disconnect(); if (bus._comp) bus._comp.disconnect(); } catch (_) {} }, 200);
        }
        playTune(events);
        var pv = r.card.querySelector('.bsc-points-value');
        if (pv && pv.dataset.final) pv.textContent = pv.dataset.final;
      }
    };
    var onSkip = function (e) {
      if (e.target && e.target.closest && e.target.closest('.bsc-later')) return;
      finish(true);
    };
    r.overlay.addEventListener('pointerdown', onSkip, true);
    at(REVEAL.end, function () { finish(false); });
  }

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
    var staged = !calm;          // the beat-by-beat reveal (REVEAL); reduced motion shows it all at once
    var danceJob = (staged && (key === 'perfect' || key === 'legend')) ? loadDance() : null;

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
      st.style.setProperty('--d', (calm || staged ? 0 : 250 + i * 260) + 'ms');
      starRow.appendChild(st);
    }
    card.appendChild(starRow);
    if (rainbow) {
      var firstRainbow = firstRainbowEver();
      var moment = readyMoment(opts.gameId, firstRainbow);
      var rb = el('div', 'bsc-rainbow-chip' + (firstRainbow ? ' first' : ''));
      rb.appendChild(el('b', null, 'READY PACE · じゅんび OK'));
      if (moment) {
        var says = el('p', 'bsc-booha-says');
        says.appendChild(el('b', null, 'Booha: '));
        says.appendChild(document.createTextNode(READY_LINES[moment].jp + ' ' + READY_LINES[moment].en));
        rb.appendChild(says);
      }
      if (firstRainbow) {
        rb.appendChild(el('span', null, kana
          ? 'じゅんびして きたね！ さいしょで せいかい、いい ペース。'
          : '準備してきたね！最初で正解、いいペース。'));
        rb.appendChild(el('span', null, 'You came ready: right first try, at a steady pace.'));
      }
      card.appendChild(rb);
    }

    // Booha reacts to the result, beside the tier word.
    var tierRow = el('div', 'bsc-tierrow');
    var booha = el('img', 'bsc-booha bsc-booha-' + key);
    booha.alt = '';
    booha.decoding = 'async';
    booha.src = BOOHA_ART + (BOOHA_POSE[key] || BOOHA_POSE.keep);
    var h = el('h2', 'bsc-tier', tier.label);
    h.id = 'bsc-tier';
    tierRow.appendChild(booha);
    tierRow.appendChild(h);
    card.appendChild(tierRow);
    var tierJp = el('p', 'bsc-jp', kana ? tier.kana : tier.kanji);
    var tierEn = el('p', 'bsc-en', tier.en);
    card.appendChild(tierJp);
    card.appendChild(tierEn);

    var score = el('div', 'bsc-score');
    var shown = Math.round(correct * 2) / 2;
    var correctEl = el('b', 'bsc-correct', (staged ? 0 : shown) + ' / ' + total);
    score.appendChild(correctEl);
    score.appendChild(el('span', 'bsc-pct', pct + '%'));
    // NEW BEST only for beating a real earlier score; a first run is celebrated
    // as a start, never presented as a record.
    var bestChip;
    if (before <= 0) bestChip = el('span', 'bsc-best bsc-first', 'FIRST SCORE · はじめて');
    else bestChip = el('span', newBest ? 'bsc-best bsc-new' : 'bsc-best', newBest ? 'NEW BEST!' : 'Best ' + best + '%');
    score.appendChild(bestChip);
    card.appendChild(score);

    var pointsValue = run ? run.points : opts.points;
    if (pointsValue != null && Number.isFinite(Number(pointsValue))) {
      // Points reward knowing it first try, and quickly. Stars never depend on them.
      var weekBest = priorWeeklyPoints(opts.gameId);
      var pv = Math.round(Number(pointsValue));
      var pts = el('div', 'bsc-points');
      pts.appendChild(el('span', 'bsc-points-label', 'POINTS'));
      var pvEl = el('b', 'bsc-points-value', calm ? pv.toLocaleString('en-US') : '0');
      pvEl.dataset.final = pv.toLocaleString('en-US');
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
        timers.push(setTimeout(function () { requestAnimationFrame(step); }, staged ? REVEAL.end * 1000 : 300));
      }
      if (run) {
        var chips = el('div', 'bsc-chips');
        runChips(run, fullCombo).forEach(function (c) {
          var chip = el('span', c.cls, c.text);
          if (c.aria) chip.setAttribute('aria-label', c.aria);
          if (c.title) chip.title = c.title;
          chips.appendChild(chip);
        });
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

    if (staged) {
      card.classList.add('bsc-staged');
      // What arrives last: points, chips, rainbow chip, stats, buttons.
      Array.prototype.forEach.call(card.querySelectorAll('.bsc-points, .bsc-chips, .bsc-rainbow-chip, .bsc-details, .bsc-actions'), function (n) { n.classList.add('bsc-later'); });
      bestChip.classList.add(newBest ? 'bsc-stampee' : 'bsc-later');
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    if (staged) runReveal({ card: card, overlay: overlay, key: key, stars: stars, newBest: newBest, correctEl: correctEl, shown: shown, total: total, booha: booha, danceJob: danceJob, tierTuneEvents: tierTune(key, total > 0 ? (correct / total) * 15 : 0) });
    document.documentElement.classList.add('bsc-open');
    // Focus the card itself so screen readers land in the dialog without a
    // focus ring flashing on the button for touch players.
    card.setAttribute('tabindex', '-1');
    try { card.focus({ preventScroll: true }); } catch (_) { card.focus(); }

    // Star pops, rainbow sparkle and the tier jingle, all on the audio clock.
    playTune(scoreTune(key, correct, total, stars, rainbow, calm, newBest));
    return { tier: key, stars: stars, rainbow: rainbow, close: close };
  }

  var api = { show: show, close: close, tierFor: tierFor, runChips: runChips, scoreTune: scoreTune, TIERS: TIERS, REVEAL: REVEAL };
  window.BoohaScorecard = api;
  if (window.GAME_UTILS) {
    window.GAME_UTILS.showScorecard = function (opts) { return show(opts); };
  }
})();
