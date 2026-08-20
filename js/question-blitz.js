
/* ═══════════════════════════════════════════════════════════════════
   QUESTION BLITZ  —  js/question-blitz.js
   Self-contained overlay game engine for the Booha Adventure index.
   Usage: QuestionBlitz.launch({ curr, monthSlug, weekNumber })
═══════════════════════════════════════════════════════════════════ */

window.QuestionBlitz = (() => {

  /* ── Palettes ────────────────────────────────────────────────── */
 const PALETTES = {
    pb: {
      baseHue: 195, bgSat: 85, bgLit: 10,
      accent: '#00cfff',
      accent2: '#ffffff',
      glow: 'rgba(0,207,255,0.7)',
      optionBg: 'rgba(0,207,255,0.10)',
      optionBorder: '#00cfff',
      optionHover: 'rgba(0,207,255,0.26)',
      timerColor: '#ffffff',
      hiraColor: '#88eeff',
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
    },
    bc: {
      baseHue: 275, bgSat: 85, bgLit: 10,
      accent: '#a855f7',
      accent2: '#d8b4fe',
      glow: 'rgba(168,85,247,0.7)',
      optionBg: 'rgba(168,85,247,0.10)',
      optionBorder: '#a855f7',
      optionHover: 'rgba(168,85,247,0.26)',
      timerColor: '#d8b4fe',
      hiraColor: '#c084fc',
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

 /* ── Blitz score helpers ──────────────────────────────────────── */
  const BLITZ_GAME_TYPE = 'questions';
  const LEGACY_SCORE_KEY = 'questionBlitz';
  const WIN_COPY = {
    clear: 'ANSWERED TOO FAST',
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

  // Weekly bucket keyed off curriculum week (monthSlug + weekNumber),
  // resolved upstream by calendar.js. Stays in lockstep with booha_save.
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

    if (weekId && blitz.weeklyKey !== weekId) {
      blitz.weeklyKey = weekId;
      blitz.weekly = {};
    }

    if (!blitz.weekly[BLITZ_GAME_TYPE]) blitz.weekly[BLITZ_GAME_TYPE] = {};
    if (!blitz.records[BLITZ_GAME_TYPE]) blitz.records[BLITZ_GAME_TYPE] = {};

    return blitz;
  }

 // Routed through BoohaSaveFile, never localStorage directly. The bare
  // 'booha_save' key is unscoped: writing to it put blitz records outside the
  // student's save file, outside the weekly reset, and shared across everyone
  // using the device. Reads here also get schema migration for free.
  function readSave() {
    try {
      if (window.BoohaAdventure && BoohaAdventure.save) return BoohaAdventure.save.load();
      console.error('[Blitz] Save system unavailable — reading empty.');
      return {};
    } catch (e) {
      console.error('[Blitz] Save read failed:', e);
      return {};
    }
  }

  // Returns true only if the write actually landed. BoohaSaveFile refuses to
  // write when no student is identified, and that must not be silent.
  function writeSave(data) {
    try {
      if (window.BoohaAdventure && BoohaAdventure.save) return BoohaAdventure.save.save(data);
      console.error('[Blitz] Save system unavailable — record NOT written.');
      return false;
    } catch (e) {
      console.error('[Blitz] Save write failed:', e);
      return false;
    }
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

      if (!writeSave(data)) {
        // Don't claim a record that wasn't stored — the student would see
        // "NEW BOOHA RECORD" and find it gone on the next load.
        return {
          isWeeklyRecord: false, isAllTimeRecord: false,
          oldRecord: bestBefore, newScore, saveFailed: true
        };
      }
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
        padding: 24px; text-align: center; gap: 8px;
        overflow-y: auto;
      }
      #qb-wrong-popup.show { display: flex; }

      .qb-wrong-jp {
        font-size: clamp(48px,12vw,88px);
        font-weight: 900; color: #ff3b3b;
        text-shadow: 0 0 24px rgba(255,59,59,0.8);
        line-height: 1.35;
        animation: qbWordPop 350ms cubic-bezier(.34,1.56,.64,1) both;
        max-width: 560px;
      }
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

  function megaCelebrate(overlay, palette, isRecord) {
    const name   = getPlayerName();
    const colors = isRecord
      ? ['#ffd700', '#ffea00', '#fff3b0', '#ffffff']
      : [palette.accent, palette.accent2, '#ffffff', '#ffea00'];

    overlay.classList.add('shake');
    setTimeout(() => overlay.classList.remove('shake'), 420);

    const W = window.innerWidth, H = window.innerHeight;

    /* 1 ── Names STREAK across at speed, alternating direction ─── */
    for (let i = 0; i < (isRecord ? 42 : 26); i++) {
      const d      = document.createElement('div');
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const size   = 12 + Math.random() * (isRecord ? 26 : 20);
      const toLeft = i % 2 === 1;
      d.className   = 'qb-name-streak';
      d.textContent = name;
      d.style.cssText = `
        left:${toLeft ? W + 60 : -300}px;
        top:${Math.random() * H}px;
        font-size:${size}px;
        color:${color};
        text-shadow:0 0 10px ${color}, 0 0 24px ${color};
        --sk:${toLeft ? 14 : -14}deg;
        --dx:${toLeft ? -(W + 620) : (W + 620)}px;
        --cdur:${1800 + Math.random() * 1200}ms;
        --cdelay:${Math.random() * 900}ms;
      `;
      overlay.appendChild(d);
      d.addEventListener('animationend', () => d.remove());
    }

    /* 2 ── Speed lines tear through with them ──────────────────── */
    for (let i = 0; i < (isRecord ? 34 : 22); i++) {
      const l      = document.createElement('div');
      const color  = colors[Math.floor(Math.random() * colors.length)];
      const toLeft = i % 2 === 0;
      const len    = 60 + Math.random() * 180;
      l.className = 'qb-speed-line';
      l.style.cssText = `
        left:${toLeft ? W + 40 : -240}px;
        top:${Math.random() * H}px;
        width:${len}px;
        background:linear-gradient(${toLeft ? '270deg' : '90deg'}, transparent, ${color});
        box-shadow:0 0 6px ${color};
        --sk:0deg;
        --dx:${toLeft ? -(W + 480) : (W + 480)}px;
        --cdur:${600 + Math.random() * 300}ms;
        --cdelay:${Math.random() * 460}ms;
      `;
      overlay.appendChild(l);
      l.addEventListener('animationend', () => l.remove());
    }
  }

  /* ── Launch ──────────────────────────────────────────────────── */
  function launch({ curr, monthSlug, weekNumber }) {
     
    const palette = PALETTES[curr];
    if (!palette) { console.error('QuestionBlitz: unknown curr', curr); return; }
    injectStyles();
    const path = `content/${curr}/${monthSlug}/questions.json`;
    fetch(path)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => startGame(data.cards, curr, weekNumber, palette, monthSlug))
      .catch(err => {
        alert(`データが読み込めませんでした。\nCould not load question data.\n(${path})`);
        console.error('QuestionBlitz fetch error:', err);
      });
  }

  /* ── Start game ──────────────────────────────────────────────── */
  function startGame(allCards, curr, weekNumber, palette, monthSlug) {
    const offset = (weekNumber - 1) * 15;
    const weekCards = allCards.slice(offset, offset + 15);
    if (weekCards.length < 6) { alert('Not enough question cards for this week.'); return; }

    const existing = document.getElementById('qb-overlay');
    if (existing) existing.remove();

    const overlay = buildOverlay();

    // BGM
    const bgm = new Audio('assets/audio/blitz.mp3');
    bgm.loop = true; bgm.volume = 0.55;
    let bgmStarted = false;
    function startBGM() { if (bgmStarted) return; bgmStarted = true; bgm.play().catch(() => {}); }
    function stopBGM()  { bgm.pause(); bgm.currentTime = 0; }

    // CSS vars
    overlay.style.setProperty('--qb-glow', palette.glow);
    overlay.style.setProperty('--qb-hira-color', palette.hiraColor);
    overlay.style.setProperty('--qb-opt-bg', palette.optionBg);
    overlay.style.setProperty('--qb-opt-border', palette.optionBorder);
    overlay.style.setProperty('--qb-opt-hover', palette.optionHover);
    overlay.style.background = `hsl(${palette.baseHue}, ${palette.bgSat}%, ${palette.bgLit}%)`;

    // DOM refs
    const timerEl    = overlay.querySelector('#qb-timer');
    const progressEl = overlay.querySelector('#qb-progress');
    const jpWordEl   = overlay.querySelector('#qb-jp-word');
    const hiraEl     = overlay.querySelector('#qb-hira');
    const optionsEl  = overlay.querySelector('#qb-options');
    const flashEl    = overlay.querySelector('#qb-flash');
    const scrollEl   = overlay.querySelector('#qb-scroll');
    const wrongPopup = overlay.querySelector('#qb-wrong-popup');
    const winScreen  = overlay.querySelector('#qb-win');

    timerEl.style.color = palette.timerColor;

    // State
    const queue = shuffle(weekCards);
    let current = 0, startTime = null, elapsed = 0;
    let clearElapsed = null;
    let rafId = null, locked = false, bgIndex = 0;

    function tick() {
      if (startTime === null) { rafId = requestAnimationFrame(tick); return; }
      elapsed = performance.now() - startTime;
      timerEl.textContent = fmtTime(elapsed);
      rafId = requestAnimationFrame(tick);
    }
    function stopTimer() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

    /* ── correctDetonate ── */
    function correctDetonate(correctBtn) {
      correctBtn.style.transition = 'none';
      correctBtn.style.background = 'rgba(0,255,100,0.6)';
      correctBtn.style.boxShadow  = '0 0 28px 6px rgba(0,255,100,0.75)';

      overlay.style.transform = 'scale(1.02)';
      setTimeout(() => {
        overlay.style.transition = 'transform 70ms ease';
        overlay.style.transform = '';
        setTimeout(() => { overlay.style.transition = ''; }, 70);
      }, 55);

      const allBtns = Array.from(optionsEl.querySelectorAll('.qb-opt'));
      setTimeout(() => {
        allBtns.forEach(btn => {
          if (btn === correctBtn) return;
          const angle = Math.random() * Math.PI * 2;
          const dist  = 200 + Math.random() * 160;
          btn.style.transition = 'transform 260ms cubic-bezier(.4,0,1,1), opacity 200ms ease';
          btn.style.transform  = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) rotate(${(Math.random()-.5)*480}deg) scale(0.15)`;
          btn.style.opacity    = '0';
        });
      }, 70);

      setTimeout(() => {
        correctBtn.style.transition = 'transform 110ms ease, opacity 90ms ease';
        correctBtn.style.transform  = 'scale(1.25)';
        correctBtn.style.opacity    = '0';

        const r   = correctBtn.getBoundingClientRect();
        const ovr = overlay.getBoundingClientRect();
        const cx  = r.left - ovr.left + r.width / 2;
        const cy  = r.top  - ovr.top  + r.height / 2;
        const colors = [palette.accent, palette.accent2, '#ffffff', '#00cfff'];

        for (let i = 0; i < 18; i++) {
          const p = document.createElement('div');
          const angle = (i / 18) * Math.PI * 2;
          const dist  = 50 + Math.random() * 100;
          const size  = 5 + Math.random() * 7;
          p.style.cssText = `
            position:absolute; left:${cx}px; top:${cy}px;
            width:${size}px; height:${size}px;
            border-radius:${Math.random()>.5?'50%':'3px'};
            background:${colors[Math.floor(Math.random()*colors.length)]};
            pointer-events:none; z-index:10;
            box-shadow:0 0 6px 2px ${palette.accent};
            --px:${Math.cos(angle)*dist}px; --py:${Math.sin(angle)*dist}px;
            --pdur:${240+Math.random()*140}ms; --pdelay:${Math.random()*30}ms;
            
            animation: qbParticle var(--pdur) ease-out var(--pdelay) both;
          `;
          overlay.appendChild(p);
          p.addEventListener('animationend', () => p.remove());
        }
      }, 90);

      setTimeout(() => {
        flashEl.style.background = palette.accent;
        flashEl.style.opacity    = '0.45';
        setTimeout(() => {
          flashEl.style.background = '#ffffff';
          flashEl.style.opacity    = '0.75';
          setTimeout(() => { flashEl.style.opacity = '0'; flashEl.style.background = ''; }, 55);
        }, 35);
      }, 110);

     setTimeout(() => {
        if (current >= queue.length) {
          stopTimer(); stopBGM();
          showWin(clearElapsed ?? elapsed, curr, palette, overlay, winScreen, monthSlug, weekNumber);
        } else {
          optionsEl.style.visibility = 'hidden';
          renderQuestion();
          scrollEl.scrollTop = 0;
          requestAnimationFrame(() => {
            optionsEl.style.visibility = '';
          });
        }
      }, 200);
    }

       
    /* ── renderQuestion ── */
    function renderQuestion() {
      locked = false;
      const card = queue[current];
       
      bgIndex++;
      const hue = (palette.baseHue + bgIndex * 51) % 360;
      overlay.style.background = `hsl(${hue}, ${palette.bgSat}%, ${palette.bgLit}%)`;

      jpWordEl.style.animation = 'none';
      hiraEl.style.animation   = 'none';
      requestAnimationFrame(() => {
        jpWordEl.style.animation = '';
        hiraEl.style.animation   = '';
        jpWordEl.textContent = card.jp;
        hiraEl.textContent   = card.hira;
      });

      progressEl.textContent = `${current + 1} / ${queue.length}`;

      const wrong   = shuffle(weekCards.filter(c => c.n !== card.n)).slice(0, 5);
      const options = shuffle([card, ...wrong]);

      optionsEl.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className   = 'qb-opt';
        btn.type        = 'button';
        btn.textContent = opt.en;
        btn.addEventListener('click', () => handleAnswer(btn, opt, card));
        optionsEl.appendChild(btn);
      });

      if (current === 0 && startTime === null) startTime = performance.now();
    }

    /* ── handleAnswer ── */
    function handleAnswer(btn, chosen, correct) {
      if (locked) return;
      locked = true;
      startBGM();

      if (chosen.n === correct.n) {
        btn.classList.add('correct');
        current++;
        if (current >= queue.length) clearElapsed = performance.now() - startTime;
        correctDetonate(btn);
      } else {
        btn.classList.add('wrong');
        optionsEl.querySelectorAll('.qb-opt').forEach(b => {
          if (b.textContent === correct.en) b.classList.add('correct');
        });
        overlay.classList.add('shake');
        overlay.addEventListener('animationend', () => overlay.classList.remove('shake'), { once: true });
        stopTimer(); stopBGM();
        setTimeout(() => showWrongPopup(correct, wrongPopup), 480);
      }
    }

    /* ── Wrong popup ── */
    function showWrongPopup(correct, popup) {
      const scold = SCOLDS[Math.floor(Math.random() * SCOLDS.length)];
      overlay.querySelector('#qbwj').textContent = correct.jp;
      overlay.querySelector('#qbwh').textContent = correct.hira;
      overlay.querySelector('#qbwe').textContent = correct.en;
      overlay.querySelector('#qbsj').textContent = scold.jp;
      overlay.querySelector('#qbsh').textContent = scold.hira;
      overlay.querySelector('#qbse').textContent = scold.en;
      popup.classList.add('show');
    }

    overlay.querySelector('#qb-wrong-close').addEventListener('click', () => {
      stopTimer(); stopBGM(); overlay.remove();
      if (typeof window.QuestionBlitz._onClose === 'function') window.QuestionBlitz._onClose();
    });

   /* ── Win screen ── */
    function showWin(ms, curr, palette, overlay, winScreen, monthSlug, weekNumber) {
      const weekId     = makeWeekId(monthSlug, weekNumber);
      const result     = saveBestTime(curr, ms, weekId);
      if (result.saveFailed) {
        console.error('[Blitz] Time not saved:', ms, 'ms');
      }

      // Report clear to Booha day-recorder (fires only on 100% clear)
      document.dispatchEvent(new CustomEvent('booha:gameEnd', {
        detail: { saveId: `blitz:${curr}:question`, score: 100, completed: true, time: ms }
      }));
      const best       = getBestScore(curr);
      const weekly     = getWeeklyScore(curr, weekId);
      const playerName = getPlayerName();

      const isRecord  = result.isAllTimeRecord;
      const oldRecord = result.oldRecord;

      winScreen.classList.toggle('record-mode', isRecord);

      winScreen.querySelector('#qb-win-name').textContent = playerName;
      winScreen.querySelector('#qb-win-scream').textContent =
        isRecord ? WIN_COPY.record : WIN_COPY.clear;
      winScreen.querySelector('#qb-win-jp').textContent =
        isRecord ? WIN_COPY.jp : 'クリア。';

      winScreen.querySelector('#qb-win-time-val').textContent = fmtTime(ms);
      winScreen.querySelector('#qb-win-time-val').style.color =
        isRecord ? '#ffd700' : palette.timerColor;
      winScreen.querySelector('#qb-win-time-val').style.textShadow =
        isRecord
          ? '0 0 28px rgba(255,215,0,1), 0 0 70px rgba(255,90,0,0.75)'
          : `0 0 32px ${palette.glow}, 0 0 64px ${palette.glow}`;

      const recordEl = winScreen.querySelector('#qb-win-record-msg');
      const bestEl   = winScreen.querySelector('#qb-win-best-val');
      const deltaEl  = winScreen.querySelector('#qb-win-delta');

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

     
    overlay.querySelector('#qb-play-again').addEventListener('click', () => {
      overlay.remove();
      launch({ curr, monthSlug, weekNumber });
    });
    overlay.querySelector('#qb-win-close').addEventListener('click', () => {
      overlay.remove();
      if (typeof window.QuestionBlitz._onClose === 'function') window.QuestionBlitz._onClose();
    });
    overlay.querySelector('#qb-quit').addEventListener('click', () => {
      stopTimer(); stopBGM(); overlay.remove();
      if (typeof window.QuestionBlitz._onClose === 'function') window.QuestionBlitz._onClose();
    });

    rafId = requestAnimationFrame(tick);
    renderQuestion();
  }

  /* ── Public API ──────────────────────────────────────────────── */
return {
    launch,
    getBestTime,
    fmtTime,
    getWeeklyScore,   // weekly read w/ stale-week guard — used by index pills
    _onClose: null,
  };

})();
