
/* ═══════════════════════════════════════════════════════════════════
   VOCAB BLITZ  —  js/vocab-blitz.js
   Self-contained overlay game engine for the Booha Adventure index.
   Usage: VocabBlitz.launch({ curr, monthSlug, weekNumber })
═══════════════════════════════════════════════════════════════════ */

window.VocabBlitz = (() => {

  /* ── Palettes ────────────────────────────────────────────────── */
  const PALETTES = {
    pb: {
      name: 'Pre-Boo',
      nameJp: 'プレブー',
      bg: ['#1a0033','#2d0057','#3d0070','#1a0040','#280050'],
      accent: '#ff3bff',
      accent2: '#ffee00',
      glow: 'rgba(255,59,255,0.7)',
      optionBg: 'rgba(255,59,255,0.18)',
      optionBorder: '#ff3bff',
      optionHover: 'rgba(255,59,255,0.38)',
      timerColor: '#ffee00',
      wordColor: '#ffffff',
      hiraColor: '#ff9fff',
    },
    br: {
      name: 'Boo-riculum',
      nameJp: 'ブーリキュラム',
      bg: ['#001a33','#002d57','#003d70','#001440','#002850'],
      accent: '#00ffee',
      accent2: '#39ff14',
      glow: 'rgba(0,255,238,0.7)',
      optionBg: 'rgba(0,255,238,0.14)',
      optionBorder: '#00ffee',
      optionHover: 'rgba(0,255,238,0.32)',
      timerColor: '#39ff14',
      wordColor: '#ffffff',
      hiraColor: '#80ffee',
    },
    bc: {
      name: 'Boo-continuum',
      nameJp: 'ブーコンティニューム',
      bg: ['#1a0000','#330a00','#2a0500','#1f0000','#280800'],
      accent: '#ff6a00',
      accent2: '#ffd700',
      glow: 'rgba(255,106,0,0.7)',
      optionBg: 'rgba(255,106,0,0.15)',
      optionBorder: '#ff6a00',
      optionHover: 'rgba(255,106,0,0.35)',
      timerColor: '#ffd700',
      wordColor: '#ffffff',
      hiraColor: '#ffb870',
    },
  };

  /* ── Scolding bank ───────────────────────────────────────────── */
  const SCOLDS = [
    { jp: '練習ゼロ分？', hira: 'れんしゅうぜろぷん？', en: 'Did you practice for zero minutes?' },
    { jp: 'お母さんには言わないよ。今回は。', hira: 'おかあさんにはいわないよ。こんかいは。', en: "I won't tell your mom. This time." },
    { jp: '目を開けてプレイしてね。', hira: 'めをあけてぷれいしてね。', en: 'Play with your eyes open.' },
    { jp: '大丈夫。天才じゃない人もいるから。', hira: 'だいじょうぶ。てんさいじゃないひともいるから。', en: "It's okay. Not everyone can be a genius." },
    { jp: '次は単語を見てみて。', hira: 'つぎはたんごをみてみて。', en: 'Maybe look at the words next time.' },
    { jp: 'あ、惜しい！…全然。', hira: 'あ、おしい！…ぜんぜん。', en: 'Oh, so close! ...Not really.' },
    { jp: '単語帳、知ってる？', hira: 'たんごちょう、しってる？', en: 'Have you heard of flashcards?' },
    { jp: 'ブーハもびっくり。', hira: 'ぶーはもびっくり。', en: 'Even Booha is shocked.' },
  ];

  /* ── Save helpers ────────────────────────────────────────────── */
  function getBestTime(curr) {
    try {
      const raw = localStorage.getItem('booha_save');
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.meta?.vocabBlitz?.[curr] ?? null;
    } catch { return null; }
  }

  function saveBestTime(curr, ms) {
    try {
      const raw = localStorage.getItem('booha_save');
      const data = raw ? JSON.parse(raw) : {};
      if (!data.meta) data.meta = {};
      if (!data.meta.vocabBlitz) data.meta.vocabBlitz = {};
      const existing = data.meta.vocabBlitz[curr];
      if (existing === null || existing === undefined || ms < existing) {
        data.meta.vocabBlitz[curr] = ms;
        localStorage.setItem('booha_save', JSON.stringify(data));
        return true; // new record
      }
      return false;
    } catch { return false; }
  }

  /* ── Shuffle ─────────────────────────────────────────────────── */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── Format time ─────────────────────────────────────────────── */
  function fmtTime(ms) {
    if (ms === null || ms === undefined) return '--';
    const s = Math.floor(ms / 1000);
    const cents = Math.floor((ms % 1000) / 10);
    return `${s}.${String(cents).padStart(2, '0')}s`;
  }

  /* ── Inject styles once ──────────────────────────────────────── */
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const s = document.createElement('style');
    s.textContent = `
      #vb-overlay {
        position: fixed; inset: 0; z-index: 9000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: flex-start;
        overflow: hidden;
        transition: background 600ms ease;
        font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,
          "Noto Sans","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
      }

      /* ── timer bar ── */
      #vb-timer-bar {
        width: 100%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        padding: max(env(safe-area-inset-top,0px) + 12px, 18px) 20px 14px;
        gap: 16px;
        position: relative; z-index: 2;
      }
      #vb-timer {
        font-size: clamp(36px, 9vw, 72px);
        font-weight: 900;
        letter-spacing: 2px;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 24px currentColor, 0 0 48px currentColor;
        transition: color 600ms ease;
        line-height: 1;
      }
      #vb-quit {
        position: absolute; right: 16px; top: 50%;
        transform: translateY(-50%);
        appearance: none; border: 0;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.18);
        color: rgba(255,255,255,0.6);
        border-radius: 999px;
        padding: 7px 14px;
        font-size: 12px; font-weight: 900;
        cursor: pointer; letter-spacing: 1px;
        -webkit-tap-highlight-color: transparent;
      }
      #vb-quit:active { transform: translateY(-50%) scale(0.97); }

      #vb-progress {
        font-size: clamp(11px,2.5vw,14px);
        color: rgba(255,255,255,0.5);
        letter-spacing: 2px;
        font-weight: 700;
      }

      /* ── word stage ── */
      #vb-stage {
        flex: 1; width: 100%;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 0 20px;
        position: relative; z-index: 2;
        gap: clamp(10px,3vw,24px);
      }

      #vb-jp-word {
        font-size: clamp(52px, 14vw, 110px);
        font-weight: 900;
        line-height: 1;
        text-align: center;
        color: #fff;
        text-shadow: 0 0 32px var(--vb-glow), 0 0 64px var(--vb-glow), 0 0 96px var(--vb-glow);
        animation: vbWordPop 300ms cubic-bezier(.34,1.56,.64,1) both;
      }
      @keyframes vbWordPop {
        from { transform: scale(0.5); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }

      #vb-hira {
        font-size: clamp(16px,4vw,28px);
        color: var(--vb-hira-color);
        text-align: center;
        letter-spacing: 2px;
        text-shadow: 0 0 16px var(--vb-glow);
        animation: vbWordPop 300ms 60ms cubic-bezier(.34,1.56,.64,1) both;
      }

      /* ── options grid ── */
      #vb-options {
        width: 100%; max-width: 600px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(8px,2vw,14px);
        padding: 0 0 max(env(safe-area-inset-bottom,0px) + 16px, 20px);
        position: relative; z-index: 2;
      }

      .vb-opt {
        appearance: none; border: 0;
        border-radius: clamp(14px,3vw,22px);
        padding: clamp(14px,3.5vw,24px) clamp(10px,2vw,16px);
        font-size: clamp(14px,3.5vw,22px);
        font-weight: 900;
        color: #fff;
        cursor: pointer;
        text-align: center;
        letter-spacing: 0.3px;
        line-height: 1.2;
        background: var(--vb-opt-bg);
        border: 2px solid var(--vb-opt-border);
        box-shadow:
          0 0 0 0 var(--vb-glow),
          0 8px 24px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.12);
        transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
        -webkit-tap-highlight-color: transparent;
        animation: vbOptIn 350ms var(--opt-delay, 0ms) cubic-bezier(.34,1.56,.64,1) both;
        position: relative;
        overflow: hidden;
      }
      @keyframes vbOptIn {
        from { transform: scale(0.7) translateY(20px); opacity: 0; }
        to   { transform: scale(1)   translateY(0);    opacity: 1; }
      }

      .vb-opt:nth-child(1) { --opt-delay: 40ms; }
      .vb-opt:nth-child(2) { --opt-delay: 80ms; }
      .vb-opt:nth-child(3) { --opt-delay: 120ms; }
      .vb-opt:nth-child(4) { --opt-delay: 160ms; }
      .vb-opt:nth-child(5) { --opt-delay: 200ms; }
      .vb-opt:nth-child(6) { --opt-delay: 240ms; }

      .vb-opt:hover {
        background: var(--vb-opt-hover);
        box-shadow:
          0 0 18px 4px var(--vb-glow),
          0 12px 28px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.18);
        transform: scale(1.04);
      }
      .vb-opt:active { transform: scale(0.98); }

      .vb-opt.correct {
        background: rgba(0,255,100,0.35) !important;
        border-color: #00ff64 !important;
        box-shadow: 0 0 32px 8px rgba(0,255,100,0.6) !important;
        transform: scale(1.08) !important;
        animation: vbCorrectPulse 400ms ease forwards !important;
      }
      @keyframes vbCorrectPulse {
        0%   { transform: scale(1.08); }
        50%  { transform: scale(1.14); }
        100% { transform: scale(1.08); }
      }

      .vb-opt.wrong {
        background: rgba(255,30,30,0.45) !important;
        border-color: #ff1e1e !important;
        box-shadow: 0 0 32px 8px rgba(255,30,30,0.7) !important;
        animation: vbShake 400ms ease !important;
      }
      @keyframes vbShake {
        0%,100% { transform: translateX(0); }
        20%  { transform: translateX(-8px); }
        40%  { transform: translateX(8px); }
        60%  { transform: translateX(-6px); }
        80%  { transform: translateX(6px); }
      }

      /* ── BG flash on correct ── */
      #vb-flash {
        position: absolute; inset: 0; z-index: 1;
        pointer-events: none;
        opacity: 0;
        background: rgba(255,255,255,0.18);
        transition: opacity 80ms ease;
      }
      #vb-flash.on { opacity: 1; }

      /* ── Wrong popup ── */
      #vb-wrong-popup {
        position: absolute; inset: 0; z-index: 20;
        display: none;
        flex-direction: column;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 24px;
        text-align: center;
        gap: 10px;
      }
      #vb-wrong-popup.show { display: flex; }

      .vb-wrong-kanji {
        font-size: clamp(52px,14vw,96px);
        font-weight: 900;
        color: #ff3b3b;
        text-shadow: 0 0 32px rgba(255,59,59,0.9), 0 0 64px rgba(255,59,59,0.5);
        line-height: 1;
        animation: vbWordPop 350ms cubic-bezier(.34,1.56,.64,1) both;
      }
      .vb-wrong-hira {
        font-size: clamp(14px,3.5vw,22px);
        color: rgba(255,150,150,0.9);
        letter-spacing: 2px;
      }
      .vb-wrong-en {
        font-size: clamp(22px,6vw,42px);
        font-weight: 900;
        color: #fff;
        margin-top: 4px;
      }
      .vb-wrong-scold-jp {
        font-size: clamp(16px,4vw,26px);
        font-weight: 900;
        color: #ffee00;
        margin-top: 12px;
        text-shadow: 0 0 16px rgba(255,238,0,0.7);
      }
      .vb-wrong-scold-hira {
        font-size: clamp(11px,2.5vw,15px);
        color: rgba(255,238,0,0.65);
        letter-spacing: 1.5px;
      }
      .vb-wrong-scold-en {
        font-size: clamp(13px,3vw,18px);
        color: rgba(255,255,255,0.7);
        font-style: italic;
        margin-top: 2px;
      }
      #vb-wrong-time {
        font-size: clamp(28px,7vw,52px);
        font-weight: 900;
        color: rgba(255,255,255,0.4);
        margin-top: 8px;
        font-variant-numeric: tabular-nums;
      }
      #vb-wrong-close {
        margin-top: 16px;
        appearance: none; border: 0;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.25);
        color: #fff;
        border-radius: 999px;
        padding: 13px 32px;
        font-size: clamp(14px,3.5vw,18px);
        font-weight: 900;
        cursor: pointer;
        letter-spacing: 1px;
        -webkit-tap-highlight-color: transparent;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      #vb-wrong-close:active { transform: scale(0.98); }

      /* ── Win screen ── */
      #vb-win {
        position: absolute; inset: 0; z-index: 20;
        display: none;
        flex-direction: column;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.90);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 28px 24px;
        text-align: center;
        gap: 8px;
      }
      #vb-win.show { display: flex; }

      .vb-win-label {
        font-size: clamp(11px,2.5vw,14px);
        letter-spacing: 3px;
        color: rgba(255,255,255,0.5);
        text-transform: uppercase;
      }
      .vb-win-time {
        font-size: clamp(56px,15vw,112px);
        font-weight: 900;
        color: #fff;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 32px var(--vb-glow), 0 0 64px var(--vb-glow);
        animation: vbWordPop 500ms cubic-bezier(.34,1.56,.64,1) both;
      }
      .vb-win-record {
        font-size: clamp(14px,3.5vw,22px);
        font-weight: 900;
        color: #ffee00;
        text-shadow: 0 0 16px rgba(255,238,0,0.8);
        letter-spacing: 1px;
        min-height: 28px;
      }
      .vb-win-best {
        font-size: clamp(12px,2.8vw,16px);
        color: rgba(255,255,255,0.45);
        letter-spacing: 1px;
      }
      .vb-win-buttons {
        display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;
        justify-content: center;
      }
      .vb-win-btn {
        appearance: none; border: 0;
        border-radius: 999px;
        padding: 13px 28px;
        font-size: clamp(14px,3.5vw,18px);
        font-weight: 900; letter-spacing: 0.5px;
        cursor: pointer; color: #000;
        background: linear-gradient(180deg, #ff79d7, #ff3bbd);
        box-shadow: 0 8px 18px rgba(255,59,189,0.35), 0 0 22px rgba(255,59,189,0.3);
        -webkit-tap-highlight-color: transparent;
      }
      .vb-win-btn.ghost {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.25);
        color: rgba(255,255,255,0.8);
        box-shadow: none;
      }
      .vb-win-btn:active { transform: scale(0.98); }

      /* ── Particle burst ── */
      .vb-particle {
        position: absolute; border-radius: 50%;
        pointer-events: none; z-index: 3;
        animation: vbParticle var(--pdur) ease-out var(--pdelay) both;
      }
      @keyframes vbParticle {
        0%   { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--px),var(--py)) scale(0); opacity: 0; }
      }

      /* ── Screen shake ── */
      @keyframes vbScreenShake {
        0%,100% { transform: translate(0,0); }
        15% { transform: translate(-10px, 5px); }
        30% { transform: translate(10px, -6px); }
        45% { transform: translate(-8px, 8px); }
        60% { transform: translate(9px, -4px); }
        75% { transform: translate(-6px, 6px); }
        90% { transform: translate(7px, -3px); }
      }
      #vb-overlay.shake { animation: vbScreenShake 400ms ease; }

      /* ── Confetti ── */
      .vb-confetti {
        position: absolute;
        width: 10px; height: 10px;
        border-radius: 2px;
        pointer-events: none; z-index: 3;
        animation: vbConfettiFall var(--cdur) ease-out var(--cdelay) both;
      }
      @keyframes vbConfettiFall {
        0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translate(var(--cx), var(--cy)) rotate(720deg) scale(0.3); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Build overlay DOM ───────────────────────────────────────── */
  function buildOverlay() {
    const el = document.createElement('div');
    el.id = 'vb-overlay';
    el.innerHTML = `
      <div id="vb-flash"></div>

      <div id="vb-timer-bar">
        <div id="vb-progress"></div>
        <div id="vb-timer">0.00s</div>
        <button id="vb-quit" type="button">やめる</button>
      </div>

      <div id="vb-stage">
        <div id="vb-jp-word"></div>
        <div id="vb-hira"></div>
      </div>

      <div id="vb-options"></div>

      <div id="vb-wrong-popup">
        <div class="vb-wrong-kanji" id="vwk"></div>
        <div class="vb-wrong-hira"  id="vwh"></div>
        <div class="vb-wrong-en"    id="vwe"></div>
        <div class="vb-wrong-scold-jp"   id="vsj"></div>
        <div class="vb-wrong-scold-hira" id="vsh"></div>
        <div class="vb-wrong-scold-en"   id="vse"></div>
        <div id="vb-wrong-time"></div>
        <button id="vb-wrong-close" type="button">もどる</button>
      </div>

      <div id="vb-win">
        <div class="vb-win-label">FINAL TIME</div>
        <div class="vb-win-time"   id="vb-win-time-val"></div>
        <div class="vb-win-record" id="vb-win-record-msg"></div>
        <div class="vb-win-best"   id="vb-win-best-val"></div>
        <div class="vb-win-buttons">
          <button class="vb-win-btn" id="vb-play-again" type="button">もう一度</button>
          <button class="vb-win-btn ghost" id="vb-win-close" type="button">もどる</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  /* ── Particles ───────────────────────────────────────────────── */
  function burst(overlay, x, y, color) {
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div');
      p.className = 'vb-particle';
      const angle = (i / 14) * Math.PI * 2;
      const dist  = 50 + Math.random() * 80;
      p.style.cssText = `
        left:${x}px; top:${y}px;
        width:${6 + Math.random()*6}px;
        height:${6 + Math.random()*6}px;
        background:${color};
        --px:${Math.cos(angle)*dist}px;
        --py:${Math.sin(angle)*dist}px;
        --pdur:${500 + Math.random()*300}ms;
        --pdelay:${Math.random()*60}ms;
        box-shadow:0 0 8px 2px ${color};
      `;
      overlay.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  function confetti(overlay, palette) {
    const colors = [palette.accent, palette.accent2, '#ffffff', '#ff3bbd', '#ffee00'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('div');
      c.className = 'vb-confetti';
      const startX = Math.random() * window.innerWidth;
      const startY = -20;
      c.style.cssText = `
        left:${startX}px; top:${startY}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        --cx:${(Math.random()-0.5)*400}px;
        --cy:${200 + Math.random()*400}px;
        --cdur:${800+Math.random()*600}ms;
        --cdelay:${Math.random()*400}ms;
        border-radius:${Math.random()>0.5?'50%':'2px'};
      `;
      overlay.appendChild(c);
      c.addEventListener('animationend', () => c.remove());
    }
  }

  /* ── Main launch function ────────────────────────────────────── */
  function launch({ curr, monthSlug, weekNumber }) {
    const palette = PALETTES[curr];
    if (!palette) { console.error('VocabBlitz: unknown curr', curr); return; }

    injectStyles();

    // Fetch vocab data
    const path = `content/${curr}/${monthSlug}/vocab.json`;
    fetch(path)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => startGame(data.cards, curr, weekNumber, palette, monthSlug))
      .catch(err => {
        alert(`データが読み込めませんでした。\nCould not load vocab data.\n(${path})`);
        console.error('VocabBlitz fetch error:', err);
      });
  }

  function startGame(allCards, curr, weekNumber, palette, monthSlug) {
    // Slice this week's 15
    const offset = (weekNumber - 1) * 15;
    const weekCards = allCards.slice(offset, offset + 15);
    if (weekCards.length < 6) {
      alert('Not enough vocab cards for this week.');
      return;
    }

    // Remove any existing overlay
    const existing = document.getElementById('vb-overlay');
    if (existing) existing.remove();

    const overlay = buildOverlay();

    // Apply CSS vars for palette
    overlay.style.setProperty('--vb-glow', palette.glow);
    overlay.style.setProperty('--vb-hira-color', palette.hiraColor);
    overlay.style.setProperty('--vb-opt-bg', palette.optionBg);
    overlay.style.setProperty('--vb-opt-border', palette.optionBorder);
    overlay.style.setProperty('--vb-opt-hover', palette.optionHover);
    overlay.style.background = palette.bg[0];

    // DOM refs
    const timerEl   = overlay.querySelector('#vb-timer');
    const progressEl = overlay.querySelector('#vb-progress');
    const jpWordEl  = overlay.querySelector('#vb-jp-word');
    const hiraEl    = overlay.querySelector('#vb-hira');
    const optionsEl = overlay.querySelector('#vb-options');
    const flashEl   = overlay.querySelector('#vb-flash');
    const wrongPopup = overlay.querySelector('#vb-wrong-popup');
    const winScreen = overlay.querySelector('#vb-win');

    timerEl.style.color = palette.timerColor;

    // State
    const queue = shuffle(weekCards);
    let current = 0;
    let startTime = null;
    let elapsed = 0;
    let rafId = null;
    let locked = false;
    let bgIndex = 0;

    // Timer
    function tick() {
      if (startTime === null) { rafId = requestAnimationFrame(tick); return; }
      elapsed = Date.now() - startTime;
      timerEl.textContent = fmtTime(elapsed);
      rafId = requestAnimationFrame(tick);
    }

    function stopTimer() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // Render question
    function renderQuestion() {
      locked = false;
      const card = queue[current];

      // Animate background color change
      bgIndex = (bgIndex + 1) % palette.bg.length;
      overlay.style.background = palette.bg[bgIndex];

      // Word display
      // Force re-animation by replacing element
      jpWordEl.style.animation = 'none';
      hiraEl.style.animation   = 'none';
      requestAnimationFrame(() => {
        jpWordEl.style.animation = '';
        hiraEl.style.animation   = '';
        jpWordEl.textContent = card.jp;
        hiraEl.textContent   = card.hira;
      });

      // Progress
      progressEl.textContent = `${current + 1} / ${queue.length}`;

      // Build 6 options: 1 correct + 5 wrong from rest of week
      const wrong = shuffle(weekCards.filter(c => c.n !== card.n)).slice(0, 5);
      const options = shuffle([card, ...wrong]);

      optionsEl.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className  = 'vb-opt';
        btn.type       = 'button';
        btn.textContent = opt.en;
        btn.addEventListener('click', () => handleAnswer(btn, opt, card, options));
        optionsEl.appendChild(btn);
      });

      // Start timer on first question
      if (current === 0 && startTime === null) {
        startTime = Date.now();
      }
    }

    function handleAnswer(btn, chosen, correct, allOpts) {
      if (locked) return;
      locked = true;

      if (chosen.n === correct.n) {
        // ── CORRECT ──
        btn.classList.add('correct');

        // Particle burst from button center
        const r = btn.getBoundingClientRect();
        const ox = overlay.getBoundingClientRect();
        burst(overlay, r.left - ox.left + r.width/2, r.top - ox.top + r.height/2, palette.accent);

        // Flash
        flashEl.classList.add('on');
        setTimeout(() => flashEl.classList.remove('on'), 120);

        current++;
        if (current >= queue.length) {
          // WIN
          stopTimer();
          setTimeout(() => showWin(elapsed, curr, palette, overlay, winScreen,
            monthSlug, weekNumber, queue), 350);
        } else {
          setTimeout(renderQuestion, 420);
        }
      } else {
        // ── WRONG ──
        btn.classList.add('wrong');

        // Highlight correct answer
        const allBtns = optionsEl.querySelectorAll('.vb-opt');
        allBtns.forEach(b => {
          if (b.textContent === correct.en) b.classList.add('correct');
        });

        // Screen shake
        overlay.classList.add('shake');
        overlay.addEventListener('animationend', () => overlay.classList.remove('shake'), { once: true });

        stopTimer();
        setTimeout(() => showWrongPopup(correct, overlay, wrongPopup, elapsed), 500);
      }
    }

    // Wrong popup
    function showWrongPopup(correct, overlay, popup, ms) {
      const scold = SCOLDS[Math.floor(Math.random() * SCOLDS.length)];
      overlay.querySelector('#vwk').textContent = correct.jp;
      overlay.querySelector('#vwh').textContent = correct.hira;
      overlay.querySelector('#vwe').textContent = correct.en;
      overlay.querySelector('#vsj').textContent = scold.jp;
      overlay.querySelector('#vsh').textContent = scold.hira;
      overlay.querySelector('#vse').textContent = scold.en;
      overlay.querySelector('#vb-wrong-time').textContent = fmtTime(ms);
      popup.classList.add('show');
    }

    overlay.querySelector('#vb-wrong-close').addEventListener('click', () => {
      stopTimer();
      overlay.remove();
      if (typeof window.VocabBlitz._onClose === 'function') window.VocabBlitz._onClose();
    });

    // Win screen
    function showWin(ms, curr, palette, overlay, winScreen, monthSlug, weekNumber) {
      const isRecord = saveBestTime(curr, ms);
      const best     = getBestTime(curr);

      overlay.style.setProperty('--vb-glow', palette.glow);
      winScreen.querySelector('#vb-win-time-val').textContent = fmtTime(ms);
      winScreen.querySelector('#vb-win-time-val').style.color = palette.timerColor;
      winScreen.querySelector('#vb-win-time-val').style.textShadow =
        `0 0 32px ${palette.glow}, 0 0 64px ${palette.glow}`;

      if (isRecord) {
        winScreen.querySelector('#vb-win-record-msg').textContent = '🏆 新記録！ NEW RECORD!';
        winScreen.querySelector('#vb-win-best-val').textContent = '';
      } else {
        winScreen.querySelector('#vb-win-record-msg').textContent = '';
        winScreen.querySelector('#vb-win-best-val').textContent =
          `ベスト: ${fmtTime(best)}`;
      }

      winScreen.classList.add('show');
      confetti(overlay, palette);
    }

    overlay.querySelector('#vb-play-again').addEventListener('click', () => {
      overlay.remove();
      // Relaunch with same params
      launch({ curr, monthSlug, weekNumber });
    });

    overlay.querySelector('#vb-win-close').addEventListener('click', () => {
      overlay.remove();
      if (typeof window.VocabBlitz._onClose === 'function') window.VocabBlitz._onClose();
    });

    // Quit
    overlay.querySelector('#vb-quit').addEventListener('click', () => {
      stopTimer();
      overlay.remove();
      if (typeof window.VocabBlitz._onClose === 'function') window.VocabBlitz._onClose();
    });

    // Kick off
    rafId = requestAnimationFrame(tick);
    renderQuestion();
  }

  /* ── "Who is Fastest?" panel ─────────────────────────────────── */
  function buildFastestPanel() {
    const panel = document.createElement('div');
    panel.id = 'vb-fastest-panel';
    panel.innerHTML = `
      <div id="vb-fp-inner">
        <div id="vb-fp-top">
          <div id="vb-fp-title">FASTEST PLAYERS</div>
          <button id="vb-fp-close" type="button">とじる</button>
        </div>
        <div id="vb-fp-tabs">
          <button class="vb-fp-tab active" data-tab="vocab">単語<br><span>VOCAB</span></button>
          <button class="vb-fp-tab" data-tab="sentences">文章<br><span>SENTENCES</span></button>
          <button class="vb-fp-tab" data-tab="questions">問題<br><span>QUESTIONS</span></button>
        </div>
        <div id="vb-fp-body">
          <div class="vb-fp-pane active" data-pane="vocab">
            ${buildVocabPane()}
          </div>
          <div class="vb-fp-pane" data-pane="sentences">
            <div class="vb-fp-coming">Coming soon…<br>文章ゲームは準備中</div>
          </div>
          <div class="vb-fp-pane" data-pane="questions">
            <div class="vb-fp-coming">Coming soon…<br>問題ゲームは準備中</div>
          </div>
        </div>
      </div>
    `;

    // Styles
    const s = document.createElement('style');
    s.id = 'vb-fp-styles';
    s.textContent = `
      #vb-fastest-panel {
        position: fixed; inset: 0; z-index: 8000;
        display: none;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: max(env(safe-area-inset-top,0px) + 12px, 16px)
                 max(env(safe-area-inset-right,0px) + 12px, 16px)
                 max(env(safe-area-inset-bottom,0px) + 12px, 16px)
                 max(env(safe-area-inset-left,0px) + 12px, 16px);
        font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,
          "Noto Sans","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
      }
      #vb-fastest-panel.show { display: flex; }

      #vb-fp-inner {
        width: min(480px, 100%);
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 64px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,59,189,0.4),
          0 0 32px rgba(255,59,189,0.2);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }

      #vb-fp-top {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 18px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      #vb-fp-title {
        font-size: clamp(14px,3.5vw,20px);
        font-weight: 900; letter-spacing: 1.5px;
        color: #fff;
        text-shadow: 0 0 20px rgba(255,59,189,0.7);
      }
      #vb-fp-close {
        appearance: none; border: 1px solid rgba(255,255,255,0.2);
        background: rgba(0,0,0,0.2); color: rgba(255,255,255,0.7);
        border-radius: 999px; padding: 7px 14px;
        font-size: 12px; font-weight: 900; cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      #vb-fp-close:active { transform: scale(0.97); }

      #vb-fp-tabs {
        display: flex;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .vb-fp-tab {
        flex: 1;
        appearance: none; border: 0;
        background: transparent;
        color: rgba(255,255,255,0.45);
        padding: 12px 8px;
        font-size: clamp(10px,2.5vw,13px);
        font-weight: 900; letter-spacing: 0.5px;
        line-height: 1.3; text-align: center;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: color 200ms, border-color 200ms;
        -webkit-tap-highlight-color: transparent;
      }
      .vb-fp-tab span { font-size: 0.8em; opacity: 0.8; }
      .vb-fp-tab.active {
        color: #fff;
        border-bottom-color: #ff3bbd;
      }
      .vb-fp-tab:active { opacity: 0.7; }

      #vb-fp-body { padding: 16px 18px 20px; }

      .vb-fp-pane { display: none; }
      .vb-fp-pane.active { display: block; }

      .vb-fp-coming {
        text-align: center;
        color: rgba(255,255,255,0.35);
        font-size: 14px; line-height: 1.8;
        padding: 24px 0;
      }

      .vb-fp-row {
        display: flex; align-items: center;
        gap: 12px; padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 8px;
      }
      .vb-fp-dot {
        width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
      }
      .vb-fp-curr { flex: 1; }
      .vb-fp-curr-name {
        font-size: clamp(12px,3vw,15px);
        font-weight: 900; color: #fff;
      }
      .vb-fp-curr-jp {
        font-size: clamp(10px,2.2vw,12px);
        color: rgba(255,255,255,0.45);
        margin-top: 2px;
      }
      .vb-fp-time {
        font-size: clamp(18px,4.5vw,28px);
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        color: #fff;
      }
      .vb-fp-time.no-score { color: rgba(255,255,255,0.25); font-size: clamp(14px,3vw,18px); }
    `;
    document.head.appendChild(s);
    document.body.appendChild(panel);

    // Tab switching
    panel.querySelectorAll('.vb-fp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.vb-fp-tab').forEach(t => t.classList.remove('active'));
        panel.querySelectorAll('.vb-fp-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        panel.querySelector(`.vb-fp-pane[data-pane="${tab.dataset.tab}"]`).classList.add('active');
      });
    });

    panel.querySelector('#vb-fp-close').addEventListener('click', () => {
      panel.classList.remove('show');
    });
    panel.addEventListener('click', e => { if (e.target === panel) panel.classList.remove('show'); });

    return panel;
  }

  function buildVocabPane() {
    const rows = [
      { curr: 'pb', name: 'Pre-Boo',        jp: 'プレブー',              color: '#ff3bff' },
      { curr: 'br', name: 'Boo-riculum',     jp: 'ブーリキュラム',        color: '#00ffee' },
      { curr: 'bc', name: 'Boo-continuum',   jp: 'ブーコンティニューム',  color: '#ff6a00' },
    ];
    return rows.map(r => {
      const t = getBestTime(r.curr);
      const hasScore = t !== null && t !== undefined;
      return `
        <div class="vb-fp-row">
          <div class="vb-fp-dot" style="background:${r.color};box-shadow:0 0 8px ${r.color};"></div>
          <div class="vb-fp-curr">
            <div class="vb-fp-curr-name">${r.name}</div>
            <div class="vb-fp-curr-jp">${r.jp}</div>
          </div>
          <div class="vb-fp-time ${hasScore ? '' : 'no-score'}" data-vb-score="${r.curr}">
            ${hasScore ? fmtTime(t) : '-- --'}
          </div>
        </div>`;
    }).join('');
  }

  function openFastestPanel(gameType = 'vocab') {
     
    let panel = document.getElementById('vb-fastest-panel');
    if (!panel) panel = buildFastestPanel();

    // Refresh scores
    ['pb','br','bc'].forEach(curr => {
      const el = panel.querySelector(`[data-vb-score="${curr}"]`);
      if (!el) return;
      const t = getBestTime(curr);
      if (t !== null && t !== undefined) {
        el.textContent = fmtTime(t);
        el.classList.remove('no-score');
      } else {
        el.textContent = '-- --';
        el.classList.add('no-score');
      }
    });

    panel.classList.add('show');
     // Update title and active tab to match gameType
  const tabs = panel.querySelectorAll('.vb-fp-tab');
  tabs.forEach(t => {
    t.classList.toggle('active', t.dataset.tab === gameType);
  });
  panel.querySelectorAll('.vb-fp-pane').forEach(p => {
    p.classList.toggle('active', p.dataset.pane === gameType);
  });
  }

  /* ── Public API ──────────────────────────────────────────────── */
  return {
    launch,
    openFastestPanel,
    fmtTime,
    getBestTime,
    _onClose: null,   // set by index.html if needed
  };

})();
