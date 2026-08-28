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

  // Pass 26F: Muenba danger is a living threat, not a single looping sample.
  // Keep the scheduler here with the shared WebAudio context so it uses the
  // same user-gesture unlock as every other short SFX and can be stopped as
  // one group when the danger state ends.
  var dangerScreamTimer = 0;
  var dangerScreamActive = false;
  var dangerScreamVoices = [];
  var lastDangerScreamPreset = -1;
  var dangerNoiseBuffer = null;
  var DANGER_SCREAM_PRESETS = [
    'banshee', 'psycho', 'beast', 'burst',
    'demonic', 'parasite', 'wail', 'rasp'
  ];

  // Pass 28A: authored scream samples share this same AudioContext. Keep
  // loading lazy so pages that never enter Muenba do not pay the download or
  // decode cost, then retain one decoded buffer per clip for cheap replay.
  var DANGER_SCREAM_SAMPLE_URLS = [1, 2, 3, 4, 5, 6].map(function (index) {
    return 'assets/img/muenba/screams/scream_' + index + '.mp3';
  });
  var dangerScreamSampleBuffers = new Map();
  var dangerScreamSampleLoads = new Map();
  var dangerScreamSampleVoices = [];

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
    return DANGER_SCREAM_SAMPLE_URLS[Math.floor(Math.random() * DANGER_SCREAM_SAMPLE_URLS.length)];
  }

  // Play one decoded sample with a small pitch window. `gain` is deliberately
  // an explicit input so the upcoming chase scheduler can make later screams
  // quieter without rebuilding the audio graph.
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
    var volume = Math.max(0, Math.min(SFX_MAX_GAIN, Number(options.gain) || 0.13));
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(pitch, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + buffer.duration / pitch);
    source.connect(gain);
    gain.connect(c.destination);
    source.onended = function () {
      var index = dangerScreamSampleVoices.indexOf(source);
      if (index >= 0) dangerScreamSampleVoices.splice(index, 1);
    };
    dangerScreamSampleVoices.push(source);
    source.start(now);
    return source;
  }

  function stopDangerScreamSamples() {
    dangerScreamSampleVoices.forEach(function (source) {
      try { source.stop(); } catch (_) {}
    });
    dangerScreamSampleVoices = [];
  }

  function trackDangerVoice(nodes, duration) {
    var voice = { nodes: nodes };
    dangerScreamVoices.push(voice);
    window.setTimeout(function () {
      var index = dangerScreamVoices.indexOf(voice);
      if (index >= 0) dangerScreamVoices.splice(index, 1);
    }, (duration + 0.3) * 1000);
  }

  // A small cached noise bed gives the abrasive profiles a vocal/air texture
  // without adding another asset. Reusing the buffer keeps repeated pulses
  // cheap on mobile while each BufferSource remains independently stoppable.
  function getDangerNoiseBuffer(c) {
    if (dangerNoiseBuffer && dangerNoiseBuffer.sampleRate === c.sampleRate) {
      return dangerNoiseBuffer;
    }
    var duration = 2.2;
    var buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    dangerNoiseBuffer = buffer;
    return buffer;
  }

  function addDangerNoise(c, now, duration, options) {
    options = options || {};
    var noise = c.createBufferSource();
    var filter = c.createBiquadFilter();
    var gain = c.createGain();
    noise.buffer = getDangerNoiseBuffer(c);
    filter.type = options.filterType || 'bandpass';
    filter.frequency.setValueAtTime(options.startFreq || 1800, now);
    if (options.endFreq) {
      filter.frequency.exponentialRampToValueAtTime(options.endFreq, now + duration);
    }
    filter.Q.value = options.q || 2.5;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(options.peak || 0.05, now + (options.attack || 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start(now);
    noise.stop(now + duration + 0.03);
    return noise;
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
        var bansheeFormant = c.createBiquadFilter();
        var bansheeGain = c.createGain();
        banshee.type = 'sawtooth';
        banshee.frequency.setValueAtTime(1250, now);
        banshee.frequency.exponentialRampToValueAtTime(330, now + 1.65);
        bansheeLfo.frequency.value = 7.5;
        bansheeLfoGain.gain.value = 48;
        bansheeLfo.connect(bansheeLfoGain);
        bansheeLfoGain.connect(banshee.frequency);
        bansheeFormant.type = 'bandpass';
        bansheeFormant.frequency.setValueAtTime(2350, now);
        bansheeFormant.frequency.exponentialRampToValueAtTime(850, now + 1.65);
        bansheeFormant.Q.value = 4.5;
        bansheeGain.gain.setValueAtTime(0.0001, now);
        bansheeGain.gain.linearRampToValueAtTime(0.17, now + 0.16);
        bansheeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);
        banshee.connect(bansheeFormant);
        bansheeFormant.connect(bansheeGain);
        bansheeGain.connect(c.destination);
        banshee.start(now);
        bansheeLfo.start(now);
        banshee.stop(now + 1.7);
        bansheeLfo.stop(now + 1.7);
        var bansheeNoise = addDangerNoise(c, now, 1.65, {
          startFreq: 3200, endFreq: 900, peak: 0.035, q: 3.5, attack: 0.12
        });
        trackDangerVoice([banshee, bansheeLfo, bansheeNoise], 1.7);
        return;
      }

      if (preset === 'psycho') {
        var psycho = c.createOscillator();
        var psychoFm = c.createOscillator();
        var psychoFmGain = c.createGain();
        var psychoFilter = c.createBiquadFilter();
        var psychoGain = c.createGain();
        psycho.type = 'square';
        psycho.frequency.setValueAtTime(2500, now);
        psycho.frequency.linearRampToValueAtTime(3150, now + 0.18);
        psycho.frequency.exponentialRampToValueAtTime(1700, now + 1.2);
        psychoFm.frequency.value = 88;
        psychoFmGain.gain.value = 260;
        psychoFm.connect(psychoFmGain);
        psychoFmGain.connect(psycho.frequency);
        psychoFilter.type = 'highpass';
        psychoFilter.frequency.setValueAtTime(1500, now);
        psychoFilter.frequency.exponentialRampToValueAtTime(700, now + 1.2);
        psychoGain.gain.setValueAtTime(0.0001, now);
        psychoGain.gain.linearRampToValueAtTime(0.12, now + 0.08);
        psychoGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        psycho.connect(psychoFilter);
        psychoFilter.connect(psychoGain);
        psychoGain.connect(c.destination);
        psycho.start(now);
        psychoFm.start(now);
        psycho.stop(now + 1.25);
        psychoFm.stop(now + 1.25);
        var psychoNoise = addDangerNoise(c, now, 1.2, {
          filterType: 'highpass', startFreq: 2600, endFreq: 1200, peak: 0.045, q: 1.2, attack: 0.04
        });
        trackDangerVoice([psycho, psychoFm, psychoNoise], 1.25);
        return;
      }

      if (preset === 'beast') {
        var beast = c.createOscillator();
        var beastFm = c.createOscillator();
        var beastFmGain = c.createGain();
        var beastFilter = c.createBiquadFilter();
        var beastGain = c.createGain();
        beast.type = 'sawtooth';
        beast.frequency.setValueAtTime(220, now);
        beast.frequency.exponentialRampToValueAtTime(62, now + 1.8);
        beastFm.type = 'sawtooth';
        beastFm.frequency.value = 35;
        beastFmGain.gain.value = 105;
        beastFm.connect(beastFmGain);
        beastFmGain.connect(beast.frequency);
        beastFilter.type = 'lowpass';
        beastFilter.frequency.setValueAtTime(760, now);
        beastFilter.frequency.exponentialRampToValueAtTime(260, now + 1.8);
        beastGain.gain.setValueAtTime(0.0001, now);
        beastGain.gain.linearRampToValueAtTime(0.18, now + 0.12);
        beastGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        beast.connect(beastFilter);
        beastFilter.connect(beastGain);
        beastGain.connect(c.destination);
        beast.start(now);
        beastFm.start(now);
        beast.stop(now + 1.85);
        beastFm.stop(now + 1.85);
        var beastNoise = addDangerNoise(c, now, 1.8, {
          filterType: 'lowpass', startFreq: 500, endFreq: 180, peak: 0.04, q: 1.5, attack: 0.1
        });
        trackDangerVoice([beast, beastFm, beastNoise], 1.85);
        return;
      }

      if (preset === 'burst') {
        var burst = c.createOscillator();
        var burstFilter = c.createBiquadFilter();
        var burstGain = c.createGain();
        burst.type = 'sawtooth';
        burst.frequency.setValueAtTime(1650, now);
        burst.frequency.exponentialRampToValueAtTime(190, now + 0.72);
        burstFilter.type = 'bandpass';
        burstFilter.frequency.setValueAtTime(1800, now);
        burstFilter.frequency.exponentialRampToValueAtTime(260, now + 0.72);
        burstFilter.Q.value = 3;
        burstGain.gain.setValueAtTime(0.0001, now);
        burstGain.gain.linearRampToValueAtTime(0.22, now + 0.035);
        burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
        burst.connect(burstFilter);
        burstFilter.connect(burstGain);
        burstGain.connect(c.destination);
        burst.start(now);
        burst.stop(now + 0.77);
        var burstNoise = addDangerNoise(c, now, 0.72, {
          filterType: 'bandpass', startFreq: 2400, endFreq: 420, peak: 0.09, q: 1.8, attack: 0.025
        });
        trackDangerVoice([burst, burstNoise], 0.77);
        return;
      }

      if (preset === 'demonic') {
        var demonic = c.createOscillator();
        var demonicFm = c.createOscillator();
        var demonicFmGain = c.createGain();
        var demonicFormant = c.createBiquadFilter();
        var demonicGain = c.createGain();
        demonic.type = 'sawtooth';
        demonic.frequency.setValueAtTime(900, now);
        demonic.frequency.exponentialRampToValueAtTime(110, now + 1.5);
        demonicFm.frequency.value = 65;
        demonicFmGain.gain.value = 210;
        demonicFm.connect(demonicFmGain);
        demonicFmGain.connect(demonic.frequency);
        demonicFormant.type = 'peaking';
        demonicFormant.frequency.value = 1200;
        demonicFormant.Q.value = 2.5;
        demonicFormant.gain.value = 10;
        demonicGain.gain.setValueAtTime(0.0001, now);
        demonicGain.gain.linearRampToValueAtTime(0.16, now + 0.1);
        demonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        demonic.connect(demonicFormant);
        demonicFormant.connect(demonicGain);
        demonicGain.connect(c.destination);
        demonic.start(now);
        demonicFm.start(now);
        demonic.stop(now + 1.55);
        demonicFm.stop(now + 1.55);
        var demonicNoise = addDangerNoise(c, now, 1.5, {
          filterType: 'bandpass', startFreq: 1500, endFreq: 360, peak: 0.04, q: 2.2, attack: 0.08
        });
        trackDangerVoice([demonic, demonicFm, demonicNoise], 1.55);
        return;
      }

      if (preset === 'parasite') {
        var parasite = c.createOscillator();
        var parasiteMod = c.createOscillator();
        var parasiteModGain = c.createGain();
        var parasiteFilter = c.createBiquadFilter();
        var parasiteGain = c.createGain();
        parasite.type = 'sine';
        parasite.frequency.setValueAtTime(1800, now);
        parasite.frequency.exponentialRampToValueAtTime(260, now + 1.15);
        parasiteMod.type = 'square';
        parasiteMod.frequency.value = 220;
        parasiteModGain.gain.value = 180;
        parasiteMod.connect(parasiteModGain);
        parasiteModGain.connect(parasite.frequency);
        parasiteFilter.type = 'bandpass';
        parasiteFilter.frequency.setValueAtTime(1700, now);
        parasiteFilter.frequency.exponentialRampToValueAtTime(320, now + 1.15);
        parasiteFilter.Q.value = 6;
        parasiteGain.gain.setValueAtTime(0.0001, now);
        parasiteGain.gain.linearRampToValueAtTime(0.13, now + 0.08);
        parasiteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        parasite.connect(parasiteFilter);
        parasiteFilter.connect(parasiteGain);
        parasiteGain.connect(c.destination);
        parasite.start(now);
        parasiteMod.start(now);
        parasite.stop(now + 1.2);
        parasiteMod.stop(now + 1.2);
        var parasiteNoise = addDangerNoise(c, now, 1.15, {
          filterType: 'bandpass', startFreq: 3600, endFreq: 900, peak: 0.035, q: 7, attack: 0.05
        });
        trackDangerVoice([parasite, parasiteMod, parasiteNoise], 1.2);
        return;
      }

      if (preset === 'wail') {
        var wail = c.createOscillator();
        var wailLfo = c.createOscillator();
        var wailLfoGain = c.createGain();
        var wailFormant = c.createBiquadFilter();
        var wailGain = c.createGain();
        wail.type = 'sine';
        wail.frequency.setValueAtTime(600, now);
        wail.frequency.linearRampToValueAtTime(950, now + 0.8);
        wail.frequency.exponentialRampToValueAtTime(400, now + 2.1);
        wailLfo.frequency.value = 8;
        wailLfoGain.gain.value = 38;
        wailLfo.connect(wailLfoGain);
        wailLfoGain.connect(wail.frequency);
        wailFormant.type = 'bandpass';
        wailFormant.frequency.setValueAtTime(1000, now);
        wailFormant.frequency.exponentialRampToValueAtTime(520, now + 2.1);
        wailFormant.Q.value = 7;
        wailGain.gain.setValueAtTime(0.0001, now);
        wailGain.gain.linearRampToValueAtTime(0.14, now + 0.3);
        wailGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
        wail.connect(wailFormant);
        wailFormant.connect(wailGain);
        wailGain.connect(c.destination);
        wail.start(now);
        wailLfo.start(now);
        wail.stop(now + 2.15);
        wailLfo.stop(now + 2.15);
        trackDangerVoice([wail, wailLfo], 2.15);
        return;
      }

      if (preset === 'rasp') {
        var rasp = c.createOscillator();
        var raspFm = c.createOscillator();
        var raspFmGain = c.createGain();
        var raspFormant = c.createBiquadFilter();
        var raspGain = c.createGain();
        rasp.type = 'sawtooth';
        rasp.frequency.setValueAtTime(760, now);
        rasp.frequency.exponentialRampToValueAtTime(300, now + 1.45);
        raspFm.frequency.value = 110;
        raspFmGain.gain.value = 250;
        raspFm.connect(raspFmGain);
        raspFmGain.connect(rasp.frequency);
        raspFormant.type = 'bandpass';
        raspFormant.frequency.setValueAtTime(2500, now);
        raspFormant.frequency.exponentialRampToValueAtTime(720, now + 1.45);
        raspFormant.Q.value = 4;
        raspGain.gain.setValueAtTime(0.0001, now);
        raspGain.gain.linearRampToValueAtTime(0.16, now + 0.14);
        raspGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
        rasp.connect(raspFormant);
        raspFormant.connect(raspGain);
        raspGain.connect(c.destination);
        rasp.start(now);
        raspFm.start(now);
        rasp.stop(now + 1.5);
        raspFm.stop(now + 1.5);
        var raspNoise = addDangerNoise(c, now, 1.45, {
          filterType: 'bandpass', startFreq: 3300, endFreq: 700, peak: 0.06, q: 3.5, attack: 0.1
        });
        trackDangerVoice([rasp, raspFm, raspNoise], 1.5);
        return;
      }
    } catch (_) {}
  }

  function scheduleDangerScreamPulse() {
    if (!dangerScreamActive) return;
    playDangerScreamPulse();
    dangerScreamTimer = window.setTimeout(scheduleDangerScreamPulse, 720 + Math.random() * 720);
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
    /* Pass 26F — staggered Muenba danger voices. Several hostile ghosts can
       request this safely: one scheduler varies the short screams instead
       of restarting a shared one-shot sample on every trigger. */
    startDangerScream: startDangerScream,
    stopDangerScream: stopDangerScream,
    /* Pass 28A — authored Muenba scream sample foundation. */
    preloadDangerScreamSamples: preloadDangerScreamSamples,
    playDangerScreamSample: playDangerScreamSample,
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
  };

  window.UtsuSfx = SFX;
})();
