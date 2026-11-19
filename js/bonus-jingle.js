/* ══════════════════════════════════════════════════════════════
   bonus-jingle.js  —  End jingle for the standalone bonus pages
   (Audio Pass 3). Synthesized on the shared js/booha-sfx.js context,
   which the player's taps have already unlocked, so iPad Safari has
   nothing to block, even when the game ends on its own (a falling piece).

   The tune follows the stars the run earned (registry thresholds):
     0  a friendly bounce that still ends going up
     1  a three-note rise
     2  an arpeggio with a shimmer
     3  a short fanfare
   A new personal best adds a sparkle run on top.
   If the context isn't running, the jingle is skipped, never played late.
   tune() is pure data so tests can check it without audio.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BoohaBonusJingle) return;

  function tune(stars, newBest) {
    var s = Math.max(0, Math.min(3, Math.round(Number(stars) || 0)));
    var ev = [];
    var pop = function (at, note, len, vol) { ev.push({ at: at, kind: 'pop', note: note, len: len || 0.2, vol: vol == null ? 0.45 : vol }); };
    var spark = function (at, note) { ev.push({ at: at, kind: 'spark', note: note, len: 0.22, vol: 0.18 }); };
    var chord = function (at, notes, len) { ev.push({ at: at, kind: 'chord', notes: notes, len: len, vol: 0.12 }); };
    var end;
    if (s === 0) {
      pop(0, 60, 0.18); pop(0.15, 67, 0.18); pop(0.32, 72, 0.42, 0.5);
      end = 0.74;
    } else if (s === 1) {
      pop(0, 67); pop(0.11, 72); pop(0.22, 76); pop(0.36, 79, 0.45, 0.52);
      end = 0.81;
    } else if (s === 2) {
      pop(0, 72, 0.16); pop(0.09, 76, 0.16); pop(0.18, 79, 0.16); pop(0.27, 84, 0.18);
      chord(0.4, [72, 76, 79], 0.5); pop(0.4, 88, 0.5, 0.55);
      [93, 96, 100].forEach(function (n, i) { spark(0.55 + i * 0.06, n); });
      end = 0.9;
    } else {
      pop(0, 67, 0.12); pop(0.1, 67, 0.12);
      chord(0.22, [72, 76, 79, 84], 0.6);
      pop(0.22, 84, 0.18, 0.5); pop(0.38, 88, 0.18, 0.5); pop(0.54, 91, 0.7, 0.58);
      [108, 103, 100, 96].forEach(function (n, i) { spark(0.66 + i * 0.07, n); });
      end = 1.24;
    }
    if (newBest) {
      [96, 98, 100, 103, 105, 108].forEach(function (n, i) { spark(end + 0.05 + i * 0.05, n); });
    }
    return ev;
  }

  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tone(c, out, type, f, t, len, peak, fromF) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(fromF || f, t);
    if (fromF) o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 0.03);
  }
  function voice(c, out, t, e) {
    if (e.kind === 'pop') {
      var f = hz(e.note);
      tone(c, out, 'sine', f, t, e.len, e.vol, f * 0.62);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(out);
      tone(c, lp, 'square', f, t, Math.min(0.16, e.len), e.vol * 0.12);
      tone(c, out, 'sine', f * 2, t, 0.06, e.vol * 0.25);
    } else if (e.kind === 'spark') {
      tone(c, out, 'sine', hz(e.note), t, e.len, e.vol);
      tone(c, out, 'sine', hz(e.note) * 2.76, t, e.len * 0.45, e.vol * 0.3);
    } else if (e.kind === 'chord') {
      e.notes.forEach(function (n) { tone(c, out, 'triangle', hz(n), t, e.len, e.vol); });
    }
  }

  /* opts: { stars, newBest }. Returns true when the jingle was scheduled. */
  function play(opts) {
    opts = opts || {};
    var S = window.BoohaSFX;
    var c = S && typeof S.context === 'function' ? S.context() : null;
    if (!c || c.state !== 'running') return false;
    try {
      var events = tune(opts.stars, opts.newBest);
      var comp = c.createDynamicsCompressor();
      comp.connect(c.destination);
      var bus = c.createGain();
      bus.gain.value = 0.6;
      bus.connect(comp);
      var t0 = c.currentTime + 0.03, end = 0;
      events.forEach(function (e) { voice(c, bus, t0 + e.at, e); end = Math.max(end, e.at + e.len); });
      setTimeout(function () { try { bus.disconnect(); comp.disconnect(); } catch (_) {} }, Math.ceil((end + 0.5) * 1000));
      return true;
    } catch (_) { return false; }
  }

  window.BoohaBonusJingle = { play: play, tune: tune };
})();
