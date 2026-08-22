/* ═══════════════════════════════════════════
   UTSU SFX — shared sound palette
   Round 2, Pass 3 (see claude/utsuroba-audit-and-pass-plan.md)

   Before this pass the entire non-music sound identity across Utsuroba
   and Karasuki was two sounds: the typewriter tick (a WebAudio
   oscillator, still in utsuroba.js — untouched by this file, kept as
   the user asked) and ding.mp3, reused three different ways (orb
   collect, correct-answer feel, and the celebration fanfare — literally
   the same file played twice, second note pitched up). Worse, the
   reading challenge's own right/wrong feedback (advanceQuestion() /
   showWrong() in utsuroba-reading.js) had ZERO sound on either side —
   the docs claimed a wrong-answer tone had shipped there; it hadn't.

   This file is a small, cheap oscillator-tone palette (same technique
   already established for the typewriter tick — no new audio files) so
   every distinct moment gets its own distinct sound instead of the same
   ding.mp3 reused everywhere. Loaded by both utsuroba.html and
   karasuki.html, right after js/utsu-card.js.
*/
(function () {
  'use strict';

  var ctx = null;
  function ensureCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    return ctx;
  }

  /* One short tone. freq in Hz, opts: {type, gain, dur, delay}. */
  function tone(freq, opts) {
    opts = opts || {};
    try {
      var c = ensureCtx();
      if (!c) return;
      var start = c.currentTime + (opts.delay || 0);
      var dur   = opts.dur != null ? opts.dur : 0.09;
      var osc   = c.createOscillator();
      var gain  = c.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
      gain.gain.setValueAtTime(opts.gain != null ? opts.gain : 0.055, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(start); osc.stop(start + dur + 0.02);
    } catch (_) {}
  }

  var SFX = {
    /* Correct answer in the reading challenge — a short bright upward
       tick, deliberately smaller/lighter than the give-memory sound
       below so the two "success" moments don't compete. */
    correct: function () {
      tone(660, { type: 'sine', gain: 0.05, dur: 0.075 });
      tone(880, { type: 'sine', gain: 0.045, dur: 0.09, delay: 0.05 });
    },
    /* Wrong answer in the reading challenge — soft two-note descending
       dip. A "try again" nudge, not a buzzer, for ESL readers working
       through a story. This is the tone the Pass 7 audit note claimed
       had shipped; it hadn't, until this pass. */
    wrong: function () {
      tone(430, { type: 'sine', gain: 0.05, dur: 0.13 });
      tone(340, { type: 'sine', gain: 0.045, dur: 0.16, delay: 0.09 });
    },
    /* A drawer/panel sliding open (drifter panel, orb panel). */
    panelOpen: function () {
      tone(480, { type: 'triangle', gain: 0.04, dur: 0.08 });
      tone(640, { type: 'triangle', gain: 0.038, dur: 0.1, delay: 0.045 });
    },
    /* A drawer/panel sliding shut — same voice as panelOpen, played in
       reverse (falling instead of rising) so open/close read as a pair. */
    panelClose: function () {
      tone(560, { type: 'triangle', gain: 0.036, dur: 0.08 });
      tone(420, { type: 'triangle', gain: 0.034, dur: 0.1, delay: 0.04 });
    },
    /* Any .dp-btn press — a very light click, quieter than every other
       sound here on purpose since it fires often. */
    buttonPress: function () {
      tone(720, { type: 'square', gain: 0.03, dur: 0.03 });
    },
    /* A memory successfully handed to its drifter — the moment
       startCelebration() fires. Three-note warm rise, deliberately
       distinct from correct() (brighter/thinner) and from the old
       ding.mp3-based celebration chime (a single sample pitched twice)
       so "you answered right" and "you completed the whole memory"
       don't sound like the same event at two volumes. */
    giveMemory: function () {
      tone(523.25, { type: 'sine', gain: 0.06, dur: 0.14 });
      tone(659.25, { type: 'sine', gain: 0.055, dur: 0.16, delay: 0.1 });
      tone(783.99, { type: 'sine', gain: 0.05, dur: 0.26, delay: 0.2 });
    },
  };

  window.UtsuSfx = SFX;
})();
