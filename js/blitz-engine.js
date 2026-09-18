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
  const STREAK_EVENT_THRESHOLDS = Object.freeze([3, 6, 9, 12, 15]);
  const STREAK_EVENT_NOTES = Object.freeze({
    playful: Object.freeze({
      3: [523, 659], 6: [587, 740, 880], 9: [659, 784, 988],
      12: [784, 988, 1175], 15: [880, 1109, 1319, 1760],
    }),
    arcade: Object.freeze({
      3: [392, 494], 6: [494, 622, 784], 9: [587, 740, 932],
      12: [659, 831, 1047], 15: [784, 988, 1245, 1568],
    }),
    sleek: Object.freeze({
      3: [440, 554], 6: [523, 659, 831], 9: [587, 740, 988],
      12: [659, 831, 1047], 15: [784, 988, 1175, 1568],
    }),
  });
  const TIMER_PAINT_INTERVAL_MS = 100;
  const PERFORMANCE_SETTLE_MS = 2000;
  const PERFORMANCE_WINDOW_MS = 4500;
  const REDUCED_MOTION = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HARDWARE_PERFORMANCE_TIER = typeof navigator !== 'undefined' && (
    (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 2) ||
    (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 2)
  ) ? 'reduced' : 'full';
  const BLITZ_DIAGNOSTIC_ENABLED = (() => {
    try {
      const search = typeof window !== 'undefined' && window.location ? window.location.search : '';
      return typeof URLSearchParams === 'function' && new URLSearchParams(search).get('blitzdiag') === '1';
    } catch {
      return false;
    }
  })();
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

  function createPerformanceDiagnostic(overlay) {
    if (!BLITZ_DIAGNOSTIC_ENABLED) return null;
    const panel = document.createElement('pre');
    panel.className = 'booha-blitz-performance-diagnostic';
    panel.setAttribute('aria-hidden', 'true');
    overlay.appendChild(panel);

    const memory = typeof navigator !== 'undefined' && Number.isFinite(navigator.deviceMemory)
      ? `${navigator.deviceMemory}GB`
      : 'n/a';
    const cores = typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)
      ? String(navigator.hardwareConcurrency)
      : 'n/a';
    const state = {
      status: HARDWARE_PERFORMANCE_TIER === 'minimal' ? 'not sampled' : 'waiting',
      runtimeTier: performanceTier(),
      averageFrameTime: null,
      slowFrames: 0,
      frameCount: 0,
      sampledMs: 0,
    };

    const render = () => {
      const slowPercent = state.frameCount
        ? `${((state.slowFrames / state.frameCount) * 100).toFixed(1)}%`
        : '--';
      const average = Number.isFinite(state.averageFrameTime)
        ? `${state.averageFrameTime.toFixed(1)}ms`
        : '--';
      const sampled = state.sampledMs > 0 ? ` · sampled ${(state.sampledMs / 1000).toFixed(1)}s` : '';
      const activeClasses = Array.from(overlay.classList)
        .filter(name => /power|blitz-compositor/.test(name))
        .join(' ') || 'none';
      panel.textContent = [
        'BLITZ DIAGNOSTIC',
        `HARDWARE TIER  ${HARDWARE_PERFORMANCE_TIER}  (deviceMemory: ${memory} · cores: ${cores})`,
        `RUNTIME TIER   ${state.runtimeTier}  (${state.status}${sampled})`,
        `avg frame      ${average}  slow frames ${slowPercent} (${state.slowFrames}/${state.frameCount})`,
        `reduced-motion ${REDUCED_MOTION}`,
        `active classes ${activeClasses}`,
      ].join('\n');
    };

    render();
    return {
      update(patch = {}) {
        Object.assign(state, patch);
        state.runtimeTier = patch.runtimeTier || performanceTier();
        render();
      },
      destroy() {
        panel.remove();
      },
    };
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

  function monitorFramePerformance(overlay, onPoorPerformance, onProgress) {
    if (HARDWARE_PERFORMANCE_TIER === 'minimal') {
      onProgress?.({
        status: 'not sampled',
        runtimeTier: HARDWARE_PERFORMANCE_TIER,
        averageFrameTime: null,
        slowFrames: 0,
        frameCount: 0,
        sampledMs: 0,
      });
      return () => {};
    }
    const monitorStartedAt = performance.now();
    const settleUntil = monitorStartedAt + PERFORMANCE_SETTLE_MS;
    let startedAt = null;
    let previous = null;
    let frameCount = 0;
    let slowFrames = 0;
    let totalFrameTime = 0;
    let rafId = null;
    let active = true;
    let lastProgressAt = -Infinity;

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
      if (onProgress && now - lastProgressAt >= 250) {
        lastProgressAt = now;
        onProgress({
          status: 'sampling',
          runtimeTier: performanceTier(),
          averageFrameTime: totalFrameTime / Math.max(1, frameCount),
          slowFrames,
          frameCount,
          sampledMs: now - startedAt,
        });
      }
      if (now - startedAt >= PERFORMANCE_WINDOW_MS) {
        const averageFrameTime = totalFrameTime / Math.max(1, frameCount);
        const slowRatio = slowFrames / Math.max(1, frameCount);
        const tier = averageFrameTime >= 30 && slowRatio >= 0.35
          ? 'minimal'
          : averageFrameTime >= 20 && slowRatio >= 0.18 ? 'reduced' : 'full';
        onPoorPerformance({ averageFrameTime, slowFrames, frameCount, sampledMs: now - startedAt, tier });
        onProgress?.({
          status: 'complete',
          runtimeTier: tier,
          averageFrameTime,
          slowFrames,
          frameCount,
          sampledMs: now - startedAt,
        });
        stop();
        return;
      }
      rafId = requestAnimationFrame(sample);
    };
    rafId = requestAnimationFrame(sample);
    return stop;
  }

  // Dead/alive color model: 0% is flat white (the game hasn't "turned on"
  // yet); each correct answer steps the color straight to its new cumulative
  // percentage (correctCount / totalItemsInRun) -- no easing settle, since
  // runs can finish in ~30s and a lingering animation would still be
  // resolving when the next correct answer lands. A wrong answer calls this
  // with 0 and snaps straight back to dead, before the run ends.
  //
  // Colors are interpolated across real stops taken from the curriculum's
  // own palette (white -> its reward "cream" tone -> its accent2 -> its
  // accent) rather than ramping one fixed hue's saturation -- a single-hue
  // ramp was landing on an intense, slightly alarming rose/red instead of
  // the curriculum's actual cute-pastel identity.
  function hexToRgb(hex) {
    const clean = String(hex).replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const num = parseInt(full, 16) || 0;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function mixHex(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }
  // Blends a color toward white by t (0 = unchanged, 1 = full white) --
  // used to derive the option-button fill (barely washed, so the
  // progression color reads at close to full strength where players are
  // actually looking) and the page wash (washed hard, so the full-bleed
  // background stays ambient instead of competing with it).
  function mixRgbTowardWhite(r, g, b, t) {
    return {
      r: Math.round(r + (255 - r) * t),
      g: Math.round(g + (255 - g) * t),
      b: Math.round(b + (255 - b) * t),
    };
  }
  // Perceptual (WCAG relative luminance) rather than raw HSL lightness --
  // HSL lightness misjudges saturated colors like a bright cyan or hot pink,
  // which read as brighter/darker to the eye than their HSL "L" implies.
  function relativeLuminance(r, g, b) {
    const toLinear = c => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
  function progressColorFor(palette, percent) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    const stops = palette.aliveStops || [
      '#ffffff',
      (palette.reward && palette.reward.colors && palette.reward.colors[0]) || palette.accent2 || palette.accent || '#ffe27a',
      palette.accent2 || palette.accent || '#ffe27a',
      palette.accent || '#ff6fb5',
    ];
    if (p <= 0) {
      const { r, g, b } = hexToRgb(stops[0]);
      return { css: stops[0], lightness: 100, r, g, b };
    }
    const segments = stops.length - 1;
    const scaled = p * segments;
    const index = Math.min(segments - 1, Math.floor(scaled));
    const localT = scaled - index;
    const { r, g, b } = mixHex(stops[index], stops[index + 1], localT);
    const lightness = Math.round(relativeLuminance(r, g, b) * 100);
    return { css: `rgb(${r}, ${g}, ${b})`, lightness, r, g, b };
  }

  // Players spend the whole run looking at the kanji and the answer
  // options, not the streak meter or the page edges -- so the option
  // buttons now carry the primary color signal at close to full strength,
  // while the full-bleed page background is pulled back toward white so it
  // reads as ambient light instead of competing for attention.
  function optionSurfaceFor(palette, percent) {
    const { r, g, b } = progressColorFor(palette, percent);
    const washed = mixRgbTowardWhite(r, g, b, 0.12);
    const lightness = Math.round(relativeLuminance(washed.r, washed.g, washed.b) * 100);
    return { css: `rgb(${washed.r}, ${washed.g}, ${washed.b})`, lightness };
  }

  function pageWashFor(palette, percent) {
    const { r, g, b } = progressColorFor(palette, percent);
    const washed = mixRgbTowardWhite(r, g, b, 0.55);
    const lightness = Math.round(relativeLuminance(washed.r, washed.g, washed.b) * 100);
    return { css: `rgb(${washed.r}, ${washed.g}, ${washed.b})`, lightness };
  }

  // Text/UI ink flips from dark to light only once the background itself has
  // gotten dark/saturated enough to need it -- true for roughly the last
  // stretch of a run, never during the mostly-pale early game.
  function inkFor(lightness) {
    return lightness < 58 ? '#ffffff' : '#14161c';
  }

  // A crisp outline only matters once the ink itself has flipped pale/white
  // -- dark ink already reads fine against these light-to-mid pastel
  // surfaces on its own and doesn't need one.
  function inkOutlineFor(lightness) {
    return lightness < 58 ? 'rgba(20, 22, 28, .55)' : 'transparent';
  }

  // Scales a palette's static glow color's alpha by progress percent, so the
  // kanji's colored halo starts fully invisible at 0% (dead) and builds in
  // alongside the background/border as the run progresses, instead of
  // showing at full strength from the very first question.
  function glowForPercent(palette, percent) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    const glow = palette.glow || 'rgba(255,255,255,0)';
    const match = glow.match(/rgba?\(([^)]+)\)/i);
    if (!match) return glow;
    const parts = match[1].split(',').map(s => s.trim());
    const [r, g, b] = parts;
    const baseAlpha = parts.length > 3 ? parseFloat(parts[3]) : 1;
    const alpha = Math.round((baseAlpha * p) * 1000) / 1000;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

  const SPEED_TARGETS = Object.freeze({
    vocab: 45000,
    sentences: 60000,
    questions: 58000,
  });

  function speedTargetFor(config) {
    const baseline = Number(config.speedTargetMs) > 0
      ? Number(config.speedTargetMs)
      : Number(SPEED_TARGETS[config.gameType]) || 90000;
    return Math.round(baseline);
  }

  function speedTargetForGame(gameType) {
    return Number(SPEED_TARGETS[gameType]) || 90000;
  }

  function speedBandFor(ms, targetMs) {
    if (ms <= targetMs * 0.75) return 'elite';
    if (ms <= targetMs) return 'target';
    return 'clear';
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

  function saveBestTime(gameType, legacyKey, curr, ms, weekId, resultMeta = {}) {
    try {
      const data = readSave();
      const blitz = ensureBlitzStore(data, gameType, weekId);
      const playerName = getPlayerName();
      const oldWeekly = normalizeScore(blitz.weekly[gameType][curr]);
      const oldRecord = normalizeScore(blitz.records[gameType][curr]);
      const legacy = normalizeScore(legacyScore(data, legacyKey, curr));
      const bestBefore = [oldRecord, legacy].filter(Boolean).sort((a, b) => a.ms - b.ms)[0] || null;
      const newScore = { ms, name: playerName, date: new Date().toISOString(), ...resultMeta };
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
        newScore: { ms, name: getPlayerName(), date: new Date().toISOString(), ...resultMeta },
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
      /* Slim, cheap, always-legible progress signal -- a single filled bar
         at the very top of the screen, separate from the background color
         wash, so how much of the run is done is never ambiguous. */
      .booha-blitz-progress-meter {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 5px;
        z-index: 6;
        background: rgba(0, 0, 0, .08);
        pointer-events: none;
      }
      .booha-blitz-progress-meter-fill {
        height: 100%;
        width: 0%;
        background: var(--blitz-accent, #ff6fb5);
        box-shadow: 0 0 10px var(--blitz-accent, #ff6fb5);
        transition: width 160ms ease;
      }
      .booha-blitz-performance-diagnostic {
        position: fixed;
        top: max(env(safe-area-inset-top, 0px) + 8px, 8px);
        left: max(env(safe-area-inset-left, 0px) + 8px, 8px);
        z-index: 120;
        margin: 0;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,.38);
        border-radius: 6px;
        background: rgba(0,0,0,.78);
        color: #ffffff;
        font: 10px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        white-space: pre;
        pointer-events: none;
        text-align: left;
      }
      #vb-overlay, #sb-overlay, #qb-overlay {
        height: 100vh;
        height: var(--blitz-viewport-height, 100dvh);
        max-height: var(--blitz-viewport-height, 100dvh);
      }
      .blitz-compositor::before {
        content: '';
        position: fixed;
        inset: -15%;
        z-index: 0;
        pointer-events: none;
        background:
          radial-gradient(46% 34% at 24% 38%, color-mix(in srgb, var(--blitz-accent) 42%, transparent), transparent 72%),
          radial-gradient(42% 36% at 78% 66%, color-mix(in srgb, var(--blitz-accent) 30%, transparent), transparent 74%);
        opacity: .10;
        transform: translate3d(0, 0, 0) scale(1);
        animation: boohaBlitzAurora 9s ease-in-out infinite alternate;
      }
      .booha-blitz-atmosphere {
        position: absolute;
        inset: -8%;
        z-index: 0;
        pointer-events: none;
        opacity: .12;
        transform: translate3d(0, 0, 0) scale(1.02);
        animation: boohaBlitzAtmosphere 11s ease-in-out infinite alternate;
      }
      .booha-blitz-atmosphere-playful {
        background:
          radial-gradient(circle at 18% 78%, rgba(255, 79, 171, .42), transparent 35%),
          radial-gradient(circle at 82% 24%, rgba(255, 226, 122, .28), transparent 34%);
      }
      .booha-blitz-atmosphere-arcade {
        background:
          repeating-linear-gradient(135deg, transparent 0 42px, rgba(0, 255, 238, .13) 44px 47px, transparent 50px 100px),
          linear-gradient(115deg, rgba(0, 255, 238, .18), transparent 44%, rgba(57, 255, 20, .14));
      }
      .booha-blitz-atmosphere-sleek {
        background:
          linear-gradient(115deg, transparent 0 34%, rgba(240, 201, 106, .18) 42%, transparent 50%),
          linear-gradient(245deg, transparent 0 58%, rgba(223, 234, 255, .14) 66%, transparent 74%);
      }
      .blitz-compositor.low-power::before,
      .blitz-compositor.reduced-power::before,
      .blitz-compositor.low-power .booha-blitz-atmosphere,
      .blitz-compositor.reduced-power .booha-blitz-atmosphere {
        animation: none;
        opacity: .06;
      }
      @keyframes boohaBlitzAurora {
        from { opacity: .10; transform: translate3d(-1%, 1%, 0) scale(1); }
        to { opacity: .22; transform: translate3d(1%, -1%, 0) scale(1.04); }
      }
      @keyframes boohaBlitzAtmosphere {
        from { opacity: .08; transform: translate3d(-1%, 0, 0) scale(1.02); }
        to { opacity: .18; transform: translate3d(1%, -1%, 0) scale(1.06); }
      }
      @media (min-width: 900px) and (orientation: landscape) {
        .booha-blitz-feedback {
          grid-column: 1 / -1;
          grid-row: 2;
          align-self: start;
          justify-self: stretch;
          width: 100%;
        }
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
      #vb-wrong-popup.blitz-wrong-feedback.show.closing,
      #sb-wrong-popup.blitz-wrong-feedback.show.closing,
      #qb-wrong-popup.blitz-wrong-feedback.show.closing {
        animation: boohaBlitzWrongCardOut 180ms ease both;
        pointer-events: none;
      }
      #vb-wrong-popup.blitz-wrong-feedback #vb-wrong-close.is-pressed,
      #sb-wrong-popup.blitz-wrong-feedback #sb-wrong-close.is-pressed,
      #qb-wrong-popup.blitz-wrong-feedback #qb-wrong-close.is-pressed {
        transform: translateY(2px) scale(.98);
        opacity: .72;
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
        font-size: clamp(28px, 8vw, 72px);
        line-height: 1.55;
        overflow-wrap: anywhere;
        text-wrap: balance;
        overflow: visible;
      }
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-hira,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-hira,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-hira,
      #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-scold-hira,
      #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-scold-hira,
      #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-scold-hira {
        display: block;
        box-sizing: border-box;
        width: min(100%, 760px);
        max-width: 100%;
        padding-inline: 8px;
        line-height: 1.5;
        white-space: normal;
        overflow-wrap: anywhere;
        text-wrap: balance;
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
      @keyframes boohaBlitzWrongCardOut {
        from { opacity: 1; transform: translate(-50%, 0) scale(1); }
        to { opacity: 0; transform: translate(-50%, 10px) scale(.98); }
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
      .booha-blitz-start-target,
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
        -webkit-text-stroke: clamp(1px, .28vw, 3px) rgba(35, 16, 38, .42);
        paint-order: stroke fill;
        text-shadow: 0 0 18px #fff, 0 0 42px var(--blitz-start-glow, var(--blitz-glow));
      }
      .booha-blitz-start-exit {
        position: absolute;
        top: max(env(safe-area-inset-top, 0px) + 16px, 16px);
        right: max(env(safe-area-inset-right, 0px) + 16px, 16px);
        z-index: 3;
        appearance: none;
        border: 1px solid rgba(35, 16, 38, .32);
        border-radius: 999px;
        padding: 8px 15px;
        color: rgba(35, 16, 38, .78);
        background: rgba(255,255,255,.68);
        box-shadow: 0 4px 16px rgba(35,16,38,.16);
        font-size: 12px;
        font-weight: 950;
        letter-spacing: 1px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .booha-blitz-start-exit:active { transform: scale(.96); }
      #vb-quit,
      #sb-quit,
      #qb-quit {
        color: #241b2a;
        background: rgba(255,255,255,.9);
        border-color: rgba(36,27,42,.34);
        box-shadow: 0 3px 14px rgba(0,0,0,.2);
        text-shadow: none;
      }
      #vb-quit:hover,
      #sb-quit:hover,
      #qb-quit:hover,
      #vb-quit:focus-visible,
      #sb-quit:focus-visible,
      #qb-quit:focus-visible {
        background: #fff;
        border-color: rgba(36,27,42,.62);
        outline: 2px solid var(--blitz-accent, #ff6fb5);
        outline-offset: 2px;
      }
      .booha-blitz-start-copy {
        color: rgba(255,255,255,.76);
        font-size: clamp(12px, 2.6vw, 18px);
        letter-spacing: 1.2px;
      }
      .booha-blitz-start-target {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 4px;
        padding: 8px 14px;
        border: 1px solid color-mix(in srgb, var(--blitz-start-accent, var(--blitz-accent)) 72%, transparent);
        border-radius: 999px;
        background: rgba(0,0,0,.24);
        color: #fff6cf;
        font-size: clamp(12px, 2.4vw, 17px);
        font-weight: 900;
        letter-spacing: 1px;
        text-shadow: 0 0 12px var(--blitz-start-accent, var(--blitz-accent));
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
        isolation: isolate;
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms ease, border-color 180ms ease,
          background 180ms ease, box-shadow 180ms ease;
        will-change: transform, opacity;
      }
      .booha-blitz-nameplate::after {
        content: '';
        position: absolute;
        inset: -8px;
        z-index: -1;
        border-radius: inherit;
        background: radial-gradient(ellipse at center, var(--streak-color, var(--blitz-accent)), transparent 72%);
        opacity: 0;
        transform: scale(.94);
        pointer-events: none;
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
        animation: boohaBlitzStreakHold 900ms ease-out both;
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
      .booha-blitz-nameplate.streak-event-6 {
        border-width: 3px;
        box-shadow: 0 0 34px var(--streak-event-color), 0 0 64px var(--blitz-streak-glow);
      }
      .booha-blitz-nameplate.streak-event-9 {
        border-width: 3px;
        box-shadow: 0 0 38px var(--streak-event-color), 0 0 76px var(--blitz-streak-glow);
      }
      .booha-blitz-nameplate.streak-event-12 {
        border-width: 3px;
        box-shadow: 0 0 44px var(--streak-event-color), 0 0 88px var(--blitz-streak-glow);
      }
      .booha-blitz-nameplate.streak-event-15 {
        border-width: 4px;
        box-shadow: 0 0 52px var(--streak-event-color), 0 0 108px var(--blitz-streak-glow);
      }
      .blitz-compositor.streak-tier-1 { --blitz-word-glow: 40px; }
      .blitz-compositor.streak-tier-2 { --blitz-word-glow: 54px; }
      .blitz-compositor.streak-tier-3 { --blitz-word-glow: 70px; }
      .blitz-compositor.streak-tier-4 { --blitz-word-glow: 88px; }
      .blitz-compositor.streak-tier-5 { --blitz-word-glow: 112px; }
      .blitz-compositor.streak-tier-2 .booha-blitz-nameplate,
      .blitz-compositor.streak-tier-3 .booha-blitz-nameplate,
      .blitz-compositor.streak-tier-4 .booha-blitz-nameplate,
      .blitz-compositor.streak-tier-5 .booha-blitz-nameplate { animation: none; }
      .blitz-compositor.streak-tier-2 .booha-blitz-nameplate::after,
      .blitz-compositor.streak-tier-3 .booha-blitz-nameplate::after,
      .blitz-compositor.streak-tier-4 .booha-blitz-nameplate::after,
      .blitz-compositor.streak-tier-5 .booha-blitz-nameplate::after { animation: boohaBlitzChargedNameplate 2.4s ease-in-out infinite; }
      .blitz-compositor.streak-tier-4 .booha-blitz-nameplate,
      .blitz-compositor.streak-tier-5 .booha-blitz-nameplate { font-size: clamp(12px, 3.2vw, 21px); }
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
      .booha-blitz-nameplate.streak-event-live {
        transform: translate(-50%, -50%) scale(var(--streak-event-scale, 1.02));
      }
      .blitz-feel-sleek.streak-event-live { transform: translate(-50%, -50%) scale(var(--streak-event-scale, 1.002)); }
      .blitz-feel-playful .booha-blitz-nameplate.streak-event-6::before,
      .blitz-feel-playful .booha-blitz-nameplate.streak-event-9::before {
        content: '✦';
        position: absolute;
        left: -18px;
        color: var(--streak-color);
        font-size: 18px;
        text-shadow: 0 0 12px var(--streak-color);
      }
      .blitz-feel-playful .booha-blitz-nameplate.streak-event-9::after {
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
      .blitz-feel-arcade .booha-blitz-nameplate.streak-event-6::before {
        content: 'COMBO';
        position: absolute;
        top: -10px;
        right: 12px;
        color: #39ff14;
        font-size: 8px;
        letter-spacing: 1.5px;
        text-shadow: 0 0 10px #00ffee;
      }
      .blitz-feel-arcade .booha-blitz-nameplate.streak-event-9::before {
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
      .blitz-compositor.correct-impact::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 80;
        pointer-events: none;
        background: radial-gradient(closest-side, transparent 55%, var(--blitz-glow) 100%);
        opacity: 0;
        animation: boohaBlitzCorrectImpactWash 320ms ease-out both;
      }
      .blitz-feel-sleek .booha-blitz-nameplate.streak-event-9 {
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
      @keyframes boohaBlitzChargedWash {
        0%, 100% { opacity: .10; }
        50% { opacity: .30; }
      }
      @keyframes boohaBlitzCorrectImpactWash {
        0%, 100% { opacity: 0; }
        35% { opacity: .85; }
      }
      @keyframes boohaBlitzChargedNameplate {
        0%, 100% { opacity: .08; transform: scale(.94); }
        50% { opacity: .28; transform: scale(1.04); }
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
      .blitz-compositor.milestone-center .booha-blitz-callout {
        position: fixed;
        top: 50%;
        z-index: 90;
        max-width: 92vw;
        font-size: clamp(34px, 8vw, 120px);
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
        /* Was a translucent pale-yellow fill (alpha .34) riding on top of an
           animation that ALSO fades opacity -- the two multiplied together
           left it nearly invisible. Solid cream fill + a real dark outline
           reads at every step of the animation, against both the fire
           wallpaper's own dark gradient and the lighter pastel page behind it. */
        color: #fff8e6;
        -webkit-text-stroke: 1.5px rgba(90, 6, 0, .75);
        paint-order: stroke fill;
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
        68% { opacity: .88; transform: rotate(-12deg) scale(1) translateY(-4px); }
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
      .booha-blitz-perfect-flash.speed {
        background: radial-gradient(circle at 50% 48%, rgba(255,255,255,.96), var(--blitz-accent) 14%, var(--blitz-glow) 30%, transparent 72%);
      }
      .booha-blitz-perfect-flash.speed .booha-blitz-perfect-flash-label {
        color: #fffbe1;
        text-shadow: 0 0 12px #fff, 0 0 40px var(--blitz-accent), 0 0 92px var(--blitz-glow);
      }
      .booha-blitz-perfect-flash.clear {
        background: radial-gradient(circle at 50% 48%, rgba(255,255,255,.42), var(--blitz-glow) 14%, transparent 56%);
      }
      .booha-blitz-perfect-flash.clear .booha-blitz-perfect-flash-label {
        font-size: clamp(26px, 8vw, 68px);
        text-shadow: 0 0 10px #fff, 0 0 28px var(--blitz-accent), 0 0 52px var(--blitz-glow);
      }
      .booha-blitz-perfect-flash.record { animation-duration: 1050ms; }
      #vb-win.climax-awaiting > *,
      #sb-win.climax-awaiting > *,
      #qb-win.climax-awaiting > * { visibility: hidden; }
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
        font-size: .42em;
        font-weight: 700;
        letter-spacing: .08em;
        line-height: 1.4;
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
        .blitz-compositor.streak-tier-4 .booha-blitz-prompt,
        .blitz-compositor.streak-tier-5 .booha-blitz-prompt,
        .blitz-compositor.streak-tier-4 .booha-blitz-answer,
        .blitz-compositor.streak-tier-5 .booha-blitz-answer,
        .blitz-compositor.streak-tier-2 .booha-blitz-nameplate,
        .blitz-compositor.streak-tier-3 .booha-blitz-nameplate,
        .blitz-compositor.streak-tier-4 .booha-blitz-nameplate,
        .blitz-compositor.streak-tier-5 .booha-blitz-nameplate,
        .blitz-compositor.streak-tier-2 .booha-blitz-nameplate::after,
        .blitz-compositor.streak-tier-3 .booha-blitz-nameplate::after,
        .blitz-compositor.streak-tier-4 .booha-blitz-nameplate::after,
        .blitz-compositor.streak-tier-5 .booha-blitz-nameplate::after { animation: none; }
        .blitz-compositor.correct-impact::after { animation: none !important; opacity: .65 !important; }
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
        }
        #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-hira,
        #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-hira,
        #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-hira,
        #vb-wrong-popup.blitz-wrong-feedback .vb-wrong-scold-hira,
        #sb-wrong-popup.blitz-wrong-feedback .sb-wrong-scold-hira,
        #qb-wrong-popup.blitz-wrong-feedback .qb-wrong-scold-hira {
          font-size: clamp(12px, 3.2vh, 20px);
          line-height: 1.45;
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

  function createStartCard(overlay, palette, speedTarget) {
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
    const target = document.createElement('div');
    target.className = 'booha-blitz-start-target';
    target.textContent = `TARGET ${fmtTime(speedTarget.targetMs)} · YOUR BEST ${fmtTime(speedTarget.bestMs)}`;
    const copy = document.createElement('div');
    copy.className = 'booha-blitz-start-copy';
    copy.textContent = 'Tap to start the run · タップしてスタート';
    const button = document.createElement('button');
    button.className = 'booha-blitz-start-button';
    button.type = 'button';
    button.textContent = 'START BLITZ →';
    const exitButton = document.createElement('button');
    exitButton.className = 'booha-blitz-start-exit';
    exitButton.type = 'button';
    exitButton.textContent = 'EXIT / やめる';
    exitButton.addEventListener('click', () => {
      overlay.querySelector('#vb-quit, #sb-quit, #qb-quit')?.click();
    });
    card.append(kicker, title, target, copy, button, exitButton);
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
          position: relative;
          isolation: isolate;
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
        #${config.overlayId}.blitz-compositor.streak-tier-4 .${config.optionClass}::after,
        #${config.overlayId}.blitz-compositor.streak-tier-5 .${config.optionClass}::after {
          background: linear-gradient(135deg, var(--streak-color, var(--blitz-accent)), transparent 72%);
          opacity: 0;
          transform: none;
          animation: boohaBlitzChargedWash 2.4s ease-in-out infinite;
        }
        #${config.overlayId}.blitz-compositor.streak-tier-3 .${config.optionClass} {
          background: color-mix(in srgb, var(--blitz-option-bg) 92%, var(--streak-color, var(--blitz-accent)) 8%);
        }
        #${config.overlayId}.blitz-compositor.streak-tier-4 .${config.optionClass} {
          background: color-mix(in srgb, var(--blitz-option-bg) 78%, var(--streak-color, var(--blitz-accent)) 22%);
        }
        #${config.overlayId}.blitz-compositor.streak-tier-5 .${config.optionClass} {
          border-width: 3px;
          background: color-mix(in srgb, var(--blitz-option-bg) 62%, var(--streak-color, var(--blitz-accent)) 38%);
          color: #151018;
          text-shadow: none;
        }
        #${config.overlayId}.reduced-power .${config.optionClass}::after,
        #${config.overlayId}.low-power .${config.optionClass}::after {
          animation: none !important;
          opacity: .18 !important;
          transform: none !important;
        }
        #${config.overlayId}.reduced-power.blitz-compositor.correct-impact::after,
        #${config.overlayId}.low-power.blitz-compositor.correct-impact::after {
          animation: none !important;
          opacity: .55 !important;
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
          #${config.overlayId}.blitz-compositor .${config.optionClass}::after {
            transition: none;
            animation: none !important;
          }
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
      overlay.style.setProperty('--blitz-bg-main', '#ffffff');
      overlay.style.setProperty('--blitz-bg-secondary', 'rgba(0,0,0,.03)');
      overlay.style.setProperty('--blitz-ink', '#14161c');
      overlay.style.setProperty('--blitz-ink-outline', 'transparent');
      overlay.style.setProperty('--blitz-progress-color', '#14161c');
      overlay.style.setProperty('--blitz-option-fill', 'rgba(255,255,255,.78)');
      overlay.style.setProperty('--blitz-option-ink', '#14161c');
      overlay.style.setProperty('--blitz-option-ink-outline', 'transparent');
      overlay.style.setProperty('--blitz-correct', palette.correct?.color || '#00ff64');
      overlay.style.setProperty('--blitz-wrong', palette.wrong?.color || '#ff1e1e');
      overlay.style.setProperty('--blitz-popup-bg', palette.popup?.background || 'rgba(0,0,0,.92)');
      overlay.style.setProperty('--blitz-streak-glow', palette.streak?.glow || palette.glow);
      overlay.style.setProperty('--blitz-option-bg', palette.optionBg || 'rgba(255,255,255,.14)');
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
      overlay.style.background = '#ffffff';
      const timer = overlay.querySelector(selector('timer'));
      if (timer) timer.style.color = 'var(--blitz-ink, #14161c)';
    }

    function createProgressMeter(overlay, palette) {
      injectSharedStyles();
      const meter = document.createElement('div');
      meter.className = 'booha-blitz-progress-meter';
      meter.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('div');
      fill.className = 'booha-blitz-progress-meter-fill';
      meter.appendChild(fill);
      overlay.insertBefore(meter, overlay.firstChild);
      return {
        setPercent(percent) {
          const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
          fill.style.width = `${clamped}%`;
        },
      };
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
      const eventClasses = ['streak-event-live', 'streak-event-3', 'streak-event-6', 'streak-event-9', 'streak-event-12', 'streak-event-15'];
      const tierClasses = ['streak-tier-1', 'streak-tier-2', 'streak-tier-3', 'streak-tier-4', 'streak-tier-5'];
      function clearStreakEventClasses() {
        overlay.classList.remove('streak-event-live');
        overlay.classList.remove('milestone-center');
        nameplate.classList.remove(...eventClasses);
        nameplate.style.removeProperty('--streak-event-scale');
      }
      function emitStreakSparks() {
        const threshold = arguments.length ? arguments[0] : 0;
        if (isMinimalPower() || REDUCED_MOTION) return;
        const fullCount = ({ 3: 6, 6: 12, 9: 20, 12: 32, 15: 48 })[threshold] || 6;
        const count = effectCount(fullCount);
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const spark = document.createElement('span');
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
          const distance = 24 + Math.random() * 32;
          spark.className = `booha-blitz-streak-spark${threshold >= 9 && i === 0 ? ' booha-blitz-streak-spark-large' : ''}`;
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
        const eventScale = ({ 3: 1.02, 6: 1.03, 9: 1.04, 12: 1.06, 15: 1.1 })[threshold] || 1.02;
        overlay.classList.add('streak-event-live');
        if (threshold >= 9) overlay.classList.add('milestone-center');
        nameplate.classList.add('streak-event-live', className, 'streak-hold');
        nameplate.style.setProperty('--streak-event-scale', eventScale);
        emitStreakSparks(threshold);
        const holdMs = ({ 3: 900, 6: 1000, 9: 1120, 12: 1300, 15: 1500 })[threshold] || 900;
        streakHoldTimer = setTimeout(() => nameplate.classList.remove('streak-hold'), holdMs);
        streakEventTimer = setTimeout(clearStreakEventClasses, holdMs);
      }
      function announce(message, final = false, variant = '') {
        announceToken++;
        callout.classList.remove('show');
        callout.classList.toggle('final', final);
        callout.classList.toggle('fire', variant === 'fire');
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

      function setStreak(streak, eventThreshold = 0, runLength = 15) {
        nameplate.classList.remove(...tierClasses);
        overlay.classList.remove(...tierClasses);
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
          overlay.style.removeProperty('--streak-color');
          nameplate.removeAttribute('data-streak');
          nameplate.classList.remove('streak-active');
          overlay.classList.remove(...tierClasses);
          return;
        }
        const tier = Math.min(5, STREAK_EVENT_THRESHOLDS.reduce(
          (level, threshold, index) => streak >= threshold ? index + 2 : level,
          1,
        ));
        const label = palette.streak?.label || 'STREAK';
        const marker = palette.streak?.marker || '★';
        nameplate.classList.add('streak-active', `streak-tier-${tier}`);
        overlay.classList.add(`streak-tier-${tier}`);
        nameplate.dataset.streak = String(streak);
        const streakColors = palette.streak?.colors || [];
        const colorIndex = eventThreshold
          ? Math.max(0, STREAK_EVENT_THRESHOLDS.indexOf(eventThreshold))
          : Math.min(streakColors.length - 1, Math.max(0, tier - 1));
        if (streakColors[colorIndex]) {
          nameplate.style.setProperty('--streak-color', streakColors[colorIndex]);
          overlay.style.setProperty('--streak-color', streakColors[colorIndex]);
        }
        nameplate.style.setProperty('--streak-progress', `${Math.min(100, (streak / Math.max(1, runLength)) * 100)}%`);
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
        overlay.querySelector('.booha-blitz-fire-wallpaper')?.remove();
        overlay.querySelectorAll('.booha-blitz-streak-spark').forEach(spark => spark.remove());
        setStreak(0);
      }

      return { playerName, nameplate, callout, announce, clearAnnouncement, setStreak, resetStreak };
    }

    function renderSeparateReading(jpContainer, hiraContainer, jp, hira) {
      jpContainer.textContent = jp;
      jpContainer.classList.remove('booha-blitz-ruby-text');
      jpContainer.setAttribute('aria-label', `${jp} ${hira}`);
      hiraContainer.textContent = hira;
      hiraContainer.hidden = false;
    }

    function emitFinishFlash(overlay, palette, playerName, kind = 'perfect') {
      const flash = document.createElement('div');
      const isRecordFlash = kind === 'record';
      const isSpeedFlash = kind === 'speed';
      const isClearFlash = kind === 'clear';
      flash.className = `booha-blitz-perfect-flash${isRecordFlash ? ' record' : ''}${isSpeedFlash ? ' speed' : ''}${isClearFlash ? ' clear' : ''}`;
      flash.style.setProperty('--blitz-accent', isRecordFlash ? '#ffd700' : palette.accent);
      flash.style.setProperty('--blitz-glow', isRecordFlash ? 'rgba(255,188,35,.72)' : palette.glow);
      const label = document.createElement('div');
      label.className = 'booha-blitz-perfect-flash-label';
      label.textContent = isRecordFlash
        ? `${playerName} · NEW RECORD!`
        : isSpeedFlash ? `${playerName} · SPEED OVERDRIVE!`
          : isClearFlash ? `${playerName} · PERFECT CLEAR!`
            : `${playerName} · PERFECT!`;
      flash.appendChild(label);
      overlay.appendChild(flash);
      setTimeout(() => flash.remove(), REDUCED_MOTION ? 320 : isRecordFlash ? 1050 : isSpeedFlash ? 1150 : isClearFlash ? 650 : 900);
    }

    function emitPerfectFlash(overlay, palette, playerName) {
      emitFinishFlash(overlay, palette, playerName, 'perfect');
    }

    function mountPersistentAtmosphere(overlay, palette) {
      const atmosphere = document.createElement('div');
      atmosphere.className = `booha-blitz-atmosphere blitz-atmosphere-${palette.feel || 'arcade'}`;
      atmosphere.setAttribute('aria-hidden', 'true');
      overlay.insertBefore(atmosphere, overlay.firstChild);
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

    // Scorecard-only final card: no curriculum banner, no headline, no
    // residual-energy line, no badge/flourish/streak/perfect stack -- those
    // were most of the "too much info" on the old completion screen. All
    // that's kept here is the anti-skip hold countdown; every other line on
    // the card is one of the plain winScreen fields populated in showWin().
    function ensureFinalCard(winScreen, palette) {
      const existing = winScreen.querySelector('.booha-blitz-final-card');
      if (existing) {
        return { hold: existing.querySelector('.booha-blitz-final-hold') };
      }

      const card = document.createElement('section');
      card.className = 'booha-blitz-final-card';
      card.setAttribute('aria-label', 'Blitz clear results');
      while (winScreen.firstChild) card.appendChild(winScreen.firstChild);
      winScreen.appendChild(card);

      // The +/- delta line is a quiet, obvious-once-you-see-it detail, not a
      // headline -- move it to the very bottom of the card, below the
      // buttons, rather than where it sat in the old stacked layout.
      const deltaNode = winScreen.querySelector(selector('winDelta'));
      if (deltaNode) card.appendChild(deltaNode);

      const hold = document.createElement('div');
      hold.className = 'booha-blitz-final-hold';
      hold.setAttribute('aria-live', 'polite');
      hold.textContent = 'LOOK AT YOUR CLEAR';

      const playAgain = winScreen.querySelector(selector('playAgain'));
      const buttonGroup = playAgain && playAgain.parentElement;
      if (buttonGroup) card.insertBefore(hold, buttonGroup);
      else card.append(hold);
      return { hold };
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

    function celebrate(overlay, palette, isRecord, speedBand = 'clear') {
      const name = getPlayerName();
      const rewardColors = palette.rewardColors || [palette.accent, palette.accent2, '#ffffff', '#ffea00'];
      const colors = isRecord
        ? (palette.rewardRecordColors || ['#fff4b0', '#ffd700', '#ff8a00', '#ffffff'])
        : rewardColors;
      const finalCard = config.finalCard || {};
      const nameDelay = finalCard.nameDelay ?? 760;
      const spectacleScale = speedBand === 'elite' ? 1.4 : speedBand === 'target' ? 1 : .6;
      const nameCount = Math.max(8, Math.round((finalCard.nameCount ?? 34) * spectacleScale));
      const nameDuration = (finalCard.nameDuration ?? 3800) + (speedBand === 'elite' ? 800 : speedBand === 'target' ? 250 : 0);
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
        for (let i = 0; i < effectCount(isRecord ? 42 : 28); i++) {
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
        for (let i = 0; i < effectCount(isRecord ? nameCount + 6 : nameCount); i++) {
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
        for (let i = 0; i < effectCount(isRecord ? 26 : 18); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          d.className = 'sb-name-drop';
          d.textContent = name;
          d.style.cssText = `left:${Math.random() * W}px;top:${-50 - Math.random() * 160}px;font-size:${14 + Math.random() * (isRecord ? 28 : 22)}px;color:${color};--cx:${(Math.random() - 0.5) * 90}px;--cy:${H * (0.5 + Math.random() * 0.42)}px;--r0:${(Math.random() - 0.5) * 24}deg;--cdur:${1400 + Math.random() * 1000}ms;--cdelay:${Math.random() * 1100}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
        for (let i = 0; i < effectCount(isRecord ? 36 : 24); i++) {
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
          for (let i = 0; i < effectCount(isRecord ? 12 : 8); i++) {
            const line = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            line.className = 'booha-blitz-structure-line';
            line.style.cssText = `left:${10 + Math.random() * 70}%;top:${18 + Math.random() * 64}%;width:${90 + Math.random() * 220}px;background:${color};--line-x:${(Math.random() - .5) * 80}px;--line-dur:${1900 + Math.random() * 800}ms;--line-delay:${nameDelay + Math.random() * 350}ms;`;
            line.addEventListener('animationend', () => line.remove());
            fragment.appendChild(line);
          }
        }
      } else {
        for (let i = 0; i < effectCount(isRecord ? nameCount + 6 : nameCount); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          const toLeft = i % 2 === 1;
          d.className = 'qb-name-streak';
          d.textContent = name;
          d.style.cssText = `left:${toLeft ? W + 60 : -300}px;top:${Math.random() * H}px;font-size:${12 + Math.random() * (isRecord ? 26 : 20)}px;color:${color};--sk:${toLeft ? 14 : -14}deg;--dx:${toLeft ? -(W + 620) : (W + 620)}px;--cdur:${nameDuration + Math.random() * 900}ms;--cdelay:${nameDelay + Math.random() * 500}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
        for (let i = 0; i < effectCount(isRecord ? 22 : 14); i++) {
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
      if (weekCards.length < 15) {
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
      mountPersistentAtmosphere(overlay, palette);
      const performanceDiagnostic = createPerformanceDiagnostic(overlay);
      performanceDiagnostic?.update({ status: 'ready' });

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
            const peak = threshold >= 12 ? 0.065 : threshold >= 9 ? 0.055 : threshold >= 6 ? 0.045 : 0.035;
            gain.gain.exponentialRampToValueAtTime(palette.feel === 'arcade' ? peak : peak * 0.82, startAt + 0.012);
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
            gain.gain.exponentialRampToValueAtTime(isRecord ? 0.07 : isPerfectRun ? 0.06 : 0.035, startAt + 0.014);
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
      const progressMeter = createProgressMeter(overlay, palette);
      const finalCard = ensureFinalCard(winScreen, palette);
      const previousBest = getBestScore(config.gameType, config.legacyKey, curr);
      const speedTarget = {
        bestMs: previousBest?.ms || null,
        targetMs: speedTargetFor(config),
      };
      const startCard = createStartCard(overlay, palette, speedTarget);
      let queue = shuffle(weekCards);
      let current = 0;
      let startTime = null;
      let elapsed = 0;
      let clearElapsed = null;
      let timerId = null;
      let locked = false;
      let backgroundValue = '';
      let lastTimerPaint = -Infinity;
      let gameStarted = false;
      let streak = 0;
      let bestStreak = 0;
      let finalHoldTimer = null;
      let finalHoldInterval = null;
      let runIsActive = false;
      let visibilityPaused = false;
      let mistakeCount = 0;
      let questionOverlayRect = null;
      let feedbackState = 'awaiting-start';
      let recoveryPending = false;
      let runEpoch = 0;
      let impactTimer = null;
      let climaxTimer = null;
      const initialQueueLength = queue.length;

      function setAnswerInputEnabled(enabled) {
        optionsEl.setAttribute('aria-disabled', String(!enabled));
        optionsEl.querySelectorAll(`.${config.optionClass}`).forEach(button => {
          button.disabled = !enabled;
          button.setAttribute('aria-disabled', String(!enabled));
        });
      }

      function bindPointerAction(button, handler) {
        let downId = null;
        let downX = 0;
        let downY = 0;
        let suppressClickUntil = 0;
        button.addEventListener('pointerdown', event => {
          downId = event.pointerId;
          downX = event.clientX;
          downY = event.clientY;
        });
        button.addEventListener('pointerup', event => {
          const sameTouch = event.pointerId === downId;
          const moved = Math.hypot(event.clientX - downX, event.clientY - downY) > 10;
          downId = null;
          if (!sameTouch || moved) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClickUntil = performance.now() + 500;
          handler(event);
        }, { passive: false });
        button.addEventListener('pointercancel', () => { downId = null; });
        button.addEventListener('click', event => {
          if (performance.now() < suppressClickUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          handler(event);
        });
      }

      function setBackground(correctCount = 0) {
        const total = initialQueueLength || queue.length || 1;
        const percent = Math.max(0, Math.min(100, (correctCount / total) * 100));
        const vivid = progressColorFor(palette, percent);
        const page = pageWashFor(palette, percent);
        const option = optionSurfaceFor(palette, percent);
        progressMeter.setPercent(percent);
        const glowColor = glowForPercent(palette, percent);
        overlay.style.setProperty('--blitz-word-glow-color', glowColor);
        overlay.style.setProperty('--blitz-progress-color', percent <= 0 ? '#14161c' : vivid.css);
        // Options carry the main color signal now -- update every tick
        // regardless of whether the page wash itself changed.
        overlay.style.setProperty('--blitz-option-fill', option.css);
        overlay.style.setProperty('--blitz-option-ink', inkFor(option.lightness));
        overlay.style.setProperty('--blitz-option-ink-outline', inkOutlineFor(option.lightness));
        if (page.css === backgroundValue) return;
        backgroundValue = page.css;
        overlay.style.background = page.css;
        overlay.style.setProperty('--blitz-bg-main', page.css);
        overlay.style.setProperty('--blitz-ink', inkFor(page.lightness));
        overlay.style.setProperty('--blitz-ink-outline', inkOutlineFor(page.lightness));
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
        spotlight.setStreak(streak, eventThreshold, initialQueueLength);
        setBackground(streak);
        if (eventThreshold) {
          playStreakBeat(eventThreshold);
          if (palette.feel === 'playful') emitFireWallpaper(overlay, spotlight.playerName, eventThreshold);
          const copy = {
            playful: {
              3: '×3 — NICE!', 6: '×6 — HOT!', 9: '×9 — WILD!', 12: '×12 — RIDICULOUS!',
              15: `${spotlight.playerName}, PERFECT RUN!`,
            },
            arcade: {
              3: 'COMBO ×3', 6: 'COMBO ×6 — SURGE', 9: 'COMBO ×9 — OVERDRIVE',
              12: 'COMBO ×12 — MAX POWER', 15: `${spotlight.playerName} — PERFECT CHAIN`,
            },
            sleek: {
              3: 'CHAIN ×3', 6: 'CHAIN ×6 — LOCKED', 9: 'CHAIN ×9 — RESONANT',
              12: 'CHAIN ×12 — ASCENDANT', 15: `${spotlight.playerName} — UNBROKEN`,
            },
          };
          const variant = palette.feel === 'arcade' ? 'combo' : palette.feel === 'sleek' ? 'chain' : 'fire';
          spotlight.announce(copy[palette.feel]?.[eventThreshold] || `×${eventThreshold}`, eventThreshold === 15, variant);
        }
        return eventThreshold;
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

      function emitCorrectMicroBurst(correctBtn, answerRect, overlayRect) {
        if (isMinimalPower() || REDUCED_MOTION) return;
        const r = answerRect || correctBtn.getBoundingClientRect();
        const ovr = overlayRect || overlay.getBoundingClientRect();
        const cx = r.left - ovr.left + r.width / 2;
        const cy = r.top - ovr.top + r.height / 2;
        const count = isLowPower() ? 4 : streak >= 6 ? 10 : 6;
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

      function correctDetonate(correctBtn, answerRect, overlayRect, milestone = 0) {
        // Color this answer's burst with the level the run is stepping up
        // to -- the firework itself should look like part of the same
        // dead-to-alive build-up, not a fixed palette color.
        const stepColor = progressColorFor(palette, (streak / (initialQueueLength || 1)) * 100).css;
        overlay.classList.remove('correct-impact');
        void overlay.offsetWidth;
        overlay.classList.add('correct-impact');
        if (impactTimer) clearTimeout(impactTimer);
        impactTimer = setTimeout(() => {
          overlay.classList.remove('correct-impact');
          impactTimer = null;
        }, 340);
        correctBtn.classList.add('micro-win');
        correctBtn.style.transition = 'none';
        correctBtn.style.background = stepColor;
        emitCorrectMicroBurst(correctBtn, answerRect, overlayRect);

        // One smooth, single-stage transition rather than a chain of an
        // overlay-wide scale bump plus buttons flying off screen with
        // rotation -- that layered choreography read as lag/jank, especially
        // on older hardware across a 15-question run that can finish in ~30s.
        const allBtns = Array.from(optionsEl.querySelectorAll(`.${config.optionClass}`));
        if (!REDUCED_MOTION) {
          setTimeout(() => {
            allBtns.forEach(btn => {
              if (btn === correctBtn) return;
              btn.style.transition = 'opacity 140ms ease';
              btn.style.opacity = '0';
            });
            correctBtn.style.transition = 'transform 140ms ease, opacity 140ms ease';
            correctBtn.style.transform = 'scale(1.06)';
            correctBtn.style.opacity = '0';

            const r = answerRect || correctBtn.getBoundingClientRect();
            const ovr = overlayRect || overlay.getBoundingClientRect();
            const cx = r.left - ovr.left + r.width / 2;
            const cy = r.top - ovr.top + r.height / 2;
            const colors = [stepColor, '#ffffff', stepColor, '#ffd54f'];
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
          }, 40);
        }

        flashEl.style.background = stepColor;
        flashEl.style.opacity = '0.45';
        setTimeout(() => {
          flashEl.style.opacity = '0';
          flashEl.style.background = '';
        }, 90);

        const nextDelay = milestone
          ? Math.max(config.nextDelay || 200, milestone === 15 ? 620 : 560)
          : (config.nextDelay || 200);
        setTimeout(() => {
          if (current >= queue.length) {
            stopTimer();
            stopBGM();
            showWin(clearElapsed ?? elapsed);
          } else {
            optionsEl.style.visibility = 'hidden';
            renderQuestion();
            if (scrollEl) scrollEl.scrollTop = 0;
            requestAnimationFrame(() => {
              optionsEl.style.visibility = '';
              feedbackState = 'playing';
              locked = false;
              setAnswerInputEnabled(true);
            });
          }
        }, nextDelay);
      }

      function emitWrongMicroFeedback(wrongBtn, answerRect, overlayRect) {
        if (isMinimalPower() || REDUCED_MOTION) return;
        const r = answerRect || wrongBtn.getBoundingClientRect();
        const ovr = overlayRect || overlay.getBoundingClientRect();
        const cx = r.left - ovr.left + r.width / 2;
        const cy = r.top - ovr.top + r.height / 2;
        const count = isLowPower() ? 3 : 4;
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
        if (feedbackState !== 'feedback-pending') return;
        const scold = config.scolds[Math.floor(Math.random() * config.scolds.length)];
        const wrongJp = overlay.querySelector(selector('wrongJp'));
        const wrongHira = overlay.querySelector(selector('wrongHira'));
        const scoldJp = overlay.querySelector(selector('scoldJp'));
        const scoldHira = overlay.querySelector(selector('scoldHira'));
        const status = wrongPopup.querySelector('[id$="-wrong-status"]');
        renderSeparateReading(wrongJp, wrongHira, correct.jp, correct.hira);
        renderSeparateReading(scoldJp, scoldHira, scold.jp, scold.hira);
        overlay.querySelector(selector('wrongEn')).textContent = correct.en;
        overlay.querySelector(selector('scoldEn')).textContent = scold.en;
        const statusByFeel = {
          playful: `${escapeHtml(spotlight.playerName)}, <ruby>BUMP!<rt>\u30d0\u30f3\u30d7!</rt></ruby> <ruby>LET'S<rt>\u30ec\u30c3\u30c4</rt></ruby> <ruby>BOUNCE<rt>\u30d0\u30a6\u30f3\u30b9</rt></ruby> <ruby>BACK.<rt>\u30d0\u30c3\u30af</rt></ruby>`,
          arcade: `${escapeHtml(spotlight.playerName)}, <ruby>CHAIN<rt>\u30c1\u30a7\u30fc\u30f3</rt></ruby> <ruby>BROKEN<rt>\u30d6\u30ed\u30fc\u30af\u30f3</rt></ruby> \u2014 <ruby>RELOAD!<rt>\u30ea\u30ed\u30fc\u30c9!</rt></ruby>`,
          sleek: `${escapeHtml(spotlight.playerName)}, <ruby>LINK<rt>\u30ea\u30f3\u30af</rt></ruby> <ruby>LOST<rt>\u30ed\u30b9\u30c8</rt></ruby> \u2014 <ruby>TRY<rt>\u30c8\u30e9\u30a4</rt></ruby> <ruby>AGAIN.<rt>\u30a2\u30b2\u30a4\u30f3</rt></ruby>`,
        };
        if (status) {
          status.classList.add('booha-blitz-ruby-text');
          status.innerHTML = statusByFeel[palette.feel] || statusByFeel.playful;
        }
        wrongPopup.classList.remove('wrong-feel-playful', 'wrong-feel-arcade', 'wrong-feel-sleek');
        wrongPopup.classList.add(`wrong-feel-${palette.feel || 'playful'}`);
        overlay.classList.add('wrong-active');
        setAnswerInputEnabled(false);
        wrongPopup.scrollTop = 0;
        wrongPopup.setAttribute('aria-hidden', 'false');
        const continueButton = overlay.querySelector(selector('wrongClose'));
        if (continueButton) {
          continueButton.disabled = false;
          continueButton.classList.remove('is-pressed');
        }
        feedbackState = 'feedback';
        wrongPopup.classList.add('show');
      }

      function recoverFromWrong(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        event?.stopImmediatePropagation?.();
        if (feedbackState !== 'feedback' || recoveryPending) return;
        recoveryPending = true;
        feedbackState = 'advancing';
        locked = true;
        runIsActive = false;
        setAnswerInputEnabled(false);
        const continueButton = overlay.querySelector(selector('wrongClose'));
        if (continueButton) {
          continueButton.disabled = true;
          continueButton.setAttribute('aria-disabled', 'true');
          continueButton.classList.add('is-pressed');
        }
        wrongPopup.classList.add('closing');
        wrongPopup.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('wrong-active');
        const recoveryEpoch = runEpoch;
        setTimeout(() => {
          if (recoveryEpoch !== runEpoch) return;
          wrongPopup.classList.remove('show', 'closing');
          wrongPopup.scrollTop = 0;
          queue = shuffle(weekCards);
          current = 0;
          streak = 0;
          bestStreak = 0;
          mistakeCount = 0;
          clearElapsed = null;
          elapsed = 0;
          startTime = null;
          lastTimerPaint = -Infinity;
          timerEl.textContent = fmtTime(0);
          renderQuestion(true);
          setTimeout(() => {
            if (recoveryEpoch !== runEpoch) return;
            recoveryPending = false;
            feedbackState = 'playing';
            locked = false;
            runIsActive = true;
            visibilityPaused = false;
            startTime = performance.now();
            elapsed = 0;
            timerEl.textContent = fmtTime(0);
            startBGM();
            scheduleTimerTick(0);
            setAnswerInputEnabled(true);
            requestAnimationFrame(() => optionsEl.querySelector(`.${config.optionClass}`)?.focus());
          }, 200);
        }, 180);
      }

      function handleAnswer(btn, chosen, correct) {
        if (locked || feedbackState !== 'playing' || !runIsActive) return;
        locked = true;
        const answerRect = isMinimalPower() || REDUCED_MOTION ? null : btn.getBoundingClientRect();
        const overlayRect = isMinimalPower() || REDUCED_MOTION ? null : questionOverlayRect;
        startBGM();
        if (chosen.n === correct.n) {
          btn.classList.add('correct');
          current++;
          const milestone = updateStreak();
          playCorrectHit();
          if (current >= queue.length) clearElapsed = performance.now() - startTime;
          correctDetonate(btn, answerRect, overlayRect, milestone);
          return;
        }

        btn.classList.add('wrong');
        runIsActive = false;
        feedbackState = 'feedback-pending';
        setAnswerInputEnabled(false);
        visibilityPaused = false;
        mistakeCount++;
        elapsed = startTime === null ? elapsed : performance.now() - startTime;
        spotlight.resetStreak();
        setBackground(0);
        optionsEl.querySelectorAll(`.${config.optionClass}`).forEach(b => {
          if (b.textContent === correct.en) b.classList.add('correct');
        });
        emitWrongMicroFeedback(btn, answerRect, overlayRect);
        playWrongHit();
        if (!REDUCED_MOTION) overlay.classList.add('shake');
        overlay.addEventListener('animationend', () => overlay.classList.remove('shake'), { once: true });
        stopTimer();
        stopBGM();
        const answerEpoch = runEpoch;
        setTimeout(() => {
          if (answerEpoch === runEpoch) showWrongPopup(correct);
        }, config.wrongDelay || 320);
      }

      function renderQuestion(recover = false) {
        locked = true;
        setAnswerInputEnabled(false);
        const card = queue[current];
        setBackground(streak);
        jpWordEl.style.animation = 'none';
        hiraEl.style.animation = 'none';
        requestAnimationFrame(() => {
          jpWordEl.style.animation = '';
          hiraEl.style.animation = '';
          jpWordEl.textContent = card.jp;
          hiraEl.textContent = card.hira;
        });
        progressEl.textContent = `${Math.min(current, initialQueueLength)} / ${initialQueueLength}`;
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
          bindPointerAction(btn, () => handleAnswer(btn, opt, card));
          optionsEl.appendChild(btn);
        });
        setAnswerInputEnabled(false);
        questionOverlayRect = overlay.getBoundingClientRect();
        if (current === 0 && startTime === null && gameStarted) startTime = performance.now();
      }

      function beginGame() {
        if (gameStarted) return;
        gameStarted = true;
        mistakeCount = 0;
        startBGM();
        playStartSting();
        startCard.card.classList.add('launching');
        setTimeout(() => {
          overlay.classList.remove('blitz-awaiting-start');
          startCard.card.remove();
          startTime = performance.now();
          runIsActive = true;
          feedbackState = 'playing';
          visibilityPaused = false;
          locked = false;
          setAnswerInputEnabled(true);
          scheduleTimerTick(0);
          overlay._boohaBlitzPerformanceCleanup = monitorFramePerformance(
            overlay,
            ({ tier }) => {
              if (tier === 'minimal') enableRuntimeLowPower(overlay);
              else if (tier === 'reduced') enableRuntimeReducedPower(overlay);
              performanceDiagnostic?.update({ status: 'decision', runtimeTier: performanceTier() });
            },
            progress => performanceDiagnostic?.update(progress),
          );
          spotlight.announce(`${spotlight.playerName}, GO!`);
        }, 140);
      }

      function showWin(ms) {
        const isPerfectRun = current === initialQueueLength && streak === initialQueueLength && bestStreak === initialQueueLength && mistakeCount === 0;
        const speedBand = speedBandFor(ms, speedTarget.targetMs);
        feedbackState = 'complete';
        runIsActive = false;
        visibilityPaused = false;
        const weekId = makeWeekId(monthSlug, weekNumber);
        const recordEligible = true;
        const clearTier = isPerfectRun ? 'perfect' : 'clear';
        const revealFinishFallback = () => {
          try {
            winScreen.classList.add('show');
            const fallbackRecord = winScreen.querySelector(selector('winRecord'));
            const fallbackTime = winScreen.querySelector(selector('winTime'));
            if (fallbackRecord && !fallbackRecord.textContent) fallbackRecord.textContent = 'CLEAR COMPLETE';
            if (fallbackTime && !fallbackTime.textContent) fallbackTime.textContent = fmtTime(ms);
            [
              winScreen.querySelector(selector('playAgain')),
              winScreen.querySelector(selector('winClose')),
            ].filter(Boolean).forEach(button => {
              button.disabled = false;
              button.removeAttribute('aria-disabled');
              button.title = '';
            });
          } catch (fallbackError) {
            console.error(`[${config.apiName}] Finish fallback failed:`, fallbackError);
          }
        };

        try {
        const result = recordEligible
          ? saveBestTime(config.gameType, config.legacyKey, curr, ms, weekId, {
            clearTier,
            mistakes: mistakeCount,
          })
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
            time: ms,
            clearTier,
            mistakes: mistakeCount,
          },
        }));

        const best = getBestScore(config.gameType, config.legacyKey, curr);
        const playerName = getPlayerName();
        const isRecord = result.isAllTimeRecord;
        const oldRecord = result.oldRecord;
        const aliveColor = progressColorFor(palette, 100).css;
        winScreen.classList.toggle('record-mode', isRecord);
        winScreen.classList.add('blitz-finish');
        winScreen.classList.add('residual-run');
        winScreen.style.setProperty('--blitz-finish-accent', isRecord ? '#ffd700' : aliveColor);
        winScreen.style.setProperty('--blitz-finish-glow', isRecord ? 'rgba(255, 215, 0, .34)' : (palette.rewardGlow || palette.glow));
        const finishGradient = palette.rewardColors?.length
          ? palette.rewardColors.join(', ')
          : `${palette.accent}, ${palette.accent2}, #ffffff`;
        winScreen.style.setProperty('--blitz-finish-gradient', `linear-gradient(90deg, ${finishGradient})`);

        // Fixed scorecard copy -- content no longer branches on outcome
        // beyond the "NEW BEST TIME" header, per spec.
        const winNameEl = winScreen.querySelector(selector('winName'));
        winNameEl.classList.add('booha-blitz-ruby-text');
        winNameEl.innerHTML = `${escapeHtml(playerName)} <ruby>is<rt>\u30a4\u30ba</rt></ruby> <ruby>Awesome!!<rt>\u30a2\u30a6\u30b5\u30e0!!</rt></ruby>`;
        const screamEl = winScreen.querySelector(selector('winScream'));
        screamEl.classList.add('booha-blitz-ruby-text');
        screamEl.innerHTML = '<ruby>Booha<rt>\u30d6\u30fc\u30cf\u30fc</rt></ruby> <ruby>is<rt>\u30a4\u30ba</rt></ruby> <ruby>happy!!<rt>\u30cf\u30c3\u30d4\u30fc!!</rt></ruby>';
        const jpLine = winScreen.querySelector(selector('winJp'));
        jpLine.classList.add('booha-blitz-ruby-text');
        jpLine.innerHTML = '<ruby>For<rt>\u30d5\u30a9\u30fc</rt></ruby> <ruby>you:<rt>\u30e6\u30fc</rt></ruby> <ruby>It\u2019s<rt>\u30a4\u30c3\u30c4</rt></ruby> <ruby>Booha<rt>\u30d6\u30fc\u30cf\u30fc</rt></ruby>';
        const timeEl = winScreen.querySelector(selector('winTime'));
        timeEl.textContent = fmtTime(ms);
        timeEl.style.color = isRecord ? '#ffd700' : aliveColor;
        timeEl.style.textShadow = isRecord
          ? '0 0 28px rgba(255,215,0,1), 0 0 70px rgba(255,90,0,0.75)'
          : `0 0 32px ${palette.glow}, 0 0 64px ${palette.glow}`;
        const recordEl = winScreen.querySelector(selector('winRecord'));
        const bestEl = winScreen.querySelector(selector('winBest'));
        const deltaEl = winScreen.querySelector(selector('winDelta'));
        // "NEW BEST TIME" only appears when this run set the all-time best --
        // otherwise the header is skipped entirely, per spec.
        recordEl.hidden = !isRecord;
        recordEl.classList.toggle('big', isRecord);
        recordEl.classList.add('booha-blitz-ruby-text');
        recordEl.innerHTML = isRecord
          ? '<ruby>NEW<rt>\u30cb\u30e5\u30fc</rt></ruby> <ruby>BEST<rt>\u30d9\u30b9\u30c8</rt></ruby> <ruby>TIME<rt>\u30bf\u30a4\u30e0</rt></ruby>'
          : '';
        bestEl.classList.add('booha-blitz-ruby-text');
        bestEl.innerHTML = `<ruby>Your<rt>\u30e6\u30a2</rt></ruby> <ruby>best<rt>\u30d9\u30b9\u30c8</rt></ruby> <ruby>time:<rt>\u30bf\u30a4\u30e0</rt></ruby> ${fmtTime(isRecord ? ms : (best ? best.ms : ms))}`;
        // Kept, per spec ("there is already a built-in +/- time, just have
        // this on the bottom") -- markup order puts it after the buttons.
        deltaEl.classList.add('booha-blitz-ruby-text');
        if (isRecord) {
          deltaEl.innerHTML = oldRecord
            ? `-${fmtTime(oldRecord.ms - ms)} <ruby>faster<rt>\u30d5\u30a1\u30b9\u30bf\u30fc</rt></ruby> <ruby>than<rt>\u30b6\u30f3</rt></ruby> <ruby>your<rt>\u30e6\u30a2</rt></ruby> <ruby>previous<rt>\u30d7\u30ea\u30d3\u30a2\u30b9</rt></ruby> <ruby>best!<rt>\u30d9\u30b9\u30c8!</rt></ruby>`
            : '<ruby>Your<rt>\u30e6\u30a2</rt></ruby> <ruby>first<rt>\u30d5\u30a1\u30fc\u30b9\u30c8</rt></ruby> <ruby>record!<rt>\u30ec\u30b3\u30fc\u30c9!</rt></ruby>';
        } else {
          deltaEl.innerHTML = oldRecord
            ? `+${fmtTime(ms - oldRecord.ms)} <ruby>vs.<rt>\u30d0\u30fc\u30b5\u30b9</rt></ruby> <ruby>your<rt>\u30e6\u30a2</rt></ruby> <ruby>best<rt>\u30d9\u30b9\u30c8</rt></ruby>`
            : '';
        }
        winScreen.classList.toggle('perfect-mode', isPerfectRun);
        winScreen.classList.toggle('speed-target-mode', speedBand === 'target');
        winScreen.classList.toggle('speed-elite-mode', speedBand === 'elite');
        spotlight.nameplate.classList.add('complete');
        spotlight.announce(`${spotlight.playerName}, YOU CLEARED IT!`, true);
        if (isPerfectRun && speedBand === 'elite') emitFinishFlash(overlay, palette, playerName, 'speed');
        else if (isPerfectRun && speedBand === 'target') emitPerfectFlash(overlay, palette, playerName);
        else if (isPerfectRun) emitFinishFlash(overlay, palette, playerName, 'clear');
        else if (isRecord) emitFinishFlash(overlay, palette, playerName, 'record');
        winScreen.classList.add('show', 'climax-awaiting');
        if (climaxTimer) clearTimeout(climaxTimer);
        const revealEpoch = runEpoch;
        climaxTimer = setTimeout(() => {
          if (revealEpoch !== runEpoch) return;
          winScreen.classList.remove('climax-awaiting');
          climaxTimer = null;
        }, REDUCED_MOTION ? 420 : 980);
        playFinalStinger(isRecord, isPerfectRun);
        startFinalHold(isPerfectRun ? 5600 : isRecord ? 5000 : FINAL_CARD_HOLD_MS);
        celebrate(overlay, palette, isRecord, speedBand);
        } catch (error) {
          console.error(`[${config.apiName}] Finish rendering failed:`, error);
          revealFinishFallback();
        }
      }

      const cleanupAndClose = () => {
        runEpoch++;
        feedbackState = 'closed';
        recoveryPending = false;
        if (impactTimer) clearTimeout(impactTimer);
        if (climaxTimer) clearTimeout(climaxTimer);
        impactTimer = null;
        climaxTimer = null;
        winScreen.classList.remove('climax-awaiting');
        stopFinalHold();
        stopStreakBeat();
        performanceDiagnostic?.destroy();
        closeGame(overlay, stopTimer, stopBGM);
      };
      bindPointerAction(overlay.querySelector(selector('wrongClose')), recoverFromWrong);
      overlay.querySelector(selector('quit')).addEventListener('click', cleanupAndClose);
      overlay.querySelector(selector('playAgain')).addEventListener('click', () => {
        runEpoch++;
        feedbackState = 'closed';
        recoveryPending = false;
        if (impactTimer) clearTimeout(impactTimer);
        if (climaxTimer) clearTimeout(climaxTimer);
        impactTimer = null;
        climaxTimer = null;
        stopFinalHold();
        stopStreakBeat();
        stopTimer();
        stopBGM();
        overlay._boohaBlitzPerformanceCleanup?.();
        overlay._boohaBlitzViewportCleanup?.();
        overlay._boohaBlitzVisibilityCleanup?.();
        performanceDiagnostic?.destroy();
        overlay.remove();
        launch({ curr, monthSlug, weekNumber });
      });
      overlay.querySelector(selector('winClose')).addEventListener('click', cleanupAndClose);
      const recordsButton = selector('records') ? overlay.querySelector(selector('records')) : null;
      recordsButton?.addEventListener('click', event => {
        openRecordsPanel({
          monthSlug,
          weekNumber,
          curr,
          returnFocus: event.currentTarget,
        });
      });

      scheduleTimerTick(0);
      renderQuestion();
      spotlight.announce(`${spotlight.playerName}, READY?`);
      bindPointerAction(startCard.button, beginGame);
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
      getSpeedTarget: () => speedTargetFor(config),
      getSpeedBand: ms => speedBandFor(ms, speedTargetFor(config)),
    };
  }

  const RECORD_LEGACY_KEYS = Object.freeze({
    vocab: 'vocabBlitz',
    sentences: 'sentenceBlitz',
    questions: 'questionBlitz',
  });
  const RECORD_GAMES = Object.freeze([
    Object.freeze({ id: 'vocab', label: 'VOCAB', jp: '単語', kana: 'たんご' }),
    Object.freeze({ id: 'sentences', label: 'SENTENCES', jp: '文章', kana: 'ぶんしょう' }),
    Object.freeze({ id: 'questions', label: 'QUESTIONS', jp: '問題', kana: 'もんだい' }),
  ]);
  const RECORD_CURRICULA = Object.freeze(['pb', 'br', 'bc']);

  function recordDateLabel(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }).format(date).toUpperCase();
    } catch (_) {
      return date.toISOString().slice(0, 10);
    }
  }

  function resolveRecordsWeek(ctx = {}) {
    const liveWeek = ctx.monthSlug && ctx.weekNumber
      ? ctx
      : window.CALENDAR?.getCurrentCurriculumWeek?.();
    return liveWeek?.monthSlug && liveWeek?.weekNumber
      ? makeWeekId(liveWeek.monthSlug, liveWeek.weekNumber)
      : null;
  }

  function buildRecordsPanel() {
    const panel = document.createElement('div');
    panel.id = 'blitz-rec-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'blitz-rec-title');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <section id="blitz-rec-inner">
        <header id="blitz-rec-top">
          <div>
            <div id="blitz-rec-title">RECORDS</div>
            <div id="blitz-rec-title-jp">きろく</div>
          </div>
          <button id="blitz-rec-close" type="button">とじる</button>
        </header>
        <div id="blitz-rec-toggle" role="group" aria-label="Record range">
          <button type="button" data-record-scope="weekly" aria-pressed="true">今週 <span>THIS WEEK</span></button>
          <button type="button" data-record-scope="alltime" aria-pressed="false">これまで <span>ALL TIME</span></button>
        </div>
        <div id="blitz-rec-awake" aria-live="polite">
          <div id="blitz-rec-awake-label">THIS WEEK</div>
          <div id="blitz-rec-awake-pct">0% COMPLETE</div>
          <div id="blitz-rec-awake-meta">PLAY A BLITZ GAME TO GET STARTED</div>
        </div>
        <div id="blitz-rec-list" aria-label="Blitz records list"></div>
      </section>
    `;

    let style = document.getElementById('blitz-rec-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'blitz-rec-styles';
      style.textContent = `
        #blitz-rec-panel {
          position: fixed; inset: 0; z-index: 10000; display: none;
          align-items: center; justify-content: center;
          padding: max(env(safe-area-inset-top,0px) + 12px, 14px)
                   max(env(safe-area-inset-right,0px) + 12px, 14px)
                   max(env(safe-area-inset-bottom,0px) + 12px, 14px)
                   max(env(safe-area-inset-left,0px) + 12px, 14px);
          background: linear-gradient(145deg, rgba(18,5,30,.97), rgba(4,18,30,.97));
          font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,
            "Noto Sans","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
        }
        #blitz-rec-panel.show { display: flex; }
        #blitz-rec-inner {
          width: min(560px, 100%); max-height: min(760px, 100%);
          overflow-y: auto; overscroll-behavior: contain;
          border: 2px solid rgba(255,255,255,.36); border-radius: 26px;
          background: linear-gradient(145deg, rgba(99,26,94,.98), rgba(14,35,61,.98));
          box-shadow: 0 24px 70px rgba(0,0,0,.72), 0 0 0 2px rgba(255,255,255,.08),
            0 0 42px rgba(255,111,181,.28);
          color: #fff;
        }
        #blitz-rec-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 20px 12px;
        }
        #blitz-rec-title { font-size: clamp(18px,4vw,25px); font-weight: 1000; letter-spacing: 2px; }
        #blitz-rec-title-jp { color: rgba(255,255,255,.68); font-size: 12px; letter-spacing: 2px; }
        #blitz-rec-close {
          appearance: none; border: 1px solid rgba(255,255,255,.42); border-radius: 999px;
          padding: 8px 14px; background: rgba(0,0,0,.18); color: #fff; font-weight: 900;
          cursor: pointer;
        }
        #blitz-rec-toggle { display: flex; gap: 8px; padding: 0 20px 14px; }
        #blitz-rec-toggle button {
          flex: 1; appearance: none; border: 1px solid rgba(255,255,255,.22);
          border-radius: 999px; padding: 8px 10px; background: rgba(0,0,0,.2);
          color: rgba(255,255,255,.58); font-weight: 950; cursor: pointer;
        }
        #blitz-rec-toggle button span { display: block; margin-top: 2px; font-size: 9px; letter-spacing: 1px; }
        #blitz-rec-toggle button[aria-pressed="true"] {
          color: #15101e; border-color: #ffe27a; background: #ffe27a;
          box-shadow: 0 0 20px rgba(255,226,122,.42);
        }
        #blitz-rec-awake {
          margin: 0 20px 16px; padding: 20px 16px; text-align: center;
          border-radius: 18px; border: 2px solid var(--rec-accent, rgba(255,255,255,.3));
          background: var(--rec-awake-bg, #ffffff);
          transition: background 300ms ease, border-color 300ms ease;
        }
        #blitz-rec-awake[hidden] { display: none; }
        #blitz-rec-awake-label { font-size: 11px; font-weight: 1000; letter-spacing: 2px; color: var(--rec-awake-ink, #14161c); }
        #blitz-rec-awake-pct { margin: 4px 0; font-size: clamp(40px,11vw,58px); font-weight: 1000; line-height: 1; color: var(--rec-awake-ink, #14161c); }
        #blitz-rec-awake-meta { font-size: clamp(10px,2.4vw,13px); font-weight: 800; letter-spacing: .5px; color: var(--rec-awake-ink, #14161c); }
        #blitz-rec-list { display: flex; flex-direction: column; gap: 8px; padding: 0 20px 20px; }
        .blitz-rec-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.2); background: rgba(0,0,0,.18); }
        .blitz-rec-row.is-cleared { border-color: var(--rec-accent); background: color-mix(in srgb, var(--rec-accent) 18%, transparent); }
        .blitz-rec-row-label { font-weight: 900; font-size: clamp(12px,3vw,15px); color: #fff; }
        .blitz-rec-row-label span { display: block; font-size: 10px; color: rgba(255,255,255,.55); letter-spacing: .5px; margin-top: 2px; }
        .blitz-rec-row-time { font-weight: 1000; font-variant-numeric: tabular-nums; font-size: clamp(14px,3.4vw,18px); color: #fff; }
        .blitz-rec-row.is-open .blitz-rec-row-time { color: rgba(255,255,255,.4); font-weight: 800; }
        @media (max-width: 430px) {
          #blitz-rec-inner { border-radius: 20px; }
          #blitz-rec-top, #blitz-rec-toggle, #blitz-rec-list { padding-left: 12px; padding-right: 12px; }
          #blitz-rec-awake { margin-left: 12px; margin-right: 12px; }
        }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(panel);

    const close = () => {
      panel.classList.remove('show');
      panel.setAttribute('aria-hidden', 'true');
      const returnFocus = panel._recordsReturnFocus;
      if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
        requestAnimationFrame(() => returnFocus.focus());
      }
    };
    panel._closeRecords = close;
    panel.querySelector('#blitz-rec-close').addEventListener('click', close);
    panel.addEventListener('click', event => {
      if (event.target === panel) close();
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    panel.querySelectorAll('[data-record-scope]').forEach(button => {
      button.addEventListener('click', () => {
        panel._recordsScope = button.dataset.recordScope;
        renderRecordsPanel(panel);
      });
    });
    return panel;
  }

  function renderRecordsPanel(panel) {
    const scope = panel._recordsScope || 'weekly';
    const weekId = panel._recordsWeekId;
    const curr = panel._recordsCurr || 'pb';
    const theme = THEMES[curr] || THEMES.pb;
    panel.style.setProperty('--rec-accent', theme.accent);

    const list = panel.querySelector('#blitz-rec-list');
    const awake = panel.querySelector('#blitz-rec-awake');
    const label = panel.querySelector('#blitz-rec-awake-label');
    const pctEl = panel.querySelector('#blitz-rec-awake-pct');
    const metaEl = panel.querySelector('#blitz-rec-awake-meta');

    panel.querySelectorAll('[data-record-scope]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.recordScope === scope));
    });

    const rows = RECORD_GAMES.map(game => ({
      game,
      score: scope === 'weekly'
        ? getWeeklyScoreFor(game.id, curr, weekId)
        : getRecordScoreFor(game.id, RECORD_LEGACY_KEYS[game.id], curr),
    }));

    if (scope === 'weekly') {
      awake.hidden = false;
      const clearedCount = rows.filter(r => r.score).length;
      const percent = clearedCount === 0 ? 0 : clearedCount === 1 ? 33 : clearedCount === 2 ? 66 : 100;
      const { css, lightness } = progressColorFor(theme, percent);
      awake.style.setProperty('--rec-awake-bg', percent <= 0 ? '#ffffff' : css);
      awake.style.setProperty('--rec-awake-ink', inkFor(lightness));
      label.textContent = `${theme.name.toUpperCase()} · THIS WEEK`;
      pctEl.textContent = `${percent}% COMPLETE`;
      metaEl.textContent = percent === 0
        ? 'PLAY A BLITZ GAME TO GET STARTED'
        : percent === 100
          ? 'ALL THREE CLEARED THIS WEEK'
          : `${clearedCount} OF 3 CLEARED THIS WEEK`;
    } else {
      awake.hidden = true;
    }

    list.innerHTML = '';
    rows.forEach(({ game, score }) => {
      const row = document.createElement('div');
      row.className = `blitz-rec-row ${score ? 'is-cleared' : 'is-open'}`;
      const labelWrap = document.createElement('div');
      labelWrap.className = 'blitz-rec-row-label';
      labelWrap.innerHTML = `${game.label}<span class="booha-blitz-ruby-text"><ruby>${game.jp}<rt>${game.kana}</rt></ruby></span>`;
      const timeEl = document.createElement('div');
      timeEl.className = 'blitz-rec-row-time';
      timeEl.textContent = score ? fmtTime(score.ms) : '--';
      row.append(labelWrap, timeEl);
      list.appendChild(row);
    });
  }

  function openRecordsPanel(ctx = {}) {
    let panel = document.getElementById('blitz-rec-panel');
    if (!panel) panel = buildRecordsPanel();
    panel._recordsWeekId = resolveRecordsWeek(ctx);
    panel._recordsScope = ctx.scope === 'alltime' ? 'alltime' : 'weekly';
    panel._recordsCurr = (ctx.curr === 'pb' || ctx.curr === 'br' || ctx.curr === 'bc')
      ? ctx.curr
      : (() => {
          try {
            const c = localStorage.getItem('booha_last_curr');
            return (c === 'pb' || c === 'br' || c === 'bc') ? c : 'pb';
          } catch (e) { return 'pb'; }
        })();
    panel._recordsReturnFocus = ctx.returnFocus || document.activeElement;
    renderRecordsPanel(panel);
    panel.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => panel.querySelector('#blitz-rec-close')?.focus());
    return panel;
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
    SPEED_TARGETS,
    speedTargetForGame,
    openRecordsPanel,
    create,
  };
})();
