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

   Pass 20F adds two tiny procedural celebration motifs. Later popup polish
   keeps the same shared path for short UI sounds; BGM and looped tracks stay
   outside this file.
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

  // Pass 22D: UI feedback must be heard over the world's music. Keep the
  // authored palette values restrained, then apply one shared capped boost so
  // every existing popup/click becomes more present without clipping.
  var SFX_GAIN_BOOST = 1.9;
  var SFX_MAX_GAIN = 0.16;

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
      var requestedGain = opts.gain != null ? opts.gain : 0.055;
      var audibleGain = Math.min(SFX_MAX_GAIN, requestedGain * SFX_GAIN_BOOST);
      gain.gain.setValueAtTime(audibleGain, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(start); osc.stop(start + dur + 0.02);
    } catch (_) {}
  }

  // Pass 26E: Muenba danger is a living threat, not a single looping sample.
  // Keep the scheduler here with the shared WebAudio context so it uses the
  // same user-gesture unlock as every other short SFX and can be stopped as
  // one group when the danger state ends.
  var dangerScreamTimer = 0;
  var dangerScreamActive = false;
  var dangerScreamVoices = [];
  var lastDangerScreamPreset = -1;
  var DANGER_SCREAM_PRESETS = ['banshee', 'spectral', 'poltergeist', 'whisper'];

  function trackDangerVoice(nodes, duration) {
    var voice = { nodes: nodes };
    dangerScreamVoices.push(voice);
    window.setTimeout(function () {
      var index = dangerScreamVoices.indexOf(voice);
      if (index >= 0) dangerScreamVoices.splice(index, 1);
    }, (duration + 0.3) * 1000);
  }

  function playDangerScreamPulse() {
    var c = ensureCtx();
    if (!c || !dangerScreamActive) return;
    var presetIndex = Math.floor(Math.random() * DANGER_SCREAM_PRESETS.length);
    if (presetIndex === lastDangerScreamPreset) {
      presetIndex = (presetIndex + 1) % DANGER_SCREAM_PRESETS.length;
    }
    lastDangerScreamPreset = presetIndex;
    var preset = DANGER_SCREAM_PRESETS[presetIndex];
    var now = c.currentTime;

    try {
      if (preset === 'banshee') {
        var banshee = c.createOscillator();
        var bansheeLfo = c.createOscillator();
        var bansheeLfoGain = c.createGain();
        var bansheeGain = c.createGain();
        banshee.type = 'sine';
        banshee.frequency.setValueAtTime(1250, now);
        banshee.frequency.exponentialRampToValueAtTime(300, now + 1.05);
        bansheeLfo.frequency.value = 7;
        bansheeLfoGain.gain.value = 55;
        bansheeLfo.connect(bansheeLfoGain);
        bansheeLfoGain.connect(banshee.frequency);
        bansheeGain.gain.setValueAtTime(0.0001, now);
        bansheeGain.gain.linearRampToValueAtTime(0.15, now + 0.12);
        bansheeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
        banshee.connect(bansheeGain);
        bansheeGain.connect(c.destination);
        banshee.start(now);
        bansheeLfo.start(now);
        banshee.stop(now + 1.08);
        bansheeLfo.stop(now + 1.08);
        trackDangerVoice([banshee, bansheeLfo], 1.08);
        return;
      }

      if (preset === 'spectral') {
        var spectral = c.createOscillator();
        var spectralFilter = c.createBiquadFilter();
        var spectralGain = c.createGain();
        spectral.type = 'triangle';
        spectral.frequency.setValueAtTime(170, now);
        spectral.frequency.linearRampToValueAtTime(320, now + 0.45);
        spectral.frequency.exponentialRampToValueAtTime(115, now + 1.25);
        spectralFilter.type = 'bandpass';
        spectralFilter.Q.value = 9;
        spectralFilter.frequency.setValueAtTime(260, now);
        spectralFilter.frequency.exponentialRampToValueAtTime(900, now + 0.5);
        spectralFilter.frequency.exponentialRampToValueAtTime(160, now + 1.25);
        spectralGain.gain.setValueAtTime(0.0001, now);
        spectralGain.gain.linearRampToValueAtTime(0.17, now + 0.18);
        spectralGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
        spectral.connect(spectralFilter);
        spectralFilter.connect(spectralGain);
        spectralGain.connect(c.destination);
        spectral.start(now);
        spectral.stop(now + 1.28);
        trackDangerVoice([spectral], 1.28);
        return;
      }

      if (preset === 'poltergeist') {
        var shriekGain = c.createGain();
        var shriekOne = c.createOscillator();
        var shriekTwo = c.createOscillator();
        shriekOne.type = 'sawtooth';
        shriekTwo.type = 'sawtooth';
        shriekOne.frequency.setValueAtTime(2200, now);
        shriekOne.frequency.exponentialRampToValueAtTime(420, now + 0.66);
        shriekTwo.frequency.setValueAtTime(2240, now);
        shriekTwo.frequency.exponentialRampToValueAtTime(440, now + 0.66);
        shriekGain.gain.setValueAtTime(0.0001, now);
        shriekGain.gain.linearRampToValueAtTime(0.08, now + 0.025);
        shriekGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.66);
        shriekOne.connect(shriekGain);
        shriekTwo.connect(shriekGain);
        shriekGain.connect(c.destination);
        shriekOne.start(now);
        shriekTwo.start(now);
        shriekOne.stop(now + 0.7);
        shriekTwo.stop(now + 0.7);
        trackDangerVoice([shriekOne, shriekTwo], 0.7);
        return;
      }

      // Whisper: filtered noise gives the scheduler a texture that is not
      // another pitched oscillator, while staying short enough for mobile.
      var duration = 1.1;
      var buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
      var noiseData = buffer.getChannelData(0);
      for (var i = 0; i < noiseData.length; i += 1) noiseData[i] = Math.random() * 2 - 1;
      var whisper = c.createBufferSource();
      var whisperFilter = c.createBiquadFilter();
      var whisperGain = c.createGain();
      whisper.buffer = buffer;
      whisperFilter.type = 'bandpass';
      whisperFilter.Q.value = 13;
      whisperFilter.frequency.setValueAtTime(220, now);
      whisperFilter.frequency.exponentialRampToValueAtTime(1700, now + 0.5);
      whisperFilter.frequency.exponentialRampToValueAtTime(150, now + duration);
      whisperGain.gain.setValueAtTime(0.0001, now);
      whisperGain.gain.linearRampToValueAtTime(0.16, now + 0.2);
      whisperGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      whisper.connect(whisperFilter);
      whisperFilter.connect(whisperGain);
      whisperGain.connect(c.destination);
      whisper.start(now);
      whisper.stop(now + duration + 0.03);
      trackDangerVoice([whisper], duration + 0.03);
    } catch (_) {}
  }

  function scheduleDangerScreamPulse() {
    if (!dangerScreamActive) return;
    playDangerScreamPulse();
    dangerScreamTimer = window.setTimeout(scheduleDangerScreamPulse, 1050 + Math.random() * 750);
  }

  function startDangerScream() {
    if (dangerScreamActive) return;
    if (!ensureCtx()) return;
    dangerScreamActive = true;
    scheduleDangerScreamPulse();
  }

  function stopDangerScream() {
    dangerScreamActive = false;
    if (dangerScreamTimer) window.clearTimeout(dangerScreamTimer);
    dangerScreamTimer = 0;
    dangerScreamVoices.forEach(function (voice) {
      voice.nodes.forEach(function (node) {
        try { node.stop(); } catch (_) {}
      });
    });
    dangerScreamVoices = [];
  }

  /* Small, intentionally restrained offsets. The motif should feel like a
     color in the ear, not a different instrument or a difficulty signal. */
  var MOTIF_PITCH = {
    lantern: 1,
    candy: 1.0595,
    reflection: 1.1225,
    window: 0.9439,
    thorn: 0.8909,
    ribbon: 1.0595,
  };
  function motifPitch(motif) { return MOTIF_PITCH[motif] || 1; }

  var SFX = {
    /* Correct answer in the reading challenge — a short bright upward
       tick, deliberately smaller/lighter than the give-memory sound
       below so the two "success" moments don't compete. */
    correct: function (motif) {
      var pitch = motifPitch(motif);
      tone(660 * pitch, { type: 'sine', gain: 0.05, dur: 0.075 });
      tone(880 * pitch, { type: 'sine', gain: 0.045, dur: 0.09, delay: 0.05 });
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
    /* Short popup open/close cues. These are deliberately distinct from the
       reading correct/wrong cues so opening a card never sounds like an
       answer judgment. */
    popupOpen: function () {
      tone(330, { type: 'triangle', gain: 0.075, dur: 0.08 });
      tone(495, { type: 'sine', gain: 0.06, dur: 0.12, delay: 0.045 });
    },
    popupClose: function () {
      tone(620, { type: 'triangle', gain: 0.06, dur: 0.055 });
      tone(390, { type: 'sine', gain: 0.05, dur: 0.09, delay: 0.035 });
    },
    /* Any .dp-btn press — a very light click, quieter than every other
       sound here on purpose since it fires often. */
    buttonPress: function () {
      tone(720, { type: 'square', gain: 0.05, dur: 0.035 });
    },
    /* Index hub: a friendly three-note acknowledgement for primary actions. */
    hubPrimary: function () {
      tone(392, { type: 'triangle', gain: 0.075, dur: 0.075 });
      tone(523.25, { type: 'sine', gain: 0.065, dur: 0.1, delay: 0.05 });
      tone(659.25, { type: 'sine', gain: 0.055, dur: 0.15, delay: 0.11 });
    },
    /* Index hub: a quick two-note confirmation for choosing a curriculum. */
    hubSelect: function () {
      tone(560, { type: 'triangle', gain: 0.065, dur: 0.055 });
      tone(840, { type: 'sine', gain: 0.055, dur: 0.085, delay: 0.04 });
    },
    /* A tiny two-click bone rattle for the Observer close/exit moment. */
    skeletonClose: function () {
      tone(1200, { type: 'triangle', gain: 0.07, dur: 0.04 });
      tone(1800, { type: 'triangle', gain: 0.06, dur: 0.04, delay: 0.035 });
    },
    /* Friendly mischief: useful for Nuppi and other cute character cards. */
    mischiefReward: function () {
      var notes = [311.13, 369.99, 440.00, 622.25];
      notes.forEach(function (freq, index) {
        tone(freq, { type: 'sine', gain: 0.07, dur: 0.1, delay: index * 0.05 });
      });
    },
    /* Green, sticky, descending click for slime/Observer interactions. */
    slimeClick: function () {
      tone(500, { type: 'sawtooth', gain: 0.075, dur: 0.07, slideTo: 90 });
    },
    /* A short shudder for an actual ghost mistake, kept below a jumpscare. */
    ghostError: function () {
      tone(240, { type: 'sawtooth', gain: 0.075, dur: 0.22, slideTo: 110 });
    },
    /* Locked-world feedback: a low, brief double knock. */
    lockedRattle: function () {
      tone(140, { type: 'square', gain: 0.08, dur: 0.04, slideTo: 70 });
      tone(140, { type: 'square', gain: 0.065, dur: 0.04, delay: 0.05, slideTo: 70 });
    },
    /* Soft cancellation/fade-out cue for a dismissed scary prompt. */
    phantomCancel: function () {
      tone(320, { type: 'triangle', gain: 0.07, dur: 0.16, slideTo: 50 });
    },
    /* Pass 26E — staggered Muenba danger voices. Several hostile ghosts can
       request this safely: one scheduler varies the short screams instead
       of restarting a shared one-shot sample on every trigger. */
    startDangerScream: startDangerScream,
    stopDangerScream: stopDangerScream,
    /* A memory successfully handed to its drifter — the moment
       startCelebration() fires. Three-note warm rise, deliberately
       distinct from correct() (brighter/thinner) and from the old
       ding.mp3-based celebration chime (a single sample pitched twice)
       so "you answered right" and "you completed the whole memory"
       don't sound like the same event at two volumes. */
    giveMemory: function (motif) {
      var pitch = motifPitch(motif);
      tone(523.25 * pitch, { type: 'sine', gain: 0.06, dur: 0.14 });
      tone(659.25 * pitch, { type: 'sine', gain: 0.055, dur: 0.16, delay: 0.1 });
      tone(783.99 * pitch, { type: 'sine', gain: 0.05, dur: 0.26, delay: 0.2 });
    },
    /* Pass 20F — first Wanderer discovery: a small, bright four-note
       rise. It is celebratory without competing with Karasuki's music. */
    wandererFound: function () {
      tone(523.25, { type: 'triangle', gain: 0.052, dur: 0.12 });
      tone(659.25, { type: 'triangle', gain: 0.048, dur: 0.14, delay: 0.08 });
      tone(783.99, { type: 'sine', gain: 0.045, dur: 0.18, delay: 0.17 });
      tone(1046.5, { type: 'sine', gain: 0.038, dur: 0.28, delay: 0.28 });
    },
    /* Pass 20F — returning Wanderer: warmer and shorter than a discovery,
       like a friendly wave rather than a new-unlock fanfare. */
    wandererReturn: function () {
      tone(392.00, { type: 'sine', gain: 0.045, dur: 0.12 });
      tone(493.88, { type: 'triangle', gain: 0.042, dur: 0.14, delay: 0.09 });
      tone(587.33, { type: 'sine', gain: 0.04, dur: 0.22, delay: 0.19 });
    },
  };

  window.UtsuSfx = SFX;
})();
