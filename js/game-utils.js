
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
  _sfxLastPlayed: new Map(),

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
    const now = Date.now();
    const last = this._sfxLastPlayed.get(name) || 0;
    if (now - last < 140) return false;
    this._sfxLastPlayed.set(name, now);
    if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const g = this._ctx.createGain();
    g.gain.value = Math.max(0, Math.min(1, vol));
    src.connect(g);
    g.connect(this._master);
    try { src.start(0); } catch(e) { return false; }
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
  emitGameEnd(detail) {
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
