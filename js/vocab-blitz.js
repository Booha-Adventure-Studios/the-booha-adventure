
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
      baseHue: 285, bgSat: 85, bgLit: 10,
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
      baseHue: 185, bgSat: 85, bgLit: 10,
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
      baseHue: 15, bgSat: 85, bgLit: 10,
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
   
  /* ── Blitz score helpers ──────────────────────────────────────── */
  const BLITZ_GAME_TYPE = 'vocab';
  const LEGACY_SCORE_KEY = 'vocabBlitz';
  const WIN_COPY = {
    clear: 'ATE THE WORDS',
    record: 'BROKE THE MACHINE',
    jp: 'ブーハが覚えた。'
  };

  function getPlayerName() {
    try {
      if (typeof getBoohaFirstName === 'function') {
        const n = getBoohaFirstName();
        if (n) return String(n).trim().split(/\s+/)[0].toUpperCase();
      }
      const raw =
        localStorage.getItem('booha_first_name') ||
        localStorage.getItem('booha_user_name') ||
        localStorage.getItem('booha_display_name') ||
        localStorage.getItem('booha_name') ||
        'PLAYER 1';
      const first = String(raw).trim().split(/\s+/)[0] || 'PLAYER';
      return first.toUpperCase();
    } catch {
      return 'PLAYER';
    }
  }

  // Weekly bucket is keyed off the curriculum week (monthSlug + weekNumber),
  // which calendar.js already resolved upstream. Keeps the blitz reset in
  // lockstep with the main booha_save week — no raw date arithmetic.
  function makeWeekId(monthSlug, weekNumber) {
    return `${monthSlug}:w${weekNumber}`;
  }

  function normalizeScore(score) {
    if (score === null || score === undefined) return null;
    if (typeof score === 'number') {
      return { ms: score, name: 'UNKNOWN', date: null };
    }
    if (typeof score === 'object' && typeof score.ms === 'number') {
      return score;
    }
    return null;
  }

  function ensureBlitzStore(data, weekId) {
    if (!data.meta) data.meta = {};
    if (!data.meta.blitz) data.meta.blitz = {};

    const blitz = data.meta.blitz;
    if (!blitz.weekly) blitz.weekly = {};
    if (!blitz.records) blitz.records = {};

    // This only rolls the weekly bucket when we have an authoritative week id.
    if (weekId && blitz.weeklyKey !== weekId) {
      blitz.weeklyKey = weekId;
      blitz.weekly = {};
    }

    if (!blitz.weekly[BLITZ_GAME_TYPE]) blitz.weekly[BLITZ_GAME_TYPE] = {};
    if (!blitz.records[BLITZ_GAME_TYPE]) blitz.records[BLITZ_GAME_TYPE] = {};

    return blitz;
  }

  function readSave() {
    try {
      const raw = localStorage.getItem('booha_save');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeSave(data) {
    localStorage.setItem('booha_save', JSON.stringify(data));
  }

  function getLegacyBestTime(curr) {
    try {
      const data = readSave();
      return data?.meta?.[LEGACY_SCORE_KEY]?.[curr] ?? null;
    } catch {
      return null;
    }
  }

  function getBestScore(curr) {
    try {
      const data = readSave();
      const blitz = ensureBlitzStore(data);
      const modern = normalizeScore(blitz.records?.[BLITZ_GAME_TYPE]?.[curr]);
      if (modern) return modern;
      return normalizeScore(getLegacyBestTime(curr));
    } catch {
      return null;
    }
  }

  function getWeeklyScore(curr, weekId) {
    try {
      const data = readSave();
      const blitz = ensureBlitzStore(data, weekId);
      return normalizeScore(blitz.weekly?.[BLITZ_GAME_TYPE]?.[curr]);
    } catch {
      return null;
    }
  }

  function getBestTime(curr) {
    const best = getBestScore(curr);
    return best ? best.ms : null;
  }

  function saveBestTime(curr, ms, weekId) {
    try {
      const data = readSave();
      const blitz = ensureBlitzStore(data, weekId);
      const playerName = getPlayerName();

      const oldWeekly = normalizeScore(blitz.weekly[BLITZ_GAME_TYPE][curr]);
      const oldRecord = normalizeScore(blitz.records[BLITZ_GAME_TYPE][curr]);
      const legacy = normalizeScore(getLegacyBestTime(curr));

      const bestBefore = [oldRecord, legacy]
        .filter(Boolean)
        .sort((a, b) => a.ms - b.ms)[0] || null;

      const newScore = { ms, name: playerName, date: new Date().toISOString() };

      const isWeeklyRecord  = !oldWeekly || ms < oldWeekly.ms;
      const isAllTimeRecord = !bestBefore || ms < bestBefore.ms;

      if (isWeeklyRecord) {
        blitz.weekly[BLITZ_GAME_TYPE][curr] = newScore;
      }
      if (isAllTimeRecord) {
        blitz.records[BLITZ_GAME_TYPE][curr] = newScore;
        if (!data.meta[LEGACY_SCORE_KEY]) data.meta[LEGACY_SCORE_KEY] = {};
        data.meta[LEGACY_SCORE_KEY][curr] = ms;
      }

      writeSave(data);
      return { isWeeklyRecord, isAllTimeRecord, oldRecord: bestBefore, newScore };
    } catch {
      return {
        isWeeklyRecord: false,
        isAllTimeRecord: false,
        oldRecord: null,
        newScore: { ms, name: getPlayerName(), date: new Date().toISOString() }
      };
    }
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

      /* ── Mega win screen ── */
      .vb-win-name {
        font-size: clamp(42px, 13vw, 108px);
        font-weight: 1000;
        line-height: 0.9;
        color: #fff;
        letter-spacing: 2px;
        overflow-wrap: anywhere;
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
        <div class="vb-win-name"   id="vb-win-name"></div>
        <div class="vb-win-scream" id="vb-win-scream"></div>
        <div class="vb-win-jp"     id="vb-win-jp"></div>
        <div class="vb-win-label">FINAL TIME</div>
        <div class="vb-win-time"   id="vb-win-time-val"></div>
        <div class="vb-win-record" id="vb-win-record-msg"></div>
        <div class="vb-win-best"   id="vb-win-best-val"></div>
        <div class="vb-win-delta"  id="vb-win-delta"></div>
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

  function megaCelebrate(overlay, palette, isRecord) {
    const colors = [
      palette.accent, palette.accent2,
      '#ff005d', '#ffea00', '#00ff66',
      '#00e5ff', '#7c4dff', '#ff7a00', '#ffffff'
    ];

    overlay.classList.add('shake');
    setTimeout(() => overlay.classList.remove('shake'), 420);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    for (let i = 0; i < (isRecord ? 96 : 64); i++) {
      const p = document.createElement('div');
      const angle = Math.random() * Math.PI * 2;
      const dist  = 90 + Math.random() * (isRecord ? 420 : 300);
      const size  = 5 + Math.random() * 12;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.className = 'vb-particle';
      p.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        width:${size}px; height:${size}px;
        border-radius:${Math.random() > 0.55 ? '50%' : '3px'};
        background:${color};
        pointer-events:none; z-index:30;
        box-shadow:0 0 12px 3px ${color};
        --px:${Math.cos(angle) * dist}px;
        --py:${Math.sin(angle) * dist}px;
        --pdur:${650 + Math.random() * 650}ms;
        --pdelay:${Math.random() * 120}ms;
        animation: vbParticle var(--pdur) ease-out var(--pdelay) both;
      `;
      overlay.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }

    for (let i = 0; i < (isRecord ? 150 : 90); i++) {
      const c = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      c.className = 'vb-confetti';
      c.style.cssText = `
        position:absolute;
        left:${Math.random() * window.innerWidth}px;
        top:${-30 - Math.random() * 180}px;
        width:${6 + Math.random() * 10}px;
        height:${6 + Math.random() * 14}px;
        background:${color};
        pointer-events:none; z-index:29;
        box-shadow:0 0 8px ${color};
        --cx:${(Math.random() - 0.5) * 520}px;
        --cy:${window.innerHeight * 0.75 + Math.random() * 420}px;
        --cdur:${900 + Math.random() * 1000}ms;
        --cdelay:${Math.random() * 420}ms;
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        animation: vbConfettiFall var(--cdur) ease-out var(--cdelay) both;
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
     
    // ── BGM ──────────────────────────────────────────────────
const bgm = new Audio('assets/audio/blitz.mp3');
bgm.loop = true;
bgm.volume = 0.55;
let bgmStarted = false;
function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;
  bgm.play().catch(() => {});
}
function stopBGM() {
  bgm.pause();
  bgm.currentTime = 0;
}
// ───────────────────────────────────────────────────────── 

    // Apply CSS vars for palette
    overlay.style.setProperty('--vb-glow', palette.glow);
    overlay.style.setProperty('--vb-hira-color', palette.hiraColor);
    overlay.style.setProperty('--vb-opt-bg', palette.optionBg);
    overlay.style.setProperty('--vb-opt-border', palette.optionBorder);
    overlay.style.setProperty('--vb-opt-hover', palette.optionHover);
    overlay.style.background = `hsl(${palette.baseHue}, ${palette.bgSat}%, ${palette.bgLit}%)`;

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

     // Hue-rotate background each question
    bgIndex++;
    const hue = (palette.baseHue + bgIndex * 51) % 360;
    overlay.style.background =
      `hsl(${hue}, ${palette.bgSat}%, ${palette.bgLit}%)`;

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

   function correctDetonate(overlay, correctBtn, optionsEl, jpWordEl, hiraEl, palette) {
  // ── 1. Button green flash ────────────────────────────────
  correctBtn.style.transition = 'none';
  correctBtn.style.background = 'rgba(0,255,100,0.7)';
  correctBtn.style.boxShadow  = '0 0 32px 8px rgba(0,255,100,0.8)';

  // ── 2. Impact zoom shake ─────────────────────────────────
  overlay.style.animation = 'none';
  overlay.style.transform = 'scale(1.03)';
  setTimeout(() => {
    overlay.style.transform = '';
    overlay.style.transition = 'transform 80ms ease';
    setTimeout(() => { overlay.style.transition = ''; }, 80);
  }, 60);

  // ── 3. Wrong buttons shoot away ──────────────────────────
  const allBtns = Array.from(optionsEl.querySelectorAll('.vb-opt'));
  setTimeout(() => {
    allBtns.forEach(btn => {
      if (btn === correctBtn) return;
      const angle  = Math.random() * Math.PI * 2;
      const dist   = 220 + Math.random() * 180;
      const tx     = Math.cos(angle) * dist;
      const ty     = Math.sin(angle) * dist;
      const rot    = (Math.random() - 0.5) * 540;
      btn.style.transition = 'transform 280ms cubic-bezier(.4,0,1,1), opacity 220ms ease';
      btn.style.transform  = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(0.2)`;
      btn.style.opacity    = '0';
    });
  }, 80);

  // ── 4. Correct button particle explosion ─────────────────
  setTimeout(() => {
    const r   = correctBtn.getBoundingClientRect();
    const ovr = overlay.getBoundingClientRect();
    const cx  = r.left - ovr.left + r.width  / 2;
    const cy  = r.top  - ovr.top  + r.height / 2;

    correctBtn.style.transition = 'transform 120ms ease, opacity 100ms ease';
    correctBtn.style.transform  = 'scale(1.3)';
    correctBtn.style.opacity    = '0';

    const colors = [palette.accent, palette.accent2, '#ffffff', '#00ff64'];
    for (let i = 0; i < 22; i++) {
      const p     = document.createElement('div');
      const angle = (i / 22) * Math.PI * 2;
      const dist  = 60 + Math.random() * 120;
      const size  = 5 + Math.random() * 8;
      p.style.cssText = `
        position:absolute;
        left:${cx}px; top:${cy}px;
        width:${size}px; height:${size}px;
        border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
        background:${colors[Math.floor(Math.random() * colors.length)]};
        pointer-events:none; z-index:10;
        box-shadow:0 0 8px 2px ${palette.accent};
        --px:${Math.cos(angle) * dist}px;
        --py:${Math.sin(angle) * dist}px;
        --pdur:${260 + Math.random() * 160}ms;
        --pdelay:${Math.random() * 40}ms;
        animation: vbParticle var(--pdur) ease-out var(--pdelay) both;
      `;
      overlay.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }, 100);

  // ── 5. Full screen white/neon flash ──────────────────────
  setTimeout(() => {
    flashEl.style.background = palette.accent;
    flashEl.style.opacity    = '0.55';
    setTimeout(() => {
      flashEl.style.background = '#ffffff';
      flashEl.style.opacity    = '0.85';
      setTimeout(() => {
        flashEl.style.opacity    = '0';
        flashEl.style.background = 'rgba(255,255,255,0.18)';
      }, 60);
    }, 40);
  }, 120);

 // ── 6. Hard cut to next question ─────────────────────────
  setTimeout(() => {
    if (current >= queue.length) {
      stopTimer();
      stopBGM();
      showWin(elapsed, curr, palette, overlay, winScreen,
        monthSlug, weekNumber, queue);
    } else {
      optionsEl.style.visibility = 'hidden';
      renderQuestion();
      requestAnimationFrame(() => {
        optionsEl.style.visibility = '';
      });
    }
  }, 220);
}  

    function handleAnswer(btn, chosen, correct, allOpts) {
  if (locked) return;
  locked = true;
  startBGM();

  if (chosen.n === correct.n) {
    // ── CORRECT ──
  btn.classList.add('correct');
    current++;
    correctDetonate(overlay, btn, optionsEl, jpWordEl, hiraEl, palette);

  } else {
    // ── WRONG ──
    btn.classList.add('wrong');
     
    const allBtns = optionsEl.querySelectorAll('.vb-opt');
    allBtns.forEach(b => {
      if (b.textContent === correct.en) b.classList.add('correct');
    });
    overlay.classList.add('shake');
    overlay.addEventListener('animationend', () => overlay.classList.remove('shake'), { once: true });
    stopTimer();
    stopBGM();
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
  stopBGM();
  overlay.remove();
       
      if (typeof window.VocabBlitz._onClose === 'function') window.VocabBlitz._onClose();
    });

     
   // Fucking epic Win screen
    function showWin(ms, curr, palette, overlay, winScreen, monthSlug, weekNumber) {
      const weekId     = makeWeekId(monthSlug, weekNumber);
      const result     = saveBestTime(curr, ms, weekId);
      const best       = getBestScore(curr);
      const weekly     = getWeeklyScore(curr, weekId);
      const playerName = getPlayerName();

      const isRecord  = result.isAllTimeRecord;
      const oldRecord = result.oldRecord;

      winScreen.classList.toggle('record-mode', isRecord);

      winScreen.querySelector('#vb-win-name').textContent = playerName;
      winScreen.querySelector('#vb-win-scream').textContent =
        isRecord ? WIN_COPY.record : WIN_COPY.clear;
      winScreen.querySelector('#vb-win-jp').textContent =
        isRecord ? WIN_COPY.jp : 'クリア。';

      winScreen.querySelector('#vb-win-time-val').textContent = fmtTime(ms);
      winScreen.querySelector('#vb-win-time-val').style.color =
        isRecord ? '#ffd700' : palette.timerColor;
      winScreen.querySelector('#vb-win-time-val').style.textShadow =
        isRecord
          ? '0 0 28px rgba(255,215,0,1), 0 0 70px rgba(255,90,0,0.75)'
          : `0 0 32px ${palette.glow}, 0 0 64px ${palette.glow}`;

      const recordEl = winScreen.querySelector('#vb-win-record-msg');
      const bestEl   = winScreen.querySelector('#vb-win-best-val');
      const deltaEl  = winScreen.querySelector('#vb-win-delta');

      recordEl.classList.toggle('big', isRecord);

      if (isRecord) {
        recordEl.textContent = '🏆 NEW BOOHA RECORD';
        bestEl.textContent   = oldRecord ? `OLD: ${fmtTime(oldRecord.ms)}` : 'FIRST RECORD';
        deltaEl.textContent  = oldRecord ? `-${fmtTime(oldRecord.ms - ms)} faster` : '';
      } else {
        recordEl.textContent = result.isWeeklyRecord ? 'THIS WEEK’S FASTEST' : '';
        bestEl.textContent   = best ? `ALL-TIME BEST: ${fmtTime(best.ms)}${best.name ? ` — ${best.name}` : ''}` : '';
        deltaEl.textContent  = weekly ? `THIS WEEK: ${fmtTime(weekly.ms)}${weekly.name ? ` — ${weekly.name}` : ''}` : '';
      }

      winScreen.classList.add('show');
      megaCelebrate(overlay, palette, isRecord);
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
  stopBGM();
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
        ${buildScorePane('sentenceBlitz')}
        </div>
        <div class="vb-fp-pane" data-pane="questions">
        ${buildScorePane('questionBlitz')}
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

function buildScorePane(saveKey) {
  const rows = [
    { curr: 'pb', name: 'Pre-Boo',       jp: 'プレブー',             color: '#ff3bff' },
    { curr: 'br', name: 'Boo-riculum',   jp: 'ブーリキュラム',       color: '#00ffee' },
    { curr: 'bc', name: 'Boo-continuum', jp: 'ブーコンティニューム', color: '#ff6a00' },
  ];
  return rows.map(r => {
    try {
      const raw  = localStorage.getItem('booha_save');
      const data = raw ? JSON.parse(raw) : {};
      const t    = data?.meta?.[saveKey]?.[r.curr] ?? null;
      const hasScore = t !== null && t !== undefined;
      return `
        <div class="vb-fp-row">
          <div class="vb-fp-dot" style="background:${r.color};box-shadow:0 0 8px ${r.color};"></div>
          <div class="vb-fp-curr">
            <div class="vb-fp-curr-name">${r.name}</div>
            <div class="vb-fp-curr-jp">${r.jp}</div>
          </div>
          <div class="vb-fp-time ${hasScore?'':'no-score'}" data-vb-score="${saveKey}-${r.curr}">
            ${hasScore ? fmtTime(t) : '-- --'}
          </div>
        </div>`;
    } catch { return ''; }
  }).join('');
}

   
 function openFastestPanel(gameType = 'vocab') {
  let panel = document.getElementById('vb-fastest-panel');
  if (!panel) panel = buildFastestPanel();

  ['pb','br','bc'].forEach(curr => {
    const el = panel.querySelector(`[data-vb-score="${curr}"]`);
    if (el) {
      const t = getBestTime(curr);
      if (t !== null && t !== undefined) {
        el.textContent = fmtTime(t);
        el.classList.remove('no-score');
      } else {
        el.textContent = '-- --';
        el.classList.add('no-score');
      }
    }
    ['sentenceBlitz','questionBlitz'].forEach(saveKey => {
      const sel = panel.querySelector(`[data-vb-score="${saveKey}-${curr}"]`);
      if (!sel) return;
      try {
        const raw  = localStorage.getItem('booha_save');
        const data = raw ? JSON.parse(raw) : {};
        const t    = data?.meta?.[saveKey]?.[curr] ?? null;
        if (t !== null && t !== undefined) {
          sel.textContent = fmtTime(t);
          sel.classList.remove('no-score');
        } else {
          sel.textContent = '-- --';
          sel.classList.add('no-score');
        }
      } catch {}
    });
  });

  panel.classList.add('show');
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
