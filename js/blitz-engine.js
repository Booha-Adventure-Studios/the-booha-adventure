/*
 * Booha Blitz shared engine.
 *
 * The three Blitz modes provide a palette, a CSS/DOM skin, and copy.  The
 * question queue, timer, answer flow, score storage, wrong-answer screen, and
 * win flow live here so those behaviours cannot drift between modes.
 */
window.BoohaBlitzEngine = (() => {
  const THEMES = Object.freeze({
    pb: Object.freeze({
      id: 'pb', name: 'Pre-Boo', nameJp: 'プレブー',
      baseHue: 330, bgSat: 76, bgLit: 24,
      background: Object.freeze({ main: 'hsl(330, 76%, 24%)', secondary: 'hsl(24, 88%, 20%)' }),
      accent: '#ff6fb5', accent2: '#ffe27a', glow: 'rgba(255,111,181,0.62)',
      optionBg: 'rgba(255,255,255,0.14)', optionBorder: '#ffb4d8', optionHover: 'rgba(255,226,122,0.28)',
      timerColor: '#fff0a8', wordColor: '#ffffff', hiraColor: '#ffd1e6',
      correct: Object.freeze({ color: '#00ff86', glow: 'rgba(0,255,134,.58)' }),
      wrong: Object.freeze({ color: '#ff536d', glow: 'rgba(255,83,109,.58)' }),
      popup: Object.freeze({ background: 'rgba(92,24,68,.92)', accent: '#ffb7dc' }),
      streak: Object.freeze({ label: 'STREAK', marker: '★', colors: ['#ffffff', '#ffe66b', '#ffad55', '#ff6d78', '#ff6ccf'], glow: 'rgba(255,125,196,.62)' }),
      reward: Object.freeze({ colors: ['#fffbe1', '#ffe27a', '#ff8ec8', '#ffffff'], glow: 'rgba(255,184,72,.72)' }),
      shape: Object.freeze({ optionRadius: 'round', popupRadius: '28px', particle: 'round' }),
      motion: Object.freeze({ feel: 'playful', particleEasing: 'cubic-bezier(.16,1.5,.3,1)', nameEasing: 'cubic-bezier(.2,.9,.25,1)', hueStep: 72, optionDurationMs: 340, optionStaggerMs: 36, optionX: '0px', optionY: '16px', optionScale: '.92' }),
      particleShape: 'round', particleEasing: 'cubic-bezier(.16,1.5,.3,1)', nameEasing: 'cubic-bezier(.2,.9,.25,1)', hueStep: 72, feel: 'playful',
      rewardColors: ['#fffbe1', '#ffe27a', '#ff8ec8', '#ffffff'], rewardGlow: 'rgba(255,184,72,.72)',
    }),
    br: Object.freeze({
      id: 'br', name: 'Boo-riculum', nameJp: 'ブーリキュラム',
      baseHue: 185, bgSat: 92, bgLit: 11,
      background: Object.freeze({ main: 'hsl(185, 92%, 11%)', secondary: 'hsl(264, 75%, 14%)' }),
      accent: '#00ffee', accent2: '#39ff14', glow: 'rgba(0,255,238,0.7)',
      optionBg: 'rgba(0,255,238,0.14)', optionBorder: '#00ffee', optionHover: 'rgba(0,255,238,0.32)',
      timerColor: '#39ff14', wordColor: '#ffffff', hiraColor: '#80ffee',
      correct: Object.freeze({ color: '#39ff14', glow: 'rgba(57,255,20,.62)' }),
      wrong: Object.freeze({ color: '#ff3b5c', glow: 'rgba(255,59,92,.62)' }),
      popup: Object.freeze({ background: 'rgba(3,18,24,.94)', accent: '#00ffee' }),
      streak: Object.freeze({ label: 'COMBO', marker: '⚡', colors: ['#f5ffcf', '#39ff14', '#00ffee', '#8affff', '#ffffff'], glow: 'rgba(0,255,210,.72)' }),
      reward: Object.freeze({ colors: ['#f5ffcf', '#39ff14', '#00ffee', '#ffffff'], glow: 'rgba(0,255,210,.78)' }),
      shape: Object.freeze({ optionRadius: 'arcade', popupRadius: '18px', particle: 'arcade' }),
      motion: Object.freeze({ feel: 'arcade', particleEasing: 'ease-out', nameEasing: 'cubic-bezier(.2,.75,.3,1)', hueStep: 51, optionDurationMs: 260, optionStaggerMs: 30, optionX: '0px', optionY: '8px', optionScale: '.97' }),
      particleShape: 'arcade', particleEasing: 'ease-out', nameEasing: 'cubic-bezier(.2,.75,.3,1)', hueStep: 51, feel: 'arcade',
      rewardColors: ['#f5ffcf', '#39ff14', '#00ffee', '#ffffff'], rewardGlow: 'rgba(0,255,210,.78)',
    }),
    bc: Object.freeze({
      id: 'bc', name: 'Boo-continuum', nameJp: 'ブーコンティニューム',
      baseHue: 222, bgSat: 46, bgLit: 10,
      background: Object.freeze({ main: 'hsl(222, 46%, 10%)', secondary: 'hsl(205, 48%, 15%)' }),
      accent: '#f0c96a', accent2: '#dfeaff', glow: 'rgba(240,201,106,0.58)',
      optionBg: 'rgba(240,201,106,0.10)', optionBorder: '#f0c96a', optionHover: 'rgba(240,201,106,0.22)',
      timerColor: '#ffe7a0', wordColor: '#ffffff', hiraColor: '#b8d1ff',
      correct: Object.freeze({ color: '#9fffc4', glow: 'rgba(159,255,196,.5)' }),
      wrong: Object.freeze({ color: '#e8758d', glow: 'rgba(232,117,141,.5)' }),
      popup: Object.freeze({ background: 'rgba(8,14,31,.95)', accent: '#f0c96a' }),
      streak: Object.freeze({ label: 'CHAIN', marker: '✦', colors: ['#fff6cf', '#f0c96a', '#dfeaff', '#b8d1ff', '#ffffff'], glow: 'rgba(240,201,106,.58)' }),
      reward: Object.freeze({ colors: ['#fff6cf', '#f0c96a', '#dfeaff', '#ffffff'], glow: 'rgba(240,201,106,.72)' }),
      shape: Object.freeze({ optionRadius: 'diamond', popupRadius: '14px', particle: 'diamond' }),
      motion: Object.freeze({ feel: 'sleek', particleEasing: 'cubic-bezier(.2,.7,.2,1)', nameEasing: 'cubic-bezier(.33,.05,.55,.9)', hueStep: 24, optionDurationMs: 380, optionStaggerMs: 44, optionX: '16px', optionY: '0px', optionScale: '.96' }),
      particleShape: 'diamond', particleEasing: 'cubic-bezier(.2,.7,.2,1)', nameEasing: 'cubic-bezier(.33,.05,.55,.9)', hueStep: 24, feel: 'sleek',
      rewardColors: ['#fff6cf', '#f0c96a', '#dfeaff', '#ffffff'], rewardGlow: 'rgba(240,201,106,.72)',
    }),
  });
  const STREAK_EVENT_THRESHOLDS = Object.freeze([3, 5, 7, 10, 15]);
  const STREAK_EVENT_NOTES = Object.freeze({
    playful: Object.freeze({
      3: [523, 659], 5: [587, 740, 880], 7: [659, 784, 988],
      10: [784, 988, 1175], 15: [880, 1109, 1319, 1760],
    }),
    arcade: Object.freeze({
      3: [392, 494], 5: [494, 622, 784], 7: [587, 740, 932],
      10: [659, 831, 1047], 15: [784, 988, 1245, 1568],
    }),
    sleek: Object.freeze({
      3: [440, 554], 5: [523, 659, 831], 7: [587, 740, 988],
      10: [659, 831, 1047], 15: [784, 988, 1175, 1568],
    }),
  });
  const TIMER_PAINT_INTERVAL_MS = 100;
  const PERFORMANCE_SETTLE_MS = 900;
  const PERFORMANCE_WINDOW_MS = 2600;
  const REDUCED_MOTION = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HARDWARE_PERFORMANCE_TIER = REDUCED_MOTION
    ? 'minimal'
    : typeof navigator !== 'undefined' && (
      (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 2) ||
      (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 2)
    ) ? 'reduced' : 'full';
  const LOW_POWER = HARDWARE_PERFORMANCE_TIER !== 'full';
  let RUNTIME_PERFORMANCE_TIER = null;
  let RUNTIME_LOW_POWER = false;

  function performanceTier() {
    return RUNTIME_PERFORMANCE_TIER || HARDWARE_PERFORMANCE_TIER;
  }

  function isLowPower() {
    return performanceTier() !== 'full';
  }

  function isMinimalPower() {
    return performanceTier() === 'minimal';
  }

  function effectCount(fullCount) {
    if (isMinimalPower()) return Math.max(2, Math.ceil(fullCount * 0.25));
    if (isLowPower()) return Math.max(4, Math.ceil(fullCount * 0.55));
    return fullCount;
  }

  function applyPerformanceTier(overlay) {
    const tier = performanceTier();
    overlay.classList.toggle('full-power', tier === 'full');
    overlay.classList.toggle('reduced-power', tier === 'reduced');
    overlay.classList.toggle('low-power', tier === 'minimal');
    overlay.classList.toggle('runtime-low-power', tier === 'minimal' && RUNTIME_PERFORMANCE_TIER === 'minimal');
  }

  function enableRuntimeLowPower(overlay) {
    RUNTIME_PERFORMANCE_TIER = 'minimal';
    RUNTIME_LOW_POWER = true;
    applyPerformanceTier(overlay);
  }

  function enableRuntimeReducedPower(overlay) {
    if (HARDWARE_PERFORMANCE_TIER === 'minimal') return;
    RUNTIME_PERFORMANCE_TIER = 'reduced';
    applyPerformanceTier(overlay);
  }

  function monitorFramePerformance(overlay, onPoorPerformance) {
    if (HARDWARE_PERFORMANCE_TIER === 'minimal') return () => {};
    const monitorStartedAt = performance.now();
    const settleUntil = monitorStartedAt + PERFORMANCE_SETTLE_MS;
    let startedAt = null;
    let previous = null;
    let frameCount = 0;
    let slowFrames = 0;
    let totalFrameTime = 0;
    let rafId = null;
    let active = true;

    const stop = () => {
      if (!active) return;
      active = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    };
    const sample = now => {
      if (!active) return;
      if (now < settleUntil) {
        rafId = requestAnimationFrame(sample);
        return;
      }
      if (startedAt === null) {
        startedAt = now;
        previous = now;
        rafId = requestAnimationFrame(sample);
        return;
      }
      const frameTime = now - previous;
      previous = now;
      totalFrameTime += frameTime;
      if (frameTime >= 34) slowFrames++;
      frameCount++;
      if (now - startedAt >= PERFORMANCE_WINDOW_MS) {
        const averageFrameTime = totalFrameTime / Math.max(1, frameCount);
        const tier = averageFrameTime >= 34 || slowFrames >= 12
          ? 'minimal'
          : averageFrameTime >= 22 || slowFrames >= 5 ? 'reduced' : 'full';
        onPoorPerformance({ averageFrameTime, slowFrames, tier });
        stop();
        return;
      }
      rafId = requestAnimationFrame(sample);
    };
    rafId = requestAnimationFrame(sample);
    return stop;
  }

  function backgroundFor(palette, index = 0) {
    const streak = arguments.length > 2 ? arguments[2] : 0;
    const energy = Math.min(15, Math.max(0, Number(streak) || 0));
    if (isMinimalPower() && palette.background?.main) return palette.background.main;
    const hue = (palette.baseHue + index * (palette.hueStep || 51) + energy * (palette.feel === 'sleek' ? 1 : 2)) % 360;
    const saturation = Math.min(100, palette.bgSat + energy * (palette.feel === 'arcade' ? 0.7 : 0.45));
    const lightness = Math.min(42, palette.bgLit + energy * (palette.feel === 'playful' ? 0.4 : 0.25));
    const main = index === 0 && energy === 0 && palette.background?.main
      ? palette.background.main
      : `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const secondaryHue = (hue + (palette.hueStep || 51) / 2 + energy) % 360;
    const secondary = energy === 0 && palette.background?.secondary
      ? palette.background.secondary
      : `hsl(${secondaryHue}, ${Math.min(100, saturation + 4)}%, ${Math.min(46, lightness + 3)}%)`;
    return `linear-gradient(145deg, ${main} 0%, ${secondary} 100%)`;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function fmtTime(ms) {
    if (ms === null || ms === undefined) return '--';
    const s = Math.floor(ms / 1000);
    const cents = Math.floor((ms % 1000) / 10);
    return `${s}.${String(cents).padStart(2, '0')}s`;
  }

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

  // Weekly bucket is keyed off the exact curriculum-week occurrence. A fifth
  // Sunday occurrence keeps Week 4's content, but gets a fresh bucket.
  function makeWeekId(monthSlug, weekNumber) {
    try {
      const cw = window.CALENDAR?.getCurrentCurriculumWeek?.();
      if (cw && cw.monthSlug === monthSlug && cw.weekNumber === weekNumber) {
        const key = window.CALENDAR.getCurriculumWeekOccurrenceKey?.(cw) || cw.occurrenceKey;
        if (key) return key;
      }
    } catch (_) {}
    return `${monthSlug}:w${weekNumber}`;
  }

  function normalizeScore(score) {
    if (score === null || score === undefined) return null;
    if (typeof score === 'number') return { ms: score, name: 'UNKNOWN', date: null };
    if (typeof score === 'object' && typeof score.ms === 'number') return score;
    return null;
  }

  function readSave() {
    try {
      if (window.BoohaAdventure && window.BoohaAdventure.save) {
        return window.BoohaAdventure.save.load();
      }
      console.error('[Blitz] Save system unavailable — reading empty.');
      return {};
    } catch (e) {
      console.error('[Blitz] Save read failed:', e);
      return {};
    }
  }

  function writeSave(data) {
    try {
      if (window.BoohaAdventure && window.BoohaAdventure.save) {
        return window.BoohaAdventure.save.save(data);
      }
      console.error('[Blitz] Save system unavailable — record NOT written.');
      return false;
    } catch (e) {
      console.error('[Blitz] Save write failed:', e);
      return false;
    }
  }

  function ensureBlitzStore(data, gameType, weekId) {
    if (!data.meta) data.meta = {};
    if (!data.meta.blitz) data.meta.blitz = {};
    const blitz = data.meta.blitz;
    if (!blitz.weekly) blitz.weekly = {};
    if (!blitz.records) blitz.records = {};

    if (weekId && blitz.weeklyKey !== weekId) {
      blitz.weeklyKey = weekId;
      blitz.weekly = {};
    }

    if (!blitz.weekly[gameType]) blitz.weekly[gameType] = {};
    if (!blitz.records[gameType]) blitz.records[gameType] = {};
    return blitz;
  }

  function legacyScore(data, legacyKey, curr) {
    return data?.meta?.[legacyKey]?.[curr] ?? null;
  }

  function getBestScore(gameType, legacyKey, curr) {
    try {
      const data = readSave();
      const blitz = ensureBlitzStore(data, gameType);
      const modern = normalizeScore(blitz.records?.[gameType]?.[curr]);
      return modern || normalizeScore(legacyScore(data, legacyKey, curr));
    } catch {
      return null;
    }
  }

  function getWeeklyScore(gameType, curr, weekId) {
    try {
      const data = readSave();
      const blitz = ensureBlitzStore(data, gameType, weekId);
      return normalizeScore(blitz.weekly?.[gameType]?.[curr]);
    } catch {
      return null;
    }
  }

  function saveBestTime(gameType, legacyKey, curr, ms, weekId) {
    try {
      const data = readSave();
      const blitz = ensureBlitzStore(data, gameType, weekId);
      const playerName = getPlayerName();
      const oldWeekly = normalizeScore(blitz.weekly[gameType][curr]);
      const oldRecord = normalizeScore(blitz.records[gameType][curr]);
      const legacy = normalizeScore(legacyScore(data, legacyKey, curr));
      const bestBefore = [oldRecord, legacy].filter(Boolean).sort((a, b) => a.ms - b.ms)[0] || null;
      const newScore = { ms, name: playerName, date: new Date().toISOString() };
      const isWeeklyRecord = !oldWeekly || ms < oldWeekly.ms;
      const isAllTimeRecord = !bestBefore || ms < bestBefore.ms;

      if (isWeeklyRecord) blitz.weekly[gameType][curr] = newScore;
      if (isAllTimeRecord) {
        blitz.records[gameType][curr] = newScore;
        if (!data.meta[legacyKey]) data.meta[legacyKey] = {};
        data.meta[legacyKey][curr] = ms;
      }

      if (!writeSave(data)) {
        return {
          isWeeklyRecord: false,
          isAllTimeRecord: false,
          oldRecord: bestBefore,
          newScore,
          saveFailed: true,
        };
      }
      return { isWeeklyRecord, isAllTimeRecord, oldRecord: bestBefore, newScore };
    } catch {
      return {
        isWeeklyRecord: false,
        isAllTimeRecord: false,
        oldRecord: null,
        newScore: { ms, name: getPlayerName(), date: new Date().toISOString() },
      };
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function scoreName(name) {
    return !name || name === 'UNKNOWN' ? '' : escapeHtml(name);
  }

  function getRecordScoreFor(gameType, legacyKey, curr) {
    return getBestScore(gameType, legacyKey, curr);
  }

  function getWeeklyScoreFor(gameType, curr, currentWeekId) {
    return getWeeklyScore(gameType, curr, currentWeekId);
  }

  const FINAL_CARD_HOLD_MS = 4000;
  let sharedStylesInjected = false;

  function injectSharedStyles() {
    if (sharedStylesInjected) return;
    sharedStylesInjected = true;
    const style = document.createElement('style');
    style.id = 'booha-blitz-shared-styles';
    style.textContent = `
      .booha-blitz-feedback {
        position: relative;
        z-index: 4;
        flex: 0 0 clamp(58px, 8vh, 86px);
        width: min(100%, 680px);
        min-height: 58px;
        pointer-events: none;
        display: grid;
        place-items: center;
        isolation: isolate;
        contain: layout style;
      }
      #vb-overlay, #sb-overlay, #qb-overlay {
        height: 100vh;
        height: var(--blitz-viewport-height, 100dvh);
        max-height: var(--blitz-viewport-height, 100dvh);
      }
      #vb-overlay #vb-quit, #sb-overlay #sb-quit, #qb-overlay #qb-quit {
        right: max(env(safe-area-inset-right, 0px) + 16px, 16px);
      }
      #vb-overlay.low-power, #sb-overlay.low-power, #qb-overlay.low-power {
        transition: none !important;
        background: var(--blitz-bg-main) !important;
      }
      #vb-overlay.reduced-power, #sb-overlay.reduced-power, #qb-overlay.reduced-power {
        transition-duration: 320ms;
      }
      #vb-overlay.reduced-power .booha-blitz-fire-wallpaper,
      #sb-overlay.reduced-power .booha-blitz-fire-wallpaper,
      #qb-overlay.reduced-power .booha-blitz-fire-wallpaper {
        opacity: .26;
        animation: none !important;
      }
      #vb-overlay.reduced-power .booha-blitz-fire-wallpaper::before,
      #sb-overlay.reduced-power .booha-blitz-fire-wallpaper::before,
      #qb-overlay.reduced-power .booha-blitz-fire-wallpaper::before,
      #vb-overlay.reduced-power .booha-blitz-fire-name,
      #sb-overlay.reduced-power .booha-blitz-fire-name,
      #qb-overlay.reduced-power .booha-blitz-fire-name {
        animation: none !important;
      }
      #vb-overlay.reduced-power #vb-win,
      #sb-overlay.reduced-power #sb-win,
      #qb-overlay.reduced-power #qb-win {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      #vb-overlay.reduced-power .booha-blitz-final-card,
      #sb-overlay.reduced-power .booha-blitz-final-card,
      #qb-overlay.reduced-power .booha-blitz-final-card {
        box-shadow: 0 12px 32px rgba(0,0,0,.46), 0 0 24px var(--blitz-finish-glow, var(--blitz-glow));
      }
      #vb-overlay.low-power .booha-blitz-fire-wallpaper,
      #sb-overlay.low-power .booha-blitz-fire-wallpaper,
      #qb-overlay.low-power .booha-blitz-fire-wallpaper,
      #vb-overlay.low-power .booha-blitz-streak-spark,
      #sb-overlay.low-power .booha-blitz-streak-spark,
      #qb-overlay.low-power .booha-blitz-streak-spark,
      #vb-overlay.low-power .booha-blitz-correct-spark,
      #sb-overlay.low-power .booha-blitz-correct-spark,
      #qb-overlay.low-power .booha-blitz-correct-spark,
      #vb-overlay.low-power .booha-blitz-wrong-spark,
      #sb-overlay.low-power .booha-blitz-wrong-spark,
      #qb-overlay.low-power .booha-blitz-wrong-spark { display: none !important; }
      #vb-overlay.low-power .booha-blitz-wrong-feedback,
      #sb-overlay.low-power .booha-blitz-wrong-feedback,
      #qb-overlay.low-power .booha-blitz-wrong-feedback,
      #vb-overlay.low-power #vb-win,
      #sb-overlay.low-power #sb-win,
      #qb-overlay.low-power #qb-win {
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
      }
      #vb-overlay.low-power .booha-blitz-final-card,
      #sb-overlay.low-power .booha-blitz-final-card {
        box-shadow: 0 12px 32px rgba(0,0,0,.46), 0 0 20px var(--blitz-finish-glow, var(--blitz-glow));
      }
      #qb-overlay.low-power .booha-blitz-final-card {
        box-shadow: 0 12px 32px rgba(0,0,0,.46), 0 0 20px var(--blitz-finish-glow, var(--blitz-glow));
      }
      #vb-overlay.low-power .vb-opt,
      #sb-overlay.low-power .sb-opt,
      #qb-overlay.low-power .qb-opt {
        transition: none !important;
      }
      #vb-win, #sb-win, #qb-win {
        padding-top: max(env(safe-area-inset-top, 0px) + 16px, 16px);
        padding-right: max(env(safe-area-inset-right, 0px) + 16px, 16px);
        padding-bottom: max(env(safe-area-inset-bottom, 0px) + 16px, 16px);
        padding-left: max(env(safe-area-inset-left, 0px) + 16px, 16px);
      }
      .booha-blitz-final-card {
        max-height: min(92vh, 860px);
        max-height: min(92dvh, 860px);
      }
      #vb-wrong-popup.blitz-wrong-feedback,
      #sb-wrong-popup.blitz-wrong-feedback,
      #qb-wrong-popup.blitz-wrong-feedback {
        position: absolute;
        top: auto;
        right: auto;
        bottom: max(env(safe-area-inset-bottom, 0px) + 16px, 16px);
        left: 50%;
        width: min(680px, calc(100% - 32px));
        max-height: min(76vh, 560px);
        max-height: min(76dvh, 560px);
        box-sizing: border-box;
        display: none;
        padding: clamp(18px, 3vw, 28px) clamp(16px, 4vw, 34px) clamp(16px, 3vw, 24px);
        gap: 8px;
        overflow-y: auto;
        overscroll-behavior: contain;
        border: 1px solid var(--blitz-accent);
        border-top-width: 3px;
        border-radius: 28px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.08), transparent 24%),
          var(--blitz-popup-bg, rgba(0,0,0,.92));
        box-shadow: 0 18px 48px rgba(0,0,0,.38), 0 0 28px var(--blitz-glow);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transform: translateX(-50%);
      }
      #vb-wrong-popup.blitz-wrong-feedback.show,
      #sb-wrong-popup.blitz-wrong-feedback.show,
      #qb-wrong-popup.blitz-wrong-feedback.show {
        display: flex;
        animation: boohaBlitzWrongCard 240ms cubic-bezier(.2, .9, .25, 1) both;
      }
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-kanji,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-jp,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-jp,
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-scold-jp,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-scold-jp,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-scold-jp {
        color: var(--blitz-wrong, #ff536d);
        text-shadow: 0 0 24px var(--blitz-wrong, #ff536d);
      }
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-kanji,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-jp,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-jp,
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-scold-jp,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-scold-jp,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-scold-jp {
        box-sizing: border-box;
        max-width: 100%;
        padding-inline: 8px;
        padding-top: .45em;
        font-size: clamp(28px, 8vw, 72px);
        line-height: 1.55;
        overflow-wrap: anywhere;
        text-wrap: balance;
        overflow: visible;
      }
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-kanji ruby,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-jp ruby,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-jp ruby,
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-scold-jp ruby,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-scold-jp ruby,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-scold-jp ruby {
        display: inline;
        max-width: 100%;
        white-space: normal;
        overflow-wrap: anywhere;
        ruby-position: over;
        overflow: visible;
      }
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-kanji rt,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-jp rt,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-jp rt,
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-scold-jp rt,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-scold-jp rt,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-scold-jp rt {
        max-width: 100%;
        white-space: normal;
        overflow-wrap: anywhere;
        line-height: 1;
        overflow: visible;
      }
      #vb-wrong-popup.blitz-wrong-feedback > *,
      #sb-wrong-popup.blitz-wrong-feedback > *,
      #qb-wrong-popup.blitz-wrong-feedback > * { flex: 0 0 auto; }
      #vb-wrong-popup.blitz-wrong-feedback #vb-wrong-close,
      #sb-wrong-popup.blitz-wrong-feedback #sb-wrong-close,
      #qb-wrong-popup.blitz-wrong-feedback #qb-wrong-close {
        margin-bottom: max(env(safe-area-inset-bottom, 0px), 4px);
        flex: 0 0 auto;
      }
      #vb-wrong-popup.blitz-wrong-feedback #vb-wrong-status,
      #sb-wrong-popup.blitz-wrong-feedback #sb-wrong-status,
      #qb-wrong-popup.blitz-wrong-feedback #qb-wrong-status {
        color: var(--blitz-accent);
        font-size: clamp(11px, 2vw, 14px);
        letter-spacing: 1.6px;
      }
      #vb-wrong-popup.blitz-wrong-feedback #vb-wrong-close,
      #sb-wrong-popup.blitz-wrong-feedback #sb-wrong-close,
      #qb-wrong-popup.blitz-wrong-feedback #qb-wrong-close {
        margin-top: 12px;
        color: #101018;
        background: var(--blitz-accent);
        border-color: var(--blitz-accent);
        box-shadow: 0 8px 22px var(--blitz-glow);
      }
      #vb-wrong-popup.blitz-wrong-feedback.wrong-feel-playful,
      #sb-wrong-popup.blitz-wrong-feedback.wrong-feel-playful,
      #qb-wrong-popup.blitz-wrong-feedback.wrong-feel-playful {
        border-top-color: var(--blitz-wrong);
      }
      #vb-wrong-popup.blitz-wrong-feedback.wrong-feel-arcade,
      #sb-wrong-popup.blitz-wrong-feedback.wrong-feel-arcade,
      #qb-wrong-popup.blitz-wrong-feedback.wrong-feel-arcade {
        border-radius: 18px;
        box-shadow: 0 18px 48px rgba(0,0,0,.42), 0 0 34px var(--blitz-wrong);
      }
      #vb-wrong-popup.blitz-wrong-feedback.wrong-feel-sleek,
      #sb-wrong-popup.blitz-wrong-feedback.wrong-feel-sleek,
      #qb-wrong-popup.blitz-wrong-feedback.wrong-feel-sleek {
        border-radius: 14px;
        border-top-width: 2px;
      }
      .booha-blitz-wrong-spark {
        position: absolute;
        width: clamp(5px, 1vw, 8px);
        height: clamp(5px, 1vw, 8px);
        background: var(--blitz-wrong, #ff536d);
        box-shadow: 0 0 10px var(--blitz-wrong, #ff536d);
        pointer-events: none;
        z-index: 12;
        animation: boohaBlitzWrongSpark 400ms ease-out var(--spark-delay, 0ms) both;
      }
      .blitz-feel-playful .booha-blitz-wrong-spark { border-radius: 50%; }
      .blitz-feel-arcade .booha-blitz-wrong-spark { border-radius: 2px; }
      .blitz-feel-sleek .booha-blitz-wrong-spark {
        clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
      }
      @keyframes boohaBlitzWrongCard {
        from { opacity: 0; transform: translate(-50%, 22px) scale(.97); }
        to { opacity: 1; transform: translate(-50%, 0) scale(1); }
      }
      @keyframes boohaBlitzWrongSpark {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.5); }
        18% { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
      }
      @keyframes boohaBlitzRecoveryCard {
        0% { opacity: 0; transform: translateY(10px) scale(.96); }
        65% { opacity: 1; transform: translateY(-2px) scale(1.02); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      #vb-overlay.blitz-awaiting-start > *:not(.booha-blitz-start-card),
      #sb-overlay.blitz-awaiting-start > *:not(.booha-blitz-start-card),
      #qb-overlay.blitz-awaiting-start > *:not(.booha-blitz-start-card) {
        visibility: hidden;
      }
      .booha-blitz-start-card {
        position: absolute;
        inset: 0;
        z-index: 40;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 10px;
        padding: 24px;
        background:
          radial-gradient(circle at 50% 46%, var(--blitz-start-glow, var(--blitz-glow)), transparent 28%),
          radial-gradient(circle at 50% 50%, rgba(255,255,255,.07), transparent 58%);
        text-align: center;
        transition: opacity 160ms ease, transform 160ms ease;
      }
      .booha-blitz-start-card::before,
      .booha-blitz-start-card::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(72vw, 420px);
        height: min(72vw, 420px);
        border: 1px solid var(--blitz-start-accent, var(--blitz-accent));
        border-radius: 50%;
        opacity: .2;
        pointer-events: none;
        transform: translate(-50%, -50%) scale(.72);
        animation: boohaBlitzStartPulse 2200ms ease-out infinite;
      }
      .booha-blitz-start-card::after { animation-delay: 820ms; }
      .booha-blitz-start-card.launching {
        opacity: 0;
        transform: scale(1.04);
        pointer-events: none;
      }
      .booha-blitz-start-kicker,
      .booha-blitz-start-title,
      .booha-blitz-start-copy,
      .booha-blitz-start-button { position: relative; z-index: 1; }
      .booha-blitz-start-kicker {
        color: var(--blitz-start-accent, var(--blitz-accent));
        font-size: clamp(10px, 2vw, 14px);
        font-weight: 950;
        letter-spacing: 2.6px;
        text-transform: uppercase;
        text-shadow: 0 0 16px var(--blitz-start-accent, var(--blitz-accent));
      }
      .booha-blitz-start-title {
        max-width: min(90vw, 620px);
        color: #fff;
        font-size: clamp(30px, 8vw, 72px);
        font-weight: 1000;
        letter-spacing: clamp(.5px, .35vw, 3px);
        line-height: .98;
        text-shadow: 0 0 18px #fff, 0 0 42px var(--blitz-start-glow, var(--blitz-glow));
      }
      .booha-blitz-start-copy {
        color: rgba(255,255,255,.76);
        font-size: clamp(12px, 2.6vw, 18px);
        letter-spacing: 1.2px;
      }
      .booha-blitz-start-button {
        appearance: none;
        margin-top: 12px;
        min-width: min(78vw, 300px);
        padding: 14px 24px;
        border: 2px solid var(--blitz-start-accent, var(--blitz-accent));
        border-radius: 999px;
        color: #101018;
        background: var(--blitz-start-accent, var(--blitz-accent));
        box-shadow: 0 10px 30px var(--blitz-start-glow, var(--blitz-glow)), 0 0 22px var(--blitz-start-accent, var(--blitz-accent));
        font-size: clamp(15px, 3.6vw, 22px);
        font-weight: 1000;
        letter-spacing: 1.3px;
        cursor: pointer;
        transition: transform 100ms ease, box-shadow 100ms ease;
      }
      .booha-blitz-start-button:hover { transform: translateY(-2px); }
      .booha-blitz-start-button:active {
        transform: translateY(1px) scale(.96);
        box-shadow: 0 5px 14px var(--blitz-start-glow, var(--blitz-glow));
      }
      .blitz-feel-playful .booha-blitz-start-card { border-radius: 32px; }
      .blitz-feel-arcade .booha-blitz-start-button { border-radius: 12px; text-transform: uppercase; }
      .blitz-feel-sleek .booha-blitz-start-button { border-radius: 14px; letter-spacing: 2px; }
      @keyframes boohaBlitzStartPulse {
        0% { opacity: .24; transform: translate(-50%, -50%) scale(.72); }
        70%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.08); }
      }
      .booha-blitz-nameplate {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 18;
        width: min(520px, calc(100vw - 24px));
        min-height: clamp(42px, 6vw, 56px);
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 9px 18px 10px;
        border: 2px solid var(--streak-color, var(--blitz-accent));
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(0, 0, 0, .76), rgba(0, 0, 0, .64));
        color: #fff;
        text-align: center;
        font-size: clamp(11px, 3vw, 18px);
        font-weight: 950;
        letter-spacing: clamp(.6px, .25vw, 1.8px);
        text-shadow: 0 0 14px var(--streak-color, var(--blitz-accent));
        opacity: 0;
        box-shadow: 0 0 20px var(--streak-color, var(--blitz-accent)), 0 0 34px var(--blitz-streak-glow);
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms ease, border-color 180ms ease,
          background 180ms ease, box-shadow 180ms ease;
        will-change: transform, opacity;
      }
      .booha-blitz-nameplate.streak-active {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        animation: boohaBlitzStreakIn 260ms cubic-bezier(.2, 1.4, .3, 1) both;
      }
      .booha-blitz-nameplate-name { color: var(--streak-color, var(--blitz-accent)); }
      .booha-blitz-nameplate-streak {
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        color: #fff;
      }
      .booha-blitz-streak-marker {
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        color: var(--streak-color, var(--blitz-accent));
        font-size: 1.05em;
        text-shadow: 0 0 10px currentColor;
      }
      .booha-blitz-streak-meter {
        display: inline-block;
        width: clamp(38px, 8vw, 64px);
        height: 4px;
        margin-left: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255,255,255,.2);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.12);
        transition: height 180ms ease, box-shadow 180ms ease, background 180ms ease;
      }
      .booha-blitz-streak-meter-fill {
        display: block;
        width: var(--streak-progress, 0%);
        height: 100%;
        border-radius: inherit;
        background: var(--streak-color, var(--blitz-accent));
        box-shadow: 0 0 10px var(--streak-color, var(--blitz-accent));
        transition: width 220ms cubic-bezier(.2,1.2,.3,1), background 180ms ease, box-shadow 180ms ease;
      }
      .booha-blitz-nameplate.streak-tier-1 .booha-blitz-streak-meter { height: 4px; }
      .booha-blitz-nameplate.streak-tier-2 .booha-blitz-streak-meter { height: 4px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.16), 0 0 7px rgba(255,230,107,.22); }
      .booha-blitz-nameplate.streak-tier-3 .booha-blitz-streak-meter { height: 5px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.2), 0 0 10px rgba(255,157,46,.3); }
      .booha-blitz-nameplate.streak-tier-4 .booha-blitz-streak-meter { height: 6px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.24), 0 0 14px rgba(255,75,62,.38); }
      .booha-blitz-nameplate.streak-tier-5 .booha-blitz-streak-meter { height: 7px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.3), 0 0 18px rgba(255,59,189,.5); }
      .booha-blitz-nameplate.streak-tier-2 .booha-blitz-streak-meter-fill { box-shadow: 0 0 12px var(--streak-color), 0 0 18px rgba(255,230,107,.35); }
      .booha-blitz-nameplate.streak-tier-3 .booha-blitz-streak-meter-fill { box-shadow: 0 0 14px var(--streak-color), 0 0 22px rgba(255,157,46,.42); }
      .booha-blitz-nameplate.streak-tier-4 .booha-blitz-streak-meter-fill { box-shadow: 0 0 16px var(--streak-color), 0 0 26px rgba(255,75,62,.48); }
      .booha-blitz-nameplate.streak-tier-5 .booha-blitz-streak-meter-fill { box-shadow: 0 0 18px var(--streak-color), 0 0 32px rgba(255,59,189,.58); }
      .booha-blitz-nameplate.streak-tier-2 { padding-inline: 20px; }
      .booha-blitz-nameplate.streak-tier-3 { padding-inline: 22px; }
      .booha-blitz-nameplate.streak-tier-4,
      .booha-blitz-nameplate.streak-tier-5 { padding-inline: 24px; }
      .booha-blitz-nameplate.streak-pop {
        animation: boohaBlitzStreakPop 320ms cubic-bezier(.2, 1.35, .3, 1) both;
      }
      .booha-blitz-nameplate.streak-hold {
        animation: boohaBlitzStreakHold 1250ms ease-out both;
      }
      .booha-blitz-nameplate.streak-event-live {
        --streak-event-color: var(--streak-color, var(--blitz-accent));
      }
      .booha-blitz-nameplate.streak-event-live .booha-blitz-streak-marker {
        animation: boohaBlitzMarkerEvent 620ms cubic-bezier(.16,1.5,.3,1) both;
      }
      .booha-blitz-nameplate.streak-event-live .booha-blitz-streak-meter-fill {
        animation: boohaBlitzMeterEvent 700ms ease-out both;
      }
      .booha-blitz-nameplate.streak-event-3 {
        box-shadow: 0 0 28px var(--streak-event-color), 0 0 52px var(--blitz-streak-glow);
      }
      .booha-blitz-nameplate.streak-event-5 {
        border-width: 3px;
        box-shadow: 0 0 34px var(--streak-event-color), 0 0 64px var(--blitz-streak-glow);
      }
      .booha-blitz-nameplate.streak-event-7 {
        border-width: 3px;
        box-shadow: 0 0 38px var(--streak-event-color), 0 0 76px var(--blitz-streak-glow);
      }
      .booha-blitz-nameplate.streak-event-10 {
        border-width: 3px;
        box-shadow: 0 0 44px var(--streak-event-color), 0 0 88px var(--blitz-streak-glow);
      }
      .booha-blitz-nameplate.streak-event-15 {
        border-width: 4px;
        box-shadow: 0 0 52px var(--streak-event-color), 0 0 108px var(--blitz-streak-glow);
      }
      .booha-blitz-streak-spark {
        position: absolute;
        left: 50%;
        top: 50%;
        width: clamp(5px, 1.1vw, 9px);
        height: clamp(5px, 1.1vw, 9px);
        background: var(--streak-event-color, var(--streak-color, var(--blitz-accent)));
        box-shadow: 0 0 10px var(--streak-event-color, var(--streak-color, var(--blitz-accent)));
        pointer-events: none;
        animation: boohaBlitzStreakSpark 680ms ease-out var(--spark-delay, 0ms) both;
      }
      .booha-blitz-streak-spark-large {
        width: clamp(11px, 1.8vw, 16px);
        height: clamp(11px, 1.8vw, 16px);
        box-shadow: 0 0 14px currentColor, 0 0 28px var(--streak-event-color, var(--blitz-accent));
      }
      .blitz-feel-playful .booha-blitz-streak-spark { border-radius: 50%; }
      .blitz-feel-arcade .booha-blitz-streak-spark {
        border-radius: 2px;
        box-shadow: 0 0 8px #00ffee, 0 0 15px #39ff14;
      }
      .blitz-feel-sleek .booha-blitz-streak-spark {
        border-radius: 0;
        clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
        box-shadow: 0 0 8px #f0c96a, 0 0 14px #dfeaff;
      }
      .booha-blitz-correct-spark {
        position: absolute;
        width: clamp(5px, 1vw, 8px);
        height: clamp(5px, 1vw, 8px);
        background: var(--blitz-correct, #00ff64);
        box-shadow: 0 0 9px var(--blitz-correct, #00ff64);
        pointer-events: none;
        z-index: 12;
        animation: boohaBlitzCorrectSpark 360ms ease-out var(--spark-delay, 0ms) both;
      }
      .blitz-feel-playful .booha-blitz-correct-spark { border-radius: 50%; }
      .blitz-feel-arcade .booha-blitz-correct-spark {
        border-radius: 2px;
        box-shadow: 0 0 8px #00ffee, 0 0 14px #39ff14;
      }
      .blitz-feel-sleek .booha-blitz-correct-spark {
        clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
        box-shadow: 0 0 8px #f0c96a, 0 0 14px #dfeaff;
      }
      .blitz-feel-arcade.streak-event-live {
        box-shadow: inset 0 0 48px rgba(0,255,238,.24);
      }
      .blitz-feel-sleek.streak-event-live { transform: scale(1.002); }
      .booha-blitz-nameplate.streak-milestone-3 { box-shadow: 0 0 24px var(--streak-color), 0 0 42px var(--blitz-streak-glow); }
      .booha-blitz-nameplate.streak-milestone-5 { box-shadow: 0 0 30px var(--streak-color), 0 0 54px var(--blitz-streak-glow); }
      .booha-blitz-nameplate.streak-milestone-8 { border-width: 3px; box-shadow: 0 0 34px var(--streak-color), 0 0 68px var(--blitz-streak-glow); }
      .blitz-feel-playful .booha-blitz-nameplate.streak-milestone-5::before,
      .blitz-feel-playful .booha-blitz-nameplate.streak-milestone-8::before {
        content: '✦';
        position: absolute;
        left: -18px;
        color: var(--streak-color);
        font-size: 18px;
        text-shadow: 0 0 12px var(--streak-color);
      }
      .blitz-feel-playful .booha-blitz-nameplate.streak-milestone-8::after {
        content: '✧';
        position: absolute;
        right: -18px;
        color: var(--streak-color);
        font-size: 18px;
        text-shadow: 0 0 12px var(--streak-color);
      }
      .blitz-feel-arcade .booha-blitz-streak-meter-fill {
        background: repeating-linear-gradient(90deg, #39ff14 0 8px, #00ffee 8px 14px);
      }
      .blitz-feel-arcade .booha-blitz-nameplate.streak-milestone-5::before {
        content: 'COMBO';
        position: absolute;
        top: -10px;
        right: 12px;
        color: #39ff14;
        font-size: 8px;
        letter-spacing: 1.5px;
        text-shadow: 0 0 10px #00ffee;
      }
      .blitz-feel-arcade .booha-blitz-nameplate.streak-milestone-8::before {
        content: 'CHAIN MAX';
        position: absolute;
        top: -10px;
        right: 12px;
        color: #f5ffcf;
        font-size: 8px;
        letter-spacing: 1.5px;
        text-shadow: 0 0 10px #39ff14;
      }
      .blitz-feel-sleek .booha-blitz-streak-meter-fill {
        background: linear-gradient(90deg, #f0c96a, #dfeaff);
      }
      .blitz-feel-sleek .booha-blitz-nameplate.streak-milestone-8 {
        letter-spacing: 2.4px;
      }
      @keyframes boohaBlitzStreakPop {
        0% { transform: translate(-50%, -50%) scale(.92); }
        58% { transform: translate(-50%, -50%) scale(1.08); }
        100% { transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes boohaBlitzStreakHold {
        0% { filter: brightness(1.18); }
        68% { filter: brightness(1.08); }
        100% { filter: brightness(1); }
      }
      @keyframes boohaBlitzMarkerEvent {
        0% { transform: scale(.65) rotate(-12deg); opacity: .5; }
        55% { transform: scale(1.25) rotate(5deg); opacity: 1; }
        100% { transform: scale(1) rotate(0); opacity: 1; }
      }
      @keyframes boohaBlitzMeterEvent {
        0% { transform: scaleX(.75); transform-origin: left center; }
        55% { transform: scaleX(1.08); transform-origin: left center; }
        100% { transform: scaleX(1); transform-origin: left center; }
      }
      @keyframes boohaBlitzStreakSpark {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.4); }
        20% { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
      }
      @keyframes boohaBlitzCorrectPop {
        0% { transform: scale(1); }
        45% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
      @keyframes boohaBlitzCorrectSpark {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.6); }
        18% { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
      }
      .booha-blitz-nameplate.streak-tier-1 { --streak-color: #ffffff; }
      .booha-blitz-nameplate.streak-tier-2 { --streak-color: #ffe66b; }
      .booha-blitz-nameplate.streak-tier-3 { --streak-color: #ff9d2e; }
      .booha-blitz-nameplate.streak-tier-4 { --streak-color: #ff4b3e; }
      .booha-blitz-nameplate.streak-tier-5 { --streak-color: #ff3bbd; }
      .booha-blitz-nameplate.complete {
        opacity: 0;
        transform: translate(-50%, calc(-50% - 8px)) scale(.96);
      }
      @keyframes boohaBlitzStreakIn {
        0% { transform: translate(-50%, calc(-50% + 6px)) scale(.82); }
        65% { transform: translate(-50%, calc(-50% - 1px)) scale(1.04); }
        100% { transform: translate(-50%, -50%) scale(1); }
      }
      .booha-blitz-callout {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 19;
        max-width: min(92vw, 620px);
        transform: translate(-50%, 8px) scale(.94);
        color: #fff;
        font-size: clamp(20px, 6vw, 46px);
        font-weight: 1000;
        letter-spacing: .8px;
        line-height: 1.05;
        text-align: center;
        text-shadow: 0 0 12px var(--blitz-accent), 0 0 34px var(--blitz-accent);
        opacity: 0;
        pointer-events: none;
      }
      .booha-blitz-callout.show { animation: boohaBlitzCallout 1050ms cubic-bezier(.2,.8,.2,1) both; }
      .booha-blitz-fire-wallpaper {
        position: absolute;
        inset: 0;
        z-index: 1;
        overflow: hidden;
        isolation: isolate;
        background:
          radial-gradient(circle at 50% 50%, rgba(255, 213, 72, .24), transparent 34%),
          radial-gradient(circle at 12% 88%, rgba(255, 46, 0, .52), transparent 42%),
          radial-gradient(circle at 88% 12%, rgba(255, 116, 0, .46), transparent 42%),
          linear-gradient(135deg, rgba(255, 55, 0, .42), rgba(90, 6, 0, .72));
        opacity: 0;
        pointer-events: none;
        animation: boohaBlitzFireWallpaper 1350ms ease-out both;
      }
      .booha-blitz-fire-wallpaper::before {
        content: '';
        position: absolute;
        inset: -20%;
        z-index: -1;
        background: repeating-linear-gradient(125deg, transparent 0 42px, rgba(255, 205, 61, .12) 44px 48px, transparent 50px 92px);
        transform: rotate(-8deg);
        animation: boohaBlitzFireSweep 1350ms ease-out both;
      }
      .booha-blitz-fire-name {
        position: absolute;
        color: rgba(255, 236, 142, .34);
        font-family: Impact, Haettenschweiler, "Arial Black", system-ui, sans-serif;
        font-size: clamp(28px, 6vw, 86px);
        font-weight: 1000;
        letter-spacing: clamp(1px, .5vw, 5px);
        line-height: 1;
        text-shadow: 0 0 18px rgba(255, 112, 0, .9), 0 0 42px rgba(255, 45, 0, .72);
        transform: rotate(-12deg) scale(.92);
        white-space: nowrap;
        animation: boohaBlitzFireName 1350ms ease-out var(--fire-delay, 0ms) both;
      }
      @keyframes boohaBlitzFireWallpaper {
        0% { opacity: 0; filter: saturate(.8) brightness(.9); }
        14% { opacity: .9; filter: saturate(1.45) brightness(1.18); }
        46% { opacity: .58; filter: saturate(1.2) brightness(1.06); }
        100% { opacity: 0; filter: saturate(1) brightness(1); }
      }
      @keyframes boohaBlitzFireSweep {
        0% { opacity: 0; transform: rotate(-8deg) translateX(-8%); }
        24% { opacity: 1; }
        100% { opacity: 0; transform: rotate(-8deg) translateX(8%); }
      }
      @keyframes boohaBlitzFireName {
        0% { opacity: 0; transform: rotate(-12deg) scale(.82) translateY(18px); }
        18% { opacity: 1; transform: rotate(-12deg) scale(1.02) translateY(0); }
        68% { opacity: .72; transform: rotate(-12deg) scale(1) translateY(-4px); }
        100% { opacity: 0; transform: rotate(-12deg) scale(1.08) translateY(-18px); }
      }
      .booha-blitz-callout.combo {
        font-family: Impact, Haettenschweiler, "Arial Black", system-ui, sans-serif;
        color: #f5ffcf;
        letter-spacing: clamp(1px, .4vw, 3px);
        text-shadow: 0 0 8px #39ff14, 0 0 24px #00ffee, 0 0 52px rgba(0,255,210,.8);
      }
      .booha-blitz-callout.combo.show {
        animation: boohaBlitzCombo 820ms cubic-bezier(.12, .95, .25, 1) both;
      }
      .booha-blitz-callout.chain {
        font-family: Georgia, "Times New Roman", serif;
        color: #fff6cf;
        letter-spacing: clamp(1px, .35vw, 3px);
        text-shadow: 0 0 10px #f0c96a, 0 0 28px rgba(223,234,255,.72);
      }
      .booha-blitz-callout.chain.show {
        animation: boohaBlitzChain 1050ms cubic-bezier(.22, .8, .24, 1) both;
      }
      .booha-blitz-perfect-flash {
        position: absolute;
        inset: 0;
        z-index: 60;
        display: grid;
        place-items: center;
        padding: 24px;
        box-sizing: border-box;
        color: #fffbe1;
        background: radial-gradient(circle at 50% 48%, rgba(255,255,255,.82), var(--blitz-glow) 18%, transparent 62%);
        text-align: center;
        pointer-events: none;
        animation: boohaBlitzPerfectFlash 900ms cubic-bezier(.16,.9,.2,1) both;
      }
      .booha-blitz-perfect-flash-label {
        max-width: 92vw;
        font-family: Impact, Haettenschweiler, "Arial Black", system-ui, sans-serif;
        font-size: clamp(30px, 10vw, 88px);
        font-weight: 1000;
        letter-spacing: clamp(1px, .6vw, 6px);
        line-height: .95;
        text-shadow: 0 0 12px #fff, 0 0 34px var(--blitz-accent), 0 0 72px var(--blitz-glow);
      }
      .booha-blitz-perfect-flash.record {
        background: radial-gradient(circle at 50% 48%, rgba(255,255,255,.9), rgba(255,196,36,.72) 16%, rgba(255,90,0,.22) 38%, transparent 68%);
      }
      .booha-blitz-perfect-flash.record .booha-blitz-perfect-flash-label {
        color: #fff7b0;
        text-shadow: 0 0 12px #fff, 0 0 34px #ffd700, 0 0 78px #ff5a00;
      }
      .booha-blitz-perfect-flash.record { animation-duration: 1050ms; }
      @keyframes boohaBlitzPerfectFlash {
        0% { opacity: 0; transform: scale(.74); }
        16% { opacity: 1; transform: scale(1.08); }
        42% { opacity: .92; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.12); }
      }
      @keyframes boohaBlitzCombo {
        0% { opacity: 0; transform: translate(-50%, calc(-50% + 18px)) scale(.65) skewX(-8deg); }
        22% { opacity: 1; transform: translate(-50%, calc(-50% - 3px)) scale(1.12) skewX(2deg); }
        70% { opacity: 1; transform: translate(-50%, -50%) scale(1) skewX(0); }
        100% { opacity: 0; transform: translate(-50%, calc(-50% - 16px)) scale(1.05); }
      }
      @keyframes boohaBlitzChain {
        0% { opacity: 0; transform: translate(-50%, calc(-50% + 12px)) scale(.82); filter: blur(4px); }
        24%, 72% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
        100% { opacity: 0; transform: translate(-50%, calc(-50% - 14px)) scale(1.04); }
      }
      .booha-blitz-callout.final {
        top: 50%;
        color: #ffe66b;
        text-shadow: 0 0 14px #ffb300, 0 0 42px #ff5a00;
      }
      @keyframes boohaBlitzCallout {
        0% { opacity: 0; transform: translate(-50%, 12px) scale(.88) rotate(-2deg); }
        18%, 72% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0); }
        100% { opacity: 0; transform: translate(-50%, calc(-50% - 18px)) scale(1.04) rotate(1deg); }
      }
      .booha-blitz-final-summary {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px 12px;
        width: min(100%, 360px);
        margin: 12px auto 2px;
        padding: 8px 12px;
        border: 1px solid var(--blitz-finish-accent, #ffe66b);
        border-radius: 18px;
        background: rgba(0, 0, 0, .25);
      }
      .booha-blitz-final-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: min(100%, 560px);
        max-height: min(92vh, 860px);
        box-sizing: border-box;
        overflow-y: auto;
        padding: clamp(22px, 4vw, 38px) clamp(18px, 4vw, 42px) clamp(18px, 3vw, 28px);
        border: 1px solid var(--blitz-finish-accent, var(--blitz-accent));
        border-radius: clamp(24px, 4vw, 38px);
        background:
          linear-gradient(145deg, rgba(255,255,255,.12), transparent 30%),
          radial-gradient(circle at 50% 0%, var(--blitz-finish-glow, var(--blitz-glow)), transparent 58%),
          rgba(7, 3, 18, .82);
        box-shadow: 0 24px 80px rgba(0,0,0,.5), 0 0 42px var(--blitz-finish-glow, var(--blitz-glow));
        scrollbar-width: thin;
        scrollbar-color: var(--blitz-finish-accent, var(--blitz-accent)) transparent;
      }
      .booha-blitz-final-card::before {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: inherit;
        pointer-events: none;
      }
      .booha-blitz-final-curriculum {
        position: relative;
        z-index: 1;
        margin-bottom: 10px;
        color: var(--blitz-finish-accent, #ffe66b);
        font-size: clamp(10px, 2vw, 13px);
        font-weight: 950;
        letter-spacing: 2.2px;
        text-transform: uppercase;
        text-shadow: 0 0 16px var(--blitz-finish-accent, #ffe66b);
      }
      .booha-blitz-final-headline {
        position: relative;
        z-index: 1;
        max-width: 100%;
        margin: 0 0 4px;
        color: transparent;
        background: var(--blitz-finish-gradient, linear-gradient(90deg, #fff, #ffe66b, #ff6fb5));
        -webkit-background-clip: text;
        background-clip: text;
        font-size: clamp(16px, 4vw, 30px);
        font-weight: 1000;
        letter-spacing: clamp(.5px, .22vw, 2px);
        line-height: 1.05;
        text-align: center;
        text-wrap: balance;
        text-shadow: 0 0 18px var(--blitz-finish-glow, var(--blitz-glow));
        animation: boohaBlitzFinalHeadline 620ms cubic-bezier(.16,1.35,.3,1) both;
      }
      .booha-blitz-final-residual {
        position: relative;
        z-index: 1;
        margin: 2px 0 0;
        color: var(--blitz-finish-accent, #ffe66b);
        font-size: clamp(9px, 1.8vw, 12px);
        font-weight: 950;
        letter-spacing: 1.5px;
        line-height: 1.2;
        text-align: center;
        text-transform: uppercase;
        text-shadow: 0 0 12px var(--blitz-finish-glow, var(--blitz-glow));
        animation: boohaBlitzResidualPulse 1500ms ease-in-out infinite alternate;
      }
      .booha-blitz-final-residual::before,
      .booha-blitz-final-residual::after {
        content: '✦';
        display: inline-block;
        margin: 0 8px;
        color: var(--blitz-finish-accent, #ffe66b);
        animation: boohaBlitzResidualSpark 1100ms ease-in-out infinite alternate;
      }
      .booha-blitz-final-residual::after { animation-delay: 280ms; }
      @keyframes boohaBlitzFinalHeadline {
        0% { opacity: 0; transform: translateY(8px) scale(.92); }
        68% { opacity: 1; transform: translateY(-1px) scale(1.03); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes boohaBlitzResidualPulse {
        from { opacity: .68; letter-spacing: 1.3px; }
        to { opacity: 1; letter-spacing: 1.7px; }
      }
      @keyframes boohaBlitzResidualSpark {
        from { opacity: .45; transform: scale(.8) rotate(0); }
        to { opacity: 1; transform: scale(1.15) rotate(18deg); }
      }
      @keyframes boohaBlitzButtonsIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .booha-blitz-final-card .booha-blitz-final-summary,
      .booha-blitz-final-card .booha-blitz-final-hold,
      .booha-blitz-final-card .vb-win-buttons,
      .booha-blitz-final-card .sb-win-buttons,
      .booha-blitz-final-card .qb-win-buttons {
        position: relative;
        z-index: 1;
      }
      .booha-blitz-final-card .booha-blitz-final-summary {
        width: 100%;
        margin-top: 16px;
        background: rgba(0,0,0,.24);
      }
      .booha-blitz-final-perfect {
        flex: 1 1 100%;
        color: #fff7b0;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 1.5px;
        text-shadow: 0 0 14px #ffd43b;
      }
      .booha-blitz-final-card .booha-blitz-final-hold {
        width: 100%;
      }
      .booha-blitz-final-card .vb-win-buttons,
      .booha-blitz-final-card .sb-win-buttons,
      .booha-blitz-final-card .qb-win-buttons {
        opacity: 0;
        transform: translateY(8px);
        animation: boohaBlitzButtonsIn 520ms 900ms cubic-bezier(.2,.9,.25,1) both;
      }
      #vb-win.blitz-finish,
      #sb-win.blitz-finish,
      #qb-win.blitz-finish {
        padding: 16px;
      }
      #vb-win.blitz-finish.perfect-mode .booha-blitz-final-card,
      #sb-win.blitz-finish.perfect-mode .booha-blitz-final-card,
      #qb-win.blitz-finish.perfect-mode .booha-blitz-final-card {
        border-color: #fff0a8;
        background:
          linear-gradient(145deg, rgba(255,255,255,.16), transparent 30%),
          radial-gradient(circle at 50% 0%, rgba(255,214,73,.32), transparent 60%),
          rgba(22, 10, 18, .86);
        box-shadow: 0 24px 80px rgba(0,0,0,.5), 0 0 52px rgba(255,214,73,.62);
      }
      #vb-win.blitz-finish.perfect-mode .booha-blitz-final-curriculum::before,
      #sb-win.blitz-finish.perfect-mode .booha-blitz-final-curriculum::before,
      #qb-win.blitz-finish.perfect-mode .booha-blitz-final-curriculum::before {
        content: '✦  PERFECT RUN  ✦';
        display: block;
        margin-bottom: 8px;
        color: #fff7b0;
        font-size: 10px;
        letter-spacing: 2px;
      }
      .booha-blitz-final-flourish {
        flex: 1 1 100%;
        color: var(--blitz-finish-accent, #ffe66b);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        opacity: .78;
      }
      .booha-blitz-final-badge,
      .booha-blitz-final-streak {
        border: 1px solid rgba(255, 255, 255, .28);
        border-radius: 999px;
        padding: 6px 11px;
        color: #fff;
        background: rgba(255, 255, 255, .1);
        font-size: 10px;
        font-weight: 950;
        letter-spacing: .8px;
        text-transform: uppercase;
      }
      .booha-blitz-final-badge {
        color: #ffe66b;
        border-color: rgba(255, 230, 107, .6);
        box-shadow: 0 0 16px rgba(255, 175, 0, .25);
      }
      .booha-blitz-final-hold {
        min-height: 18px;
        margin: 7px auto 2px;
        color: rgba(255, 255, 255, .7);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: 1px;
        text-align: center;
      }
      .booha-blitz-final-hold.ready { color: #ffe66b; }
      #vb-win.blitz-finish.residual-run .booha-blitz-final-card,
      #sb-win.blitz-finish.residual-run .booha-blitz-final-card,
      #qb-win.blitz-finish.residual-run .booha-blitz-final-card {
        box-shadow: 0 24px 80px rgba(0,0,0,.5), 0 0 42px var(--blitz-finish-glow, var(--blitz-glow)), 0 0 90px var(--blitz-finish-glow, var(--blitz-glow));
      }
      #vb-win.blitz-finish,
      #sb-win.blitz-finish,
      #qb-win.blitz-finish {
        border: 1px solid var(--blitz-finish-accent, var(--blitz-accent));
        background:
          radial-gradient(circle at 50% 18%, var(--blitz-finish-glow, var(--blitz-glow)), transparent 38%),
          linear-gradient(180deg, rgba(16, 7, 30, .92), rgba(0, 0, 0, .97));
      }
      #vb-win.blitz-finish.record-mode,
      #sb-win.blitz-finish.record-mode,
      #qb-win.blitz-finish.record-mode {
        background:
          radial-gradient(circle at 50% 18%, rgba(255, 213, 72, .34), transparent 34%),
          radial-gradient(circle at 15% 35%, var(--blitz-glow), transparent 28%),
          linear-gradient(180deg, rgba(30, 10, 10, .92), rgba(0, 0, 0, .97));
      }
      #vb-win.blitz-finish.record-mode .booha-blitz-final-card,
      #sb-win.blitz-finish.record-mode .booha-blitz-final-card,
      #qb-win.blitz-finish.record-mode .booha-blitz-final-card {
        border-color: #ffd700;
        background:
          linear-gradient(145deg, rgba(255,255,255,.18), transparent 28%),
          radial-gradient(circle at 50% 0%, rgba(255,199,49,.38), transparent 62%),
          rgba(28, 8, 8, .86);
        box-shadow: 0 24px 80px rgba(0,0,0,.5), 0 0 64px rgba(255,188,35,.72), 0 0 110px rgba(255,90,0,.26);
      }
      #vb-win.blitz-finish .booha-blitz-final-badge,
      #sb-win.blitz-finish .booha-blitz-final-badge,
      #qb-win.blitz-finish .booha-blitz-final-badge {
        color: var(--blitz-finish-accent, #ffe66b);
        border-color: var(--blitz-finish-accent, #ffe66b);
      }
      .booha-blitz-ruby-text ruby { ruby-position: over; }
      .booha-blitz-ruby-text rt {
        color: rgba(255, 190, 190, .9);
        font-size: .34em;
        font-weight: 700;
        letter-spacing: .08em;
        line-height: 1;
      }
      .booha-blitz-celebration-layer {
        position: absolute;
        inset: 0;
        z-index: 19;
        overflow: hidden;
        pointer-events: none;
      }
      .booha-blitz-structure-line {
        position: absolute;
        height: 3px;
        border-radius: 999px;
        opacity: 0;
        transform: translateX(0) scaleX(.2);
        transform-origin: center;
        animation: boohaBlitzStructureLine var(--line-dur) cubic-bezier(.2,.75,.3,1) var(--line-delay) both;
      }
      @keyframes boohaBlitzStructureLine {
        0% { opacity: 0; transform: translateX(0) scaleX(.2); }
        18% { opacity: .9; transform: translateX(0) scaleX(1); }
        76% { opacity: .72; transform: translateX(var(--line-x)) scaleX(1); }
        100% { opacity: 0; transform: translateX(calc(var(--line-x) * 1.3)) scaleX(.8); }
      }
      #vb-overlay .vb-name-drop,
      #sb-overlay .sb-name-drop,
      #qb-overlay .qb-name-streak {
        animation-timing-function: var(--blitz-name-ease, ease-out);
      }
      .blitz-feel-playful .booha-blitz-callout,
      .blitz-feel-playful .booha-blitz-final-flourish { letter-spacing: .5px; }
      #vb-overlay.blitz-feel-playful .vb-opt,
      #sb-overlay.blitz-feel-playful .sb-opt,
      #qb-overlay.blitz-feel-playful .qb-opt {
        border-radius: 24px;
        box-shadow: 0 8px 22px rgba(74, 14, 55, .24), inset 0 1px 0 rgba(255,255,255,.22);
        transition-timing-function: cubic-bezier(.2,1.35,.3,1);
      }
      #vb-overlay.blitz-feel-playful .vb-opt:hover,
      #sb-overlay.blitz-feel-playful .sb-opt:hover,
      #qb-overlay.blitz-feel-playful .qb-opt:hover {
        transform: translateY(-3px) scale(1.02);
      }
      #vb-overlay.blitz-feel-arcade .vb-opt,
      #sb-overlay.blitz-feel-arcade .sb-opt,
      #qb-overlay.blitz-feel-arcade .qb-opt {
        border-radius: 10px;
        box-shadow: 0 6px 18px rgba(0, 10, 24, .42), inset 0 1px 0 rgba(255,255,255,.16);
        letter-spacing: .5px;
      }
      #vb-overlay.blitz-feel-arcade .vb-opt:hover,
      #sb-overlay.blitz-feel-arcade .sb-opt:hover,
      #qb-overlay.blitz-feel-arcade .qb-opt:hover {
        transform: translateY(-2px) scale(1.015);
      }
      #vb-overlay.blitz-feel-sleek .vb-opt,
      #sb-overlay.blitz-feel-sleek .sb-opt,
      #qb-overlay.blitz-feel-sleek .qb-opt {
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 8, 24, .38), inset 0 1px 0 rgba(255,255,255,.14);
        letter-spacing: .25px;
      }
      #vb-overlay.blitz-feel-sleek .vb-opt:hover,
      #sb-overlay.blitz-feel-sleek .sb-opt:hover,
      #qb-overlay.blitz-feel-sleek .qb-opt:hover {
        transform: translateY(-1px);
      }
      #vb-overlay.blitz-compositor .vb-opt,
      #sb-overlay.blitz-compositor .sb-opt,
      #qb-overlay.blitz-compositor .qb-opt {
        border-width: 2px;
        border-color: var(--blitz-accent);
        background-image: linear-gradient(160deg, rgba(255,255,255,.10), rgba(0,0,0,.16));
      }
      #vb-overlay.blitz-compositor .vb-opt.correct,
      #vb-overlay.blitz-compositor .vb-opt.wrong,
      #vb-overlay.blitz-compositor .vb-opt.micro-win,
      #sb-overlay.blitz-compositor .sb-opt.correct,
      #sb-overlay.blitz-compositor .sb-opt.wrong,
      #sb-overlay.blitz-compositor .sb-opt.micro-win,
      #qb-overlay.blitz-compositor .qb-opt.correct,
      #qb-overlay.blitz-compositor .qb-opt.wrong,
      #qb-overlay.blitz-compositor .qb-opt.micro-win {
        background-image: none;
      }
      #vb-overlay.blitz-feel-playful .vb-opt,
      #sb-overlay.blitz-feel-playful .sb-opt,
      #qb-overlay.blitz-feel-playful .qb-opt {
        box-shadow: 0 0 0 1px rgba(255,255,255,.20), 0 8px 22px rgba(74,14,55,.24), inset 0 1px 0 rgba(255,255,255,.22);
      }
      #vb-overlay.blitz-feel-arcade .vb-opt,
      #sb-overlay.blitz-feel-arcade .sb-opt,
      #qb-overlay.blitz-feel-arcade .qb-opt {
        box-shadow: 0 0 0 1px rgba(255,255,255,.20), 0 6px 18px rgba(0,10,24,.42), inset 0 1px 0 rgba(255,255,255,.16);
      }
      #vb-overlay.blitz-feel-sleek .vb-opt,
      #sb-overlay.blitz-feel-sleek .sb-opt,
      #qb-overlay.blitz-feel-sleek .qb-opt {
        box-shadow: 0 0 0 1px rgba(255,255,255,.18), 0 8px 24px rgba(0,8,24,.38), inset 0 1px 0 rgba(255,255,255,.14);
      }
      .blitz-feel-sleek .booha-blitz-nameplate {
        border-radius: 14px;
        letter-spacing: 2px;
      }
      .blitz-feel-sleek .booha-blitz-callout { letter-spacing: 2px; }
      .booha-blitz-prompt {
        width: 100%;
        min-width: 0;
      }
      .booha-blitz-answer {
        width: 100%;
        min-width: 0;
      }
      .booha-blitz-final-summary + .booha-blitz-final-hold + .vb-win-buttons,
      .booha-blitz-final-summary + .booha-blitz-final-hold + .sb-win-buttons,
      .booha-blitz-final-summary + .booha-blitz-final-hold + .qb-win-buttons { margin-top: 4px; }
      .booha-blitz-final-hold ~ button:disabled,
      .booha-blitz-final-hold ~ .vb-win-buttons button:disabled,
      .booha-blitz-final-hold ~ .sb-win-buttons button:disabled,
      .booha-blitz-final-hold ~ .qb-win-buttons button:disabled {
        cursor: wait;
        opacity: .42;
        filter: grayscale(.35);
      }
      @media (prefers-reduced-motion: reduce) {
        .booha-blitz-callout.show { animation: none; opacity: 1; transform: translate(-50%, -50%); }
        .booha-blitz-fire-wallpaper { animation: none; opacity: .52; }
        .booha-blitz-fire-wallpaper::before,
        .booha-blitz-fire-name { animation: none; }
        .booha-blitz-callout.combo.show,
        .booha-blitz-callout.chain.show { animation: none; }
        .booha-blitz-nameplate { transition: none; }
        .booha-blitz-nameplate.streak-active { animation: none; }
        .booha-blitz-nameplate.streak-event-live,
        .booha-blitz-nameplate.streak-hold { animation: none; filter: none; }
        .booha-blitz-nameplate.streak-event-live .booha-blitz-streak-marker,
        .booha-blitz-nameplate.streak-event-live .booha-blitz-streak-meter-fill { animation: none; }
        .booha-blitz-streak-meter,
        .booha-blitz-streak-meter-fill { transition: none; }
        .booha-blitz-streak-spark { display: none; }
        .booha-blitz-correct-spark { display: none; }
        .booha-blitz-wrong-spark { display: none; }
        .booha-blitz-perfect-flash { animation: none; opacity: .88; }
        .booha-blitz-start-card::before,
        .booha-blitz-start-card::after { animation: none; }
        .booha-blitz-start-card,
        .booha-blitz-start-card.launching { transition: none; }
        .blitz-feel-arcade.streak-event-live,
        .blitz-feel-sleek.streak-event-live { box-shadow: none; transform: none; }
        .booha-blitz-final-headline,
        .booha-blitz-final-residual,
        .booha-blitz-final-residual::before,
        .booha-blitz-final-residual::after,
        .booha-blitz-final-card .vb-win-buttons,
        .booha-blitz-final-card .sb-win-buttons,
        .booha-blitz-final-card .qb-win-buttons { animation: none; opacity: 1; transform: none; }
        #vb-wrong-popup.blitz-wrong-feedback.show,
        #sb-wrong-popup.blitz-wrong-feedback.show,
        #qb-wrong-popup.blitz-wrong-feedback.show { animation: none; }
      }
      @media (max-width: 600px) {
        .booha-blitz-feedback { flex-basis: clamp(52px, 8vh, 72px); min-height: 52px; }
        .booha-blitz-nameplate { width: min(92vw, 360px); }
        .booha-blitz-callout { max-width: 94vw; font-size: clamp(18px, 6vw, 34px); }
        #vb-wrong-popup.blitz-wrong-feedback,
        #sb-wrong-popup.blitz-wrong-feedback,
        #qb-wrong-popup.blitz-wrong-feedback {
          right: 10px;
          bottom: max(env(safe-area-inset-bottom, 0px) + 10px, 10px);
          left: 10px;
          width: auto;
          max-height: 70vh;
          border-radius: 24px;
          transform: none;
          animation: none;
        }
        #vb-wrong-popup.blitz-wrong-feedback.show,
        #sb-wrong-popup.blitz-wrong-feedback.show,
        #qb-wrong-popup.blitz-wrong-feedback.show {
          animation: boohaBlitzWrongSheet 240ms cubic-bezier(.2, .9, .25, 1) both;
        }
        @keyframes boohaBlitzWrongSheet {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
      }
      @media (orientation: landscape) and (max-height: 620px) {
        .booha-blitz-feedback { flex-basis: 48px; min-height: 48px; }
        .booha-blitz-nameplate { min-height: 32px; padding: 5px 12px; }
        .booha-blitz-callout { font-size: clamp(18px, 4vw, 32px); }
      }
      @media (orientation: landscape) and (max-height: 700px) {
        #vb-timer-bar, #sb-timer-bar, #qb-timer-bar {
          min-height: 56px;
          padding-top: max(env(safe-area-inset-top, 0px) + 8px, 10px);
          padding-bottom: 6px;
          gap: 10px;
        }
        #vb-timer, #sb-timer, #qb-timer { font-size: clamp(32px, 8vh, 58px); }
        #vb-progress, #sb-progress, #qb-progress { font-size: clamp(10px, 2.2vh, 13px); }
        .booha-blitz-feedback { flex-basis: 44px; min-height: 44px; }
        .booha-blitz-nameplate {
          width: min(520px, calc(100vw - 64px));
          min-height: 36px;
          padding: 5px 12px 6px;
          font-size: clamp(10px, 2.3vh, 15px);
        }
        .booha-blitz-nameplate-streak { margin-left: 5px; }
        .booha-blitz-streak-marker { margin-left: 5px; }
        .booha-blitz-streak-meter { width: clamp(30px, 7vw, 52px); margin-left: 6px; }
        #vb-stage { gap: 4px; padding-inline: 16px; }
        #vb-jp-word { font-size: clamp(38px, 11vh, 74px); line-height: .95; }
        #vb-hira { font-size: clamp(14px, 3vh, 22px); }
        #vb-options {
          gap: 6px;
          padding-bottom: max(env(safe-area-inset-bottom, 0px) + 8px, 10px);
        }
        .vb-opt {
          padding: clamp(8px, 1.8vh, 14px) 10px;
          font-size: clamp(13px, 2.7vh, 18px);
        }
        #sb-scroll, #qb-scroll { padding-top: 4px; gap: 8px; }
        #sb-prompt, #qb-prompt { gap: 4px; padding-top: 2px; }
        #sb-jp-word { font-size: clamp(20px, 5.2vh, 34px); line-height: 1.2; }
        #qb-jp-word { font-size: clamp(19px, 4.8vh, 32px); line-height: 1.25; }
        #sb-hira, #qb-hira { font-size: clamp(11px, 2.2vh, 15px); }
        #sb-options, #qb-options { gap: 5px; }
        .sb-opt, .qb-opt {
          padding: clamp(8px, 1.8vh, 13px) 14px;
          font-size: clamp(12px, 2.3vh, 16px);
        }
        #vb-wrong-popup.blitz-wrong-feedback,
        #sb-wrong-popup.blitz-wrong-feedback,
        #qb-wrong-popup.blitz-wrong-feedback {
          max-height: calc(100dvh - 24px);
          padding-top: max(24px, 3vh);
          padding-bottom: max(env(safe-area-inset-bottom, 0px) + 18px, 22px);
          gap: 6px;
        }
        #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-kanji,
        #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-jp,
        #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-jp,
        #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-scold-jp,
        #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-scold-jp,
        #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-scold-jp {
          font-size: clamp(24px, 7vh, 48px);
          line-height: 1.55;
          padding-top: .45em;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function bindViewportMetrics(overlay) {
    const visualViewport = window.visualViewport;
    const update = () => {
      const height = visualViewport?.height || window.innerHeight;
      const width = visualViewport?.width || window.innerWidth;
      if (Number.isFinite(height) && height > 0) {
        overlay.style.setProperty('--blitz-viewport-height', `${Math.round(height)}px`);
      }
      if (Number.isFinite(width) && width > 0) {
        overlay.style.setProperty('--blitz-viewport-width', `${Math.round(width)}px`);
      }
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    visualViewport?.addEventListener('resize', update, { passive: true });
    visualViewport?.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
    };
  }

  function createStartCard(overlay, palette) {
    const card = document.createElement('section');
    card.className = 'booha-blitz-start-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', `${palette.name || 'Blitz'} start`);
    card.style.setProperty('--blitz-start-accent', palette.accent);
    card.style.setProperty('--blitz-start-glow', palette.glow);

    const kicker = document.createElement('div');
    kicker.className = 'booha-blitz-start-kicker';
    kicker.textContent = `${palette.name || 'BOOHA BLITZ'} · ${palette.nameJp || ''}`.trim();
    const title = document.createElement('div');
    title.className = 'booha-blitz-start-title';
    title.textContent = `${getPlayerName()}, READY?`;
    const copy = document.createElement('div');
    copy.className = 'booha-blitz-start-copy';
    copy.textContent = 'Tap to start the run · タップしてスタート';
    const button = document.createElement('button');
    button.className = 'booha-blitz-start-button';
    button.type = 'button';
    button.textContent = 'START BLITZ →';
    card.append(kicker, title, copy, button);
    overlay.classList.add('blitz-awaiting-start');
    overlay.appendChild(card);
    return { card, button };
  }

  function create(config) {
    const ids = config.ids;
    const selector = (key) => ids[key];
    let stylesInjected = false;
    let compositorStylesInjected = false;

    function injectCompositorStyles() {
      if (compositorStylesInjected) return;
      compositorStylesInjected = true;
      const style = document.createElement('style');
      style.id = `booha-blitz-compositor-${config.gameType}`;
      style.textContent = `
        @keyframes boohaBlitzOptionEnter {
          from {
            opacity: 0;
            transform: translate(var(--blitz-option-x, 0px), var(--blitz-option-y, 12px)) scale(var(--blitz-option-scale, .96));
          }
          to {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass} {
          transition: transform 120ms ease, background 120ms ease, opacity 120ms ease;
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}.blitz-enter {
          animation: boohaBlitzOptionEnter var(--blitz-option-duration, 320ms) var(--blitz-motion-ease, ease-out) var(--blitz-enter-delay, 0ms) both;
          will-change: transform, opacity;
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}::after {
          content: '';
          position: absolute;
          inset: 0;
          border: 2px solid var(--blitz-accent);
          border-radius: inherit;
          background: radial-gradient(circle at 50% 35%, var(--blitz-glow), transparent 68%);
          opacity: 0;
          transform: scale(.96);
          transition: opacity 120ms ease, transform 120ms ease;
          pointer-events: none;
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}:hover::after,
        #${config.overlayId}.blitz-compositor .${config.optionClass}.correct::after,
        #${config.overlayId}.blitz-compositor .${config.optionClass}.wrong::after {
          opacity: .62;
          transform: scale(1);
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}.correct {
          box-shadow: none !important;
          outline: 2px solid #00ff64;
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}.micro-win {
          background: var(--blitz-correct) !important;
          outline-color: var(--blitz-correct) !important;
          outline: 2px solid #ffffff;
          outline-offset: 0;
          box-shadow:
            0 0 0 2px #ffffff,
            0 0 22px var(--blitz-correct),
            0 0 42px var(--blitz-glow),
            inset 0 0 18px rgba(255,255,255,.35) !important;
          filter: brightness(1.12) saturate(1.14);
          animation: boohaBlitzCorrectPop 220ms cubic-bezier(.16,1.45,.3,1) both;
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}.micro-win::after {
          opacity: .78;
          transform: scale(1.04);
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}.wrong {
          box-shadow: none !important;
          outline: 2px solid #ff1e1e;
        }
        #${config.overlayId}.blitz-compositor.wrong-active .${config.optionClass} {
          opacity: .35;
          filter: saturate(.55);
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}.blitz-recover {
          animation: boohaBlitzRecoveryCard 360ms cubic-bezier(.16,1.25,.3,1) both;
          animation-delay: calc(var(--recover-index, 0) * 42ms);
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}:focus-visible {
          outline: 3px solid var(--blitz-accent);
          outline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          #${config.overlayId}.blitz-compositor .${config.optionClass}::after { transition: none; }
          #${config.overlayId}.blitz-compositor .${config.optionClass}.blitz-enter,
          #${config.overlayId}.blitz-compositor .${config.optionClass}.blitz-recover { animation: none !important; opacity: 1; transform: none; }
          #${config.overlayId}.blitz-compositor .${config.optionClass}.micro-win { animation: none; filter: none; }
          #${config.overlayId}.blitz-compositor .${config.optionClass}.wrong,
          #${config.overlayId}.shake { animation: none !important; }
        }
      `;
      document.head.appendChild(style);
    }

    function applyPalette(overlay, palette) {
      overlay.style.setProperty('--blitz-accent', palette.accent);
      overlay.style.setProperty('--blitz-glow', palette.glow);
      overlay.style.setProperty('--blitz-reward-glow', palette.rewardGlow || palette.glow);
      overlay.style.setProperty('--blitz-name-ease', palette.nameEasing || 'ease-out');
      overlay.style.setProperty('--blitz-bg-main', palette.background?.main || `hsl(${palette.baseHue}, ${palette.bgSat}%, ${palette.bgLit}%)`);
      overlay.style.setProperty('--blitz-bg-secondary', palette.background?.secondary || 'rgba(255,255,255,.08)');
      overlay.style.setProperty('--blitz-correct', palette.correct?.color || '#00ff64');
      overlay.style.setProperty('--blitz-wrong', palette.wrong?.color || '#ff1e1e');
      overlay.style.setProperty('--blitz-popup-bg', palette.popup?.background || 'rgba(0,0,0,.92)');
      overlay.style.setProperty('--blitz-streak-glow', palette.streak?.glow || palette.glow);
      const motion = palette.motion || {};
      overlay.style.setProperty('--blitz-motion-ease', motion.particleEasing || palette.particleEasing || 'ease-out');
      overlay.style.setProperty('--blitz-option-duration', `${motion.optionDurationMs || 320}ms`);
      overlay.style.setProperty('--blitz-option-stagger', `${motion.optionStaggerMs || 36}ms`);
      overlay.style.setProperty('--blitz-option-x', motion.optionX || '0px');
      overlay.style.setProperty('--blitz-option-y', motion.optionY || '12px');
      overlay.style.setProperty('--blitz-option-scale', motion.optionScale || '.96');
      overlay.classList.add(`blitz-feel-${palette.feel || 'arcade'}`);
      Object.entries(config.cssVars || {}).forEach(([name, value]) => {
        overlay.style.setProperty(name, typeof value === 'function' ? value(palette) : value);
      });
      overlay.style.background = backgroundFor(palette);
      const timer = overlay.querySelector(selector('timer'));
      if (timer) timer.style.color = palette.timerColor;
    }

    function createPlayerSpotlight(overlay, palette) {
      injectSharedStyles();
      const playerName = getPlayerName();
      const feedback = document.createElement('div');
      feedback.className = 'booha-blitz-feedback';
      const contentStart = Array.from(overlay.children).find(child =>
        child.id.endsWith('-stage') || child.id.endsWith('-scroll'));
      overlay.insertBefore(feedback, contentStart || null);

      const nameplate = document.createElement('div');
      nameplate.className = 'booha-blitz-nameplate';
      nameplate.style.setProperty('--blitz-accent', palette.accent);
      nameplate.setAttribute('role', 'status');
      nameplate.setAttribute('aria-live', 'polite');
      const nameEl = document.createElement('span');
      nameEl.className = 'booha-blitz-nameplate-name';
      nameEl.textContent = playerName;
      const streakEl = document.createElement('span');
      streakEl.className = 'booha-blitz-nameplate-streak';
      streakEl.textContent = 'READY';
      const streakMarkerEl = document.createElement('span');
      streakMarkerEl.className = 'booha-blitz-streak-marker';
      const streakMeter = document.createElement('span');
      streakMeter.className = 'booha-blitz-streak-meter';
      streakMeter.setAttribute('aria-hidden', 'true');
      const streakMeterFill = document.createElement('span');
      streakMeterFill.className = 'booha-blitz-streak-meter-fill';
      streakMeter.appendChild(streakMeterFill);
      nameplate.append(nameEl, streakMarkerEl, streakEl, streakMeter);
      feedback.appendChild(nameplate);

      const callout = document.createElement('div');
      callout.className = 'booha-blitz-callout';
      callout.style.setProperty('--blitz-accent', palette.accent);
      callout.setAttribute('aria-live', 'polite');
      feedback.appendChild(callout);

      let announceToken = 0;
      let streakHoldTimer = null;
      let streakEventTimer = null;
      const eventClasses = ['streak-event-live', 'streak-event-3', 'streak-event-5', 'streak-event-7', 'streak-event-10', 'streak-event-15'];
      function clearStreakEventClasses() {
        overlay.classList.remove('streak-event-live');
        nameplate.classList.remove(...eventClasses);
      }
      function emitStreakSparks() {
        const threshold = arguments.length ? arguments[0] : 0;
        const count = isMinimalPower()
          ? 3
          : isLowPower()
            ? 4
            : threshold >= 5 ? (palette.feel === 'arcade' ? 14 : 12) : palette.feel === 'arcade' ? 8 : 6;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const spark = document.createElement('span');
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
          const distance = 24 + Math.random() * 32;
          spark.className = `booha-blitz-streak-spark${threshold >= 5 && i === 0 ? ' booha-blitz-streak-spark-large' : ''}`;
          spark.style.cssText = `--sx:${Math.cos(angle) * distance}px;--sy:${Math.sin(angle) * distance}px;--spark-delay:${Math.random() * 50}ms;`;
          spark.addEventListener('animationend', () => spark.remove(), { once: true });
          fragment.appendChild(spark);
        }
        nameplate.appendChild(fragment);
      }
      function showStreakEvent(threshold) {
        if (!threshold) return;
        if (streakHoldTimer) clearTimeout(streakHoldTimer);
        if (streakEventTimer) clearTimeout(streakEventTimer);
        clearStreakEventClasses();
        void nameplate.offsetWidth;
        const className = `streak-event-${threshold}`;
        overlay.classList.add('streak-event-live');
        nameplate.classList.add('streak-event-live', className, 'streak-hold');
        emitStreakSparks(threshold);
        streakHoldTimer = setTimeout(() => nameplate.classList.remove('streak-hold'), 1250);
        streakEventTimer = setTimeout(clearStreakEventClasses, 780);
      }
      function announce(message, final = false, variant = '') {
        announceToken++;
        callout.classList.remove('show');
        callout.classList.toggle('final', final);
        callout.classList.remove('fire');
        callout.classList.toggle('combo', variant === 'combo');
        callout.classList.toggle('chain', variant === 'chain');
        callout.textContent = message;
        void callout.offsetWidth;
        callout.classList.add('show');
        const token = announceToken;
        setTimeout(() => {
          if (token === announceToken) callout.classList.remove('show');
        }, final ? 1500 : 1100);
      }

      function clearAnnouncement() {
        announceToken++;
        callout.classList.remove('show', 'final', 'fire', 'combo', 'chain');
        callout.textContent = '';
      }

      function setStreak(streak, eventThreshold = 0) {
        nameplate.classList.remove(
          'streak-tier-1', 'streak-tier-2', 'streak-tier-3', 'streak-tier-4', 'streak-tier-5',
          'streak-milestone-2', 'streak-milestone-3', 'streak-milestone-5', 'streak-milestone-8'
        );
        if (!streak) {
          if (streakHoldTimer) clearTimeout(streakHoldTimer);
          if (streakEventTimer) clearTimeout(streakEventTimer);
          streakHoldTimer = null;
          streakEventTimer = null;
          clearStreakEventClasses();
          clearAnnouncement();
          streakEl.textContent = 'READY';
          streakMarkerEl.textContent = '';
          nameplate.style.setProperty('--streak-progress', '0%');
          nameplate.style.removeProperty('--streak-color');
          nameplate.removeAttribute('data-streak');
          nameplate.removeAttribute('data-milestone');
          nameplate.classList.remove('streak-active');
          return;
        }
        const tier = streak >= 10 ? 5 : streak >= 8 ? 4 : streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
        const milestone = streak >= 8 ? 8 : streak >= 5 ? 5 : streak >= 3 ? 3 : streak >= 2 ? 2 : 0;
        const label = palette.streak?.label || 'STREAK';
        const marker = palette.streak?.marker || '★';
        nameplate.classList.add('streak-active', `streak-tier-${tier}`);
        nameplate.dataset.streak = String(streak);
        if (milestone) nameplate.classList.add(`streak-milestone-${milestone}`);
        nameplate.dataset.milestone = milestone ? String(milestone) : '1';
        const streakColors = palette.streak?.colors || [];
        const colorIndex = eventThreshold
          ? Math.max(0, STREAK_EVENT_THRESHOLDS.indexOf(eventThreshold))
          : Math.min(streakColors.length - 1, Math.max(0, tier - 1));
        if (streakColors[colorIndex]) nameplate.style.setProperty('--streak-color', streakColors[colorIndex]);
        nameplate.style.setProperty('--streak-progress', `${Math.min(100, streak * 10)}%`);
        streakMarkerEl.textContent = marker;
        streakEl.textContent = `${label} ×${streak}`;
        nameplate.classList.remove('streak-pop');
        void nameplate.offsetWidth;
        nameplate.classList.add('streak-pop');
        if (eventThreshold) showStreakEvent(eventThreshold);
      }

      function resetStreak() {
        nameplate.classList.remove('streak-pop', 'streak-hold');
        clearAnnouncement();
        setStreak(0);
      }

      return { playerName, nameplate, callout, announce, clearAnnouncement, setStreak, resetStreak };
    }

    function renderFurigana(container, jp, hira) {
      while (container.firstChild) container.removeChild(container.firstChild);
      const ruby = document.createElement('ruby');
      ruby.appendChild(document.createTextNode(jp));
      const rt = document.createElement('rt');
      rt.textContent = hira;
      ruby.appendChild(rt);
      container.appendChild(ruby);
      container.classList.add('booha-blitz-ruby-text');
      container.setAttribute('aria-label', `${jp} ${hira}`);
    }

    function emitFinishFlash(overlay, palette, playerName, kind = 'perfect') {
      const flash = document.createElement('div');
      const isRecordFlash = kind === 'record';
      flash.className = `booha-blitz-perfect-flash${isRecordFlash ? ' record' : ''}`;
      flash.style.setProperty('--blitz-accent', isRecordFlash ? '#ffd700' : palette.accent);
      flash.style.setProperty('--blitz-glow', isRecordFlash ? 'rgba(255,188,35,.72)' : palette.glow);
      const label = document.createElement('div');
      label.className = 'booha-blitz-perfect-flash-label';
      label.textContent = isRecordFlash ? `${playerName} · NEW RECORD!` : `${playerName} · PERFECT!`;
      flash.appendChild(label);
      overlay.appendChild(flash);
      setTimeout(() => flash.remove(), REDUCED_MOTION ? 320 : isRecordFlash ? 1050 : 900);
    }

    function emitPerfectFlash(overlay, palette, playerName) {
      emitFinishFlash(overlay, palette, playerName, 'perfect');
    }

    function emitFireWallpaper(overlay, playerName, threshold = 0) {
      if (isMinimalPower()) return;
      overlay.querySelector('.booha-blitz-fire-wallpaper')?.remove();
      const wallpaper = document.createElement('div');
      wallpaper.className = 'booha-blitz-fire-wallpaper';
      wallpaper.setAttribute('aria-hidden', 'true');
      const count = isLowPower() ? 6 : 12;
      for (let i = 0; i < count; i++) {
        const name = document.createElement('span');
        name.className = 'booha-blitz-fire-name';
        name.textContent = playerName;
        name.style.left = `${-8 + (i % 4) * 28 + Math.random() * 10}%`;
        name.style.top = `${-4 + Math.floor(i / 4) * 28 + Math.random() * 8}%`;
        name.style.setProperty('--fire-delay', `${Math.random() * 90}ms`);
        name.style.opacity = String(Math.min(1, .72 + threshold * .01));
        wallpaper.appendChild(name);
      }
      overlay.insertBefore(wallpaper, overlay.firstChild);
      setTimeout(() => wallpaper.remove(), REDUCED_MOTION ? 520 : 1450);
    }

    function ensureFinalCard(winScreen, palette) {
      const existing = winScreen.querySelector('.booha-blitz-final-summary');
      if (existing) {
        return {
          summary: existing,
          streak: existing.querySelector('.booha-blitz-final-streak'),
          perfect: existing.querySelector('.booha-blitz-final-perfect'),
          headline: winScreen.querySelector('.booha-blitz-final-headline'),
          residual: winScreen.querySelector('.booha-blitz-final-residual'),
          hold: winScreen.querySelector('.booha-blitz-final-hold'),
        };
      }

      const card = document.createElement('section');
      card.className = 'booha-blitz-final-card';
      card.setAttribute('aria-label', 'Blitz clear results');
      while (winScreen.firstChild) card.appendChild(winScreen.firstChild);
      winScreen.appendChild(card);

      const curriculum = document.createElement('div');
      curriculum.className = 'booha-blitz-final-curriculum';
      curriculum.textContent = `${palette?.name || 'BOOHA BLITZ'} · ${palette?.nameJp || ''}`.trim();
      card.prepend(curriculum);

      const headline = document.createElement('div');
      headline.className = 'booha-blitz-final-headline';
      headline.setAttribute('aria-live', 'polite');
      const originalName = winScreen.querySelector(selector('winName'));
      card.insertBefore(headline, originalName || null);

      const residual = document.createElement('div');
      residual.className = 'booha-blitz-final-residual';
      residual.setAttribute('aria-live', 'polite');
      residual.textContent = 'RUN ENERGY CARRIED INTO THE CLEAR';
      card.insertBefore(residual, originalName || null);

      const summary = document.createElement('div');
      summary.className = 'booha-blitz-final-summary';
      const badge = document.createElement('div');
      badge.className = 'booha-blitz-final-badge';
      badge.textContent = config.finalCard?.badge || 'FULL CLEAR';
      const flourish = document.createElement('div');
      flourish.className = 'booha-blitz-final-flourish';
      flourish.textContent = config.finalCard?.detail || 'EVERY ANSWER LANDED';
      const streak = document.createElement('div');
      streak.className = 'booha-blitz-final-streak';
      streak.textContent = 'BEST STREAK ×0';
      const perfect = document.createElement('div');
      perfect.className = 'booha-blitz-final-perfect';
      perfect.hidden = true;
      summary.append(badge, flourish, streak, perfect);

      const hold = document.createElement('div');
      hold.className = 'booha-blitz-final-hold';
      hold.setAttribute('aria-live', 'polite');
      hold.textContent = 'LOOK AT YOUR CLEAR';

      const playAgain = winScreen.querySelector(selector('playAgain'));
      const buttonGroup = playAgain && playAgain.parentElement;
      if (buttonGroup) {
        card.insertBefore(summary, buttonGroup);
        card.insertBefore(hold, buttonGroup);
      } else {
        card.append(summary, hold);
      }
      return { summary, streak, perfect, headline, residual, hold };
    }

    function closeGame(overlay, stopTimer, stopBGM) {
      stopTimer();
      stopBGM();
      overlay._boohaBlitzPerformanceCleanup?.();
      overlay._boohaBlitzViewportCleanup?.();
      overlay._boohaBlitzVisibilityCleanup?.();
      overlay.remove();
      const api = window[config.apiName];
      if (api && typeof api._onClose === 'function') api._onClose();
    }

    function celebrate(overlay, palette, isRecord) {
      const name = getPlayerName();
      const rewardColors = palette.rewardColors || [palette.accent, palette.accent2, '#ffffff', '#ffea00'];
      const colors = isRecord
        ? (palette.rewardRecordColors || ['#fff4b0', '#ffd700', '#ff8a00', '#ffffff'])
        : rewardColors;
      const finalCard = config.finalCard || {};
      const nameDelay = finalCard.nameDelay ?? 760;
      const nameCount = finalCard.nameCount ?? 34;
      const nameDuration = finalCard.nameDuration ?? 3800;
      const particleEasing = palette.particleEasing || 'ease-out';
      const particleRadius = palette.particleShape === 'diamond' ? '2px' : palette.particleShape === 'round' ? '50%' : '3px';
      const W = window.innerWidth;
      const H = window.innerHeight;

      if (!REDUCED_MOTION) {
        overlay.classList.add('shake');
        setTimeout(() => overlay.classList.remove('shake'), 420);
      }

      const fragment = document.createDocumentFragment();
      const mode = config.celebrationMode;

      if (mode === 'vocab') {
        const crumbs = ['#ffdca8', '#ffc46b', '#fff1d6', palette.accent, '#ffffff'];
        for (let i = 0; i < effectCount(isRecord ? 70 : 46); i++) {
          const p = document.createElement('div');
          const angle = Math.random() * Math.PI * 2;
          const dist = 70 + Math.random() * (isRecord ? 360 : 240);
          const size = 5 + Math.random() * 6;
          const color = crumbs[Math.floor(Math.random() * crumbs.length)];
          p.className = 'vb-particle';
          p.style.cssText = `position:absolute;left:${W / 2}px;top:${H / 2}px;width:${size}px;height:${size}px;border-radius:${particleRadius};background:${color};pointer-events:none;z-index:30;--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist + 40}px;--pdur:${520 + Math.random() * 520}ms;--pdelay:${Math.random() * 100}ms;animation:vbParticle var(--pdur) ${particleEasing} var(--pdelay) both;`;
          p.addEventListener('animationend', () => p.remove());
          fragment.appendChild(p);
        }
        for (let i = 0; i < effectCount(isRecord ? nameCount + 14 : nameCount); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          d.className = 'vb-name-drop';
          d.textContent = name;
          d.style.cssText = `left:${Math.random() * W}px;top:${-40 - Math.random() * 220}px;font-size:${12 + Math.random() * (isRecord ? 26 : 20)}px;color:${color};--cx:${(Math.random() - 0.5) * 340}px;--cy:${H * 0.8 + Math.random() * 380}px;--r0:${(Math.random() - 0.5) * 40}deg;--r1:${(Math.random() - 0.5) * 220}deg;--cdur:${nameDuration + Math.random() * 1200}ms;--cdelay:${nameDelay + Math.random() * 500}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
      } else if (mode === 'sentence') {
        const rubble = ['#9aa0a8', '#c7ccd4', '#6d737c', palette.accent, '#ffffff'];
        for (let i = 0; i < effectCount(isRecord ? 40 : 26); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          d.className = 'sb-name-drop';
          d.textContent = name;
          d.style.cssText = `left:${Math.random() * W}px;top:${-50 - Math.random() * 160}px;font-size:${14 + Math.random() * (isRecord ? 28 : 22)}px;color:${color};--cx:${(Math.random() - 0.5) * 90}px;--cy:${H * (0.5 + Math.random() * 0.42)}px;--r0:${(Math.random() - 0.5) * 24}deg;--cdur:${1400 + Math.random() * 1000}ms;--cdelay:${Math.random() * 1100}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
        for (let i = 0; i < effectCount(isRecord ? 60 : 40); i++) {
          const p = document.createElement('div');
          const angle = -Math.PI * (0.15 + Math.random() * 0.7);
          const dist = 80 + Math.random() * (isRecord ? 340 : 240);
          const color = rubble[Math.floor(Math.random() * rubble.length)];
          p.className = 'sb-particle';
          p.style.cssText = `position:absolute;left:${Math.random() * W}px;top:${H - 8}px;width:${4 + Math.random() * 8}px;height:${4 + Math.random() * 8}px;border-radius:${particleRadius};background:${color};pointer-events:none;z-index:30;--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist}px;--pdur:${520 + Math.random() * 560}ms;--pdelay:${Math.random() * 260}ms;animation:sbParticle var(--pdur) ${particleEasing} var(--pdelay) both;`;
          p.addEventListener('animationend', () => p.remove());
          fragment.appendChild(p);
        }
        if (finalCard.celebrationKind === 'lines') {
          for (let i = 0; i < effectCount(isRecord ? 18 : 12); i++) {
            const line = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            line.className = 'booha-blitz-structure-line';
            line.style.cssText = `left:${10 + Math.random() * 70}%;top:${18 + Math.random() * 64}%;width:${90 + Math.random() * 220}px;background:${color};--line-x:${(Math.random() - .5) * 80}px;--line-dur:${1900 + Math.random() * 800}ms;--line-delay:${nameDelay + Math.random() * 350}ms;`;
            line.addEventListener('animationend', () => line.remove());
            fragment.appendChild(line);
          }
        }
      } else {
        for (let i = 0; i < effectCount(isRecord ? nameCount + 12 : nameCount); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          const toLeft = i % 2 === 1;
          d.className = 'qb-name-streak';
          d.textContent = name;
          d.style.cssText = `left:${toLeft ? W + 60 : -300}px;top:${Math.random() * H}px;font-size:${12 + Math.random() * (isRecord ? 26 : 20)}px;color:${color};--sk:${toLeft ? 14 : -14}deg;--dx:${toLeft ? -(W + 620) : (W + 620)}px;--cdur:${nameDuration + Math.random() * 900}ms;--cdelay:${nameDelay + Math.random() * 500}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
        for (let i = 0; i < effectCount(isRecord ? 34 : 22); i++) {
          const line = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          const toLeft = i % 2 === 0;
          line.className = 'qb-speed-line';
          line.style.cssText = `left:${toLeft ? W + 40 : -240}px;top:${Math.random() * H}px;width:${60 + Math.random() * 180}px;background:${color};--dx:${toLeft ? -(W + 620) : (W + 620)}px;--cdur:${900 + Math.random() * 700}ms;--cdelay:${nameDelay * .7 + Math.random() * 400}ms;`;
          line.addEventListener('animationend', () => line.remove());
          fragment.appendChild(line);
        }
      }
      const layer = document.createElement('div');
      layer.className = 'booha-blitz-celebration-layer';
      layer.appendChild(fragment);
      overlay.appendChild(layer);
      setTimeout(() => layer.remove(), 5600);
    }

    function startGame(allCards, curr, weekNumber, palette, monthSlug) {
      const offset = (weekNumber - 1) * 15;
      const weekCards = allCards.slice(offset, offset + 15);
      if (weekCards.length < 6) {
        alert(config.notEnoughMessage);
        return;
      }

      const existing = document.getElementById(config.overlayId);
      if (existing) {
        existing._boohaBlitzPerformanceCleanup?.();
        existing._boohaBlitzViewportCleanup?.();
        existing._boohaBlitzVisibilityCleanup?.();
        existing.remove();
      }
      RUNTIME_PERFORMANCE_TIER = null;
      RUNTIME_LOW_POWER = false;
      const overlay = config.buildOverlay();
      overlay._boohaBlitzViewportCleanup = bindViewportMetrics(overlay);
      applyPerformanceTier(overlay);
      overlay.classList.add('blitz-compositor');
      applyPalette(overlay, palette);

      const bgm = new Audio('assets/audio/blitz.mp3');
      bgm.loop = true;
      bgm.volume = 0.55;
      let bgmStarted = false;
      const startBGM = () => {
        bgmStarted = true;
        if (!bgm.paused) return;
        const playback = bgm.play();
        if (playback?.catch) playback.catch(() => {});
      };
      const stopBGM = () => {
        bgm.pause();
        bgm.currentTime = 0;
      };
      let streakAudioCtx = null;
      function playStreakBeat(threshold) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!threshold || !AudioCtor) return;
        try {
          if (!streakAudioCtx) streakAudioCtx = new AudioCtor();
          if (streakAudioCtx.state === 'suspended') streakAudioCtx.resume().catch(() => {});
          const notes = STREAK_EVENT_NOTES[palette.feel]?.[threshold] || STREAK_EVENT_NOTES.playful[threshold];
          const now = streakAudioCtx.currentTime + 0.01;
          notes.forEach((frequency, index) => {
            const startAt = now + index * 0.055;
            const oscillator = streakAudioCtx.createOscillator();
            const gain = streakAudioCtx.createGain();
            oscillator.type = palette.feel === 'sleek' ? 'sine' : palette.feel === 'arcade' ? 'square' : 'triangle';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(palette.feel === 'arcade' ? 0.045 : 0.035, startAt + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);
            oscillator.connect(gain);
            gain.connect(streakAudioCtx.destination);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.16);
          });
        } catch (_) {
          // Audio is an enhancement; a blocked or unavailable context must not interrupt play.
        }
      }
      function stopStreakBeat() {
        if (!streakAudioCtx) return;
        const ctx = streakAudioCtx;
        streakAudioCtx = null;
        try { ctx.close().catch(() => {}); } catch (_) {}
      }
      function playCorrectHit() {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
          if (!streakAudioCtx) streakAudioCtx = new AudioCtor();
          if (streakAudioCtx.state === 'suspended') streakAudioCtx.resume().catch(() => {});
          const base = palette.feel === 'arcade' ? 440 : palette.feel === 'sleek' ? 523 : 587;
          const pitch = base * (1 + Math.min(streak, 12) * 0.018);
          const now = streakAudioCtx.currentTime + 0.005;
          [pitch, pitch * 1.5].forEach((frequency, index) => {
            const startAt = now + index * 0.018;
            const oscillator = streakAudioCtx.createOscillator();
            const gain = streakAudioCtx.createGain();
            oscillator.type = palette.feel === 'sleek' ? 'sine' : 'triangle';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(index ? 0.018 : 0.032, startAt + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.1);
            oscillator.connect(gain);
            gain.connect(streakAudioCtx.destination);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.12);
          });
        } catch (_) {
          // Audio is optional feedback and must never block an answer.
        }
      }
      function playFinalStinger(isRecord, isPerfectRun) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
          if (!streakAudioCtx) streakAudioCtx = new AudioCtor();
          if (streakAudioCtx.state === 'suspended') streakAudioCtx.resume().catch(() => {});
          const notes = isRecord
            ? [659, 831, 1047, 1319]
            : isPerfectRun ? [523, 659, 784, 1047] : [440, 554, 659];
          const now = streakAudioCtx.currentTime + 0.015;
          notes.forEach((frequency, index) => {
            const startAt = now + index * 0.075;
            const oscillator = streakAudioCtx.createOscillator();
            const gain = streakAudioCtx.createGain();
            oscillator.type = isRecord ? 'triangle' : palette.feel === 'sleek' ? 'sine' : 'triangle';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(isRecord ? 0.05 : 0.035, startAt + 0.014);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);
            oscillator.connect(gain);
            gain.connect(streakAudioCtx.destination);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.24);
          });
        } catch (_) {
          // Audio is optional celebration feedback.
        }
      }
      function playStartSting() {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
          if (!streakAudioCtx) streakAudioCtx = new AudioCtor();
          if (streakAudioCtx.state === 'suspended') streakAudioCtx.resume().catch(() => {});
          const notes = palette.feel === 'arcade' ? [392, 587] : palette.feel === 'sleek' ? [440, 659] : [523, 784];
          const now = streakAudioCtx.currentTime + 0.01;
          notes.forEach((frequency, index) => {
            const startAt = now + index * 0.075;
            const oscillator = streakAudioCtx.createOscillator();
            const gain = streakAudioCtx.createGain();
            oscillator.type = palette.feel === 'sleek' ? 'sine' : 'triangle';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(0.028, startAt + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
            oscillator.connect(gain);
            gain.connect(streakAudioCtx.destination);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.2);
          });
        } catch (_) {
          // Audio is optional first-impression feedback.
        }
      }
      function playWrongHit() {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        try {
          if (!streakAudioCtx) streakAudioCtx = new AudioCtor();
          if (streakAudioCtx.state === 'suspended') streakAudioCtx.resume().catch(() => {});
          const notes = palette.feel === 'arcade' ? [196, 147] : palette.feel === 'sleek' ? [330, 247] : [262, 196];
          const now = streakAudioCtx.currentTime + 0.005;
          notes.forEach((frequency, index) => {
            const startAt = now + index * 0.045;
            const oscillator = streakAudioCtx.createOscillator();
            const gain = streakAudioCtx.createGain();
            oscillator.type = palette.feel === 'arcade' ? 'square' : 'triangle';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(0.018, startAt + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);
            oscillator.connect(gain);
            gain.connect(streakAudioCtx.destination);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.18);
          });
        } catch (_) {
          // Audio is optional feedback and must never block recovery.
        }
      }

      const timerEl = overlay.querySelector(selector('timer'));
      const progressEl = overlay.querySelector(selector('progress'));
      const jpWordEl = overlay.querySelector(selector('jpWord'));
      const hiraEl = overlay.querySelector(selector('hira'));
      const optionsEl = overlay.querySelector(selector('options'));
      const flashEl = overlay.querySelector(selector('flash'));
      const scrollEl = selector('scroll') ? overlay.querySelector(selector('scroll')) : null;
      const wrongPopup = overlay.querySelector(selector('wrongPopup'));
      const winScreen = overlay.querySelector(selector('win'));
      const spotlight = createPlayerSpotlight(overlay, palette);
      const finalCard = ensureFinalCard(winScreen, palette);
      const startCard = createStartCard(overlay, palette);
      const queue = shuffle(weekCards);
      let current = 0;
      let startTime = null;
      let elapsed = 0;
      let clearElapsed = null;
      let timerId = null;
      let locked = false;
      let bgIndex = 0;
      let backgroundValue = '';
      let lastTimerPaint = -Infinity;
      let gameStarted = false;
      let streak = 0;
      let bestStreak = 0;
      let finalHoldTimer = null;
      let finalHoldInterval = null;
      let runIsActive = false;
      let visibilityPaused = false;
      let runEligibleForRecord = true;

      function setBackground(streakValue = streak) {
        const next = backgroundFor(palette, bgIndex, streakValue);
        if (next === backgroundValue) return;
        backgroundValue = next;
        overlay.style.background = next;
      }

      function scheduleTimerTick(delay = 0) {
        if (timerId !== null) clearTimeout(timerId);
        timerId = setTimeout(tick, delay);
      }

      function tick() {
        timerId = null;
        if (startTime === null) {
          scheduleTimerTick(TIMER_PAINT_INTERVAL_MS);
          return;
        }
        elapsed = performance.now() - startTime;
        if (elapsed - lastTimerPaint >= TIMER_PAINT_INTERVAL_MS) {
          timerEl.textContent = fmtTime(elapsed);
          lastTimerPaint = elapsed;
        }
        scheduleTimerTick(TIMER_PAINT_INTERVAL_MS);
      }

      function stopTimer() {
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
      }

      function pauseForVisibility() {
        if (!runIsActive || visibilityPaused || startTime === null) return;
        elapsed = performance.now() - startTime;
        stopTimer();
        stopBGM();
        visibilityPaused = true;
      }

      function resumeFromVisibility() {
        if (document.visibilityState === 'hidden' || document.hidden || !visibilityPaused || !runIsActive || startTime === null) return;
        startTime = performance.now() - elapsed;
        lastTimerPaint = -Infinity;
        timerEl.textContent = fmtTime(elapsed);
        visibilityPaused = false;
        startBGM();
        scheduleTimerTick(0);
      }

      function handleVisibilityChange() {
        const hidden = document.visibilityState === 'hidden' || document.hidden;
        if (hidden) pauseForVisibility();
        else resumeFromVisibility();
      }

      document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
      window.addEventListener('pagehide', pauseForVisibility, { passive: true });
      window.addEventListener('pageshow', resumeFromVisibility, { passive: true });
      overlay._boohaBlitzVisibilityCleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', pauseForVisibility);
        window.removeEventListener('pageshow', resumeFromVisibility);
      };

      function updateStreak() {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        const eventThreshold = STREAK_EVENT_THRESHOLDS.includes(streak) ? streak : 0;
        spotlight.clearAnnouncement();
        spotlight.setStreak(streak, eventThreshold);
        setBackground(streak);
        if (eventThreshold) {
          playStreakBeat(eventThreshold);
          if (palette.feel === 'playful') emitFireWallpaper(overlay, spotlight.playerName, eventThreshold);
        }
      }

      function stopFinalHold() {
        if (finalHoldTimer) clearTimeout(finalHoldTimer);
        if (finalHoldInterval) clearInterval(finalHoldInterval);
        finalHoldTimer = null;
        finalHoldInterval = null;
      }

      function startFinalHold(holdMs = FINAL_CARD_HOLD_MS) {
        stopFinalHold();
        const buttons = [
          winScreen.querySelector(selector('playAgain')),
          winScreen.querySelector(selector('winClose')),
        ].filter(Boolean);
        buttons.forEach(button => {
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
          button.title = 'Please look at your clear first.';
        });

        const releaseAt = Date.now() + holdMs;
        const paintHold = () => {
          const seconds = Math.max(1, Math.ceil((releaseAt - Date.now()) / 1000));
          finalCard.hold.textContent = `${spotlight.playerName}, LOOK AT YOUR CLEAR — ${seconds}`;
        };
        finalCard.hold.classList.remove('ready');
        paintHold();
        finalHoldInterval = setInterval(paintHold, 250);
        finalHoldTimer = setTimeout(() => {
          stopFinalHold();
          finalCard.hold.classList.add('ready');
          finalCard.hold.textContent = `${spotlight.playerName}, YOUR MOMENT — READY`;
          buttons.forEach(button => {
            button.disabled = false;
            button.removeAttribute('aria-disabled');
            button.title = '';
          });
        }, holdMs);
      }

      function emitCorrectMicroBurst(correctBtn) {
        const r = correctBtn.getBoundingClientRect();
        const ovr = overlay.getBoundingClientRect();
        const cx = r.left - ovr.left + r.width / 2;
        const cy = r.top - ovr.top + r.height / 2;
        const count = isMinimalPower() ? 2 : isLowPower() ? 4 : streak >= 5 ? 10 : 6;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const spark = document.createElement('span');
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
          const distance = 20 + Math.random() * 28;
          spark.className = 'booha-blitz-correct-spark';
          spark.style.cssText = `left:${cx}px;top:${cy}px;--sx:${Math.cos(angle) * distance}px;--sy:${Math.sin(angle) * distance}px;--spark-delay:${Math.random() * 24}ms;`;
          spark.addEventListener('animationend', () => spark.remove(), { once: true });
          fragment.appendChild(spark);
        }
        overlay.appendChild(fragment);
      }

      function correctDetonate(correctBtn) {
        correctBtn.classList.add('micro-win');
        correctBtn.style.transition = 'none';
        correctBtn.style.background = palette.correct?.color || '#00ff64';
        emitCorrectMicroBurst(correctBtn);
        if (!REDUCED_MOTION) {
          overlay.style.transform = 'scale(1.02)';
          setTimeout(() => {
            overlay.style.transition = 'transform 70ms ease';
            overlay.style.transform = '';
            setTimeout(() => { overlay.style.transition = ''; }, 70);
          }, 55);
        }

        const allBtns = Array.from(optionsEl.querySelectorAll(`.${config.optionClass}`));
        if (!REDUCED_MOTION) {
          setTimeout(() => {
            allBtns.forEach(btn => {
              if (btn === correctBtn) return;
              const angle = Math.random() * Math.PI * 2;
              const dist = 200 + Math.random() * 160;
              btn.style.transition = 'transform 260ms cubic-bezier(.4,0,1,1), opacity 200ms ease';
              btn.style.transform = `translate(${Math.cos(angle) * dist}px,${Math.sin(angle) * dist}px) rotate(${(Math.random() - 0.5) * 480}deg) scale(0.15)`;
              btn.style.opacity = '0';
            });
          }, 70);
        }

        if (!REDUCED_MOTION) {
          setTimeout(() => {
            correctBtn.style.transition = 'transform 110ms ease, opacity 90ms ease';
            correctBtn.style.transform = 'scale(1.25)';
            correctBtn.style.opacity = '0';
            const r = correctBtn.getBoundingClientRect();
            const ovr = overlay.getBoundingClientRect();
            const cx = r.left - ovr.left + r.width / 2;
            const cy = r.top - ovr.top + r.height / 2;
            const colors = [palette.accent, palette.accent2, '#ffffff', '#00ff64'];
            const particles = document.createDocumentFragment();
            const count = config.correctParticles || 20;
            for (let i = 0; i < effectCount(count); i++) {
              const p = document.createElement('div');
              const angle = (i / count) * Math.PI * 2;
              const dist = 50 + Math.random() * 100;
              const size = 5 + Math.random() * 7;
              p.className = config.particleClass;
              p.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'};background:${colors[Math.floor(Math.random() * colors.length)]};pointer-events:none;z-index:10;--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist}px;--pdur:${240 + Math.random() * 140}ms;--pdelay:${Math.random() * 30}ms;animation:${config.particleAnimation} var(--pdur) ease-out var(--pdelay) both;`;
              p.addEventListener('animationend', () => p.remove());
              particles.appendChild(p);
            }
            overlay.appendChild(particles);
          }, 90);
        }

        if (!REDUCED_MOTION) {
          setTimeout(() => {
            flashEl.style.background = palette.accent;
            flashEl.style.opacity = '0.45';
            setTimeout(() => {
              flashEl.style.background = '#ffffff';
              flashEl.style.opacity = '0.75';
              setTimeout(() => { flashEl.style.opacity = '0'; flashEl.style.background = ''; }, 55);
            }, 35);
          }, 110);
        }

        setTimeout(() => {
          if (current >= queue.length) {
            stopTimer();
            stopBGM();
            showWin(clearElapsed ?? elapsed);
          } else {
            optionsEl.style.visibility = 'hidden';
            renderQuestion();
            if (scrollEl) scrollEl.scrollTop = 0;
            requestAnimationFrame(() => { optionsEl.style.visibility = ''; });
          }
        }, config.nextDelay || 200);
      }

      function emitWrongMicroFeedback(wrongBtn) {
        const r = wrongBtn.getBoundingClientRect();
        const ovr = overlay.getBoundingClientRect();
        const cx = r.left - ovr.left + r.width / 2;
        const cy = r.top - ovr.top + r.height / 2;
        const count = isMinimalPower() ? 0 : isLowPower() ? 3 : 4;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const spark = document.createElement('span');
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.25;
          const distance = 18 + Math.random() * 22;
          spark.className = 'booha-blitz-wrong-spark';
          spark.style.cssText = `left:${cx}px;top:${cy}px;--sx:${Math.cos(angle) * distance}px;--sy:${Math.sin(angle) * distance}px;--spark-delay:${Math.random() * 20}ms;`;
          spark.addEventListener('animationend', () => spark.remove(), { once: true });
          fragment.appendChild(spark);
        }
        overlay.appendChild(fragment);
        flashEl.style.background = palette.wrong?.color || '#ff536d';
        flashEl.style.opacity = '0.3';
        setTimeout(() => {
          flashEl.style.opacity = '0';
          flashEl.style.background = '';
        }, 120);
      }

      function showWrongPopup(correct) {
        const scold = config.scolds[Math.floor(Math.random() * config.scolds.length)];
        const wrongJp = overlay.querySelector(selector('wrongJp'));
        const wrongHira = overlay.querySelector(selector('wrongHira'));
        const scoldJp = overlay.querySelector(selector('scoldJp'));
        const scoldHira = overlay.querySelector(selector('scoldHira'));
        const status = wrongPopup.querySelector('[id$="-wrong-status"]');
        renderFurigana(wrongJp, correct.jp, correct.hira);
        renderFurigana(scoldJp, scold.jp, scold.hira);
        wrongHira.textContent = correct.hira;
        scoldHira.textContent = scold.hira;
        wrongHira.hidden = true;
        scoldHira.hidden = true;
        overlay.querySelector(selector('wrongEn')).textContent = correct.en;
        overlay.querySelector(selector('scoldEn')).textContent = scold.en;
        const statusByFeel = {
          playful: `${spotlight.playerName}, BUMP! LET'S BOUNCE BACK.`,
          arcade: `${spotlight.playerName}, CHAIN BROKEN — RELOAD!`,
          sleek: `${spotlight.playerName}, LINK LOST — TRY AGAIN.`,
        };
        if (status) status.textContent = statusByFeel[palette.feel] || statusByFeel.playful;
        wrongPopup.classList.remove('wrong-feel-playful', 'wrong-feel-arcade', 'wrong-feel-sleek');
        wrongPopup.classList.add(`wrong-feel-${palette.feel || 'playful'}`);
        overlay.classList.add('wrong-active');
        wrongPopup.scrollTop = 0;
        wrongPopup.classList.add('show');
      }

      function recoverFromWrong() {
        if (!wrongPopup.classList.contains('show')) return;
        wrongPopup.classList.remove('show');
        wrongPopup.scrollTop = 0;
        overlay.classList.remove('wrong-active');
        streak = 0;
        elapsed = 0;
        clearElapsed = null;
        startTime = performance.now();
        runIsActive = true;
        visibilityPaused = false;
        lastTimerPaint = -Infinity;
        timerEl.textContent = '0.00s';
        renderQuestion(true);
        startBGM();
        scheduleTimerTick(0);
        requestAnimationFrame(() => optionsEl.querySelector(`.${config.optionClass}`)?.focus());
      }

      function handleAnswer(btn, chosen, correct) {
        if (locked) return;
        locked = true;
        startBGM();
        if (chosen.n === correct.n) {
          btn.classList.add('correct');
          current++;
          updateStreak();
          playCorrectHit();
          if (current >= queue.length) clearElapsed = performance.now() - startTime;
          correctDetonate(btn);
          return;
        }

        btn.classList.add('wrong');
        runIsActive = false;
        visibilityPaused = false;
        runEligibleForRecord = false;
        spotlight.resetStreak();
        setBackground(0);
        optionsEl.querySelectorAll(`.${config.optionClass}`).forEach(b => {
          if (b.textContent === correct.en) b.classList.add('correct');
        });
        emitWrongMicroFeedback(btn);
        playWrongHit();
        if (!REDUCED_MOTION) overlay.classList.add('shake');
        overlay.addEventListener('animationend', () => overlay.classList.remove('shake'), { once: true });
        stopTimer();
        stopBGM();
        setTimeout(() => showWrongPopup(correct), config.wrongDelay || 320);
      }

      function renderQuestion(recover = false) {
        locked = false;
        const card = queue[current];
        bgIndex++;
        setBackground(streak);
        jpWordEl.style.animation = 'none';
        hiraEl.style.animation = 'none';
        requestAnimationFrame(() => {
          jpWordEl.style.animation = '';
          hiraEl.style.animation = '';
          jpWordEl.textContent = card.jp;
          hiraEl.textContent = card.hira;
        });
        progressEl.textContent = `${current + 1} / ${queue.length}`;
        const wrong = shuffle(weekCards.filter(c => c.n !== card.n)).slice(0, 5);
        const options = shuffle([card, ...wrong]);
        optionsEl.innerHTML = '';
        options.forEach((opt, index) => {
          const btn = document.createElement('button');
          btn.className = config.optionClass;
          if (recover) {
            btn.classList.add('blitz-recover');
            btn.style.setProperty('--recover-index', String(index));
          } else {
            btn.classList.add('blitz-enter');
            btn.style.setProperty('--blitz-enter-delay', `${index * (palette.motion?.optionStaggerMs || 36)}ms`);
          }
          btn.type = 'button';
          btn.textContent = opt.en;
          btn.addEventListener('click', () => handleAnswer(btn, opt, card));
          optionsEl.appendChild(btn);
        });
        if (current === 0 && startTime === null && gameStarted) startTime = performance.now();
      }

      function beginGame() {
        if (gameStarted) return;
        gameStarted = true;
        runEligibleForRecord = true;
        startBGM();
        playStartSting();
        startCard.card.classList.add('launching');
        setTimeout(() => {
          overlay.classList.remove('blitz-awaiting-start');
          startCard.card.remove();
          startTime = performance.now();
          runIsActive = true;
          visibilityPaused = false;
          scheduleTimerTick(0);
          overlay._boohaBlitzPerformanceCleanup = monitorFramePerformance(
            overlay,
            ({ tier }) => {
              if (tier === 'minimal') enableRuntimeLowPower(overlay);
              else if (tier === 'reduced') enableRuntimeReducedPower(overlay);
            },
          );
          spotlight.announce(`${spotlight.playerName}, GO!`);
        }, 140);
      }

      function showWin(ms) {
        runIsActive = false;
        visibilityPaused = false;
        const weekId = makeWeekId(monthSlug, weekNumber);
        const recordEligible = runEligibleForRecord;
        const result = recordEligible
          ? saveBestTime(config.gameType, config.legacyKey, curr, ms, weekId)
          : {
            isWeeklyRecord: false,
            isAllTimeRecord: false,
            oldRecord: getBestScore(config.gameType, config.legacyKey, curr),
            newScore: null,
            saveFailed: false,
          };
        if (result.saveFailed) console.error(`[${config.apiName}] Time not saved:`, ms, 'ms');

        document.dispatchEvent(new CustomEvent('booha:gameEnd', {
          detail: {
            saveId: `blitz:${curr}:${config.saveId}`,
            score: 100,
            completed: true,
            recordEligible,
            ...(recordEligible ? { time: ms } : {}),
          },
        }));

        const best = getBestScore(config.gameType, config.legacyKey, curr);
        const weekly = getWeeklyScore(config.gameType, curr, weekId);
        const playerName = getPlayerName();
        const isRecord = result.isAllTimeRecord;
        const oldRecord = result.oldRecord;
        winScreen.classList.toggle('record-mode', isRecord);
        winScreen.classList.add('blitz-finish');
        winScreen.classList.add('residual-run');
        winScreen.style.setProperty('--blitz-finish-accent', isRecord ? '#ffd700' : (palette.rewardColors?.[1] || palette.accent));
        winScreen.style.setProperty('--blitz-finish-glow', isRecord ? 'rgba(255, 215, 0, .34)' : (palette.rewardGlow || palette.glow));
        const finishGradient = palette.rewardColors?.length
          ? palette.rewardColors.join(', ')
          : `${palette.accent}, ${palette.accent2}, #ffffff`;
        winScreen.style.setProperty('--blitz-finish-gradient', `linear-gradient(90deg, ${finishGradient})`);
        winScreen.querySelector(selector('winName')).textContent = playerName;
        winScreen.querySelector(selector('winScream')).textContent = isRecord ? config.winCopy.record : config.winCopy.clear;
        winScreen.querySelector(selector('winJp')).textContent = isRecord ? config.winCopy.jp : 'クリア。';
        const timeEl = winScreen.querySelector(selector('winTime'));
        timeEl.textContent = fmtTime(ms);
        timeEl.style.color = isRecord ? '#ffd700' : palette.timerColor;
        timeEl.style.textShadow = isRecord
          ? '0 0 28px rgba(255,215,0,1), 0 0 70px rgba(255,90,0,0.75)'
          : `0 0 32px ${palette.glow}, 0 0 64px ${palette.glow}`;
        const recordEl = winScreen.querySelector(selector('winRecord'));
        const bestEl = winScreen.querySelector(selector('winBest'));
        const deltaEl = winScreen.querySelector(selector('winDelta'));
        recordEl.classList.toggle('big', isRecord);
        if (isRecord) {
          recordEl.textContent = '🏆 NEW BOOHA RECORD';
          bestEl.textContent = `PERSONAL BEST: ${fmtTime(ms)}`;
          deltaEl.textContent = oldRecord ? `-${fmtTime(oldRecord.ms - ms)} faster than previous best` : 'FIRST PERSONAL BEST';
        } else if (isMasteryClear) {
          recordEl.textContent = 'MASTERY CLEAR · NO RECORD';
          bestEl.textContent = best ? `PERSONAL BEST: ${fmtTime(best.ms)}${best.name ? ` — ${best.name}` : ''}` : 'PERSONAL BEST: --';
          deltaEl.textContent = 'RETRY RUN — RECORDS REQUIRE A CLEAN START';
        } else {
          recordEl.textContent = result.isWeeklyRecord ? 'THIS WEEK’S FASTEST · #1' : 'CLEAR COMPLETE';
          bestEl.textContent = best ? `PERSONAL BEST: ${fmtTime(best.ms)}${best.name ? ` — ${best.name}` : ''}` : 'PERSONAL BEST: --';
          deltaEl.textContent = oldRecord ? `+${fmtTime(ms - oldRecord.ms)} vs previous best` : (weekly ? `THIS WEEK: ${fmtTime(weekly.ms)}` : '');
        }
        const isPerfectRun = recordEligible && bestStreak === queue.length;
        const isMasteryClear = !recordEligible;
        finalCard.streak.textContent = `BEST STREAK ×${bestStreak}`;
        if (finalCard.headline) {
          finalCard.headline.textContent = `${playerName} — ${String(palette.name || 'BOOHA').toUpperCase()} BLITZ`;
        }
        if (finalCard.residual) {
          finalCard.residual.textContent = `${palette.streak?.label || 'STREAK'} ENERGY ×${bestStreak} — STILL GLOWING`;
        }
        finalCard.perfect.hidden = !(isPerfectRun || isMasteryClear);
        finalCard.perfect.textContent = isMasteryClear
          ? 'MASTERY CLEAR · NO RECORD'
          : isPerfectRun ? `PERFECT RUN · ${queue.length}/${queue.length}` : '';
        winScreen.classList.toggle('perfect-mode', isPerfectRun);
        spotlight.nameplate.classList.add('complete');
        spotlight.announce(`${spotlight.playerName}, YOU CLEARED IT!`, true);
        if (isPerfectRun) emitPerfectFlash(overlay, palette, playerName);
        else if (isRecord) emitFinishFlash(overlay, palette, playerName, 'record');
        winScreen.classList.add('show');
        playFinalStinger(isRecord, isPerfectRun);
        startFinalHold(isPerfectRun ? 5600 : isRecord ? 5000 : FINAL_CARD_HOLD_MS);
        celebrate(overlay, palette, isRecord);
      }

      const cleanupAndClose = () => {
        stopFinalHold();
        stopStreakBeat();
        closeGame(overlay, stopTimer, stopBGM);
      };
      overlay.querySelector(selector('wrongClose')).addEventListener('click', recoverFromWrong);
      overlay.querySelector(selector('quit')).addEventListener('click', cleanupAndClose);
      overlay.querySelector(selector('playAgain')).addEventListener('click', () => {
        stopFinalHold();
        stopStreakBeat();
        stopTimer();
        stopBGM();
        overlay._boohaBlitzPerformanceCleanup?.();
        overlay._boohaBlitzViewportCleanup?.();
        overlay._boohaBlitzVisibilityCleanup?.();
        overlay.remove();
        launch({ curr, monthSlug, weekNumber });
      });
      overlay.querySelector(selector('winClose')).addEventListener('click', cleanupAndClose);

      scheduleTimerTick(0);
      renderQuestion();
      spotlight.announce(`${spotlight.playerName}, READY?`);
      startCard.button.addEventListener('click', beginGame);
      requestAnimationFrame(() => startCard.button.focus());
    }

    function launch({ curr, monthSlug, weekNumber }) {
      const palette = config.palettes[curr];
      if (!palette) {
        console.error(`${config.apiName}: unknown curr`, curr);
        return;
      }
      if (!stylesInjected) {
        stylesInjected = true;
        config.injectStyles();
      }
      injectCompositorStyles();
      const path = `content/${curr}/${monthSlug}/${config.dataFile}`;
      fetch(path)
        .then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        })
        .then(data => startGame(data.cards, curr, weekNumber, palette, monthSlug))
        .catch(err => {
          alert(`データが読み込めませんでした。\nCould not load ${config.dataLabel} data.\n(${path})`);
          console.error(`${config.apiName} fetch error:`, err);
        });
    }

    return {
      launch,
      getBestTime: curr => {
        const best = getBestScore(config.gameType, config.legacyKey, curr);
        return best ? best.ms : null;
      },
      fmtTime,
      getWeeklyScore: (curr, weekId) => getWeeklyScore(config.gameType, curr, weekId),
      getBestScore: curr => getBestScore(config.gameType, config.legacyKey, curr),
    };
  }

  return {
    themes: THEMES,
    PERFORMANCE_TIER: HARDWARE_PERFORMANCE_TIER,
    LOW_POWER,
    effectCount,
    fmtTime,
    makeWeekId,
    readSave,
    normalizeScore,
    getPlayerName,
    getRecordScoreFor,
    getWeeklyScoreFor,
    scoreName,
    create,
  };
})();
