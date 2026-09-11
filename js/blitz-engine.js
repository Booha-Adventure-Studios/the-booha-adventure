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

  function create(config) {
    const ids = config.ids;
    const selector = (key) => ids[key];
    let stylesInjected = false;

    function applyPalette(overlay, palette) {
      Object.entries(config.cssVars || {}).forEach(([name, value]) => {
        overlay.style.setProperty(name, typeof value === 'function' ? value(palette) : value);
      });
      overlay.style.background = `hsl(${palette.baseHue}, ${palette.bgSat}%, ${palette.bgLit}%)`;
      const timer = overlay.querySelector(selector('timer'));
      if (timer) timer.style.color = palette.timerColor;
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
          p.style.cssText = `position:absolute;left:${W / 2}px;top:${H / 2}px;width:${size}px;height:${size}px;border-radius:${Math.random() > 0.4 ? '50%' : '2px'};background:${color};pointer-events:none;z-index:30;box-shadow:0 0 8px 2px ${color};--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist + 40}px;--pdur:${520 + Math.random() * 520}ms;--pdelay:${Math.random() * 100}ms;animation:vbParticle var(--pdur) ease-out var(--pdelay) both;`;
          p.addEventListener('animationend', () => p.remove());
          fragment.appendChild(p);
        }
        for (let i = 0; i < effectCount(isRecord ? 44 : 28); i++) {
          const d = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          d.className = 'vb-name-drop';
          d.textContent = name;
          d.style.cssText = `left:${Math.random() * W}px;top:${-40 - Math.random() * 220}px;font-size:${12 + Math.random() * (isRecord ? 26 : 20)}px;color:${color};text-shadow:0 0 10px ${color},0 0 22px ${color};--cx:${(Math.random() - 0.5) * 340}px;--cy:${H * 0.8 + Math.random() * 380}px;--r0:${(Math.random() - 0.5) * 40}deg;--r1:${(Math.random() - 0.5) * 220}deg;--cdur:${2800 + Math.random() * 1800}ms;--cdelay:${Math.random() * 1000}ms;`;
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
          d.style.cssText = `left:${Math.random() * W}px;top:${-50 - Math.random() * 160}px;font-size:${14 + Math.random() * (isRecord ? 28 : 22)}px;color:${color};text-shadow:0 0 10px ${color},0 2px 0 rgba(0,0,0,.45);--cx:${(Math.random() - 0.5) * 90}px;--cy:${H * (0.5 + Math.random() * 0.42)}px;--r0:${(Math.random() - 0.5) * 24}deg;--cdur:${1400 + Math.random() * 1000}ms;--cdelay:${Math.random() * 1100}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
        for (let i = 0; i < effectCount(isRecord ? 60 : 40); i++) {
          const p = document.createElement('div');
          const angle = -Math.PI * (0.15 + Math.random() * 0.7);
          const dist = 80 + Math.random() * (isRecord ? 340 : 240);
          const color = rubble[Math.floor(Math.random() * rubble.length)];
          p.className = 'sb-particle';
          p.style.cssText = `position:absolute;left:${Math.random() * W}px;top:${H - 8}px;width:${4 + Math.random() * 8}px;height:${4 + Math.random() * 8}px;border-radius:${Math.random() > 0.6 ? '50%' : '2px'};background:${color};pointer-events:none;z-index:30;box-shadow:0 0 8px 2px ${color};--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist}px;--pdur:${520 + Math.random() * 560}ms;--pdelay:${Math.random() * 260}ms;animation:sbParticle var(--pdur) ease-out var(--pdelay) both;`;
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
          d.style.cssText = `left:${toLeft ? W + 60 : -300}px;top:${Math.random() * H}px;font-size:${12 + Math.random() * (isRecord ? 26 : 20)}px;color:${color};text-shadow:0 0 10px ${color},0 0 24px ${color};--sk:${toLeft ? 14 : -14}deg;--dx:${toLeft ? -(W + 620) : (W + 620)}px;--cdur:${1800 + Math.random() * 1200}ms;--cdelay:${Math.random() * 900}ms;`;
          d.addEventListener('animationend', () => d.remove());
          fragment.appendChild(d);
        }
        for (let i = 0; i < effectCount(isRecord ? 34 : 22); i++) {
          const line = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          const toLeft = i % 2 === 0;
          line.className = 'qb-speed-line';
          line.style.cssText = `left:${toLeft ? W + 40 : -240}px;top:${Math.random() * H}px;width:${60 + Math.random() * 180}px;background:${color};box-shadow:0 0 10px 2px ${color};--dx:${toLeft ? -(W + 620) : (W + 620)}px;--cdur:${900 + Math.random() * 700}ms;--cdelay:${Math.random() * 700}ms;`;
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
      const queue = shuffle(weekCards);
      let current = 0;
      let startTime = null;
      let elapsed = 0;
      let clearElapsed = null;
      let rafId = null;
      let locked = false;
      let bgIndex = 0;
      let lastTimerPaint = -Infinity;

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

      function correctDetonate(correctBtn) {
        correctBtn.style.transition = 'none';
        correctBtn.style.background = 'rgba(0,255,100,0.65)';
        correctBtn.style.boxShadow = '0 0 30px 7px rgba(0,255,100,0.78)';
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
            p.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'};background:${colors[Math.floor(Math.random() * colors.length)]};pointer-events:none;z-index:10;box-shadow:0 0 6px 2px ${palette.accent};--px:${Math.cos(angle) * dist}px;--py:${Math.sin(angle) * dist}px;--pdur:${240 + Math.random() * 140}ms;--pdelay:${Math.random() * 30}ms;animation:${config.particleAnimation} var(--pdur) ease-out var(--pdelay) both;`;
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
        winScreen.classList.add('show');
        celebrate(overlay, palette, isRecord);
      }

      const cleanupAndClose = () => closeGame(overlay, stopTimer, stopBGM);
      overlay.querySelector(selector('wrongClose')).addEventListener('click', cleanupAndClose);
      overlay.querySelector(selector('quit')).addEventListener('click', cleanupAndClose);
      overlay.querySelector(selector('playAgain')).addEventListener('click', () => {
        stopTimer();
        stopBGM();
        overlay.remove();
        launch({ curr, monthSlug, weekNumber });
      });
      overlay.querySelector(selector('winClose')).addEventListener('click', cleanupAndClose);

      rafId = requestAnimationFrame(tick);
      renderQuestion();
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
