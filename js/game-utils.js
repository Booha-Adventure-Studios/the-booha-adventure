
/* ══════════════════════════════════════════════════════════════
   game-utils.js  —  Shared helpers for all Booha game engines
   Loaded by each engine via: const U = window.GAME_UTILS;
   ══════════════════════════════════════════════════════════════ */
(function() {

const UTILS = {

  /* ── Shuffle array (Fisher-Yates) ── */
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /* ── Wait ── */
  wait: ms => new Promise(r => setTimeout(r, ms)),

  /* ── iOS detection ── */
  isIOS() {
    const ua = navigator.userAgent || '';
    const pl = navigator.platform || '';
    const isIpad  = /iPad/.test(ua) || (pl === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isPhone = /iPhone|iPod/.test(ua);
    return isIpad || isPhone;
  },

  /* ══════════════════════════════
     AUDIO — short SFX (ding / fart)
     Delegates to the shared engine in js/booha-sfx.js, which game.html
     loads first. The fallback paths below only run if that file is
     missing, and keep the previous behaviour.
     ══════════════════════════════ */
  _ctx: null,
  _master: null,
  _buf: new Map(),
  _sfxLastPlayed: new Map(),
  _fartIdx: 0,

  _engine() { return window.BoohaSFX || null; },

  _ensureCtx() {
    const engine = this._engine();
    if (engine) { this._ctx = engine.context(); return; }
    if (!this._ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this._ctx = new C();
      this._master = this._ctx.createGain();
      this._master.gain.value = 1;
      this._master.connect(this._ctx.destination);
    }
  },

  /* Safe to call any number of times. Only a call made inside a tap can
     unlock iPad audio, so this never latches as "already unlocked". */
  unlockAudio() {
    const engine = this._engine();
    if (engine) { engine.unlock(); return; }
    this._ensureCtx();
    if (!this._ctx) return;
    if (this._ctx.state !== 'running') this._ctx.resume().catch(() => {});
    try {
      const b = this._ctx.createBuffer(1, 1, 22050);
      const s = this._ctx.createBufferSource();
      s.buffer = b;
      s.connect(this._master);
      s.start(0);
    } catch(e) {}
  },

  /* ── Synth cues (Fixes pass) ──────────────────────────────────────
     "ding" and "fart" are no longer recordings: they are synthesized on
     the same Web Audio context as the combo chime, so nothing overlaps.
       ding → a bright bell "ting" that climbs a little with the streak
       fart → a soft low "bonk" (three pitches in rotation)
     A combo milestone chime replaces the ting, and a combo-break crack
     replaces the bonk (see createRun), instead of playing on top. */
  SYNTH_CUES: { ding: 0.42, fart: 0.36 },   // name → length in seconds
  _synthHold: { ding: 0, fart: 0 },         // performance.now() until which a cue is replaced
  _synthVoice: { ding: null, fart: null },
  _synthCtx() {
    const engine = this._engine();
    try {
      const c = engine ? engine.context() : (this._ensureCtx(), this._ctx);
      if (c && c.state !== 'running') c.resume().catch(() => {});
      return c || null;
    } catch (_) { return null; }
  },
  _synthPlay(name, vol, rate) {
    const c = this._synthCtx();
    if (!c || c.state !== 'running') return false;
    const t = c.currentTime + 0.005;
    const out = c.createGain();
    out.gain.value = Math.max(0, Math.min(1, vol == null ? 1 : vol));
    out.connect(c.destination);
    const tone = (type, f, start, dur, peak, toF) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, start);
      if (toF) o.frequency.exponentialRampToValueAtTime(toF, start + dur * 0.6);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(out); o.start(start); o.stop(start + dur + 0.02);
    };
    if (name === 'ding') {
      // Bell: fundamental + inharmonic partial; pitch climbs with the streak (max +7 semitones).
      const streak = Math.min(7, Math.max(0, (window.__brunCombo || 0)));
      const f = Math.min(2400, 1046.5 * Math.pow(2, streak / 12) * (rate || 1));   // C6 upward, capped
      tone('sine', f, t, 0.42, 0.22);
      tone('sine', f * 2.76, t, 0.16, 0.06);
      tone('triangle', f * 1.5, t + 0.045, 0.3, 0.08);
    } else {
      // Bonk: a soft pitched thump, not harsh.
      const f = 210 * (rate || 1);
      tone('sine', f, t, 0.34, 0.32, f * 0.5);
      tone('triangle', f * 1.5, t, 0.12, 0.08, f * 0.7);
    }
    this._synthVoice[name] = { out, until: t + this.SYNTH_CUES[name] };
    return true;
  },
  /* Called by createRun just before a milestone chime / combo crack:
     cuts the cue that is already sounding and swallows the next one. */
  _synthReplace(name, ms = 260) {
    this._synthHold[name] = performance.now() + ms;
    const v = this._synthVoice[name], c = this._synthCtx();
    if (v && c && c.currentTime < v.until) {
      try { v.out.gain.setTargetAtTime(0.0001, c.currentTime, 0.015); } catch (_) {}
    }
  },

  /* Resolves when the sound is ready (or could not load). Never rejects. */
  async loadSFX(name, url) {
    if (this.SYNTH_CUES[name]) { this._synthCtx(); return true; }   // nothing to download
    const engine = this._engine();
    if (engine) return engine.load(name, url);
    this._ensureCtx();
    if (!this._ctx) return false;
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      const arr = await res.arrayBuffer();
      const buf = await new Promise((resolve, reject) => {
        const p = this._ctx.decodeAudioData(arr, resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      });
      this._buf.set(name, buf);
      return true;
    } catch(e) {
      console.warn('[game-utils] Could not load SFX:', name, url);
      return false;
    }
  },

  /*
   * playSFX(name)              play once
   * playSFX(name, onEnd)       onEnd fires when the sound finishes
   * playSFX(name, vol, onEnd)
   * playSFX(name, { volume, rate, onEnd })   rate > 1 = higher pitch
   * A repeat of the same sound within 140 ms is dropped (anti-mash), but
   * onEnd still fires so an answer chain can never stall on a sound.
   */
  playSFX(name, vol = 1, onEnd = null) {
    let rate = null;
    if (typeof vol === 'function') { onEnd = vol; vol = 1; }
    else if (vol && typeof vol === 'object') {
      const opts = vol;
      onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : onEnd;
      rate = Number(opts.rate) > 0 ? Number(opts.rate) : null;
      vol = opts.volume == null ? 1 : opts.volume;
    }
    const finish = () => { if (onEnd) setTimeout(onEnd, 0); };
    const now = Date.now();
    const last = this._sfxLastPlayed.get(name) || 0;
    if (now - last < 140) { finish(); return false; }
    this._sfxLastPlayed.set(name, now);

    if (this.SYNTH_CUES[name]) {
      // A milestone chime or combo crack already covers this moment.
      if (performance.now() < this._synthHold[name]) { if (onEnd) setTimeout(onEnd, 120); return false; }
      if (rate === null && name === 'fart') rate = [1, 0.92, 1.08][this._fartIdx++ % 3];
      const ok = this._synthPlay(name, vol, rate);
      if (onEnd) setTimeout(onEnd, ok ? Math.round(this.SYNTH_CUES[name] * 1000 / (rate || 1)) : 0);
      return ok;
    }

    const engine = this._engine();
    if (engine) {
      // Three fart pitches in rotation so repeats don't sound identical.
      if (rate === null) rate = name === 'fart' ? [1, 0.92, 1.08][this._fartIdx++ % 3] : 1;
      return engine.play(name, { volume: vol, rate, onEnd }) > 0;
    }

    if (!this._ctx) { finish(); return false; }
    const buf = this._buf.get(name);
    if (!buf) { finish(); return false; }
    if (this._ctx.state !== 'running') this._ctx.resume().catch(() => {});
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const g = this._ctx.createGain();
    g.gain.value = Math.max(0, Math.min(1, vol));
    src.connect(g);
    g.connect(this._master);
    if (rate) src.playbackRate.value = rate;
    if (onEnd) src.onended = () => onEnd();
    try { src.start(0); } catch(e) { finish(); return false; }
    return true;
  },

  /*
   * One active HTMLAudio clip per interaction. Normal listen controls use the
   * default ignore-while-playing policy; controlled answer narration can opt
   * into replacement. The cooldown applies after the accepted press as well
   * as after playback, which prevents rapid replay on older touch devices.
   */
  createAudioGate({ cooldownMs = 650, timeoutMs = 8000 } = {}) {
    let active = null;
    let lastAccepted = 0;
    let safety = null;

    const clearButton = button => {
      if (!button) return;
      button.disabled = false;
      button.classList.remove('audio-playing');
      button.removeAttribute('aria-busy');
      button.removeAttribute('data-audio-state');
    };

    const stop = () => {
      if (safety) clearTimeout(safety);
      safety = null;
      if (!active) return;
      const { audio, button } = active;
      try { audio.pause(); audio.currentTime = 0; } catch (_) {}
      audio.onended = null;
      audio.onerror = null;
      clearButton(button);
      active = null;
    };

    const play = (audio, { button = null, onStart = null, onEnd = null, replace = false, ignoreCooldown = false } = {}) => {
      if (!audio) {
        if (onEnd) setTimeout(onEnd, 0);
        return false;
      }
      const now = Date.now();
      if (active && !replace) return false;
      if (!ignoreCooldown && now - lastAccepted < cooldownMs) return false;
      if (active) stop();
      lastAccepted = now;
      active = { audio, button };
      if (button) {
        button.disabled = true;
        button.classList.add('audio-playing');
        button.setAttribute('aria-busy', 'true');
        button.setAttribute('data-audio-state', 'playing');
      }
      if (onStart) onStart();
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (safety) clearTimeout(safety);
        safety = null;
        audio.onended = null;
        audio.onerror = null;
        if (active?.audio === audio) {
          clearButton(active.button);
          active = null;
        }
        if (onEnd) onEnd();
      };
      audio.onended = finish;
      audio.onerror = finish;
      safety = setTimeout(finish, timeoutMs);
      try {
        const result = audio.play();
        if (result && result.catch) result.catch(finish);
      } catch (_) {
        finish();
      }
      return true;
    };

    return {
      play,
      stop,
      isPlaying: () => !!active,
      lastAccepted: () => lastAccepted,
    };
  },

  /* ── HTML audio fallback (for result sounds, sage voice) ── */
  playHTMLAudio(el) {
    if (!el) return;
    try {
      const a = el.cloneNode(true);
      a.setAttribute('playsinline', '');
      a.currentTime = 0;
      document.body.appendChild(a);
      a.play().catch(() => {}).finally(() => setTimeout(() => a.remove(), 12000));
    } catch(e) {}
  },

  /* ══════════════════════════════
     CONFETTI BURST
     ══════════════════════════════ */
  confetti(el, count = 60) {
    const motion = window.BoohaMotion;
    if (motion && motion.reduced()) return;
    if (motion && motion.lowPower()) count = Math.min(count, 24);
    const r = el ? el.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 };
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'confetti-piece';
      d.style.left = cx + 'px';
      d.style.top  = cy + 'px';
      d.style.background = `hsl(${Math.random()*360},100%,60%)`;
      const x = (Math.random() - 0.5) * 340;
      const y = (Math.random() - 1)   * 320;
      d.animate(
        [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${x}px,${y}px)`, opacity: 0 }],
        { duration: 900 + Math.random() * 600, easing: 'ease-out' }
      );
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1600);
    }
  },

  /* ══════════════════════════════
     FX BURST (heart / fart)
     ══════════════════════════════ */
  showBurst(kind) {
    const el = document.createElement('div');
    el.className = 'fx-burst ' + (kind === 'ok' ? 'ok' : 'ng');
    if (kind === 'ok') {
      el.innerHTML = '<div class="fx-big">♥</div><div class="fx-label">Good!</div>';
    } else {
      el.innerHTML = '<div class="fx-big">💨</div><div class="fx-label">Try Again</div>';
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  },

  /* ══════════════════════════════
     SPEECH RECOGNITION helpers
     ══════════════════════════════ */
  normWord(s) {
    return (s || '').toLowerCase().replace(/[^a-z]/g, '').trim();
  },

  normSound(s) {
    s = this.normWord(s);
    return s
      .replace(/^ch/, 'sh').replace(/^shi/, 'sh').replace(/^ci/, 'si')
      .replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/qu/g, 'kw')
      .replace(/x/g, 'ks').replace(/i$/, 'y');
  },

  levenshtein(a, b) {
    a = a || ''; b = b || '';
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m+1 }, () => Array(n+1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
      }
    }
    return dp[m][n];
  },

  similarity(a, b) {
    const L = Math.max(a.length, b.length);
    if (!L) return 1;
    return 1 - this.levenshtein(a, b) / L;
  },

  requiredScore(len) {
    if (len <= 2) return 1.00;
    if (len === 3) return 0.34;
    if (len === 4) return 0.50;
    if (len <= 6) return 0.67;
    return 0.75;
  },

  /* Match a raw SR transcript to a target word or short phrase */
  matchesTarget(raw, target) {
    const t0 = this.normWord(target);
    const h0 = this.normWord(raw);
    if (!t0 || !h0) return false;
    if (h0 === t0) return true;
    const t = this.normSound(t0);
    const h = this.normSound(h0);
    if (h === t) return true;
    return this.similarity(h, t) >= this.requiredScore(t.length);
  },

  /* Keyword scoring for sentences (from eigoperapera) */
  normalizeToken(t) {
    let s = this.normWord(t);
    if (s.endsWith('s') && s.length > 3) s = s.slice(0, -1);
    if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3);
    return s;
  },

  tokensOf(s) {
    return this.normWord(s).split(' ').map(w => this.normalizeToken(w)).filter(Boolean);
  },

  keywordScore(target, spoken, maxFuzzy = 1) {
    const tgt  = this.tokensOf(target).filter(x => x.length >= 2);
    const said = new Set(this.tokensOf(spoken));
    let total = 0, hit = 0;
    for (const t of tgt) {
      if (t === 'a' || t === 'an' || t === 'the') continue;
      total++;
      if (said.has(t)) hit++;
    }
    if (!total) return 0;
    const miss = total - hit;
    const forgiven = Math.min(miss, maxFuzzy);
    return Math.round(((hit + forgiven) / total) * 100);
  },

  /* ══════════════════════════════
     RESULTS MESSAGES
     ══════════════════════════════ */
  RESULT_MSGS: [
    { maxScore: 5,  jp: 'ブーリキュラム見てないでしょ！',        en: "You didn't study!" },
    { maxScore: 10, jp: 'YouTube見すぎ！ブーリキュラムもやろう！', en: 'Too much YouTube!' },
    { maxScore: 14, jp: 'いいね！あと少しでパーフェクト！',        en: 'So close!' },
    { maxScore: 15, jp: 'すごい！あなたは地球で一番頭がいい！',    en: 'Perfect!!' },
  ],

  getResultMsg(score) {
    return this.RESULT_MSGS.find(m => score <= m.maxScore) || this.RESULT_MSGS.at(-1);
  },

  /*
   * Submit a result after the scorecard has been painted. Result listeners
   * perform synchronous save/unlock work and can be expensive on iPad Safari;
   * keeping that work off the result reveal prevents a half-filled card from
   * looking frozen when storage or sync is slow.
   */
  /* ══════════════════════════════
     READY PACE → RAINBOW STARS (Rainbow Pass B)
     Gold stars = completed. Rainbow stars = prepared pace: enough answers
     right on the first try, at a steady "ready" pace, with no frantic
     tapping. Notebook checks are fine: the rule uses the MEDIAN pace, so a
     few long pauses never cost the rainbow. Pace is time ÷ the item's par
     (par already scales with word / sentence length).

     These zones are first defaults. Calibrate them ONCE from the first
     real class data with
       node tools/pace-report.cjs <Wix saves export>
     (about the top third of runs qualifying), then keep them fixed so
     students learn what earns rainbow. Re-tune only if a game is broken.
     null = pace not judged (speed games already set the pace).
     ══════════════════════════════ */
  PACE_RULE: { firstTry: 0.75, maxFrantic: 2, minTimed: 5, preBooSlack: 1.3 },
  PACE_ZONES: {
    vocab_tap: 1.5, spell_word: 1.25, vocab_speed: null,
    sentence_tap: 1.5, sentence_order: 1.25, sentence_speed: null,
    say_word: 1.5, say_sentence: 1.5, ask_question: 1.5,
    booha_bites: 1.25, echo: 1.5, week_boss: 1.5,
  },
  readyPace(pace, saveId) {
    if (!pace || pace.v !== 1 || !Array.isArray(pace.t) || !pace.t.length) return false;
    const R = UTILS.PACE_RULE;
    const id = String(saveId || '');
    const game = id.slice(id.indexOf(':') + 1);
    if (!Object.prototype.hasOwnProperty.call(UTILS.PACE_ZONES, game)) return false;
    const f = String(pace.f || '');
    const n = pace.t.length;
    let right = 0;
    for (let i = 0; i < n; i++) if (f[i] === '1') right++;
    if (right / n < R.firstTry) return false;
    if ((Number(pace.fr) || 0) > R.maxFrantic) return false;
    let zone = UTILS.PACE_ZONES[game];
    if (zone === null) return true;
    if (id.indexOf('pb') === 0) zone *= R.preBooSlack;
    const ratios = [];
    for (let i = 0; i < n; i++) {
      if (f[i] === '1' && pace.t[i] != null && pace.p[i] > 0) ratios.push(pace.t[i] / pace.p[i]);
    }
    if (ratios.length < R.minTimed) return false;
    ratios.sort((a, b) => a - b);
    const m = ratios.length >> 1;
    const med = ratios.length % 2 ? ratios[m] : (ratios[m - 1] + ratios[m]) / 2;
    return med <= zone;
  },

  emitGameEnd(detail) {
    // Rainbow Pass A: attach the pace record from the run that just ended
    // (summary() is always called right before this). It is saved inside
    // recentRun, which the score system keeps for the last 8 runs per game.
    // Pass B: the same record decides rainbow stars (score system stores it).
    const lp = UTILS._lastPace;
    UTILS._lastPace = null;
    if (lp && lp.pace && Date.now() - lp.at < 60000 && detail && typeof detail === 'object') {
      const rr = detail.recentRun && typeof detail.recentRun === 'object' ? detail.recentRun : {};
      if (!rr.pace) detail = { ...detail, recentRun: { ...rr, pace: lp.pace } };
      if (detail.rainbow === undefined) detail = { ...detail, rainbow: detail.completed !== false && UTILS.readyPace(lp.pace, detail.saveId) };
    }
    const send = () => {
      try {
        document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail }));
      } catch (error) {
        console.error('[game-utils] Could not submit game result:', error);
      }
    };
    setTimeout(send, 0);
  },

  /* Add the shared Pass 1 result summary to any engine scorecard. */
  renderResultMeta(container, { gameId, score, bestScore = null } = {}) {
    if (!container) return;

    const numericScore = Math.max(0, Math.min(100, Number(score) || 0));
    let priorBest = Number.isFinite(bestScore) ? bestScore : null;
    if (priorBest === null) {
      try {
        const scores = window.BoohaAdventure && window.BoohaAdventure.scores;
        if (scores && typeof scores.getHighScore === 'function') {
          priorBest = Number(scores.getHighScore(gameId));
        }
      } catch (_) {}
    }
    const best = Math.max(numericScore, Number.isFinite(priorBest) ? priorBest : 0);
    const registry = window.BoohaGameRegistry;
    const fallbackThresholds = String(gameId || '').includes('speed')
      ? [30, 60, 90] : [40, 70, 90];
    const starsFor = value => {
      if (registry && typeof registry.starsForScore === 'function') {
        return registry.starsForScore(gameId, value);
      }
      return fallbackThresholds.reduce((stars, threshold) => stars + (value >= threshold ? 1 : 0), 0);
    };
    const earned = starsFor(numericScore);
    const bestStars = starsFor(best);
    let meta = container.querySelector('.game-result-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'game-result-meta';
      container.querySelector('.game-result-actions, .game-result-inner, .vs-res-actions, .ssp-res-actions, .aq-res-actions, .sas-res-actions, .stw-res-actions, .so-res-actions, .st-res-actions, .sw-res-actions, .vt-res-actions')?.before(meta);
      if (!meta.parentNode) container.appendChild(meta);
    }
    meta.innerHTML = `
      <div class="game-result-stars" role="img" aria-label="${earned} of 3 stars this run; ${bestStars} of 3 stars best">
        <span class="game-result-stars-current">${'★'.repeat(earned)}${'☆'.repeat(3 - earned)}</span>
        <span class="game-result-stars-label">${earned}/3 stars</span>
      </div>
      <div class="game-result-best"><span>This run / こんかい</span> <b>${Math.round(numericScore)}%</b><span> · Best / ベスト</span> <b>${Math.round(best)}%</b></div>`;
  },

  /* Add compact learning stats and an optional missed-item review drawer. */
  renderResultDetails(container, { stats = [], reviewItems = [], audioBase = '' } = {}) {
    if (!container) return;

    let details = container.querySelector('.game-result-details');
    if (!details) {
      details = document.createElement('div');
      details.className = 'game-result-details';
      const anchor = container.querySelector('.game-result-meta, .game-result-actions, .game-result-inner, .vs-res-actions, .ssp-res-actions, .aq-res-actions, .sas-res-actions, .stw-res-actions, .so-res-actions, .st-res-actions, .sw-res-actions, .vt-res-actions');
      if (anchor) anchor.after(details);
      else container.appendChild(details);
    }
    this.stopReviewAudio();
    details.innerHTML = '';

    const statList = Array.isArray(stats) ? stats.filter(item => item && item.label != null && item.value != null) : [];
    if (statList.length) {
      const statGrid = document.createElement('div');
      statGrid.className = 'game-result-stats';
      statList.slice(0, 4).forEach(({ label, value }) => {
        const stat = document.createElement('div');
        stat.className = 'game-result-stat';
        const labelEl = document.createElement('span');
        labelEl.className = 'game-result-stat-label';
        labelEl.textContent = label;
        const valueEl = document.createElement('b');
        valueEl.className = 'game-result-stat-value';
        valueEl.textContent = value;
        stat.append(labelEl, valueEl);
        statGrid.appendChild(stat);
      });
      details.appendChild(statGrid);
    }

    const uniqueItems = [];
    const seen = new Set();
    (Array.isArray(reviewItems) ? reviewItems : []).forEach(item => {
      if (!item || typeof item !== 'object') return;
      const key = `${item.jp || ''}|${item.en || item.enDisplay || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      uniqueItems.push(item);
    });

    const review = document.createElement('details');
    review.className = 'game-result-review';
    const summary = document.createElement('summary');
    summary.textContent = uniqueItems.length
      ? `Review focus / ふくしゅう (${uniqueItems.length})`
      : 'Review focus / ふくしゅう (clear run)';
    review.appendChild(summary);
    if (uniqueItems.length) {
      const list = document.createElement('ul');
      uniqueItems.slice(0, 6).forEach(item => {
        const row = document.createElement('li');
        const jp = document.createElement('span');
        jp.className = 'game-result-review-jp';
        jp.innerHTML = this.furiganaHTML(
          item.jp || item.en || '—',
          item.hira || '',
          item.readings || item.furigana || item.readingMap || null,
        );
        const en = document.createElement('span');
        en.className = 'game-result-review-en';
        en.textContent = item.en || item.enDisplay || '';
        row.append(jp, en);
        if (item.mp3 && audioBase) {
          const audioButton = document.createElement('button');
          audioButton.type = 'button';
          audioButton.className = 'game-result-review-audio';
          audioButton.title = 'Play Japanese audio / おとをきく';
          audioButton.setAttribute('aria-label', 'Play Japanese audio / おとをきく');
          audioButton.textContent = '▶';
          audioButton.addEventListener('click', () => {
            this.playReviewAudio(audioBase, item.mp3, audioButton);
          });
          row.appendChild(audioButton);
        }
        list.appendChild(row);
      });
      if (uniqueItems.length > 6) {
        const more = document.createElement('li');
        more.className = 'game-result-review-more';
        more.textContent = `+${uniqueItems.length - 6} more to revisit`;
        list.appendChild(more);
      }
      review.appendChild(list);
    } else {
      const empty = document.createElement('p');
      empty.className = 'game-result-review-empty';
      empty.textContent = 'No missed items recorded — nice work! / まちがいなし！';
      review.appendChild(empty);
    }
    details.appendChild(review);
  },

  _reviewAudio: null,
  _reviewAudioButton: null,

  stopReviewAudio() {
    if (this._reviewAudio) {
      this._reviewAudio.pause();
      this._reviewAudio = null;
    }
    if (this._reviewAudioButton) {
      this._reviewAudioButton.classList.remove('is-playing');
      this._reviewAudioButton.textContent = '▶';
      this._reviewAudioButton = null;
    }
  },

  playReviewAudio(audioBase, mp3, button) {
    if (!audioBase || !mp3) return;
    this.stopReviewAudio();
    const audio = new Audio(audioBase + mp3);
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    const finish = () => {
      if (this._reviewAudio !== audio) return;
      this.stopReviewAudio();
    };
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    this._reviewAudio = audio;
    this._reviewAudioButton = button;
    button.classList.add('is-playing');
    button.textContent = '■';
    audio.play().catch(finish);
  },

  /*
   * Convert a card reading into ruby. Optional authored maps can override
   * heuristic segmentation, e.g. { '今日': 'きょう', '明日': 'あした' }.
   */
  furiganaHTML(jp, hira, authoredReadings = null) {
    const text = String(jp == null ? '' : jp);
    const rawReading = String(hira == null ? '' : hira);
    const escape = value => String(value).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    if (!text || !rawReading) return escape(text);

    const map = authoredReadings && typeof authoredReadings === 'object' && !Array.isArray(authoredReadings)
      ? authoredReadings : {};
    const terms = Object.keys(map).filter(Boolean).sort((a, b) => b.length - a.length);
    if (terms.length) {
      const pattern = new RegExp(terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
      let mapped = '';
      let cursor = 0;
      let match;
      while ((match = pattern.exec(text))) {
        mapped += escape(text.slice(cursor, match.index));
        mapped += `<ruby>${escape(match[0])}<rt>${escape(map[match[0]])}</rt></ruby>`;
        cursor = match.index + match[0].length;
      }
      if (cursor) return mapped + escape(text.slice(cursor));
    }

    const toHiragana = value => String(value).replace(/[ァ-ヶ]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60));
    const reading = toHiragana(rawReading).replace(/\s+/g, '');
    const isKana = ch => /[\u3040-\u30ffー]/.test(ch);
    let html = '';
    let cursor = 0;
    let index = 0;
    while (index < text.length) {
      if (isKana(text[index])) {
        let end = index + 1;
        while (end < text.length && isKana(text[end])) end++;
        const kana = toHiragana(text.slice(index, end));
        const position = reading.indexOf(kana, cursor);
        if (position >= cursor) cursor = position + kana.length;
        html += escape(text.slice(index, end));
        index = end;
        continue;
      }

      let end = index + 1;
      while (end < text.length && !isKana(text[end])) end++;
      const kanjiRun = text.slice(index, end);
      let nextKana = '';
      let lookahead = end;
      while (lookahead < text.length && !isKana(text[lookahead])) lookahead++;
      if (lookahead < text.length) {
        let nextEnd = lookahead + 1;
        while (nextEnd < text.length && isKana(text[nextEnd])) nextEnd++;
        nextKana = toHiragana(text.slice(lookahead, nextEnd));
      }
      const nextPosition = nextKana ? reading.indexOf(nextKana, cursor) : -1;
      const runReading = nextPosition >= cursor
        ? reading.slice(cursor, nextPosition)
        : (!nextKana ? reading.slice(cursor) : '');

      if (runReading) {
        html += `<ruby>${escape(kanjiRun)}<rt>${escape(runReading)}</rt></ruby>`;
        cursor += runReading.length;
      } else {
        html += escape(kanjiRun);
      }
      index = end;
    }
    return html || escape(text);
  },

  /* ══════════════════════════════
     SAGE VOICE PLAYER
     ══════════════════════════════ */
  _sageAudio: null,
  _sageTicket: 0,

  stopSage() {
    this._sageTicket++;
    if (this._sageAudio) {
      try { this._sageAudio.pause(); this._sageAudio.currentTime = 0; } catch(e) {}
    }
  },

  async playSage(audioSrc, delayMs = 0) {
    const myTicket = ++this._sageTicket;
    if (delayMs > 0) await this.wait(delayMs);
    if (myTicket !== this._sageTicket) return; // canceled

    return new Promise(resolve => {
      const a = new Audio(audioSrc);
      a.setAttribute('playsinline', '');
      this._sageAudio = a;
      a.onended  = () => resolve();
      a.onerror  = () => resolve();
      a.play().catch(() => resolve());
    });
  },

  /* ══════════════════════════════
     GAME MOUNT helpers
     ══════════════════════════════ */
  mount(html) {
    const el = document.getElementById('game-loading');
    if (el) el.remove();
    const mount = document.getElementById('game-mount');
    if (!mount) return;
    mount.innerHTML = html;
    // Games Pass 10: v2 games get the lane chip and their own name as the title.
    const root = document.documentElement, cfg = window.GAME_CONFIG || {};
    if (root.getAttribute('data-skin') === 'v2') {
      const LANE_LABEL = { words: 'WORDS · たんご', sentences: 'SENTENCES · ぶん', listen: 'LISTEN · きく', extra: 'EXTRA · おまけ' };
      const chip = document.createElement('div');
      chip.className = 'game-lane-chip';
      chip.textContent = LANE_LABEL[root.getAttribute('data-lane')] || LANE_LABEL.extra;
      document.querySelectorAll('.game-lane-chip').forEach(c => c.remove());
      // The extra games use the page header (the nine draw their own and hide it).
      const header = document.querySelector('.game-header');
      const headerShown = header && getComputedStyle(header).display !== 'none';
      if (headerShown) header.insertBefore(chip, header.firstChild);
      else mount.insertBefore(chip, mount.firstChild);
      if (cfg.gameTitle) mount.querySelectorAll('.vt-curriculum, .sw-curriculum, .vs-curriculum, .st-curriculum, .so-curriculum, .ssp-curriculum, .stw-curriculum, .sas-curriculum, .aq-curriculum').forEach(t => { t.textContent = cfg.gameTitle; });
    }
  },

  setTitle(gameName) {
    const el = document.getElementById('gameTitle');
    if (el) el.textContent = gameName;
  },

  /* ══════════════════════════════
     RUN TRACKER — combo, sharp answers, points, crown (Games Pass 4)
     Stars stay accuracy-only (registry thresholds); this layer only
     rewards students who knew it first try, and quickly.

       const run = U.createRun({ total: 15 });
       run.reset()                     new game / replay
       run.ready(parMs, { at, minMs, waitAudio })
                                       item is answerable (waitAudio: the
                                       sharp clock starts at audioDone())
       run.audioDone()                 listening games: clip finished
       run.pauseClock()                listening games: a replay started; the
                                       clock resumes at the next audioDone()
       run.hit(at?)                    first-try right answer
       run.miss()                      wrong answer (ends the combo)
       run.recover()                   right on a later try
       run.summary()                   { points, maxCombo, firstTry, sharp,
                                         recovered, misses, fullCombo, pace }

     Combo multiplier ×1 → ×1.5 at 3 → ×2 at 6 → ×3 at 10 in a row.
     Sharp (+25): answered inside the par time, but not faster than minMs
     (default 0.4 s: too fast to have read it). A miss scores 0 and resets
     the combo; recover() earns recoverPoints (0 in multiple-choice games
     so tapping every option never pays).

     Pace record (Rainbow Pass A, silent): each item's FIRST response is
     logged as elapsed time vs that item's par (par already scales with word
     length), whether it was right, and whether it was a frantic miss (wrong
     faster than minMs). summary().pace rides along to the save inside
     recentRun (see emitGameEnd); nothing is shown to students. It exists to
     calibrate the "ready pace" zones before rainbow stars are switched on.
       pace = { v:1, t:[ds|null...], p:[ds...], f:'1011…', fr }
       t = first-response time in tenths of a second (null: clip unfinished)
       p = par in tenths, f = first try right (1) / wrong (0), fr = frantic
     ══════════════════════════════ */
  /* ══════════════════════════════
     IMPACT KIT — "contact" for every answer (Razzle-dazzle Pass 1)
     Simple answers, big-feeling hits (the Minecraft Dungeons idea): the
     answer lands somewhere, with a layered sound, and grows with the streak.

       U.impact({ source, target, outcome, combo, sharp, flavor })
         source   element the student answered with (the "attacker")
         target   element the answer lands on (the prompt), optional
         outcome  'hit' | 'recover' | 'miss' | 'timeout'
         combo    current streak (run.hit() returns it)
         sharp    fast first-try answer (run.hit() returns it)
         flavor   'speed' (bolt from the answer into the target)
                  'wave'  (Sentence Speed: a wide band sweeps across the
                           target, from the answer's side; broader and
                           brighter with the streak)
                  'listen' (Say Word / Say Sentence / Ask Question: three
                           sound-wave arcs travel from the answer into the
                           listening card, which absorbs them in two
                           concentric rings)
                  'build'  (Spell the Word / Sentence Order release, via
                           U.impactChain: no bolt, the ring lands on the
                           whole answer)
                  'match'  (Vocab Tap / Sentence Tap: each graded slot lights
                           like a connected rune — a turning diamond + ring;
                           U.impactRound adds one finisher per round)
         squash   false when the game already animates the answer button

     Escalation: combo 1–2 a tight hit (4 fragments); 3–5 a stronger ring;
     6–9 a charged, larger burst; 10+ the largest (the run tracker adds its
     banner and gold edge). Sharp adds a white-gold critical spark and tink.
     A miss is a short recoil and a dull grey puff — never the best show.
     Rules: ~260 ms, transform/opacity only, fixed and pointer-events:none,
     ≤ 6 fragments (half on reduced power, none on minimal), NEVER delays
     input or the next question, sounds end within ~120 ms (before any
     learning audio). Reduced motion: flash and sound only, nothing moves.
     ══════════════════════════════ */
  impact({ source = null, target = null, outcome = 'hit', combo = 1, sharp = false, flavor = 'speed', squash = true } = {}) {
    if (typeof document === 'undefined' || !document.body) return null;
    const M = window.BoohaMotion || null;
    const reduced = !!(M && M.reduced && M.reduced());
    const power = (M && M.power && M.power()) || 'full';
    const tier = combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
    const plan = UTILS._impactPlan({ outcome, tier, sharp, reduced, power });
    const centre = el => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r } : null;
    };
    const from = centre(source), to = centre(target) || from;
    const fx = (cls, x, y) => {
      const n = document.createElement('i');
      n.className = 'bimp ' + cls;
      n.setAttribute('aria-hidden', 'true');
      n.style.left = x + 'px'; n.style.top = y + 'px';
      document.body.appendChild(n);
      return n;
    };
    const play = (n, frames, ms, easing) => {
      if (n.animate) n.animate(frames, { duration: ms, easing: easing || 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      setTimeout(() => n.remove(), ms + 40);
    };

    UTILS._impactSound(plan.sound, tier, sharp);

    // 1. The answer itself: a quick squash (hit) or recoil (miss).
    if (source && source.animate && plan.squash && squash) {
      source.animate(outcome === 'hit' || outcome === 'recover'
        ? [{ transform: 'scale(1)' }, { transform: 'scale(.92)', offset: .25 }, { transform: 'scale(1.04)', offset: .6 }, { transform: 'scale(1)' }]
        : [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)', offset: .3 }, { transform: 'translateX(4px)', offset: .6 }, { transform: 'translateX(0)' }],
        { duration: 220, easing: 'ease-out' });
    }
    // 2a. Wave: a wide band sweeps across the whole target, starting on the
    //     side the answer came from. Its width grows with the streak (CSS t1–t4).
    if (plan.bolt && flavor === 'wave' && to && to !== from) {
      const r = to.r;
      const clip = fx('bimp-wave', r.left, r.top);
      clip.style.width = r.width + 'px'; clip.style.height = r.height + 'px';
      const band = document.createElement('i');
      band.className = 'bimp-wave-band t' + plan.tier + (outcome === 'recover' ? ' rec' : '');
      clip.appendChild(band);
      const ltr = !from || from.x <= to.x;
      const a = ltr ? -130 : 230, z = ltr ? 230 : -130;   // % of the band's own width
      if (band.animate) band.animate([{ transform: `translateX(${a}%) skewX(-18deg)`, opacity: 1 },
        { transform: `translateX(${z}%) skewX(-18deg)`, opacity: .85 }], { duration: 240, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' });
      setTimeout(() => clip.remove(), 280);
    }
    // 2b. Listen: three sound-wave arcs, staggered, travel into the card.
    if (plan.bolt && flavor === 'listen' && from && to && (from.x !== to.x || from.y !== to.y)) {
      const dx = to.x - from.x, dy = to.y - from.y;
      const rot = `rotate(${Math.atan2(dy, dx)}rad)`;
      [0, 45, 90].forEach(delay => {
        const arc = fx('bimp-arc t' + plan.tier + (outcome === 'recover' ? ' rec' : ''), from.x, from.y);
        if (arc.animate) arc.animate([
          { transform: `translate(0,0) ${rot} scale(.45)`, opacity: 0 },
          { transform: `translate(${dx * .25}px,${dy * .25}px) ${rot} scale(.7)`, opacity: 1, offset: .2 },
          { transform: `translate(${dx}px,${dy}px) ${rot} scale(1.25)`, opacity: 0 },
        ], { duration: 190, delay, easing: 'cubic-bezier(.3,.5,.4,1)', fill: 'both' });
        setTimeout(() => arc.remove(), delay + 230);
      });
      // The card absorbs it: a second, later concentric ring.
      if (plan.ring) {
        const r2 = fx('bimp-ring ' + plan.ring, to.x, to.y);
        if (r2.animate) r2.animate([{ transform: 'scale(.2)', opacity: .9 }, { transform: `scale(${plan.ringScale * .7})`, opacity: 0 }],
          { duration: 240, delay: 70, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
        setTimeout(() => r2.remove(), 350);
      }
    }
    // 2c. Bolt from the answer into the target.
    if (plan.bolt && flavor !== 'wave' && flavor !== 'listen' && from && to && (from.x !== to.x || from.y !== to.y)) {
      const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy);
      const b = fx('bimp-bolt t' + tier + (outcome === 'recover' ? ' rec' : ''), from.x, from.y);
      b.style.width = len + 'px';
      const rot = `rotate(${Math.atan2(dy, dx)}rad)`;
      play(b, [{ transform: rot + ' scaleX(0)', opacity: 1 }, { transform: rot + ' scaleX(1)', opacity: 1, offset: .35 }, { transform: rot + ' scaleX(1)', opacity: 0 }], 220, 'ease-out');
    }
    const at = outcome === 'miss' ? from : to;
    if (!at) return plan;
    // 3. Flash on the target (also the whole show under reduced motion).
    if (plan.flash) {
      const box = (outcome === 'miss' ? from : to).r;
      const f = fx('bimp-flash ' + plan.flash, box.left, box.top);
      f.style.width = box.width + 'px'; f.style.height = box.height + 'px';
      play(f, [{ opacity: 0 }, { opacity: plan.flashPeak, offset: .2 }, { opacity: 0 }], 240, 'ease-out');
    }
    // 4. Shock ring.
    if (plan.ring) {
      const ring = fx('bimp-ring ' + plan.ring, at.x, at.y);
      play(ring, [{ transform: 'scale(.3)', opacity: .95 }, { transform: `scale(${plan.ringScale})`, opacity: 0 }], 280);
    }
    // 5. Fragments.
    for (let i = 0; i < plan.fragments; i++) {
      const a = (Math.PI * 2 * i) / plan.fragments + Math.random() * 0.6;
      const d = plan.spread * (0.6 + Math.random() * 0.5);
      const p = fx('bimp-frag ' + plan.fragClass, at.x, at.y);
      play(p, [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + (plan.fragClass === 'dust' ? 14 : 0)}px) scale(.4)`, opacity: 0 }], 300);
    }
    // 5b. Match: a rune (turning diamond) on the graded slot.
    if (flavor === 'match' && plan.ring) {
      const rune = fx('bimp-rune ' + plan.ring, at.x, at.y);
      play(rune, [{ transform: 'rotate(45deg) scale(.4)', opacity: 1 }, { transform: 'rotate(135deg) scale(1.15)', opacity: .9, offset: .5 },
        { transform: `rotate(180deg) scale(${(plan.ringScale * .7).toFixed(2)})`, opacity: 0 }], 260);
    }
    // 6. Sharp: a critical-hit star.
    if (plan.crit) {
      const c = fx('bimp-crit', at.x, at.y - 6);
      play(c, [{ transform: 'rotate(0) scale(0)', opacity: 1 }, { transform: 'rotate(45deg) scale(1.3)', opacity: 1, offset: .45 }, { transform: 'rotate(90deg) scale(.2)', opacity: 0 }], 260);
    }
    return plan;
  },

  /* Razzle-dazzle Pass 5: answers that are BUILT (Spell the Word, Sentence
     Order). The effect explains the answer: pieces lock in one by one, in
     step with the game's own stagger, then the whole answer releases a
     shock ring (U.impact flavor 'build', with the crack/thump on the ding).
     On a wrong answer the wrong pieces crack with a little dust and the
     right ones glow faintly: they stay anchored.

       U.impactChain(pieces, { outcome, stagger, combo, sharp, container, isRight })
         outcome   'hit' | 'recover' | 'miss'
         stagger   ms between pieces — the game's own green/red stagger
         container the whole answer (where the release lands)
         isRight   (el, i) => bool, for 'miss': which pieces were right

     Never adds delay: it only follows timings the game already has. */
  impactChain(pieces, { outcome = 'hit', stagger = 55, combo = 1, sharp = false, container = null, isRight = null } = {}) {
    if (typeof document === 'undefined' || !document.body) return null;
    const list = Array.from(pieces || []);
    const M = window.BoohaMotion || null;
    const reduced = !!(M && M.reduced && M.reduced());
    const power = (M && M.power && M.power()) || 'full';
    const kinds = UTILS._chainPlan({ outcome, rights: list.map((el, i) => (outcome === 'miss' ? !!(isRight && isRight(el, i)) : true)) });
    const node = (cls, x, y) => {
      const n = document.createElement('i');
      n.className = 'bimp ' + cls; n.setAttribute('aria-hidden', 'true');
      n.style.left = x + 'px'; n.style.top = y + 'px';
      document.body.appendChild(n);
      return n;
    };
    const anim = (n, frames, ms) => {
      if (n.animate) n.animate(frames, { duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      setTimeout(() => n.remove(), ms + 40);
    };
    const mini = (el, kind) => {
      const r = el && el.isConnected !== false && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || !r.width) return;
      const f = node('bimp-flash ' + (kind === 'crack' ? 'dull' : kind === 'anchor' ? 'anchor' : (outcome === 'recover' ? 'rec' : 'lock')), r.left, r.top);
      f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
      anim(f, [{ opacity: 0 }, { opacity: kind === 'anchor' ? .25 : .55, offset: .25 }, { opacity: 0 }], 200);
      if (reduced) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (kind === 'lock') {
        const ring = node('bimp-ring mini' + (outcome === 'recover' ? ' rec' : ''), cx, cy);
        anim(ring, [{ transform: 'scale(.3)', opacity: .9 }, { transform: 'scale(1.1)', opacity: 0 }], 200);
      } else if (kind === 'crack' && power !== 'minimal') {
        [-1, 1].forEach(side => {
          const p = node('bimp-frag dust', cx, cy);
          anim(p, [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${side * (10 + Math.random() * 8)}px, ${12 + Math.random() * 8}px) scale(.4)`, opacity: 0 }], 260);
        });
      }
    };
    list.forEach((el, i) => setTimeout(() => mini(el, kinds[i]), i * stagger));
    const releaseAt = list.length * stagger + 20;
    if (outcome !== 'miss') {
      setTimeout(() => UTILS.impact({ source: container || list[list.length - 1], outcome, combo, sharp, flavor: 'build', squash: false }), releaseAt);
    }
    return { kinds, releaseAt };
  },

  /* Razzle-dazzle Pass 6: one finisher after a Tap round's grading cascade,
     sized by how many matches were right (0 = nothing, all = biggest, with
     the critical star). Lands on the whole slot board, inside the game's
     existing end-of-round pause. */
  impactRound(container, correct, total = 5) {
    const t = UTILS._roundTier(correct, total);
    if (!t.combo || !container) return null;
    return UTILS.impact({ source: container, outcome: 'hit', combo: t.combo, sharp: t.perfect, flavor: 'match', squash: false });
  },
  _roundTier(correct, total = 5) {
    const c = Math.max(0, Number(correct) || 0), n = Math.max(1, Number(total) || 5);
    if (!c) return { combo: 0, perfect: false };
    const f = c / n;
    return { combo: f >= 1 ? 10 : f >= .8 ? 6 : f >= .4 ? 3 : 1, perfect: c >= n };
  },

  /* Pure: per-piece effect for a built answer. */
  _chainPlan({ outcome = 'hit', rights = [] } = {}) {
    return rights.map(ok => (outcome === 'miss' ? (ok ? 'anchor' : 'crack') : 'lock'));
  },

  /* Pure: what an impact shows for an outcome, streak tier, sharpness and the
     device's motion/power tier. Tests read this directly. */
  _impactPlan({ outcome = 'hit', tier = 1, sharp = false, reduced = false, power = 'full' } = {}) {
    const good = outcome === 'hit' || outcome === 'recover';
    const minimal = power === 'minimal';
    const fragBase = good ? [0, 4, 5, 6, 6][tier] : 4;
    let fragments = reduced || minimal ? 0 : power === 'reduced' ? Math.ceil(fragBase / 2) : fragBase;
    return {
      outcome, tier,
      sound: outcome === 'hit' ? 'hit' : outcome === 'recover' ? 'recover' : 'none',   // misses keep their own sound
      squash: !reduced,
      bolt: good && !reduced && !minimal,
      flash: good ? (outcome === 'recover' ? 'rec' : 't' + tier) : outcome === 'timeout' ? 'bad' : 'dull',
      flashPeak: good ? [0, .35, .45, .55, .65][tier] : .3,
      ring: reduced ? '' : good ? (outcome === 'recover' ? 'rec' : 't' + tier) : '',
      ringScale: [0, 1.5, 1.8, 2.2, 2.6][good ? tier : 1],
      fragments,
      fragClass: good ? (outcome === 'recover' ? 'rec' : 't' + tier) : 'dust',
      spread: good ? [0, 34, 44, 58, 72][tier] : 26,
      crit: !!(sharp && outcome === 'hit' && !reduced),
    };
  },

  /* Layered hit sound on the shared synth: an immediate crack and a low
     thump (the game's own ding is the musical reward on top). Short: done
     within ~120 ms, so it never runs under learning audio. */
  _impactSound(kind, tier = 1, sharp = false) {
    if (kind === 'none') return;
    let c = null;
    try { const S = window.BoohaSFX; c = S && S.context && S.context(); } catch (_) {}
    if (!c || c.state !== 'running') return;
    const t = c.currentTime + 0.005;
    const n = Math.floor(c.sampleRate * 0.03);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; hp.type = 'highpass'; hp.frequency.value = kind === 'recover' ? 1800 : 2600;
    g.gain.value = 0.10 + tier * 0.02;
    src.connect(hp); hp.connect(g); g.connect(c.destination); src.start(t);
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(kind === 'recover' ? 220 : 150 + tier * 10, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.22 + tier * 0.04, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(og); og.connect(c.destination); o.start(t); o.stop(t + 0.12);
    if (sharp) {
      const k = c.createOscillator(), kg = c.createGain();
      k.type = 'sine'; k.frequency.setValueAtTime(2640, t + 0.02);
      kg.gain.setValueAtTime(0.0001, t + 0.02);
      kg.gain.exponentialRampToValueAtTime(0.08, t + 0.026);
      kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      k.connect(kg); kg.connect(c.destination); k.start(t + 0.02); k.stop(t + 0.1);
    }
  },

  createRun({ total = 15, recoverPoints = 50, minMs = 400, hud = true, now = null, impactKit = false } = {}) {
    const clock = typeof now === 'function' ? now : () => performance.now();
    const MULT = c => (c >= 10 ? 3 : c >= 6 ? 2 : c >= 3 ? 1.5 : 1);
    let st = null;
    let item = null;
    let hudEl = null;

    /* ── Celebration layer (Games Pass 9) ─────────────────────────────
       Milestones (×1.5 at 3, ×2 at 6, ×3 at 10) get a centre banner, a
       rising chime and sparks from the button just answered; ×3 lights a
       gold screen edge for the rest of the streak; losing a combo of 3+
       cracks and shatters the meter. Everything is pointer-events:none
       and never delays the next answer. Reduced motion: banner only, held
       still. Minimal power: no particles. */
    const BM = () => (typeof window !== 'undefined' && window.BoohaMotion) || null;
    const fxReduced = () => { const m = BM(); return !!(m && m.reduced && m.reduced()); };
    const fxPower = () => { const m = BM(); return (m && m.power && m.power()) || 'full'; };
    if (hud && typeof document !== 'undefined' && !window.__brunTap) {
      window.__brunTap = { el: null, t: 0 };
      document.addEventListener('pointerdown', e => {
        const t = e.target && e.target.closest ? (e.target.closest('button,a,[role="button"],input') || e.target) : null;
        window.__brunTap = { el: t, t: performance.now() };
      }, { capture: true, passive: true });
    }
    const fxOrigin = () => {
      const tap = window.__brunTap || {};
      let el = tap.el && tap.el.isConnected && performance.now() - tap.t < 2500 ? tap.el : null;
      if (!el && document.activeElement && document.activeElement !== document.body) el = document.activeElement;
      if (!el) el = document.getElementById('game-mount');
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
    };
    /* Razzle-dazzle Pass 2: every game on the tracker gets small "contact"
       at the answer the student just tapped (U.impact, no target, so no bolt:
       flash, ring and a few fragments that grow with the streak, plus the
       crack/thump layer). Games on the full kit (impactKit: true) draw their
       own, richer impacts and are skipped here. Only a fresh tap counts as
       the origin (a timeout or programmatic miss draws nothing stale). A
       recovery shows its blue-gold effect only where a second try scores:
       in multiple-choice games (recoverPoints 0) it would reward tapping
       every option. */
    const fxTapEl = () => {
      const tap = (typeof window !== 'undefined' && window.__brunTap) || {};
      return tap.el && tap.el.isConnected && performance.now() - tap.t < 1500 ? tap.el : null;
    };
    const autoImpact = (outcome, extra) => {
      if (impactKit || !hud || typeof document === 'undefined' || typeof UTILS === 'undefined') return;
      try { UTILS.impact(Object.assign({ source: fxTapEl(), outcome, squash: false }, extra || {})); } catch (_) {}
    };
    const fxCtx = () => {
      const S = typeof window !== 'undefined' && window.BoohaSFX;
      try { const c = S && S.context && S.context(); return c && c.state === 'running' ? c : null; } catch (_) { return null; }
    };
    const fxTone = (c, t, f, d, type, vol) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + d + 0.03);
    };
    const fxChime = level => {
      const c = fxCtx(); if (!c) return;
      const steps = level >= 3 ? [0, 4, 7, 12, 16, 19] : level >= 2 ? [0, 4, 7, 12] : [0, 4, 7];
      const t0 = c.currentTime + 0.02, base = 659.25;   // E5, major arpeggio upward
      steps.forEach((st, i) => {
        const f = base * Math.pow(2, st / 12), t = t0 + i * 0.065;
        fxTone(c, t, f, 0.32, 'triangle', 0.15);
        fxTone(c, t, f * 2, 0.22, 'sine', 0.05);
      });
    };
    const fxCrack = () => {
      const c = fxCtx(); if (!c) return;
      const t = c.currentTime + 0.01, n = Math.floor(c.sampleRate * 0.16);
      const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9; g.gain.value = 0.22;
      src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t);
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.22);
      og.gain.setValueAtTime(0.07, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(og); og.connect(c.destination); o.start(t); o.stop(t + 0.26);
    };
    const fxParticles = (at, count, cls, spread) => {
      if (fxReduced() || fxPower() === 'minimal') return;
      if (fxPower() === 'reduced') count = Math.ceil(count / 2);
      for (let i = 0; i < count; i++) {
        const p = document.createElement('i');
        p.className = cls;
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = spread * (0.6 + Math.random() * 0.6);
        p.style.left = at.x + 'px'; p.style.top = at.y + 'px';
        p.style.setProperty('--dx', Math.cos(a) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(a) * dist + (cls === 'brun-shard' ? 60 : 0) + 'px');
        p.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg');
        p.setAttribute('aria-hidden', 'true');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 900);
      }
    };
    const BANNER = { 1.5: ['NICE!', 'いいね！'], 2: ['AMAZING!', 'すごい！'], 3: ['ON FIRE!', 'さいこう！'] };
    const fxBanner = m => {
      document.querySelectorAll('.brun-banner').forEach(b => b.remove());
      const el = document.createElement('div');
      el.className = 'brun-banner lv' + String(m).replace('.', '');
      el.setAttribute('aria-hidden', 'true');
      const words = BANNER[m] || BANNER[1.5];
      el.innerHTML = `<b>COMBO ×${m}</b><span>${words[0]} · ${words[1]}</span>`;
      if (fxReduced()) el.classList.add('still');
      document.body.appendChild(el);
      setTimeout(() => el.remove(), fxReduced() ? 900 : 1100);
    };
    let edgeEl = null;
    const fxEdge = on => {
      if (typeof document === 'undefined' || !document.body) return;
      if (on && !edgeEl) {
        edgeEl = document.createElement('div');
        edgeEl.className = 'brun-edge';
        edgeEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(edgeEl);
        void edgeEl.offsetWidth;
      }
      if (edgeEl) edgeEl.classList.toggle('on', !!on);
    };

    const paint = (fx = {}) => {
      if (!hud || typeof document === 'undefined' || !document.body) return;
      if (!hudEl && !st.items) return;   // appears once play starts
      if (!hudEl) {
        hudEl = document.createElement('div');
        hudEl.className = 'brun-hud';
        hudEl.setAttribute('aria-live', 'polite');
        hudEl.innerHTML = '<span class="brun-mult"></span><span class="brun-meter" aria-hidden="true">' +
          '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><b class="brun-pts"></b>';
        document.body.appendChild(hudEl);
      }
      const m = MULT(st.combo);
      window.__brunCombo = st.combo;   // the synth ting climbs with the streak
      hudEl.querySelector('.brun-mult').textContent = st.combo >= 3 ? `COMBO ×${m}` : (st.combo ? `${st.combo} in a row` : '');
      hudEl.querySelector('.brun-pts').textContent = st.points.toLocaleString('en-US');
      hudEl.querySelectorAll('.brun-meter i').forEach((dot, i) => dot.classList.toggle('on', i < Math.min(10, st.combo)));
      hudEl.classList.toggle('hot', st.combo >= 3);
      hudEl.dataset.level = String(m);
      const bump = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
      if (fx.gained) bump(hudEl.querySelector('.brun-pts'), 'pop', 400);
      if (fx.milestone) {
        if (typeof UTILS !== 'undefined') UTILS._synthReplace('ding');
        bump(hudEl, 'pulse', 450);
        fxBanner(fx.milestone);
        fxChime(fx.milestone);
        fxParticles(fxOrigin(), fx.milestone >= 3 ? 18 : 14, 'brun-spark', fx.milestone >= 3 ? 130 : 100);
      }
      // (Per-hit sparks are now the impact kit's job: autoImpact below, or
      // the game's own U.impact when it runs on the full kit.)
      if (fx.broke) {
        if (typeof UTILS !== 'undefined') UTILS._synthReplace('fart');
        bump(hudEl, 'break', 500);
        fxCrack();
        const r = hudEl.getBoundingClientRect();
        fxParticles({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, 8, 'brun-shard', 70);
      }
      fxEdge(st.combo >= 10);
    };

    const api = {
      reset() {
        st = { points: 0, combo: 0, maxCombo: 0, firstTry: 0, sharp: 0, recovered: 0, misses: 0, items: 0, pace: [], frantic: 0 };
        item = null;
        paint();
        return api;
      },
      ready(parMs = 2500, opts = {}) {
        item = {
          readyAt: opts.waitAudio ? null : (Number.isFinite(opts.at) ? opts.at : clock()),
          par: Number(parMs) > 0 ? Number(parMs) : 2500,
          min: Number.isFinite(opts.minMs) ? opts.minMs : minMs,
          missed: false,
          resolved: false,
          first: false,
        };
        st.items++;
        return api;
      },
      _first(t, ok) {
        if (!item || item.first) return;
        item.first = true;
        const el = item.readyAt === null ? (Number.isFinite(item.acc) ? item.acc : null) : Math.max(0, t - item.readyAt);
        st.pace.push([el, item.par, ok]);
        if (!ok && el !== null && el < item.min) st.frantic++;
      },
      audioDone() {
        if (item && !item.resolved && item.readyAt === null) item.readyAt = clock() - (Number.isFinite(item.acc) ? item.acc : 0);
      },
      // Rainbow Pass B: a replay is listening, not hesitating. Bank the time
      // so far and stop the clock until the replayed clip ends.
      pauseClock() {
        if (!item || item.resolved || item.first || item.readyAt === null) return;
        item.acc = (Number.isFinite(item.acc) ? item.acc : 0) + Math.max(0, clock() - item.readyAt);
        item.readyAt = null;
      },
      hit(at) {
        if (!item) api.ready();
        if (item.resolved) return null;
        if (item.missed) return api.recover();
        api._first(Number.isFinite(at) ? at : clock(), true);
        const before = MULT(st.combo);
        st.combo++;
        st.maxCombo = Math.max(st.maxCombo, st.combo);
        st.firstTry++;
        const mult = MULT(st.combo);
        const t = Number.isFinite(at) ? at : clock();
        const elapsed = item.readyAt === null ? Infinity : t - item.readyAt;
        const sharp = elapsed >= item.min && elapsed <= item.par;
        const pts = Math.round(100 * mult) + (sharp ? 25 : 0);
        if (sharp) st.sharp++;
        st.points += pts;
        item.resolved = true;
        paint({ gained: pts, milestone: mult > before ? mult : 0 });
        autoImpact('hit', { combo: st.combo, sharp });
        return { pts, combo: st.combo, mult, sharp };
      },
      miss() {
        if (!item) api.ready();
        if (item.resolved || item.missed) return;
        api._first(clock(), false);
        item.missed = true;
        st.misses++;
        const hadCombo = st.combo >= 3;
        st.combo = 0;
        paint({ broke: hadCombo });
        autoImpact('miss');
      },
      recover() {
        if (!item || item.resolved) return null;
        if (!item.missed) return api.hit();
        item.resolved = true;
        st.recovered++;
        st.points += recoverPoints;
        paint({ gained: recoverPoints });
        if (recoverPoints > 0) autoImpact('recover', { combo: 1 });
        return { pts: recoverPoints, combo: 0, mult: 1, sharp: false };
      },
      summary() {
        fxEdge(false);   // the score card takes over
        const ds = ms => (ms === null || !Number.isFinite(ms) ? null : Math.round(ms / 100));
        const pace = {
          v: 1,
          t: st.pace.map(r => ds(r[0])),
          p: st.pace.map(r => ds(r[1])),
          f: st.pace.map(r => (r[2] ? '1' : '0')).join(''),
          fr: st.frantic,
        };
        if (typeof UTILS !== 'undefined') UTILS._lastPace = { pace, at: Date.now() };
        return {
          points: st.points, maxCombo: st.maxCombo, firstTry: st.firstTry,
          sharp: st.sharp, recovered: st.recovered, misses: st.misses, items: st.items,
          fullCombo: st.firstTry >= total && st.misses === 0 && st.recovered === 0,
          pace,
        };
      },
      hideHud() { if (hudEl) { hudEl.remove(); hudEl = null; } fxEdge(false); },
    };
    return api.reset();
  },

  /* ── Result sound paths (from sfxBase) ── */
  resultSoundFor(score, sfxBase) {
    if (score <= 5)  return sfxBase + 'result_0-5.mp3';
    if (score <= 10) return sfxBase + 'result_6-10.mp3';
    if (score <= 14) return sfxBase + 'result_11-14.mp3';
    return sfxBase + 'result_15.mp3';
  },

};

window.GAME_UTILS = UTILS;

})();
