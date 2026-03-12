
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
     AUDIO — WebAudio context SFX
     ══════════════════════════════ */
  _ctx: null,
  _master: null,
  _buf: new Map(),
  _unlocked: false,

  _ensureCtx() {
    if (!this._ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      this._ctx = new C();
      this._master = this._ctx.createGain();
      this._master.gain.value = 1;
      this._master.connect(this._ctx.destination);
    }
  },

  unlockAudio() {
    this._ensureCtx();
    if (this._unlocked) return;
    this._unlocked = true;
    if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
    const b = this._ctx.createBuffer(1, 1, 22050);
    const s = this._ctx.createBufferSource();
    s.buffer = b;
    s.connect(this._master);
    try { s.start(0); } catch(e) {}
  },

  async loadSFX(name, url) {
    this._ensureCtx();
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      const arr = await res.arrayBuffer();
      const buf = await this._ctx.decodeAudioData(arr);
      this._buf.set(name, buf);
    } catch(e) {
      console.warn('[game-utils] Could not load SFX:', name, url);
    }
  },

  playSFX(name, vol = 1) {
    if (!this._ctx) return;
    const buf = this._buf.get(name);
    if (!buf) return;
    if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const g = this._ctx.createGain();
    g.gain.value = Math.max(0, Math.min(1, vol));
    src.connect(g);
    g.connect(this._master);
    try { src.start(0); } catch(e) {}
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
    if (mount) mount.innerHTML = html;
  },

  setTitle(gameName) {
    const el = document.getElementById('gameTitle');
    if (el) el.textContent = gameName;
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
