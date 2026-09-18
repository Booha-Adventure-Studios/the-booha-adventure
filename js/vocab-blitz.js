
/* ═══════════════════════════════════════════════════════════════════
   VOCAB BLITZ  —  js/vocab-blitz.js
   Self-contained overlay game engine for the Booha Adventure index.
   Usage: VocabBlitz.launch({ curr, monthSlug, weekNumber })
═══════════════════════════════════════════════════════════════════ */

window.VocabBlitz = (() => {

  /* ── Palettes ────────────────────────────────────────────────── */
  const PALETTES = BoohaBlitzEngine.themes;

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
    jp: '次は単語を見てから来よう。',
    hira: 'つぎはたんごをみてからこよう。',
    en: "Next time, try looking at the words first."
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
    clear: 'ATE THE WORDS',
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
        width: 100%; flex: 0 0 auto; min-height: 78px; box-sizing: border-box;
        display: flex; align-items: center; justify-content: center;
        padding: max(env(safe-area-inset-top,0px) + 12px, 18px) 20px 14px;
        gap: 16px;
        position: relative; z-index: 2;
      }
      #vb-timer {
        font-size: clamp(36px, min(9vw, 8vh), 72px);
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
        flex: 1 1 auto; min-height: 0; width: 100%;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 0 20px;
        position: relative; z-index: 2;
        gap: clamp(10px,3vw,24px);
      }

      #vb-jp-word {
        font-size: clamp(52px, min(14vw, 13vh), 110px);
        font-weight: 900;
        line-height: 1;
        text-align: center;
        color: var(--blitz-ink, #14161c);
        text-shadow:
          0 0 calc(var(--blitz-word-glow, 64px) * .5) var(--blitz-word-glow-color, var(--vb-glow)),
          0 0 var(--blitz-word-glow, 64px) var(--blitz-word-glow-color, var(--vb-glow)),
          0 0 calc(var(--blitz-word-glow, 64px) * 1.5) var(--blitz-word-glow-color, var(--vb-glow));
        animation: vbWordPop 300ms cubic-bezier(.34,1.56,.64,1) both;
      }
      @keyframes vbWordPop {
        from { transform: scale(0.5); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }

      #vb-hira {
        font-size: clamp(16px,min(4vw,4vh),28px);
        color: var(--blitz-ink, #14161c);
        opacity: .7;
        text-align: center;
        letter-spacing: 2px;
        text-shadow: 0 0 calc(var(--blitz-word-glow, 64px) * .28) var(--blitz-word-glow-color, var(--vb-glow));
        animation: vbWordPop 300ms 60ms cubic-bezier(.34,1.56,.64,1) both;
      }

      /* ── options grid ── */
      #vb-options {
        flex: 0 0 auto; width: min(100%, 600px); max-width: 600px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(8px,2vw,14px);
        padding: 0 0 max(env(safe-area-inset-bottom,0px) + 16px, 20px);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        position: relative; z-index: 2;
      }

      .vb-opt {
        appearance: none; border: 0;
        border-radius: clamp(14px,3vw,22px);
        padding: clamp(14px,min(3.5vw,2.8vh),24px) clamp(10px,2vw,16px);
        font-size: clamp(14px,min(3.5vw,3vh),22px);
        font-weight: 900;
        color: var(--blitz-ink, #14161c);
        cursor: pointer;
        text-align: center;
        letter-spacing: 0.3px;
        line-height: 1.2;
        background: rgba(255,255,255,.78);
        border: 2px solid var(--blitz-progress-color, #14161c);
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
        background: rgba(0,0,0,.05);
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

      @media (min-width: 900px) and (orientation: landscape) {
        #vb-overlay {
          display: grid;
          grid-template-columns: 1fr minmax(380px, 46vw);
          grid-template-rows: auto 1fr;
          align-items: stretch;
        }
        #vb-timer-bar { grid-column: 1 / -1; }
        #vb-stage {
          grid-column: 1;
          grid-row: 2;
          padding: 0 clamp(24px, 4vw, 72px);
        }
        #vb-options {
          grid-column: 2;
          grid-row: 2;
          width: 100%;
          max-width: none;
          grid-template-columns: 1fr;
          align-content: center;
          gap: clamp(14px, 1.6vw, 24px);
          padding: 0 clamp(24px, 4vw, 64px) clamp(24px, 4vh, 56px) 0;
        }
        #vb-jp-word { font-size: clamp(96px, 9vw, 200px); }
        #vb-hira { font-size: clamp(26px, 2.2vw, 44px); }
        .vb-opt {
          font-size: clamp(20px, 1.8vw, 34px);
          padding: clamp(20px, 2.2vh, 34px) clamp(16px, 1.6vw, 28px);
          border-radius: clamp(18px, 1.6vw, 28px);
        }
      }

      @media (min-width: 900px) and (orientation: landscape) and (max-height: 720px) {
        #vb-options { grid-template-columns: 1fr 1fr; }
        .vb-opt {
          font-size: clamp(16px, 1.4vw, 24px);
          padding: clamp(12px, 1.6vh, 20px) clamp(12px, 1.2vw, 20px);
        }
        #vb-jp-word { font-size: clamp(64px, 7vw, 120px); }
        #vb-hira { font-size: clamp(20px, 1.8vw, 30px); }
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
        /* Positioning, sizing, background and overflow now come entirely
           from the shared ".blitz-wrong-feedback" rule in blitz-engine.js
           (higher specificity, id+class) -- this rule used to duplicate and
           conflict with it, producing a broken hybrid layout. Only the
           flexbox alignment below isn't set anywhere else. */
        z-index: 20;
        display: none;
        flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center;
      }

      .vb-wrong-kanji {
        font-size: clamp(34px, 9vw, 78px);
        font-weight: 900;
        color: #ff3b3b;
        text-shadow: 0 0 32px rgba(255,59,59,0.9), 0 0 64px rgba(255,59,59,0.5);
        line-height: 1.25;
        max-width: min(92vw, 760px);
        width: 100%;
        overflow-wrap: anywhere;
        animation: vbWordPop 350ms cubic-bezier(.34,1.56,.64,1) both;
      }
      .vb-wrong-hira[hidden], .vb-wrong-scold-hira[hidden] { display: none; }
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
      #vb-wrong-status {
        font-size: clamp(18px,4vw,28px);
        font-weight: 900;
        color: rgba(255,255,255,0.62);
        margin-top: 8px;
        letter-spacing: 1px;
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
      #vb-overlay.low-power #vb-win {
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        background: rgba(0,0,0,0.96);
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

      /* ── Mega win screen ── */
      .vb-win-name {
        /* Holds a full sentence ("(Name) is Awesome!!"), not a single mega
           slam word -- the old 42-108px sizing with overflow-wrap:anywhere
           broke mid-word ("Awesom" / "e!!"). Sized and wrapped for a
           sentence instead. */
        font-size: clamp(22px, 6vw, 40px);
        font-weight: 1000;
        line-height: 1.15;
        color: #fff;
        letter-spacing: 1px;
        max-width: 100%;
        overflow-wrap: break-word;
        word-break: normal;
        text-shadow: 0 0 18px #fff, 0 0 34px var(--vb-glow), 0 0 70px var(--vb-glow);
        animation: vbWinSlam 520ms cubic-bezier(.12,1.7,.34,1) both;
      }
      .vb-win-scream {
        font-size: clamp(18px, 5vw, 42px);
        font-weight: 1000;
        color: #ffee00;
        letter-spacing: 1px;
        text-shadow: 0 0 16px rgba(255,238,0,0.9), 0 0 34px rgba(255,0,120,0.55);
        animation: vbWinSlam 620ms 120ms cubic-bezier(.12,1.7,.34,1) both;
      }
      .vb-win-jp {
        font-size: clamp(14px, 3.5vw, 24px);
        font-weight: 900;
        color: rgba(255,255,255,0.86);
        text-shadow: 0 0 18px var(--vb-glow);
        animation: vbWinFade 700ms 280ms ease both;
      }
      .vb-win-record.big {
        color: #ffd700;
        font-size: clamp(18px, 5vw, 34px);
        text-shadow: 0 0 18px rgba(255,215,0,0.95), 0 0 36px rgba(255,90,0,0.75);
        animation: vbRecordPulse 900ms ease-in-out infinite alternate;
      }
      .vb-win-delta {
        font-size: clamp(12px, 3vw, 18px);
        font-weight: 900;
        color: rgba(255,255,255,0.72);
        letter-spacing: 1px;
      }
      #vb-win.record-mode {
        background:
          radial-gradient(circle at 50% 35%, rgba(255,215,0,0.22), transparent 34%),
          radial-gradient(circle at 20% 20%, rgba(255,0,120,0.22), transparent 26%),
          radial-gradient(circle at 80% 25%, rgba(0,229,255,0.18), transparent 28%),
          rgba(0,0,0,0.94);
      }
      @keyframes vbWinSlam {
        0%   { transform: scale(3.1) rotate(-4deg); opacity: 0; filter: blur(8px); }
        55%  { transform: scale(0.88) rotate(1deg); opacity: 1; filter: blur(0); }
        75%  { transform: scale(1.08) rotate(0deg); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes vbWinFade {
        from { transform: translateY(12px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      @keyframes vbRecordPulse {
        from { transform: scale(1); }
        to   { transform: scale(1.06); }
      }

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

      /* ── Name rain ── */
      .vb-name-drop {
        position: absolute;
        font-weight: 1000;
        letter-spacing: 1px;
        white-space: nowrap;
        pointer-events: none; z-index: 29;
        animation: vbNameFall var(--cdur) cubic-bezier(.25,.1,.55,1) var(--cdelay) both;
      }
      @keyframes vbNameFall {
        0%   { transform: translate(0,0) rotate(var(--r0)) scale(1); opacity: 1; }
        85%  { opacity: 1; }
        100% { transform: translate(var(--cx), var(--cy)) rotate(var(--r1)) scale(0.85); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Build overlay DOM ───────────────────────────────────────── */
  function buildOverlay() {
    const el = document.createElement('div');
    el.id = 'vb-overlay';
    if (BoohaBlitzEngine.LOW_POWER) el.classList.add('low-power');
    el.innerHTML = `
      <div id="vb-flash"></div>

      <div id="vb-timer-bar" class="booha-blitz-hud">
        <div id="vb-progress"></div>
        <div id="vb-timer">0.00s</div>
        <button id="vb-quit" type="button">やめる</button>
      </div>

      <div id="vb-stage" class="booha-blitz-prompt">
        <div id="vb-jp-word"></div>
        <div id="vb-hira"></div>
      </div>

      <div id="vb-options" class="booha-blitz-answer"></div>

      <div id="vb-wrong-popup" class="blitz-wrong-feedback">
        <div class="vb-wrong-kanji" id="vwk"></div>
        <div class="vb-wrong-hira"  id="vwh"></div>
        <div class="vb-wrong-en"    id="vwe"></div>
        <div class="vb-wrong-scold-jp"   id="vsj"></div>
        <div class="vb-wrong-scold-hira" id="vsh"></div>
        <div class="vb-wrong-scold-en"   id="vse"></div>
        <div id="vb-wrong-status">READY FOR THE NEXT TRY</div>
        <button id="vb-wrong-close" type="button">つぎへ / CONTINUE</button>
      </div>

     <div id="vb-win">
        <div class="vb-win-name"   id="vb-win-name"></div>
        <div class="vb-win-scream" id="vb-win-scream"></div>
        <div class="vb-win-jp"     id="vb-win-jp"></div>
        <div class="vb-win-label">This Time:</div>
        <div class="vb-win-time"   id="vb-win-time-val"></div>
        <div class="vb-win-record" id="vb-win-record-msg"></div>
        <div class="vb-win-best"   id="vb-win-best-val"></div>
        <div class="vb-win-delta"  id="vb-win-delta"></div>
        <div class="vb-win-buttons">
          <button class="vb-win-btn" id="vb-play-again" type="button">もう一度</button>
          <button class="vb-win-btn ghost records" id="vb-records" type="button">RECORDS / きろくを みる</button>
          <button class="vb-win-btn ghost" id="vb-win-close" type="button">もどる</button>
        </div>
      </div>
      
    `;
    document.body.appendChild(el);
    return el;
  }

  // The game lifecycle is shared with Sentence Blitz and Question Blitz.
  const blitzEngine = BoohaBlitzEngine.create({
    apiName: 'VocabBlitz',
    gameType: 'vocab',
    legacyKey: 'vocabBlitz',
    saveId: 'vocab',
    dataFile: 'vocab.json',
    dataLabel: 'vocab',
    overlayId: 'vb-overlay',
    notEnoughMessage: 'Not enough vocab cards for this week.',
    palettes: PALETTES,
    scolds: SCOLDS,
    buildOverlay,
    injectStyles,
    optionClass: 'vb-opt',
    particleClass: 'vb-particle',
    particleAnimation: 'vbParticle',
    celebrationMode: 'vocab',
    speedTargetMs: 45000,
    finalCard: {
      badge: 'WORD STORM',
      detail: 'EVERY WORD LANDED',
      nameCount: 48,
      nameDelay: 760,
      nameDuration: 4100,
    },
    correctParticles: 22,
    nextDelay: 220,
    cssVars: {
      '--vb-glow': p => p.glow,
      '--vb-hira-color': p => p.hiraColor,
      '--vb-opt-bg': p => p.optionBg,
      '--vb-opt-border': p => p.optionBorder,
      '--vb-opt-hover': p => p.optionHover,
    },
    ids: {
      timer: '#vb-timer', progress: '#vb-progress', jpWord: '#vb-jp-word', hira: '#vb-hira',
      options: '#vb-options', flash: '#vb-flash', scroll: null, wrongPopup: '#vb-wrong-popup',
      win: '#vb-win', quit: '#vb-quit', wrongClose: '#vb-wrong-close',
      playAgain: '#vb-play-again', winClose: '#vb-win-close', records: '#vb-records',
      wrongJp: '#vwk', wrongHira: '#vwh', wrongEn: '#vwe',
      scoldJp: '#vsj', scoldHira: '#vsh', scoldEn: '#vse',
      winName: '#vb-win-name', winScream: '#vb-win-scream', winJp: '#vb-win-jp',
      winTime: '#vb-win-time-val', winRecord: '#vb-win-record-msg',
      winBest: '#vb-win-best-val', winDelta: '#vb-win-delta',
    },
    winCopy: WIN_COPY,
  });

  /* ── Particles ───────────────────────────────────────────────── */
  /* ── Main launch function ────────────────────────────────────── */
   
  function launch({ curr, monthSlug, weekNumber }) {
    return blitzEngine.launch({ curr, monthSlug, weekNumber });
  }


  /* ── Public API ──────────────────────────────────────────────── */
  function openFastestPanel(gameType = 'vocab', ctx = {}) {
    return BoohaBlitzEngine.openRecordsPanel(ctx);
  }

  return {
    launch,
    openFastestPanel,
    fmtTime: blitzEngine.fmtTime,
    getBestTime: blitzEngine.getBestTime,
    getWeeklyScore: blitzEngine.getWeeklyScore, // weekly read w/ stale-week guard — used by index pills
    _onClose: null,   // set by index.html if needed
  };

})();
