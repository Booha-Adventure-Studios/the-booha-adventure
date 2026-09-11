
/* ═══════════════════════════════════════════════════════════════════
   SENTENCE BLITZ  —  js/sentence-blitz.js
   Self-contained overlay game engine for the Booha Adventure index.
   Usage: SentenceBlitz.launch({ curr, monthSlug, weekNumber })
═══════════════════════════════════════════════════════════════════ */

window.SentenceBlitz = (() => {

 const PALETTES = {
    pb: {
      baseHue: 25, bgSat: 85, bgLit: 10,
      accent: '#ff9933',
      accent2: '#ffcc66',
      glow: 'rgba(255,153,51,0.7)',
      optionBg: 'rgba(255,153,51,0.12)',
      optionBorder: '#ff9933',
      optionHover: 'rgba(255,153,51,0.28)',
      timerColor: '#ffcc66',
      hiraColor: '#ffbb77',
    },
    br: {
      baseHue: 90, bgSat: 85, bgLit: 10,
      accent: '#aaff33',
      accent2: '#ddff99',
      glow: 'rgba(170,255,51,0.7)',
      optionBg: 'rgba(170,255,51,0.10)',
      optionBorder: '#aaff33',
      optionHover: 'rgba(170,255,51,0.24)',
      timerColor: '#ddff99',
      hiraColor: '#ccff88',
    },
    bc: {
      baseHue: 210, bgSat: 85, bgLit: 10,
      accent: '#3399ff',
      accent2: '#99ccff',
      glow: 'rgba(51,153,255,0.7)',
      optionBg: 'rgba(51,153,255,0.12)',
      optionBorder: '#3399ff',
      optionHover: 'rgba(51,153,255,0.28)',
      timerColor: '#99ccff',
      hiraColor: '#88bbff',
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
      jp: '次は文章を読んでから来よう。',
      hira: 'つぎはぶんしょうをよんでからこよう。',
      en: 'Next time, try reading the sentences first.'
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
    clear: 'CRUSHED THE SENTENCES',
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
      #sb-overlay {
        position: fixed; inset: 0; z-index: 9000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: flex-start;
        overflow: hidden;
        font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,
          "Noto Sans","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
      }

      #sb-timer-bar {
        width: 100%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        padding: max(env(safe-area-inset-top,0px) + 12px, 18px) 20px 10px;
        gap: 16px;
        position: relative; z-index: 2;
      }
      #sb-timer {
        font-size: clamp(32px, 8vw, 64px);
        font-weight: 900;
        letter-spacing: 2px;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 24px currentColor, 0 0 48px currentColor;
        line-height: 1;
      }
      #sb-quit {
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
      #sb-quit:active { transform: translateY(-50%) scale(0.97); }
      #sb-progress {
        font-size: clamp(11px,2.5vw,14px);
        color: rgba(255,255,255,0.5);
        letter-spacing: 2px; font-weight: 700;
      }

      /* ── Scrollable main area ── */
      #sb-scroll {
        flex: 1; width: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: flex; flex-direction: column;
        align-items: center;
        padding: 10px 16px max(env(safe-area-inset-bottom,0px) + 16px, 20px);
        gap: clamp(10px,2vw,18px);
        z-index: 2;
      }

      /* ── JP sentence ── */
      #sb-jp-word {
        font-size: clamp(22px, 5vw, 44px);
        font-weight: 900;
        line-height: 1.3;
        text-align: center;
        color: #fff;
        text-shadow: 0 0 24px var(--sb-glow), 0 0 48px var(--sb-glow);
        animation: sbWordPop 300ms cubic-bezier(.34,1.56,.64,1) both;
        max-width: 680px; width: 100%;
      }
      @keyframes sbWordPop {
        from { transform: scale(0.85); opacity: 0; }
        to   { transform: scale(1);    opacity: 1; }
      }

      #sb-hira {
        font-size: clamp(12px,2.5vw,18px);
        color: var(--sb-hira-color);
        text-align: center;
        letter-spacing: 1.5px;
        line-height: 1.6;
        text-shadow: 0 0 12px var(--sb-glow);
        animation: sbWordPop 300ms 60ms cubic-bezier(.34,1.56,.64,1) both;
        max-width: 680px; width: 100%;
      }

      /* ── Options — single column ── */
      #sb-options {
        width: 100%; max-width: 680px;
        display: flex;
        flex-direction: column;
        gap: clamp(7px,1.5vw,11px);
      }

      .sb-opt {
        appearance: none; border: 0;
        border-radius: clamp(12px,2vw,18px);
        padding: clamp(12px,2.5vw,18px) clamp(14px,2.5vw,20px);
        font-size: clamp(13px,2.5vw,17px);
        font-weight: 700;
        color: #fff;
        cursor: pointer;
        text-align: left;
        line-height: 1.4;
        background: var(--sb-opt-bg);
        border: 2px solid var(--sb-opt-border);
        box-shadow: 0 6px 18px rgba(0,0,0,0.35),
          inset 0 1px 0 rgba(255,255,255,0.08);
        transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
        -webkit-tap-highlight-color: transparent;
        animation: sbOptIn 320ms var(--opt-delay,0ms) cubic-bezier(.34,1.56,.64,1) both;
        position: relative; overflow: hidden;
        width: 100%;
      }
      @keyframes sbOptIn {
        from { transform: translateX(-18px); opacity: 0; }
        to   { transform: translateX(0);     opacity: 1; }
      }
      .sb-opt:nth-child(1) { --opt-delay: 30ms; }
      .sb-opt:nth-child(2) { --opt-delay: 70ms; }
      .sb-opt:nth-child(3) { --opt-delay: 110ms; }
      .sb-opt:nth-child(4) { --opt-delay: 150ms; }
      .sb-opt:nth-child(5) { --opt-delay: 190ms; }
      .sb-opt:nth-child(6) { --opt-delay: 230ms; }

      .sb-opt:hover {
        background: var(--sb-opt-hover);
        box-shadow: 0 0 16px 4px var(--sb-glow), 0 10px 24px rgba(0,0,0,0.45),
          inset 0 1px 0 rgba(255,255,255,0.14);
        transform: translateX(4px);
      }
      .sb-opt:active { transform: scale(0.99); }

      .sb-opt.correct {
        background: rgba(0,255,100,0.28) !important;
        border-color: #00ff64 !important;
        box-shadow: 0 0 28px 6px rgba(0,255,100,0.55) !important;
      }
      .sb-opt.wrong {
        background: rgba(255,30,30,0.38) !important;
        border-color: #ff1e1e !important;
        box-shadow: 0 0 28px 6px rgba(255,30,30,0.65) !important;
        animation: sbShake 380ms ease !important;
      }
      @keyframes sbShake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-6px); }
        80% { transform: translateX(6px); }
      }

      /* ── Flash ── */
      #sb-flash {
        position: absolute; inset: 0; z-index: 1;
        pointer-events: none; opacity: 0;
        background: rgba(255,255,255,0.18);
      }

      /* ── Wrong popup ── */
      #sb-wrong-popup {
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
      #sb-wrong-popup.show { display: flex; }

      .sb-wrong-jp {
        font-size: clamp(34px, 9vw, 78px);
        font-weight: 900; color: #ff3b3b;
        text-shadow: 0 0 24px rgba(255,59,59,0.8);
        line-height: 1.3;
        animation: sbWordPop 350ms cubic-bezier(.34,1.56,.64,1) both;
        max-width: min(92vw, 760px);
        width: 100%;
        overflow-wrap: anywhere;
      }
      .sb-wrong-jp ruby { ruby-position: over; }
      .sb-wrong-jp rt {
        display: ruby-text;
        font-size: .34em;
        color: rgba(255, 190, 190, .9);
        letter-spacing: .08em;
        line-height: 1;
      }
      .sb-wrong-hira[hidden], .sb-wrong-scold-hira[hidden] { display: none; }
      .sb-wrong-hira {
        font-size: clamp(14px,3.5vw,22px);
        color: rgba(255,150,150,0.85); letter-spacing: 1.5px;
        line-height: 1.6; max-width: 560px;
      }
      .sb-wrong-en {
        font-size: clamp(22px,6vw,42px);
        font-weight: 900; color: #fff; margin-top: 6px;
        line-height: 1.4; max-width: 560px;
      }
      .sb-wrong-scold-jp {
        font-size: clamp(15px,3.5vw,22px);
        font-weight: 900; color: #ffee00; margin-top: 10px;
        text-shadow: 0 0 14px rgba(255,238,0,0.7);
      }
      .sb-wrong-scold-hira {
        font-size: clamp(10px,2vw,13px);
        color: rgba(255,238,0,0.6); letter-spacing: 1.5px;
      }
      .sb-wrong-scold-en {
        font-size: clamp(12px,2.5vw,16px);
        color: rgba(255,255,255,0.65); font-style: italic;
      }
      #sb-wrong-status {
        font-size: clamp(18px,4vw,28px);
        font-weight: 900; color: rgba(255,255,255,0.62);
        margin-top: 6px; letter-spacing: 1px;
      }
      #sb-wrong-close {
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
      #sb-wrong-close:active { transform: scale(0.98); }

      /* ── Win screen ── */
      #sb-win {
        position: absolute; inset: 0; z-index: 20;
        display: none; flex-direction: column;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 28px 24px; text-align: center; gap: 8px;
      }
      #sb-overlay.low-power #sb-wrong-popup,
      #sb-overlay.low-power #sb-win {
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        background: rgba(0,0,0,0.96);
      }
      #sb-win.show { display: flex; }

      .sb-win-label {
        font-size: clamp(11px,2.5vw,14px);
        letter-spacing: 3px; color: rgba(255,255,255,0.5);
        text-transform: uppercase;
      }
      .sb-win-time {
        font-size: clamp(52px,14vw,104px);
        font-weight: 900; color: #fff; line-height: 1;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 0 32px var(--sb-glow), 0 0 64px var(--sb-glow);
        animation: sbWordPop 500ms cubic-bezier(.34,1.56,.64,1) both;
      }
      .sb-win-record {
        font-size: clamp(13px,3.5vw,20px);
        font-weight: 900; color: #ffee00;
        text-shadow: 0 0 14px rgba(255,238,0,0.8);
        letter-spacing: 1px; min-height: 26px;
      }
      .sb-win-best {
        font-size: clamp(11px,2.5vw,15px);
        color: rgba(255,255,255,0.4); letter-spacing: 1px;
      }
      .sb-win-buttons {
        display: flex; gap: 12px; margin-top: 18px;
        flex-wrap: wrap; justify-content: center;
      }
      .sb-win-btn {
        appearance: none; border: 0; border-radius: 999px;
        padding: 12px 26px;
        font-size: clamp(13px,3vw,17px);
        font-weight: 900; letter-spacing: 0.5px;
        cursor: pointer; color: #000;
        background: linear-gradient(180deg, #ff79d7, #ff3bbd);
        box-shadow: 0 8px 18px rgba(255,59,189,0.35);
        -webkit-tap-highlight-color: transparent;
      }
      .sb-win-btn.ghost {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.22);
        color: rgba(255,255,255,0.8); box-shadow: none;
      }
      
     .sb-win-btn:active { transform: scale(0.98); }

      /* ── Mega win screen ── */
      .sb-win-name {
        font-size: clamp(42px, 13vw, 108px);
        font-weight: 1000;
        line-height: 0.9;
        color: #fff;
        letter-spacing: 2px;
        overflow-wrap: anywhere;
        text-shadow: 0 0 18px #fff, 0 0 34px var(--sb-glow), 0 0 70px var(--sb-glow);
        animation: sbWinSlam 520ms cubic-bezier(.12,1.7,.34,1) both;
      }
      .sb-win-scream {
        font-size: clamp(18px, 5vw, 42px);
        font-weight: 1000;
        color: #ffee00;
        letter-spacing: 1px;
        text-shadow: 0 0 16px rgba(255,238,0,0.9), 0 0 34px rgba(255,0,120,0.55);
        animation: sbWinSlam 620ms 120ms cubic-bezier(.12,1.7,.34,1) both;
      }
      .sb-win-jp {
        font-size: clamp(14px, 3.5vw, 24px);
        font-weight: 900;
        color: rgba(255,255,255,0.86);
        text-shadow: 0 0 18px var(--sb-glow);
        animation: sbWinFade 700ms 280ms ease both;
      }
      .sb-win-record.big {
        color: #ffd700;
        font-size: clamp(18px, 5vw, 34px);
        text-shadow: 0 0 18px rgba(255,215,0,0.95), 0 0 36px rgba(255,90,0,0.75);
        animation: sbRecordPulse 900ms ease-in-out infinite alternate;
      }
      .sb-win-delta {
        font-size: clamp(12px, 3vw, 18px);
        font-weight: 900;
        color: rgba(255,255,255,0.72);
        letter-spacing: 1px;
      }
      #sb-win.record-mode {
        background:
          radial-gradient(circle at 50% 35%, rgba(255,215,0,0.22), transparent 34%),
          radial-gradient(circle at 20% 20%, rgba(255,0,120,0.22), transparent 26%),
          radial-gradient(circle at 80% 25%, rgba(0,229,255,0.18), transparent 28%),
          rgba(0,0,0,0.94);
      }
      @keyframes sbWinSlam {
        0%   { transform: scale(3.1) rotate(-4deg); opacity: 0; filter: blur(8px); }
        55%  { transform: scale(0.88) rotate(1deg); opacity: 1; filter: blur(0); }
        75%  { transform: scale(1.08) rotate(0deg); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes sbWinFade {
        from { transform: translateY(12px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      @keyframes sbRecordPulse {
        from { transform: scale(1); }
        to   { transform: scale(1.06); }
      }

      /* ── Confetti ── */
      .sb-name-drop {
        position: absolute;
        font-weight: 1000;
        letter-spacing: 1px;
        white-space: nowrap;
        pointer-events: none; z-index: 29;
        animation: sbNameSlam var(--cdur) cubic-bezier(.55,0,.85,.5) var(--cdelay) both;
      }
      @keyframes sbNameSlam {
        0%   { transform: translate(0,0) rotate(var(--r0)) scaleY(1); opacity: 1; }
        76%  { transform: translate(var(--cx), var(--cy)) rotate(0deg) scaleY(1); opacity: 1; }
        84%  { transform: translate(var(--cx), calc(var(--cy) + 7px)) scaleY(.6) scaleX(1.2); opacity: 1; }
        100% { transform: translate(var(--cx), var(--cy)) scaleY(.82) scaleX(1.06); opacity: 0; }
      }

      /* ── Screen shake ── */
      
      @keyframes sbScreenShake {
        0%,100% { transform: translate(0,0); }
        15% { transform: translate(-9px,4px); }
        30% { transform: translate(9px,-5px); }
        45% { transform: translate(-7px,7px); }
        60% { transform: translate(8px,-3px); }
        75% { transform: translate(-5px,5px); }
        90% { transform: translate(6px,-2px); }
      }
     #sb-overlay.shake { animation: sbScreenShake 380ms ease; }

      @keyframes sbParticle {
        0%   { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--px),var(--py)) scale(0); opacity: 0; }
      }
    `;
     
    document.head.appendChild(s);
  }

  /* ── Build overlay DOM ───────────────────────────────────────── */
  function buildOverlay() {
    const el = document.createElement('div');
    el.id = 'sb-overlay';
    if (BoohaBlitzEngine.LOW_POWER) el.classList.add('low-power');
    el.innerHTML = `
      <div id="sb-flash"></div>
      <div id="sb-timer-bar">
        <div id="sb-progress"></div>
        <div id="sb-timer">0.00s</div>
        <button id="sb-quit" type="button">やめる</button>
      </div>
      <div id="sb-scroll">
        <div id="sb-jp-word"></div>
        <div id="sb-hira"></div>
        <div id="sb-options"></div>
      </div>
      <div id="sb-wrong-popup">
        <div class="sb-wrong-jp"   id="sbwj"></div>
        <div class="sb-wrong-hira" id="sbwh"></div>
        <div class="sb-wrong-en"   id="sbwe"></div>
        <div class="sb-wrong-scold-jp"   id="sbsj"></div>
        <div class="sb-wrong-scold-hira" id="sbsh"></div>
        <div class="sb-wrong-scold-en"   id="sbse"></div>
        <div id="sb-wrong-status">RUN ENDED — NO SCORE</div>
        <button id="sb-wrong-close" type="button">もどる</button>
      </div>
      
     <div id="sb-win">
        <div class="sb-win-name"   id="sb-win-name"></div>
        <div class="sb-win-scream" id="sb-win-scream"></div>
        <div class="sb-win-jp"     id="sb-win-jp"></div>
        <div class="sb-win-label">FINAL TIME</div>
        <div class="sb-win-time"   id="sb-win-time-val"></div>
        <div class="sb-win-record" id="sb-win-record-msg"></div>
        <div class="sb-win-best"   id="sb-win-best-val"></div>
        <div class="sb-win-delta"  id="sb-win-delta"></div>
        <div class="sb-win-buttons">
          <button class="sb-win-btn" id="sb-play-again" type="button">もう一度</button>
          <button class="sb-win-btn ghost" id="sb-win-close" type="button">もどる</button>
        </div>
      </div>
      
    `;
     
    document.body.appendChild(el);
    return el;
  }

  // The game lifecycle is shared with Vocab Blitz and Question Blitz.
  const blitzEngine = BoohaBlitzEngine.create({
    apiName: 'SentenceBlitz',
    gameType: 'sentences',
    legacyKey: 'sentenceBlitz',
    saveId: 'sentence',
    dataFile: 'sentences.json',
    dataLabel: 'sentence',
    overlayId: 'sb-overlay',
    notEnoughMessage: 'Not enough sentence cards for this week.',
    palettes: PALETTES,
    scolds: SCOLDS,
    buildOverlay,
    injectStyles,
    optionClass: 'sb-opt',
    particleClass: 'sb-particle',
    particleAnimation: 'sbParticle',
    celebrationMode: 'sentence',
    correctParticles: 18,
    nextDelay: 200,
    cssVars: {
      '--sb-glow': p => p.glow,
      '--sb-hira-color': p => p.hiraColor,
      '--sb-opt-bg': p => p.optionBg,
      '--sb-opt-border': p => p.optionBorder,
      '--sb-opt-hover': p => p.optionHover,
    },
    ids: {
      timer: '#sb-timer', progress: '#sb-progress', jpWord: '#sb-jp-word', hira: '#sb-hira',
      options: '#sb-options', flash: '#sb-flash', scroll: '#sb-scroll', wrongPopup: '#sb-wrong-popup',
      win: '#sb-win', quit: '#sb-quit', wrongClose: '#sb-wrong-close',
      playAgain: '#sb-play-again', winClose: '#sb-win-close',
      wrongJp: '#sbwj', wrongHira: '#sbwh', wrongEn: '#sbwe',
      scoldJp: '#sbsj', scoldHira: '#sbsh', scoldEn: '#sbse',
      winName: '#sb-win-name', winScream: '#sb-win-scream', winJp: '#sb-win-jp',
      winTime: '#sb-win-time-val', winRecord: '#sb-win-record-msg',
      winBest: '#sb-win-best-val', winDelta: '#sb-win-delta',
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
