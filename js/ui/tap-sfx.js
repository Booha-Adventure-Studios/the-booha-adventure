/* ══════════════════════════════════════════════════════════════
   tap-sfx.js  —  Small UI sounds for the quiet pages (Audio Pass 6)
   Profile pages, the study deck and homework call these by name:

     BoohaTapSfx.play('select')   a bright two-note pop (pick a card / tab)
                      'back'      the same, falling
                      'open'      a soft rising swish-pop (open a card/popup)
                      'close'     a soft falling pop
                      'next' / 'prev'  a light tick, higher / lower
                      'flip'      a quick paper "fwip"
                      'tick'      two-note "got it" (mark known)
                      'untick'    one soft low note
                      'equip'     a three-note sparkle (wear a skin)

   Synthesized on the shared js/booha-sfx.js context, which the tap itself
   unlocks. Quiet by design, and never on top of other sound: nothing plays
   while a <video> or <audio> element on the page is playing (intros and
   flyovers keep their own baked-in audio), or when the context isn't running.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BoohaTapSfx) return;

  function mediaPlaying() {
    try {
      var media = document.querySelectorAll('video, audio');
      for (var i = 0; i < media.length; i++) {
        if (!media[i].paused && !media[i].ended && !media[i].muted) return true;
      }
    } catch (_) {}
    return false;
  }
  function context() {
    var S = window.BoohaSFX;
    var c = S && typeof S.context === 'function' ? S.context() : null;
    return c && c.state === 'running' ? c : null;
  }
  function note(c, out, f, t, len, peak, type, fromF) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(fromF || f, t);
    if (fromF) o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.03);
  }
  function hiss(c, out, t, len, from, to, peak) {
    var n = Math.max(1, Math.floor(c.sampleRate * len)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp); bp.connect(g); g.connect(out); src.start(t);
  }

  var SOUNDS = {
    select: function (c, o, t) { note(c, o, 784, t, 0.12, 0.12, 'sine', 560); note(c, o, 1175, t + 0.06, 0.18, 0.1); },
    back:   function (c, o, t) { note(c, o, 1047, t, 0.12, 0.1); note(c, o, 698, t + 0.07, 0.18, 0.1); },
    open:   function (c, o, t) { hiss(c, o, t, 0.16, 600, 2400, 0.05); note(c, o, 880, t + 0.08, 0.2, 0.1, 'sine', 620); },
    close:  function (c, o, t) { hiss(c, o, t, 0.12, 2000, 700, 0.04); note(c, o, 660, t + 0.03, 0.16, 0.08, 'triangle'); },
    next:   function (c, o, t) { note(c, o, 1320, t, 0.06, 0.07); },
    prev:   function (c, o, t) { note(c, o, 990, t, 0.06, 0.07); },
    flip:   function (c, o, t) { hiss(c, o, t, 0.1, 900, 3600, 0.08); note(c, o, 1568, t + 0.05, 0.08, 0.05); },
    tick:   function (c, o, t) { note(c, o, 1047, t, 0.1, 0.1, 'sine', 800); note(c, o, 1568, t + 0.07, 0.22, 0.1); },
    untick: function (c, o, t) { note(c, o, 523, t, 0.16, 0.09, 'triangle'); },
    equip:  function (c, o, t) { [1319, 1568, 2093].forEach(function (f, i) { note(c, o, f, t + i * 0.06, 0.22, 0.08); }); }
  };

  /* Cooldown: the same sound can't repeat within COOLDOWN_MS, so a smashed
     button gives at most a steady quiet tick, never a barrage. */
  var COOLDOWN_MS = 140;
  var lastAt = {};

  /* Returns true when the sound was scheduled. */
  function play(name) {
    var make = SOUNDS[name];
    if (!make || mediaPlaying()) return false;
    var now = Date.now();
    if (now - (lastAt[name] || 0) < COOLDOWN_MS) return false;
    lastAt[name] = now;
    var c = context();
    if (!c) return false;
    try {
      var out = c.createGain();
      out.gain.value = 0.8;
      out.connect(c.destination);
      make(c, out, c.currentTime + 0.01);
      setTimeout(function () { try { out.disconnect(); } catch (_) {} }, 800);
      return true;
    } catch (_) { return false; }
  }

  window.BoohaTapSfx = { play: play, names: Object.keys(SOUNDS), COOLDOWN_MS: COOLDOWN_MS };
})();
