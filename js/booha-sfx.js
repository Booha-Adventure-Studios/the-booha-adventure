/* ══════════════════════════════════════════════════════════════
   booha-sfx.js  —  Shared Web Audio engine for short game sounds
   (ding, fart, and future UI sounds). Loaded by game.html before
   game-utils.js; GAME_UTILS.unlockAudio / loadSFX / playSFX delegate
   here, so every engine shares one AudioContext and one buffer bank.

   Why this exists (Pass 1 — reliable ding/fart):
   - iPad Safari only starts audio from inside a real tap. The old
     unlock ran once at script load (no tap) and then latched, so later
     taps never re-unlocked. Here every tap re-arms the unlock until the
     context is actually running, and again after any interruption
     (screen lock, app switch, Siri, a phone call).
   - Older iPads (Safari < 14.1) only support the callback form of
     decodeAudioData; the promise-only call left them with no sounds.
   - A failed load is retried once instead of failing silently.
   - Sounds are decoded buffers, never cloned <audio> elements, so they
     start instantly and can overlap.
   - onEnd always fires (real end, or a safety timer), so answer chains
     can never stall on a sound that failed to play.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BoohaSFX) return;

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var buffers = new Map();   // name -> AudioBuffer
  var loading = new Map();   // name -> Promise<boolean>
  var voices = [];           // currently playing sources (oldest first)
  var MAX_VOICES = 8;
  var GESTURES = ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown'];
  var LISTEN_OPTS = { capture: true, passive: true };
  var armed = false;

  /* iOS 17+: let Web Audio play with the ring/silent switch on silent,
     the same way the word clips (HTML audio) already do. */
  function setPlaybackSession() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch (_) {}
  }

  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC(); } catch (_) { ctx = null; return null; }
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      // Interrupted → re-arm the tap unlock; running again (including an
      // async resume finishing after the tap) → remove the listeners.
      var onState = function () { if (ctx.state === 'running') disarm(); else arm(); };
      if (ctx.addEventListener) ctx.addEventListener('statechange', onState);
      else ctx.onstatechange = onState;
    }
    return ctx;
  }

  function running() { return !!ctx && ctx.state === 'running'; }

  function tryResume() {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return;
    try {
      var p = ctx.resume();
      if (p && p.catch) p.catch(function () {});
    } catch (_) {}
  }

  /* Call from inside a user gesture. Safe to call any number of times. */
  function unlock() {
    setPlaybackSession();
    var c = ensure();
    if (!c) return;
    tryResume();
    // iOS needs a source started inside the gesture itself.
    try {
      var b = c.createBuffer(1, 1, 22050);
      var s = c.createBufferSource();
      s.buffer = b;
      s.connect(master);
      if (s.start) s.start(0); else s.noteOn(0);
    } catch (_) {}
    if (running()) disarm(); else arm();
  }

  function onGesture() { unlock(); }

  function arm() {
    if (armed) return;
    armed = true;
    GESTURES.forEach(function (ev) { document.addEventListener(ev, onGesture, LISTEN_OPTS); });
  }

  function disarm() {
    if (!armed) return;
    armed = false;
    GESTURES.forEach(function (ev) { document.removeEventListener(ev, onGesture, LISTEN_OPTS); });
  }

  /* Coming back to the tab (or from the back/forward cache): try to resume
     right away, and keep the tap unlock armed in case the browser refuses. */
  function onReturn() {
    if (document.visibilityState === 'hidden') return;
    tryResume();
    if (!running()) arm();
  }
  document.addEventListener('visibilitychange', onReturn);
  window.addEventListener('pageshow', onReturn);
  window.addEventListener('focus', onReturn);

  function decode(arrayBuffer) {
    return new Promise(function (resolve, reject) {
      try {
        // Callback form works everywhere; newer browsers also return a promise.
        var p = ctx.decodeAudioData(arrayBuffer, resolve, function (e) { reject(e || new Error('decode failed')); });
        if (p && p.then) p.then(resolve, reject);
      } catch (e) { reject(e); }
    });
  }

  function fetchAndDecode(url) {
    return fetch(url, { cache: 'force-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(decode);
  }

  /* Resolves true when the sound is ready, false if it could not load.
     Never rejects, so Promise.all([...loads]) can't break a game start. */
  function load(name, url) {
    if (buffers.has(name)) return Promise.resolve(true);
    if (loading.has(name)) return loading.get(name);
    if (!ensure()) return Promise.resolve(false);
    var attempt = function () { return fetchAndDecode(url); };
    var p = attempt()
      .catch(function () {
        return new Promise(function (r) { setTimeout(r, 800); }).then(attempt);
      })
      .then(function (buf) { buffers.set(name, buf); return true; })
      .catch(function () {
        console.warn('[booha-sfx] Could not load sound:', name, url);
        return false;
      })
      .then(function (ok) { loading.delete(name); return ok; });
    loading.set(name, p);
    return p;
  }

  /* Play a loaded sound now. Returns its duration in seconds (0 if it could
     not play). opts: { volume = 1, rate = 1, onEnd } — onEnd always fires. */
  function play(name, opts) {
    opts = opts || {};
    var onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : null;
    var fired = false;
    var done = function () {
      if (fired) return;
      fired = true;
      if (onEnd) { try { onEnd(); } catch (e) { console.error(e); } }
    };

    var c = ensure();
    var buf = buffers.get(name);
    if (!c || !buf) { setTimeout(done, 0); return 0; }
    if (!running()) { tryResume(); arm(); }

    while (voices.length >= MAX_VOICES) {
      var old = voices.shift();
      try { old.stop(0); } catch (_) {}
    }

    var rate = Number(opts.rate) > 0 ? Number(opts.rate) : 1;
    var vol = opts.volume == null ? 1 : Math.max(0, Math.min(1, Number(opts.volume) || 0));
    var src = c.createBufferSource();
    var g = c.createGain();
    src.buffer = buf;
    try { src.playbackRate.value = rate; } catch (_) {}
    g.gain.value = vol;
    src.connect(g);
    g.connect(master);

    var dur = buf.duration / rate;
    var cleanup = function () {
      var i = voices.indexOf(src);
      if (i >= 0) voices.splice(i, 1);
      try { src.disconnect(); g.disconnect(); } catch (_) {}
      done();
    };
    src.onended = cleanup;
    // A suspended context never fires onended; this keeps chains moving and
    // stops a sound that never started, so it can't burst out on a later tap.
    setTimeout(function () {
      try { src.stop(0); } catch (_) {}
      cleanup();
    }, Math.round(dur * 1000) + 250);

    try {
      if (src.start) src.start(0); else src.noteOn(0);
    } catch (_) { cleanup(); return 0; }
    voices.push(src);
    return dur;
  }

  // Arm from the start so the very first tap anywhere unlocks audio.
  arm();

  window.BoohaSFX = {
    unlock: unlock,
    load: load,
    play: play,
    has: function (name) { return buffers.has(name); },
    duration: function (name) { var b = buffers.get(name); return b ? b.duration : 0; },
    isRunning: running,
    context: function () { return ensure(); },
  };
})();
