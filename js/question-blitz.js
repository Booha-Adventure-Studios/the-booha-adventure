
/* ═══════════════════════════════════════════════════════════════════
   QUESTION BLITZ  —  js/question-blitz.js
   Self-contained overlay game engine for the Booha Adventure index.
   Usage: QuestionBlitz.launch({ curr, monthSlug, weekNumber })
═══════════════════════════════════════════════════════════════════ */

window.QuestionBlitz = (() => {

  /* ── Palettes ────────────────────────────────────────────────── */
 const PALETTES = {
    pb: {
      baseHue: 318, bgSat: 68, bgLit: 14,
      accent: '#ff5ac8', accent2: '#ffe16a', glow: 'rgba(255,90,200,0.72)',
      optionBg: 'rgba(255,90,200,0.16)', optionBorder: '#ff5ac8',
      optionHover: 'rgba(255,90,200,0.34)', timerColor: '#ffe16a', hiraColor: '#ffc0ec',
      particleShape: 'round', particleEasing: 'cubic-bezier(.16,1.5,.3,1)',
      nameEasing: 'cubic-bezier(.2,.9,.25,1)', hueStep: 72, feel: 'playful',
      rewardColors: ['#fff8ce', '#ffe166', '#ff72d2', '#ffffff'], rewardGlow: 'rgba(255,165,48,.78)',
    },
    br: {
      baseHue: 220, bgSat: 85, bgLit: 10,
      accent: '#3d8eff',
      accent2: '#aaccff',
      glow: 'rgba(61,142,255,0.7)',
      optionBg: 'rgba(61,142,255,0.10)',
      optionBorder: '#3d8eff',
      optionHover: 'rgba(61,142,255,0.26)',
      timerColor: '#aaccff',
      hiraColor: '#88aaff',
      particleShape: 'arcade', particleEasing: 'ease-out',
      nameEasing: 'cubic-bezier(.2,.75,.3,1)', hueStep: 51, feel: 'arcade',
      rewardColors: ['#f5ffcf', '#39ff14', '#00ffee', '#ffffff'], rewardGlow: 'rgba(0,255,210,.78)',
    },
    bc: {
      baseHue: 222, bgSat: 42, bgLit: 8,
      accent: '#f0c96a', accent2: '#dfeaff', glow: 'rgba(240,201,106,0.58)',
      optionBg: 'rgba(240,201,106,0.10)', optionBorder: '#f0c96a',
      optionHover: 'rgba(240,201,106,0.22)', timerColor: '#ffe7a0', hiraColor: '#b8d1ff',
      particleShape: 'diamond', particleEasing: 'cubic-bezier(.2,.7,.2,1)',
      nameEasing: 'cubic-bezier(.33,.05,.55,.9)', hueStep: 24, feel: 'sleek',
      rewardColors: ['#fff6cf', '#f0c96a', '#dfeaff', '#ffffff'], rewardGlow: 'rgba(240,201,106,.72)',
    },
  };
   
  /* ── Scolding bank ───────────────────────────────────────────── */
  const SCOLDS = [
    {
      jp: '練習した形跡がないね。',
      hira: 'れんしゅうしたけいせきがないね。',
      en: 'There is no evidence that you practiced.'
    },
    {
      jp: 'ブーハ、今ちょっと黙ったよ。',
      hira: 'ぶーは、いまちょっとだまったよ。',
      en: 'Booha just went quiet for a second.'
    },
    {
      jp: 'お母さんには言わないよ。今回は。',
      hira: 'おかあさんにはいわないよ。こんかいは。',
      en: "I won't tell your mom. This time."
    },
    {
      jp: '目を開けてプレイしてね。',
      hira: 'めをあけてぷれいしてね。',
      en: 'Play with your eyes open.'
    },
    {
      jp: '今のは、英語じゃなくて勇気だったね。',
      hira: 'いまのは、えいごじゃなくてゆうきだったね。',
      en: 'That was not English. That was courage.'
    },
    {
      jp: '大丈夫。単語もたまには休みたいよね。',
      hira: 'だいじょうぶ。たんごもたまにはやすみたいよね。',
      en: "It's okay. Words need a vacation too."
    },
    {
      jp: '次は質問をよく読んでから来よう。',
      hira: 'つぎはしつもんをよくよんでからこよう。',
      en: 'Next time, try actually reading the question first.'
    },
    {
      jp: 'あ、惜しい！…と言いたかった。',
      hira: 'あ、おしい！…といいたかった。',
      en: 'Oh, so close! ...I wanted to say.'
    },
    {
      jp: '単語帳、都市伝説じゃないよ。',
      hira: 'たんごちょう、としでんせつじゃないよ。',
      en: 'Flashcards are not an urban legend.'
    },
    {
      jp: 'ブーハも二度見したよ。',
      hira: 'ぶーはもにどみしたよ。',
      en: 'Even Booha did a double take.'
    },
    {
      jp: 'これはミスじゃない。事件だ。',
      hira: 'これはみすじゃない。じけんだ。',
      en: 'This is not a mistake. This is an incident.'
    },
    {
      jp: '今の答え、どこから来たの？',
      hira: 'いまのこたえ、どこからきたの？',
      en: 'Where did that answer come from?'
    },
    {
      jp: 'ブーハの魂が少し抜けたよ。',
      hira: 'ぶーはのたましいがすこしぬけたよ。',
      en: "A little bit of Booha's soul just left."
    },
    {
      jp: '先生の心に小さなヒビが入りました。',
      hira: 'せんせいのこころにちいさなひびがはいりました。',
      en: "A tiny crack just appeared in the teacher's heart."
    },
    {
      jp: '復習って知ってる？友だちになれるよ。',
      hira: 'ふくしゅうってしってる？ともだちになれるよ。',
      en: 'Do you know review? You two could be friends.'
    },
    {
      jp: '今のはブーハの予想を下回りました。',
      hira: 'いまのはぶーはのよそうをしたまわりました。',
      en: "That was below Booha's expectations."
    }
  ];

  /* ── Mode-specific win copy ─────────────────────────────────── */
  const WIN_COPY = {
    clear: 'ANSWERED TOO FAST',
    record: 'BROKE THE MACHINE',
    jp: 'ブーハが覚えた。'
  };

  /* ── Inject styles once ──────────────────────────────────────── */
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const s = document.createElement('style');
    s.textContent = `
      #qb-overlay {
        position: fixed; inset: 0; z-index: 9000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: flex-start;
        overflow: hidden;
        font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,
          "Noto Sans","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
      }

      #qb-timer-bar {
        width: 100%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        padding: max(env(safe-area-inset-top,0px) + 12px, 18px) 20px 10px;
        gap: 16px; position: relative; z-index: 2;
      }
      #qb-timer {
        font-size: clamp(32px, 8vw, 64px);
        font-weight: 900; letter-spacing: 2px;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 24px currentColor, 0 0 48px currentColor;
        line-height: 1;
      }
      #qb-quit {
        position: absolute; right: 16px; top: 50%;
        transform: translateY(-50%);
        appearance: none; border: 0;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.18);
        color: rgba(255,255,255,0.6);
        border-radius: 999px; padding: 7px 14px;
        font-size: 12px; font-weight: 900;
        cursor: pointer; letter-spacing: 1px;
        -webkit-tap-highlight-color: transparent;
      }
      #qb-quit:active { transform: translateY(-50%) scale(0.97); }
      #qb-progress {
        font-size: clamp(11px,2.5vw,14px);
        color: rgba(255,255,255,0.5);
        letter-spacing: 2px; font-weight: 700;
      }

      /* ── Scrollable area ── */
      #qb-scroll {
        flex: 1; width: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: flex; flex-direction: column;
        align-items: center;
        padding: 10px 16px max(env(safe-area-inset-bottom,0px) + 16px, 20px);
        gap: clamp(10px,2vw,18px);
        z-index: 2;
      }

      /* ── JP question ── */
      #qb-jp-word {
        font-size: clamp(20px, 4.5vw, 40px);
        font-weight: 900; line-height: 1.35;
        text-align: center; color: #fff;
        text-shadow: 0 0 20px var(--qb-glow), 0 0 40px var(--qb-glow);
        animation: qbWordPop 300ms cubic-bezier(.34,1.56,.64,1) both;
        max-width: 680px; width: 100%;
      }
      @keyframes qbWordPop {
        from { transform: scale(0.85); opacity: 0; }
        to   { transform: scale(1);    opacity: 1; }
      }

      #qb-hira {
        font-size: clamp(11px,2.2vw,16px);
        color: var(--qb-hira-color);
        text-align: center; letter-spacing: 1.5px;
        line-height: 1.6;
        text-shadow: 0 0 10px var(--qb-glow);
        animation: qbWordPop 300ms 60ms cubic-bezier(.34,1.56,.64,1) both;
        max-width: 680px; width: 100%;
      }

      /* ── Options — single column ── */
      #qb-options {
        width: 100%; max-width: 680px;
        display: flex; flex-direction: column;
        gap: clamp(7px,1.5vw,11px);
      }

      .qb-opt {
        appearance: none; border: 0;
        border-radius: clamp(12px,2vw,18px);
        padding: clamp(12px,2.5vw,18px) clamp(14px,2.5vw,20px);
        font-size: clamp(13px,2.5vw,17px);
        font-weight: 700; color: #fff;
        cursor: pointer; text-align: left;
        line-height: 1.4;
        background: var(--qb-opt-bg);
        border: 2px solid var(--qb-opt-border);
        box-shadow: 0 6px 18px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.07);
        transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
        -webkit-tap-highlight-color: transparent;
        animation: qbOptIn 320ms var(--opt-delay,0ms) cubic-bezier(.34,1.56,.64,1) both;
        position: relative; overflow: hidden; width: 100%;
      }
      @keyframes qbOptIn {
        from { transform: translateX(18px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      .qb-opt:nth-child(1) { --opt-delay: 30ms; }
      .qb-opt:nth-child(2) { --opt-delay: 70ms; }
      .qb-opt:nth-child(3) { --opt-delay: 110ms; }
      .qb-opt:nth-child(4) { --opt-delay: 150ms; }
      .qb-opt:nth-child(5) { --opt-delay: 190ms; }
      .qb-opt:nth-child(6) { --opt-delay: 230ms; }

      .qb-opt:hover {
        background: var(--qb-opt-hover);
        box-shadow: 0 0 14px 4px var(--qb-glow), 0 10px 24px rgba(0,0,0,0.45),
          inset 0 1px 0 rgba(255,255,255,0.12);
        transform: translateX(-4px);
      }
      .qb-opt:active { transform: scale(0.99); }

      .qb-opt.correct {
        background: rgba(0,255,100,0.28) !important;
        border-color: #00ff64 !important;
        box-shadow: 0 0 28px 6px rgba(0,255,100,0.55) !important;
      }
      .qb-opt.wrong {
        background: rgba(255,30,30,0.38) !important;
        border-color: #ff1e1e !important;
        box-shadow: 0 0 28px 6px rgba(255,30,30,0.65) !important;
        animation: qbShake 380ms ease !important;
      }
      @keyframes qbShake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-6px); }
        80% { transform: translateX(6px); }
      }

      /* ── Flash ── */
      #qb-flash {
        position: absolute; inset: 0; z-index: 1;
        pointer-events: none; opacity: 0;
        background: rgba(255,255,255,0.18);
      }

      /* ── Wrong popup ── */
      #qb-wrong-popup {
        position: absolute; inset: 0; z-index: 20;
        display: none; flex-direction: column;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.90);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-sizing: border-box;
        padding: clamp(18px, 4vw, 42px) 18px; text-align: center; gap: 8px;
        overflow-y: auto;
      }
      #qb-wrong-popup.show { display: flex; }

      .qb-wrong-jp {
        font-size: clamp(34px, 9vw, 78px);
        font-weight: 900; color: #ff3b3b;
        text-shadow: 0 0 24px rgba(255,59,59,0.8);
        line-height: 1.35;
        animation: qbWordPop 350ms cubic-bezier(.34,1.56,.64,1) both;
        max-width: min(92vw, 760px);
        width: 100%;
        overflow-wrap: anywhere;
      }
      .qb-wrong-jp ruby { ruby-position: over; }
      .qb-wrong-jp rt {
        display: ruby-text;
        font-size: .34em;
        color: rgba(255, 190, 190, .9);
        letter-spacing: .08em;
        line-height: 1;
      }
      .qb-wrong-hira[hidden], .qb-wrong-scold-hira[hidden] { display: none; }
      .qb-wrong-hira {
        font-size: clamp(14px,3.5vw,22px);
        color: rgba(255,150,150,0.85);
        letter-spacing: 1.5px; line-height: 1.6; max-width: 560px;
      }
      .qb-wrong-en {
        font-size: clamp(22px,6vw,42px);
        font-weight: 900; color: #fff; margin-top: 6px;
        line-height: 1.4; max-width: 560px;
      }
      .qb-wrong-scold-jp {
        font-size: clamp(15px,3.5vw,22px);
        font-weight: 900; color: #ffee00; margin-top: 10px;
        text-shadow: 0 0 14px rgba(255,238,0,0.7);
      }
      .qb-wrong-scold-hira {
        font-size: clamp(10px,2vw,13px);
        color: rgba(255,238,0,0.6); letter-spacing: 1.5px;
      }
      .qb-wrong-scold-en {
        font-size: clamp(12px,2.5vw,16px);
        color: rgba(255,255,255,0.65); font-style: italic;
      }
      #qb-wrong-status {
        font-size: clamp(18px,4vw,28px);
        font-weight: 900; color: rgba(255,255,255,0.62);
        margin-top: 6px; letter-spacing: 1px;
      }
      #qb-wrong-close {
        margin-top: 14px;
        appearance: none; border: 0;
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.22);
        color: #fff; border-radius: 999px;
        padding: 12px 28px;
        font-size: clamp(13px,3vw,17px);
        font-weight: 900; cursor: pointer; letter-spacing: 1px;
        -webkit-tap-highlight-color: transparent;
      }
      #qb-wrong-close:active { transform: scale(0.98); }

      /* ── Win screen ── */
      #qb-win {
        position: absolute; inset: 0; z-index: 20;
        display: none; flex-direction: column;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 28px 24px; text-align: center; gap: 8px;
      }
      #qb-overlay.low-power #qb-wrong-popup,
      #qb-overlay.low-power #qb-win {
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        background: rgba(0,0,0,0.96);
      }
      #qb-win.show { display: flex; }

      .qb-win-label {
        font-size: clamp(11px,2.5vw,14px);
        letter-spacing: 3px; color: rgba(255,255,255,0.5);
        text-transform: uppercase;
      }
      .qb-win-time {
        font-size: clamp(52px,14vw,104px);
        font-weight: 900; color: #fff; line-height: 1;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 32px var(--qb-glow), 0 0 64px var(--qb-glow);
        animation: qbWordPop 500ms cubic-bezier(.34,1.56,.64,1) both;
      }
      .qb-win-record {
        font-size: clamp(13px,3.5vw,20px);
        font-weight: 900; color: #ffee00;
        text-shadow: 0 0 14px rgba(255,238,0,0.8);
        letter-spacing: 1px; min-height: 26px;
      }
      .qb-win-best {
        font-size: clamp(11px,2.5vw,15px);
        color: rgba(255,255,255,0.4); letter-spacing: 1px;
      }
      .qb-win-buttons {
        display: flex; gap: 12px; margin-top: 18px;
        flex-wrap: wrap; justify-content: center;
      }
      .qb-win-btn {
        appearance: none; border: 0; border-radius: 999px;
        padding: 12px 26px;
        font-size: clamp(13px,3vw,17px);
        font-weight: 900; letter-spacing: 0.5px;
        cursor: pointer; color: #000;
        background: linear-gradient(180deg, #ff79d7, #ff3bbd);
        box-shadow: 0 8px 18px rgba(255,59,189,0.35);
        -webkit-tap-highlight-color: transparent;
      }
      .qb-win-btn.ghost {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.22);
        color: rgba(255,255,255,0.8); box-shadow: none;
      }
      
.qb-win-btn:active { transform: scale(0.98); }

      /* ── Mega win screen ── */
      .qb-win-name {
        font-size: clamp(42px, 13vw, 108px);
        font-weight: 1000;
        line-height: 0.9;
        color: #fff;
        letter-spacing: 2px;
        overflow-wrap: anywhere;
        text-shadow: 0 0 18px #fff, 0 0 34px var(--qb-glow), 0 0 70px var(--qb-glow);
        animation: qbWinSlam 520ms cubic-bezier(.12,1.7,.34,1) both;
      }
      .qb-win-scream {
        font-size: clamp(18px, 5vw, 42px);
        font-weight: 1000;
        color: #ffee00;
        letter-spacing: 1px;
        text-shadow: 0 0 16px rgba(255,238,0,0.9), 0 0 34px rgba(255,0,120,0.55);
        animation: qbWinSlam 620ms 120ms cubic-bezier(.12,1.7,.34,1) both;
      }
      .qb-win-jp {
        font-size: clamp(14px, 3.5vw, 24px);
        font-weight: 900;
        color: rgba(255,255,255,0.86);
        text-shadow: 0 0 18px var(--qb-glow);
        animation: qbWinFade 700ms 280ms ease both;
      }
      .qb-win-record.big {
        color: #ffd700;
        font-size: clamp(18px, 5vw, 34px);
        text-shadow: 0 0 18px rgba(255,215,0,0.95), 0 0 36px rgba(255,90,0,0.75);
        animation: qbRecordPulse 900ms ease-in-out infinite alternate;
      }
      .qb-win-delta {
        font-size: clamp(12px, 3vw, 18px);
        font-weight: 900;
        color: rgba(255,255,255,0.72);
        letter-spacing: 1px;
      }
      #qb-win.record-mode {
        background:
          radial-gradient(circle at 50% 35%, rgba(255,215,0,0.22), transparent 34%),
          radial-gradient(circle at 20% 20%, rgba(255,0,120,0.22), transparent 26%),
          radial-gradient(circle at 80% 25%, rgba(0,229,255,0.18), transparent 28%),
          rgba(0,0,0,0.94);
      }
      @keyframes qbWinSlam {
        0%   { transform: scale(3.1) rotate(-4deg); opacity: 0; filter: blur(8px); }
        55%  { transform: scale(0.88) rotate(1deg); opacity: 1; filter: blur(0); }
        75%  { transform: scale(1.08) rotate(0deg); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes qbWinFade {
        from { transform: translateY(12px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      @keyframes qbRecordPulse {
        from { transform: scale(1); }
        to   { transform: scale(1.06); }
      }

      /* ── Confetti ── */
      .qb-name-streak {
        position: absolute;
        font-weight: 1000;
        font-style: italic;
        letter-spacing: 2px;
        white-space: nowrap;
        pointer-events: none; z-index: 29;
        animation: qbNameStreak var(--cdur) cubic-bezier(.2,.75,.3,1) var(--cdelay) both;
      }
      .qb-speed-line {
        position: absolute;
        height: 2px;
        pointer-events: none; z-index: 28;
        animation: qbNameStreak var(--cdur) linear var(--cdelay) both;
      }
      @keyframes qbNameStreak {
        0%   { transform: translateX(0) skewX(var(--sk)); opacity: 0; }
        8%   { opacity: 1; }
        78%  { opacity: 1; }
        100% { transform: translateX(var(--dx)) skewX(var(--sk)); opacity: 0; }
      }

      /* ── Screen shake ── */
      
      @keyframes qbScreenShake {
        0%,100% { transform: translate(0,0); }
        15% { transform: translate(-9px,4px); }
        30% { transform: translate(9px,-5px); }
        45% { transform: translate(-7px,7px); }
        60% { transform: translate(8px,-3px); }
        75% { transform: translate(-5px,5px); }
        90% { transform: translate(6px,-2px); }
      }
     #qb-overlay.shake { animation: qbScreenShake 380ms ease; }

      @keyframes qbParticle {
        0%   { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--px),var(--py)) scale(0); opacity: 0; }
      }
    `;
     
    document.head.appendChild(s);
  }

  /* ── Build overlay DOM ───────────────────────────────────────── */
  function buildOverlay() {
    const el = document.createElement('div');
    el.id = 'qb-overlay';
    if (BoohaBlitzEngine.LOW_POWER) el.classList.add('low-power');
    el.innerHTML = `
      <div id="qb-flash"></div>
      <div id="qb-timer-bar">
        <div id="qb-progress"></div>
        <div id="qb-timer">0.00s</div>
        <button id="qb-quit" type="button">やめる</button>
      </div>
      <div id="qb-scroll">
        <div id="qb-jp-word"></div>
        <div id="qb-hira"></div>
        <div id="qb-options"></div>
      </div>
      <div id="qb-wrong-popup">
        <div class="qb-wrong-jp"   id="qbwj"></div>
        <div class="qb-wrong-hira" id="qbwh"></div>
        <div class="qb-wrong-en"   id="qbwe"></div>
        <div class="qb-wrong-scold-jp"   id="qbsj"></div>
        <div class="qb-wrong-scold-hira" id="qbsh"></div>
        <div class="qb-wrong-scold-en"   id="qbse"></div>
        <div id="qb-wrong-status">RUN ENDED — NO SCORE</div>
        <button id="qb-wrong-close" type="button">もどる</button>
      </div>
      
     <div id="qb-win">
        <div class="qb-win-name"   id="qb-win-name"></div>
        <div class="qb-win-scream" id="qb-win-scream"></div>
        <div class="qb-win-jp"     id="qb-win-jp"></div>
        <div class="qb-win-label">FINAL TIME</div>
        <div class="qb-win-time"   id="qb-win-time-val"></div>
        <div class="qb-win-record" id="qb-win-record-msg"></div>
        <div class="qb-win-best"   id="qb-win-best-val"></div>
        <div class="qb-win-delta"  id="qb-win-delta"></div>
        <div class="qb-win-buttons">
          <button class="qb-win-btn" id="qb-play-again" type="button">もう一度</button>
          <button class="qb-win-btn ghost" id="qb-win-close" type="button">もどる</button>
        </div>
      </div>
      
    `;
     
   document.body.appendChild(el);
    return el;
  }

  // The game lifecycle is shared with Vocab Blitz and Sentence Blitz.
  const blitzEngine = BoohaBlitzEngine.create({
    apiName: 'QuestionBlitz',
    gameType: 'questions',
    legacyKey: 'questionBlitz',
    saveId: 'question',
    dataFile: 'questions.json',
    dataLabel: 'question',
    overlayId: 'qb-overlay',
    notEnoughMessage: 'Not enough question cards for this week.',
    palettes: PALETTES,
    scolds: SCOLDS,
    buildOverlay,
    injectStyles,
    optionClass: 'qb-opt',
    particleClass: 'qb-particle',
    particleAnimation: 'qbParticle',
    celebrationMode: 'question',
    finalCard: {
      badge: 'SPEED SOLVED',
      detail: 'ANSWERED UNDER PRESSURE',
      celebrationKind: 'speed',
      nameCount: 34,
      nameDelay: 650,
      nameDuration: 3000,
    },
    correctParticles: 18,
    nextDelay: 200,
    cssVars: {
      '--qb-glow': p => p.glow,
      '--qb-hira-color': p => p.hiraColor,
      '--qb-opt-bg': p => p.optionBg,
      '--qb-opt-border': p => p.optionBorder,
      '--qb-opt-hover': p => p.optionHover,
    },
    ids: {
      timer: '#qb-timer', progress: '#qb-progress', jpWord: '#qb-jp-word', hira: '#qb-hira',
      options: '#qb-options', flash: '#qb-flash', scroll: '#qb-scroll', wrongPopup: '#qb-wrong-popup',
      win: '#qb-win', quit: '#qb-quit', wrongClose: '#qb-wrong-close',
      playAgain: '#qb-play-again', winClose: '#qb-win-close',
      wrongJp: '#qbwj', wrongHira: '#qbwh', wrongEn: '#qbwe',
      scoldJp: '#qbsj', scoldHira: '#qbsh', scoldEn: '#qbse',
      winName: '#qb-win-name', winScream: '#qb-win-scream', winJp: '#qb-win-jp',
      winTime: '#qb-win-time-val', winRecord: '#qb-win-record-msg',
      winBest: '#qb-win-best-val', winDelta: '#qb-win-delta',
    },
    winCopy: WIN_COPY,
  });

  /* ── Launch ──────────────────────────────────────────────────── */
  function launch({ curr, monthSlug, weekNumber }) {
    return blitzEngine.launch({ curr, monthSlug, weekNumber });
  }

  /* ── Start game ──────────────────────────────────────────────── */
  /* ── Public API ──────────────────────────────────────────────── */
return {
    launch,
    getBestTime: blitzEngine.getBestTime,
    fmtTime: blitzEngine.fmtTime,
    getWeeklyScore: blitzEngine.getWeeklyScore, // weekly read w/ stale-week guard — used by index pills
    _onClose: null,
  };

})();
