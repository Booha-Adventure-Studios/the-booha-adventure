/* ═══════════════════════════════════════════
   UTSU SFX — shared sound palette
   Round 2, Pass 3

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
  // Danger samples are authored full-volume one-shots, not tiny UI tones.
  // Give them their own headroom so an angry ghost cannot look active while
  // its scream is buried under the cemetery BGM.
  var DANGER_SCREAM_BASE_GAIN = 2.05;
  var DANGER_SCREAM_MAX_GAIN = 2.3;
  var dangerScreamLimiter = null;

  function ensureDangerScreamLimiter(c) {
    if (dangerScreamLimiter) return dangerScreamLimiter;
    var limiter = c.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-3, c.currentTime);
    limiter.knee.setValueAtTime(0, c.currentTime);
    limiter.ratio.setValueAtTime(20, c.currentTime);
    limiter.attack.setValueAtTime(0.003, c.currentTime);
    limiter.release.setValueAtTime(0.12, c.currentTime);
    limiter.connect(c.destination);
    dangerScreamLimiter = limiter;
    return limiter;
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
      var requestedGain = opts.gain != null ? opts.gain : 0.055;
      var audibleGain = Math.min(SFX_MAX_GAIN, requestedGain * SFX_GAIN_BOOST);
      gain.gain.setValueAtTime(audibleGain, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(start); osc.stop(start + dur + 0.02);
    } catch (_) {}
  }

  /* ── Karasuki Cards reveal voices (Pass 4a) ─────────────────────────
     The reveal stacks several voices at once, so they share one gentle
     compressor bus instead of going straight to the speakers. Every voice
     still passes through the same capped gain as tone(). */
  var cardBusNode = null;
  function cardBus(c) {
    if (cardBusNode && cardBusNode.context === c) return cardBusNode;
    var comp = c.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-14, c.currentTime);
    comp.knee.setValueAtTime(10, c.currentTime);
    comp.ratio.setValueAtTime(5, c.currentTime);
    comp.attack.setValueAtTime(0.004, c.currentTime);
    comp.release.setValueAtTime(0.25, c.currentTime);
    comp.connect(c.destination);
    cardBusNode = comp;
    return comp;
  }
  function capped(g) { return Math.min(SFX_MAX_GAIN, (g != null ? g : 0.05) * SFX_GAIN_BOOST); }

  /* A note that fades IN then out (tone() only decays). opts: {type, gain,
     dur, delay, attack, slideTo, lowpass, lowpassTo}. */
  function swell(freq, opts) {
    opts = opts || {};
    try {
      var c = ensureCtx();
      if (!c) return;
      var start = c.currentTime + (opts.delay || 0);
      var dur = opts.dur != null ? opts.dur : 0.6;
      var attack = Math.min(dur * 0.9, opts.attack != null ? opts.attack : dur * 0.4);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
      var node = osc;
      if (opts.lowpass) {
        var lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(opts.lowpass, start);
        if (opts.lowpassTo) lp.frequency.exponentialRampToValueAtTime(opts.lowpassTo, start + dur);
        osc.connect(lp); node = lp;
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(capped(opts.gain), start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      node.connect(gain); gain.connect(cardBus(c));
      osc.start(start); osc.stop(start + dur + 0.03);
    } catch (_) {}
  }

  var noiseBuffer = null;
  /* Filtered white noise (rumbles, whooshes). opts: {gain, dur, delay,
     attack, type ('bandpass'|'lowpass'), from, to, q}. */
  function noiseSweep(opts) {
    opts = opts || {};
    try {
      var c = ensureCtx();
      if (!c) return;
      if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
        noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      var start = c.currentTime + (opts.delay || 0);
      var dur = opts.dur != null ? opts.dur : 0.4;
      var attack = Math.min(dur * 0.9, opts.attack != null ? opts.attack : dur * 0.35);
      var src = c.createBufferSource();
      src.buffer = noiseBuffer;
      var filter = c.createBiquadFilter();
      filter.type = opts.type || 'bandpass';
      filter.Q.setValueAtTime(opts.q != null ? opts.q : 1, start);
      filter.frequency.setValueAtTime(opts.from || 400, start);
      if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
      var gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(capped(opts.gain), start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(filter); filter.connect(gain); gain.connect(cardBus(c));
      src.start(start); src.stop(start + dur + 0.03);
    } catch (_) {}
  }

  // Pass 28A: authored scream samples share this same AudioContext. Keep
  // loading lazy so pages that never enter Muenba do not pay the download or
  // decode cost, then retain one decoded buffer per clip for cheap replay.
  var DANGER_SCREAM_SAMPLE_URLS = [1, 2, 3, 4, 5, 6].map(function (index) {
    return 'assets/img/muenba/screams/scream_' + index + '.mp3';
  });
  var dangerScreamSampleBuffers = new Map();
  var dangerScreamSampleLoads = new Map();
  var dangerScreamSampleVoices = [];
  var dangerScreamSampleLastUrl = '';
  var dangerSampleScreamTimer = 0;
  var dangerSampleScreamActive = false;
  var dangerSampleScreamCount = 0;
  var dangerSampleScreamDecayEnabled = true;
  var dangerSampleScreamGeneration = 0;

  function loadDangerScreamSample(url) {
    if (dangerScreamSampleBuffers.has(url)) {
      return Promise.resolve(dangerScreamSampleBuffers.get(url));
    }
    if (dangerScreamSampleLoads.has(url)) return dangerScreamSampleLoads.get(url);
    var c = ensureCtx();
    if (!c || typeof window.fetch !== 'function') return Promise.resolve(null);
    var load = window.fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load scream sample');
        return response.arrayBuffer();
      })
      .then(function (encoded) {
        return new Promise(function (resolve, reject) {
          var decoded = c.decodeAudioData(encoded, resolve, reject);
          // Older WebKit returns a promise; newer browsers resolve through the
          // callback above. Supporting both keeps the loader one-shot-safe.
          if (decoded && typeof decoded.then === 'function') decoded.then(resolve, reject);
        });
      })
      .then(function (buffer) {
        dangerScreamSampleBuffers.set(url, buffer);
        dangerScreamSampleLoads.delete(url);
        return buffer;
      })
      .catch(function () {
        dangerScreamSampleLoads.delete(url);
        return null;
      });
    dangerScreamSampleLoads.set(url, load);
    return load;
  }

  function preloadDangerScreamSamples() {
    return Promise.all(DANGER_SCREAM_SAMPLE_URLS.map(loadDangerScreamSample));
  }

  function randomDangerScreamSampleUrl() {
    var candidates = DANGER_SCREAM_SAMPLE_URLS.filter(function (url) {
      return url !== dangerScreamSampleLastUrl;
    });
    var url = candidates[Math.floor(Math.random() * candidates.length)] || DANGER_SCREAM_SAMPLE_URLS[0];
    dangerScreamSampleLastUrl = url;
    return url;
  }

  // Play one decoded sample with a small pitch window. `gain` is deliberately
  // an explicit input so the chase scheduler can taper later screams without
  // rebuilding the audio graph. Danger samples intentionally use their own
  // louder ceiling instead of the small UI-tone cap above.
  function playDangerScreamSample(options) {
    options = options || {};
    var c = ensureCtx();
    if (!c) return null;
    var url = options.url || randomDangerScreamSampleUrl();
    var buffer = dangerScreamSampleBuffers.get(url);
    if (!buffer) {
      loadDangerScreamSample(url);
      return null;
    }
    var source = c.createBufferSource();
    var gain = c.createGain();
    var now = c.currentTime;
    var minPitch = Number.isFinite(options.minPitch) ? options.minPitch : 0.92;
    var maxPitch = Number.isFinite(options.maxPitch) ? options.maxPitch : 1.08;
    var pitch = minPitch + Math.random() * Math.max(0, maxPitch - minPitch);
    var volume = Math.max(0, Math.min(DANGER_SCREAM_MAX_GAIN, Number(options.gain) || DANGER_SCREAM_BASE_GAIN));
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(pitch, now);
    var playedDur = buffer.duration / pitch;
    var fadeTailSec = Math.min(0.11, playedDur * 0.15);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, now + Math.max(0, playedDur - fadeTailSec));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + playedDur);
    source.connect(gain);
    gain.connect(ensureDangerScreamLimiter(c));
    source.onended = function () {
      var index = dangerScreamSampleVoices.indexOf(source);
      if (index >= 0) dangerScreamSampleVoices.splice(index, 1);
    };
    dangerScreamSampleVoices.push(source);
    source.start(now);
    return source;
  }

  function stopDangerScreamSamples() {
    // Invalidate any in-flight decode callback before stopping voices. This
    // matters when a new ghost starts screaming while the previous clip is
    // still loading: the old callback must not leak into the new encounter.
    dangerSampleScreamGeneration += 1;
    dangerSampleScreamActive = false;
    if (dangerSampleScreamTimer) window.clearTimeout(dangerSampleScreamTimer);
    dangerSampleScreamTimer = 0;
    dangerScreamSampleVoices.forEach(function (source) {
      try { source.stop(); } catch (_) {}
    });
    dangerScreamSampleVoices = [];
  }

  // Pass 28I: each ghost owns a fresh scream run. The first response is loud;
  // later responses taper gently instead of inheriting another ghost's decay.
  // Return trips use decay:false so every warning stays loud while Booha is
  // carrying energy back to Nuppi.
  function scheduleDangerSampleScreamPulse(generation) {
    if (!dangerSampleScreamActive || generation !== dangerSampleScreamGeneration) return;
    var url = randomDangerScreamSampleUrl();
    var play = function (buffer) {
      if (!dangerSampleScreamActive || generation !== dangerSampleScreamGeneration || !buffer) return;
      var gain = dangerSampleScreamDecayEnabled
        ? Math.max(1.1, DANGER_SCREAM_BASE_GAIN * Math.pow(0.9, dangerSampleScreamCount))
        : DANGER_SCREAM_BASE_GAIN;
      playDangerScreamSample({
        url: url,
        gain: gain,
        minPitch: 0.94,
        maxPitch: 1.06
      });
      dangerSampleScreamCount += 1;
      dangerSampleScreamTimer = window.setTimeout(
        function () { scheduleDangerSampleScreamPulse(generation); },
        1800 + Math.random() * 1100
      );
    };
    if (dangerScreamSampleBuffers.has(url)) {
      play(dangerScreamSampleBuffers.get(url));
      return;
    }
    loadDangerScreamSample(url).then(function (buffer) {
      if (buffer) play(buffer);
      else if (dangerSampleScreamActive && generation === dangerSampleScreamGeneration) {
        dangerSampleScreamTimer = window.setTimeout(function () {
          scheduleDangerSampleScreamPulse(generation);
        }, 900);
      }
    });
  }

  function startDangerScreamSamples(options) {
    options = options || {};
    var reset = options.reset === true;
    var decay = options.decay !== false;
    if (dangerSampleScreamActive && !reset) return;
    stopDangerScreamSamples();
    if (!ensureCtx()) return;
    dangerSampleScreamActive = true;
    dangerSampleScreamCount = 0;
    dangerSampleScreamDecayEnabled = decay;
    scheduleDangerSampleScreamPulse(dangerSampleScreamGeneration);
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
    /* Pass 28A/28B — authored Muenba scream sample foundation and scheduler. */
    preloadDangerScreamSamples: preloadDangerScreamSamples,
    playDangerScreamSample: playDangerScreamSample,
    startDangerScreamSamples: startDangerScreamSamples,
    stopDangerScreamSamples: stopDangerScreamSamples,
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
    /* Bespoke "cute" open cue for the Nuppi popup, replacing the borrowed
       mischiefReward() (which stays in the palette for its other callers
       in muenba.js). A light, bouncy bell run that closes on an upward
       "boop" wobble — its own voice instead of a reused generic one. */
    nuppiOpen: function () {
      tone(587.33, { type: 'triangle', gain: 0.06, dur: 0.09 });
      tone(698.46, { type: 'triangle', gain: 0.055, dur: 0.09, delay: 0.06 });
      tone(880.00, { type: 'sine', gain: 0.05, dur: 0.11, delay: 0.12 });
      tone(1046.50, { type: 'sine', gain: 0.045, dur: 0.18, delay: 0.2, slideTo: 1244.51 });
    },
    /* Bespoke "eerie" open cue for the Observer popup, replacing the
       borrowed slimeClick(). Two closely-detuned descending saws beat
       against each other for an uneasy hum, closed out by a small
       mechanical "shutter" click — the Observer noticing you. */
    observerOpen: function () {
      tone(196.00, { type: 'sawtooth', gain: 0.045, dur: 0.32, slideTo: 130.81 });
      tone(207.65, { type: 'sawtooth', gain: 0.032, dur: 0.32, delay: 0.015, slideTo: 138.59 });
      tone(1500, { type: 'square', gain: 0.05, dur: 0.025, delay: 0.27 });
    },

    /* ── Karasuki Cards reveal (Pass 4a). Called in order by the reveal
       timeline in js/karasuki-card-challenge.js; each cue lasts until the
       next one begins. ─────────────────────────────────────────────── */
    /* 0.0s — the world hushes: a low swell under a soft filtered rumble. */
    cardHush: function () {
      swell(55, { type: 'sine', gain: 0.07, dur: 1.7, attack: 0.6, slideTo: 82 });
      noiseSweep({ type: 'lowpass', from: 260, to: 620, q: 0.7, gain: 0.035, dur: 1.5, attack: 0.5 });
    },
    /* 0.4s — the card rises: a filtered rising "charge" and sparkle ticks. */
    cardCharge: function () {
      swell(220, { type: 'sawtooth', gain: 0.03, dur: 1.35, attack: 1.0, slideTo: 466, lowpass: 380, lowpassTo: 2600 });
      swell(330, { type: 'triangle', gain: 0.022, dur: 1.35, attack: 1.0, slideTo: 698 });
      [0.15, 0.32, 0.5, 0.66, 0.8, 0.92, 1.02, 1.1].forEach(function (d, i) {
        tone(1760 + i * 220, { type: 'sine', gain: 0.018, dur: 0.06, delay: d });
      });
    },
    /* 1.7s — the turn: an airy whoosh across the flip. */
    cardWhoosh: function () {
      noiseSweep({ type: 'bandpass', from: 350, to: 4200, q: 1.1, gain: 0.09, dur: 0.5, attack: 0.28 });
    },
    /* 2.05s — the face lands: a sting in the card's kind. */
    cardReveal: function (kind) {
      if (kind === 'dangerous') {
        swell(48, { type: 'sine', gain: 0.09, dur: 1.4, attack: 0.02, slideTo: 34 });
        [110, 130.81, 155.56].forEach(function (f) {
          swell(f, { type: 'sawtooth', gain: 0.03, dur: 1.6, attack: 0.03, lowpass: 900, lowpassTo: 300 });
        });
        tone(1244.5, { type: 'sine', gain: 0.03, dur: 1.9, delay: 0.12 });
        tone(1661.2, { type: 'sine', gain: 0.022, dur: 1.7, delay: 0.16 });
        return;
      }
      if (kind === 'mischievous') {
        [587.33, 739.99, 880, 1174.66, 1479.98].forEach(function (f, i) {
          tone(f * 1.004, { type: 'triangle', gain: 0.045, dur: 0.16, delay: i * 0.07 });
        });
        tone(300, { type: 'triangle', gain: 0.04, dur: 0.22, delay: 0.38, slideTo: 640 });
        [587.33, 739.99, 880].forEach(function (f) {
          swell(f, { type: 'triangle', gain: 0.022, dur: 1.1, attack: 0.03, delay: 0.42 });
        });
        return;
      }
      // friendly (and any future kind): a warm major chord with chimes.
      swell(130.81, { type: 'sine', gain: 0.06, dur: 1.4, attack: 0.03 });
      [523.25, 659.25, 783.99].forEach(function (f) {
        swell(f, { type: 'triangle', gain: 0.03, dur: 1.4, attack: 0.03 });
      });
      [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) {
        tone(f, { type: 'sine', gain: 0.03, dur: 0.6, delay: 0.1 + i * 0.09 });
      });
    },
    /* Binder: turning a card over by hand — a soft paper whoosh and a tap. */
    cardFlip: function () {
      noiseSweep({ type: 'bandpass', from: 700, to: 2600, q: 0.9, gain: 0.05, dur: 0.26, attack: 0.12 });
      tone(1320, { type: 'sine', gain: 0.022, dur: 0.05, delay: 0.2 });
    },
    /* One tick per point as "Words recalled" counts up. */
    cardTick: function (step) {
      tone(900 + (step || 0) * 60, { type: 'sine', gain: 0.018, dur: 0.035 });
    },
  };

  window.UtsuSfx = SFX;
})();
