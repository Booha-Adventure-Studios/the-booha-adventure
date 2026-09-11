/*
 * Booha Blitz shared engine.
 *
 * The three Blitz modes provide a palette, a CSS/DOM skin, and copy.  The
 * question queue, timer, answer flow, score storage, wrong-answer screen, and
 * win flow live here so those behaviours cannot drift between modes.
 */
window.BoohaBlitzEngine = (() => {
  const TIMER_PAINT_INTERVAL_MS = 100;
  const LOW_POWER =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
    (typeof navigator !== 'undefined' && (
      (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 2) ||
      (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 2)
    ));

  function effectCount(fullCount) {
    return LOW_POWER ? Math.max(6, Math.round(fullCount * 0.5)) : fullCount;
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
      .booha-blitz-nameplate {
        position: fixed;
        top: max(env(safe-area-inset-top, 0px) + 58px, 58px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 18;
        min-width: min(280px, calc(100vw - 32px));
        padding: 8px 18px 9px;
        border: 1px solid var(--blitz-accent);
        border-radius: 999px;
        background: rgba(0, 0, 0, .34);
        color: #fff;
        text-align: center;
        font-size: clamp(11px, 2.8vw, 14px);
        font-weight: 950;
        letter-spacing: 1.2px;
        text-shadow: 0 0 14px var(--blitz-accent);
        box-shadow: 0 0 18px var(--blitz-accent);
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms ease;
      }
      .booha-blitz-nameplate-name { color: var(--blitz-accent); }
      .booha-blitz-nameplate-streak { margin-left: 8px; color: #fff; }
      .booha-blitz-nameplate.complete {
        opacity: 0;
        transform: translate(-50%, -8px) scale(.96);
      }
      .booha-blitz-callout {
        position: fixed;
        left: 50%;
        top: 24%;
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
      .booha-blitz-callout.final {
        top: 20%;
        color: #ffe66b;
        text-shadow: 0 0 14px #ffb300, 0 0 42px #ff5a00;
      }
      @keyframes boohaBlitzCallout {
        0% { opacity: 0; transform: translate(-50%, 12px) scale(.88) rotate(-2deg); }
        18%, 72% { opacity: 1; transform: translate(-50%, 0) scale(1) rotate(0); }
        100% { opacity: 0; transform: translate(-50%, -18px) scale(1.04) rotate(1deg); }
      }
      .booha-blitz-final-summary {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px 12px;
        width: min(100%, 360px);
        margin: 12px auto 2px;
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
        .booha-blitz-callout.show { animation: none; opacity: 1; transform: translate(-50%, 0); }
        .booha-blitz-nameplate { transition: none; }
      }
    `;
    document.head.appendChild(style);
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
        #${config.overlayId}.blitz-compositor .${config.optionClass} {
          transition: transform 120ms ease, background 120ms ease, opacity 120ms ease;
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
        #${config.overlayId}.blitz-compositor .${config.optionClass}.wrong {
          box-shadow: none !important;
          outline: 2px solid #ff1e1e;
        }
        #${config.overlayId}.blitz-compositor .${config.optionClass}:focus-visible {
          outline: 3px solid var(--blitz-accent);
          outline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          #${config.overlayId}.blitz-compositor .${config.optionClass}::after { transition: none; }
        }
      `;
      document.head.appendChild(style);
    }

    function applyPalette(overlay, palette) {
      overlay.style.setProperty('--blitz-accent', palette.accent);
      overlay.style.setProperty('--blitz-glow', palette.glow);
      Object.entries(config.cssVars || {}).forEach(([name, value]) => {
        overlay.style.setProperty(name, typeof value === 'function' ? value(palette) : value);
      });
      overlay.style.background = `hsl(${palette.baseHue}, ${palette.bgSat}%, ${palette.bgLit}%)`;
      const timer = overlay.querySelector(selector('timer'));
      if (timer) timer.style.color = palette.timerColor;
    }

    function createPlayerSpotlight(overlay, palette) {
      injectSharedStyles();
      const playerName = getPlayerName();
      const nameplate = document.createElement('div');
      nameplate.className = 'booha-blitz-nameplate';
      nameplate.style.setProperty('--blitz-accent', palette.accent);
      const nameEl = document.createElement('span');
      nameEl.className = 'booha-blitz-nameplate-name';
      nameEl.textContent = playerName;
      const streakEl = document.createElement('span');
      streakEl.className = 'booha-blitz-nameplate-streak';
      streakEl.textContent = 'READY';
      nameplate.append(nameEl, streakEl);
      overlay.appendChild(nameplate);

      const callout = document.createElement('div');
      callout.className = 'booha-blitz-callout';
      callout.style.setProperty('--blitz-accent', palette.accent);
      callout.setAttribute('aria-live', 'polite');
      overlay.appendChild(callout);

      let announceToken = 0;
      function announce(message, final = false) {
        announceToken++;
        callout.classList.remove('show');
        callout.classList.toggle('final', final);
        callout.textContent = message;
        void callout.offsetWidth;
        callout.classList.add('show');
        const token = announceToken;
        setTimeout(() => {
          if (token === announceToken) callout.classList.remove('show');
        }, final ? 1500 : 1100);
      }

      function setStreak(streak) {
        streakEl.textContent = streak ? `STREAK ×${streak}` : 'READY';
      }

      return { playerName, nameplate, callout, announce, setStreak };
    }

    function ensureFinalCard(winScreen) {
      const existing = winScreen.querySelector('.booha-blitz-final-summary');
      if (existing) {
        return {
          summary: existing,
          streak: existing.querySelector('.booha-blitz-final-streak'),
          hold: winScreen.querySelector('.booha-blitz-final-hold'),
        };
      }

      const summary = document.createElement('div');
      summary.className = 'booha-blitz-final-summary';
      const badge = document.createElement('div');
      badge.className = 'booha-blitz-final-badge';
      badge.textContent = 'FULL CLEAR';
      const streak = document.createElement('div');
      streak.className = 'booha-blitz-final-streak';
      streak.textContent = 'BEST STREAK ×0';
      summary.append(badge, streak);

      const hold = document.createElement('div');
      hold.className = 'booha-blitz-final-hold';
      hold.setAttribute('aria-live', 'polite');
      hold.textContent = 'LOOK AT YOUR CLEAR';

      const playAgain = winScreen.querySelector(selector('playAgain'));
      const buttonGroup = playAgain && playAgain.parentElement;
      if (buttonGroup) {
        winScreen.insertBefore(summary, buttonGroup);
        winScreen.insertBefore(hold, buttonGroup);
      } else {
        winScreen.append(summary, hold);
      }
      return { summary, streak, hold };
    }

    function closeGame(overlay, stopTimer, stopBGM) {
      stopTimer();
      stopBGM();
      overlay.remove();
      const api = window[config.apiName];
      if (api && typeof api._onClose === 'function') api._onClose();
    }

    function celebrate(overlay, palette, isRecord) {
      const name = getPlayerName();
      const colors = isRecord
        ? ['#ffd700', '#ffea00', '#fff3b0', '#ffffff']
        : [palette.accent, palette.accent2, '#ffffff', '#ffea00'];
      const W = window.innerWidth;
      const H = window.innerHeight;

      overlay.classList.add('shake');
      setTimeout(() => overlay.classList.remove('shake'), 420);

      const fragment = document.createDocumentFragment();
      const mode = config.celebrationMode;

      if (mode === 'vocab') {
        const crumbs = ['#ffdca8', '#ffc46b', '#fff1d6', palette.accent, '#ffffff'];
        for (let i = 0; i < effectCount(isRecord ? 70 : 46); i++) {
          const p = document.createElement('div');
          const angle = Math.random() * Math.PI * 2;
          const dist = 70 + Math.random() * (isRecord ? 360 : 240);
          const size = 3 + Math.random() * 6;
          const color = crumbs[Math.floor(Math.random() * crumbs.length)];
          p.className = 'vb-particle';
          p.style.cssText = `position:absolute;left:${W / 2}px;top:${H / 2}px;width:${size}px;height:${size}px;border-radius:${Math.random() > 0.4 ? '50%' : '2px'};background:${color};pointer-events:none;z-index:30;--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist + 40}px;--pdur:${520 + Math.random() * 520}ms;--pdelay:${Math.random() * 100}ms;animation:vbParticle var(--pdur) ease-out var(--pdelay) both;`;
          p.addEventListener('animationend', () => p.remove());
          fragment.appendChild(p);
        }
        for (let i = 0; i < effectCount(isRecord ? 44 : 28); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          d.className = 'vb-name-drop';
          d.textContent = name;
          d.style.cssText = `left:${Math.random() * W}px;top:${-40 - Math.random() * 220}px;font-size:${12 + Math.random() * (isRecord ? 26 : 20)}px;color:${color};--cx:${(Math.random() - 0.5) * 340}px;--cy:${H * 0.8 + Math.random() * 380}px;--r0:${(Math.random() - 0.5) * 40}deg;--r1:${(Math.random() - 0.5) * 220}deg;--cdur:${2800 + Math.random() * 1800}ms;--cdelay:${Math.random() * 1000}ms;`;
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
          p.style.cssText = `position:absolute;left:${Math.random() * W}px;top:${H - 8}px;width:${4 + Math.random() * 8}px;height:${4 + Math.random() * 8}px;border-radius:${Math.random() > 0.6 ? '50%' : '2px'};background:${color};pointer-events:none;z-index:30;--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist}px;--pdur:${520 + Math.random() * 560}ms;--pdelay:${Math.random() * 260}ms;animation:sbParticle var(--pdur) ease-out var(--pdelay) both;`;
          p.addEventListener('animationend', () => p.remove());
          fragment.appendChild(p);
        }
      } else {
        for (let i = 0; i < effectCount(isRecord ? 42 : 26); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          const toLeft = i % 2 === 1;
          d.className = 'qb-name-streak';
          d.textContent = name;
          d.style.cssText = `left:${toLeft ? W + 60 : -300}px;top:${Math.random() * H}px;font-size:${12 + Math.random() * (isRecord ? 26 : 20)}px;color:${color};--sk:${toLeft ? 14 : -14}deg;--dx:${toLeft ? -(W + 620) : (W + 620)}px;--cdur:${1800 + Math.random() * 1200}ms;--cdelay:${Math.random() * 900}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
        for (let i = 0; i < effectCount(isRecord ? 34 : 22); i++) {
          const line = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          const toLeft = i % 2 === 0;
          line.className = 'qb-speed-line';
          line.style.cssText = `left:${toLeft ? W + 40 : -240}px;top:${Math.random() * H}px;width:${60 + Math.random() * 180}px;background:${color};--dx:${toLeft ? -(W + 620) : (W + 620)}px;--cdur:${900 + Math.random() * 700}ms;--cdelay:${Math.random() * 700}ms;`;
          line.addEventListener('animationend', () => line.remove());
          fragment.appendChild(line);
        }
      }
      overlay.appendChild(fragment);
    }

    function startGame(allCards, curr, weekNumber, palette, monthSlug) {
      const offset = (weekNumber - 1) * 15;
      const weekCards = allCards.slice(offset, offset + 15);
      if (weekCards.length < 6) {
        alert(config.notEnoughMessage);
        return;
      }

      const existing = document.getElementById(config.overlayId);
      if (existing) existing.remove();
      const overlay = config.buildOverlay();
      overlay.classList.add('blitz-compositor');
      applyPalette(overlay, palette);

      const bgm = new Audio('assets/audio/blitz.mp3');
      bgm.loop = true;
      bgm.volume = 0.55;
      let bgmStarted = false;
      const startBGM = () => {
        if (bgmStarted) return;
        bgmStarted = true;
        bgm.play().catch(() => {});
      };
      const stopBGM = () => {
        bgm.pause();
        bgm.currentTime = 0;
      };

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
      const finalCard = ensureFinalCard(winScreen);
      const queue = shuffle(weekCards);
      let current = 0;
      let startTime = null;
      let elapsed = 0;
      let clearElapsed = null;
      let rafId = null;
      let locked = false;
      let bgIndex = 0;
      let lastTimerPaint = -Infinity;
      let streak = 0;
      let bestStreak = 0;
      let finalHoldTimer = null;
      let finalHoldInterval = null;

      function tick() {
        if (startTime === null) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        elapsed = performance.now() - startTime;
        if (elapsed - lastTimerPaint >= TIMER_PAINT_INTERVAL_MS) {
          timerEl.textContent = fmtTime(elapsed);
          lastTimerPaint = elapsed;
        }
        rafId = requestAnimationFrame(tick);
      }

      function stopTimer() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      function updateStreak() {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        spotlight.setStreak(streak);
        const messages = {
          1: `${spotlight.playerName}, NICE START!`,
          2: `${spotlight.playerName} ×2 — KEEP GOING!`,
          3: `${spotlight.playerName} IS ON FIRE!`,
          5: `${spotlight.playerName} IS UNSTOPPABLE!`,
          8: `${spotlight.playerName} OWNS THIS RUN!`,
          10: `${spotlight.playerName} HAS THE RHYTHM!`,
        };
        if (messages[streak]) spotlight.announce(messages[streak]);
      }

      function stopFinalHold() {
        if (finalHoldTimer) clearTimeout(finalHoldTimer);
        if (finalHoldInterval) clearInterval(finalHoldInterval);
        finalHoldTimer = null;
        finalHoldInterval = null;
      }

      function startFinalHold() {
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

        const releaseAt = Date.now() + FINAL_CARD_HOLD_MS;
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
        }, FINAL_CARD_HOLD_MS);
      }

      function correctDetonate(correctBtn) {
        correctBtn.style.transition = 'none';
        correctBtn.style.background = 'rgba(0,255,100,0.65)';
        overlay.style.transform = 'scale(1.02)';
        setTimeout(() => {
          overlay.style.transition = 'transform 70ms ease';
          overlay.style.transform = '';
          setTimeout(() => { overlay.style.transition = ''; }, 70);
        }, 55);

        const allBtns = Array.from(optionsEl.querySelectorAll(`.${config.optionClass}`));
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

        setTimeout(() => {
          flashEl.style.background = palette.accent;
          flashEl.style.opacity = '0.45';
          setTimeout(() => {
            flashEl.style.background = '#ffffff';
            flashEl.style.opacity = '0.75';
            setTimeout(() => { flashEl.style.opacity = '0'; flashEl.style.background = ''; }, 55);
          }, 35);
        }, 110);

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

      function showWrongPopup(correct) {
        const scold = config.scolds[Math.floor(Math.random() * config.scolds.length)];
        overlay.querySelector(selector('wrongJp')).textContent = correct.jp;
        overlay.querySelector(selector('wrongHira')).textContent = correct.hira;
        overlay.querySelector(selector('wrongEn')).textContent = correct.en;
        overlay.querySelector(selector('scoldJp')).textContent = scold.jp;
        overlay.querySelector(selector('scoldHira')).textContent = scold.hira;
        overlay.querySelector(selector('scoldEn')).textContent = scold.en;
        wrongPopup.classList.add('show');
      }

      function handleAnswer(btn, chosen, correct) {
        if (locked) return;
        locked = true;
        startBGM();
        if (chosen.n === correct.n) {
          btn.classList.add('correct');
          current++;
          updateStreak();
          if (current >= queue.length) clearElapsed = performance.now() - startTime;
          correctDetonate(btn);
          return;
        }

        btn.classList.add('wrong');
        optionsEl.querySelectorAll(`.${config.optionClass}`).forEach(b => {
          if (b.textContent === correct.en) b.classList.add('correct');
        });
        overlay.classList.add('shake');
        overlay.addEventListener('animationend', () => overlay.classList.remove('shake'), { once: true });
        stopTimer();
        stopBGM();
        setTimeout(() => showWrongPopup(correct), config.wrongDelay || 480);
      }

      function renderQuestion() {
        locked = false;
        const card = queue[current];
        bgIndex++;
        const hue = (palette.baseHue + bgIndex * 51) % 360;
        overlay.style.background = `hsl(${hue}, ${palette.bgSat}%, ${palette.bgLit}%)`;
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
        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = config.optionClass;
          btn.type = 'button';
          btn.textContent = opt.en;
          btn.addEventListener('click', () => handleAnswer(btn, opt, card));
          optionsEl.appendChild(btn);
        });
        if (current === 0 && startTime === null) startTime = performance.now();
      }

      function showWin(ms) {
        const weekId = makeWeekId(monthSlug, weekNumber);
        const result = saveBestTime(config.gameType, config.legacyKey, curr, ms, weekId);
        if (result.saveFailed) console.error(`[${config.apiName}] Time not saved:`, ms, 'ms');

        document.dispatchEvent(new CustomEvent('booha:gameEnd', {
          detail: { saveId: `blitz:${curr}:${config.saveId}`, score: 100, completed: true, time: ms },
        }));

        const best = getBestScore(config.gameType, config.legacyKey, curr);
        const weekly = getWeeklyScore(config.gameType, curr, weekId);
        const playerName = getPlayerName();
        const isRecord = result.isAllTimeRecord;
        const oldRecord = result.oldRecord;
        winScreen.classList.toggle('record-mode', isRecord);
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
          bestEl.textContent = oldRecord ? `OLD: ${fmtTime(oldRecord.ms)}` : 'FIRST RECORD';
          deltaEl.textContent = oldRecord ? `-${fmtTime(oldRecord.ms - ms)} faster` : '';
        } else {
          recordEl.textContent = result.isWeeklyRecord ? 'THIS WEEK’S FASTEST' : '';
          bestEl.textContent = best ? `ALL-TIME BEST: ${fmtTime(best.ms)}${best.name ? ` — ${best.name}` : ''}` : '';
          deltaEl.textContent = weekly ? `THIS WEEK: ${fmtTime(weekly.ms)}${weekly.name ? ` — ${weekly.name}` : ''}` : '';
        }
        finalCard.streak.textContent = `BEST STREAK ×${bestStreak}`;
        spotlight.nameplate.classList.add('complete');
        spotlight.announce(`${spotlight.playerName}, YOU CLEARED IT!`, true);
        winScreen.classList.add('show');
        startFinalHold();
        celebrate(overlay, palette, isRecord);
      }

      const cleanupAndClose = () => {
        stopFinalHold();
        closeGame(overlay, stopTimer, stopBGM);
      };
      overlay.querySelector(selector('wrongClose')).addEventListener('click', cleanupAndClose);
      overlay.querySelector(selector('quit')).addEventListener('click', cleanupAndClose);
      overlay.querySelector(selector('playAgain')).addEventListener('click', () => {
        stopFinalHold();
        stopTimer();
        stopBGM();
        overlay.remove();
        launch({ curr, monthSlug, weekNumber });
      });
      overlay.querySelector(selector('winClose')).addEventListener('click', cleanupAndClose);

      rafId = requestAnimationFrame(tick);
      renderQuestion();
      spotlight.announce(`${spotlight.playerName}, READY?`);
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
