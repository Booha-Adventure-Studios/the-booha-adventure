
/**
 * adventure-log.js
 * The Booha Adventure — Adventure Log (student profile sections)
 *
 * Renders into three mounts on profile.html:
 *   #alog-week      — This Week: 12 stamps + sealed score + blitz times + duels
 *   #alog-calendar  — attendance calendar for the current Tokyo month
 *   #alog-past      — past week seals
 *
 * This is the canonical weekly log for the main profile. Data comes ONLY
 * from BoohaDayRecord (meta.dayLog / meta.weekLog).
 * All user-derived text is set via textContent — never innerHTML.
 */

const BoohaAdventureLog = (() => {
  'use strict';

  const BLITZ_TYPES = ['vocab', 'sentence', 'question'];
  const JP_DAYS     = ['日', '月', '火', '水', '木', '金', '土'];
  const BLITZ_TIER_LABELS = { perfect: 'PERFECT', clean: 'CLEAN', mastery: 'MASTERY' };

  /* ── Pure helpers (exposed for testing) ─────────────────────── */

  /** Infer the student's curriculum from weekLog: most adv entries this
      week; falls back through past weeks; final fallback 'br'. */
  function inferCurriculum(weekLog, currentWeekKey) {
    const count = (wk) => {
      const tally = { bc: 0, br: 0, pb: 0 };
      Object.keys((wk && wk.adv) || {}).forEach(k => {
        const c = k.split(':')[0];
        if (tally[c] != null) tally[c]++;
      });
      return tally;
    };
    const pick = (tally) => {
      const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      return best && best[1] > 0 ? best[0] : null;
    };
    const cur = pick(count(weekLog[currentWeekKey]));
    if (cur) return cur;
    const keys = Object.keys(weekLog).sort().reverse();
    for (const k of keys) {
      const c = pick(count(weekLog[k]));
      if (c) return c;
    }
    return 'br';
  }

  /** Weekly status for one curriculum. */
  function weekStatus(wk, curr, games) {
    const adv   = (wk && wk.adv)   || {};
    const blitz = (wk && wk.blitz) || {};
    const duel  = (wk && wk.duel)  || {};

    const gameStamps = games.map(g => {
      const key = `${curr}:${g.id}`;
      return { id: g.id, name: g.name, pct: adv[key] != null ? adv[key] : null };
    });
    const blitzStamps = BLITZ_TYPES.map(t => {
      const key = `${curr}:${t}`;
      const raw = blitz[key];
      const result = typeof raw === 'number'
        ? { ms: raw, tier: 'perfect', mistakes: 0 }
        : raw && typeof raw === 'object' && typeof raw.ms === 'number'
          ? raw
          : null;
      return {
        id: t,
        ms: result?.ms ?? null,
        tier: result?.tier || null,
        mistakes: Number.isFinite(result?.mistakes) ? result.mistakes : null,
      };
    });

    const advDone   = gameStamps.filter(s => s.pct != null).length;
    const blitzDone = blitzStamps.filter(s => s.ms != null).length;
    const complete  = advDone === games.length && blitzDone === BLITZ_TYPES.length;

    const vals = gameStamps.map(s => s.pct).filter(v => v != null);
    const pct  = vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : null;

    return { gameStamps, blitzStamps, advDone, blitzDone, complete, pct, duel };
  }

  /** Consecutive game-completion days, ending today or yesterday.
   *
   * Grace day: when today has no completed game yet, count back from
   * yesterday. A streak breaks after a full missed day, not each morning.
   * `g` is completed games; `s` is only evidence that the app was opened.
   */
  function streak(dayLog, todayKey) {
    const dayBefore = (key) => {
      const d = new Date(key + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    };
    const today = dayLog[todayKey];
    let cursor = (today && today.g > 0) ? todayKey : dayBefore(todayKey);
    let n = 0;
    for (;;) {
      const rec = dayLog[cursor];
      if (rec && rec.g > 0) { n++; cursor = dayBefore(cursor); }
      else break;
    }
    return n;
  }

  function fmtMs(ms) {
    if (ms == null) return '';
    const s = ms / 1000;
    return s >= 60
      ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
      : `${s.toFixed(1)}s`;
  }

  /** Average only fully recorded past weeks for the selected curriculum. */
  function recentFullWeekAverage(weekLog, currentWeekKey, curr, games) {
    const scores = Object.keys(weekLog || {})
      .filter(key => key !== currentWeekKey)
      .map(key => weekStatus(weekLog[key], curr, games))
      .filter(status => status.complete && status.pct != null)
      .map(status => status.pct);
    return scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;
  }

  /* ── DOM builders (createElement + textContent only) ─────────── */

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function showMountFallback(mount, label, error) {
    console.error(`[AdventureLog] ${label} section failed:`, error);
    if (!mount) return;
    mount.replaceChildren();
    mount.setAttribute('aria-busy', 'false');
    const box = el('div', 'profile-render-fallback');
    box.setAttribute('role', 'status');
    box.appendChild(el('strong', null, `${label} is temporarily unavailable.`));
    box.appendChild(el('small', null, 'Try refreshing this page.'));
    mount.appendChild(box);
  }

  function showWeeklyLoading(mount) {
    if (!mount) return;
    mount.replaceChildren();
    mount.setAttribute('aria-busy', 'true');
    const box = el('div', 'profile-render-fallback is-loading');
    box.setAttribute('role', 'status');
    box.appendChild(el('strong', null, 'Loading this week’s progress…'));
    box.appendChild(el('small', null, '今週のきろくを よみこんでいます'));
    mount.appendChild(box);
  }

  function formatPastWeekLabel(key) {
    const match = String(key).match(/^(\d{4})-(\d{2})-(\d{2})\|([a-z]+)-w(\d+)$/);
    if (!match) return String(key).slice(5);
    return `${match[4].slice(0, 3).toUpperCase()} ${Number(match[3])} · W${match[5]}`;
  }

  const CURR_LABELS = {
    pb: { en: 'Pre-Boo', jp: 'プレブー' },
    br: { en: 'Boo-riculum', jp: 'ブーカリキュラム' },
    bc: { en: 'Boo-continuum', jp: 'ブーコンティニューム' },
  };

  const BLITZ_ART = {
    vocab: 'assets/img/blitz/medal-circus.webp',
    sentence: 'assets/img/blitz/medal-spooky.webp',
    question: 'assets/img/blitz/medal-fireflies.webp',
  };

  function chip(text, cls) {
    return el('span', 'rb-chip' + (cls ? ' ' + cls : ''), text);
  }

  function renderWeek(mount, status, curr, playerName, onPick, reference) {
    mount.textContent = '';

    // Curriculum selector. It also drives the trail and game records above
    // and below (they listen for booha:profileCurr).
    const switcher = el('div', 'alog-curr-switcher');
    const switcherLabel = el('div', 'alog-curr-switcher-label');
    switcherLabel.appendChild(el('span', 'alog-curr-switcher-en', 'WEEKLY CURRICULUM'));
    switcherLabel.appendChild(el('span', 'alog-curr-switcher-jp', 'こんしゅうのカリキュラム'));
    switcher.appendChild(switcherLabel);

    const tabs = el('div', 'alog-curr-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Choose the curriculum for this week');
    ['pb', 'br', 'bc'].forEach(c => {
      const label = CURR_LABELS[c];
      const b = el('button', 'alog-curr-tab' + (c === curr ? ' active' : ''));
      b.type = 'button';
      b.title = `${label.en} / ${label.jp}`;
      b.setAttribute('aria-label', `${label.en}, ${label.jp}`);
      b.setAttribute('aria-pressed', c === curr ? 'true' : 'false');
      b.appendChild(el('span', 'alog-curr-tab-code', c.toUpperCase()));
      const copy = el('span', 'alog-curr-tab-copy');
      copy.appendChild(el('span', 'alog-curr-tab-en', label.en));
      copy.appendChild(el('span', 'alog-curr-tab-jp', label.jp));
      b.appendChild(copy);
      b.addEventListener('click', () => { if (c !== curr && onPick) onPick(c); });
      tabs.appendChild(b);
    });
    switcher.appendChild(tabs);
    mount.appendChild(switcher);

    const untouched = status.advDone === 0 && status.blitzDone === 0;
    if (untouched) {
      const box = el('div', 'rb-empty');
      box.appendChild(el('div', 'rb-empty-jp', 'こんしゅうは まだ あそんで いないよ'));
      box.appendChild(el('div', 'rb-empty-en', 'NOT PLAYED THIS WEEK'));
      mount.appendChild(box);
      return;
    }

    const total = status.gameStamps.length + status.blitzStamps.length;
    const done  = status.advDone + status.blitzDone;

    // Understanding ring: average of the games recorded so far this week.
    const card = el('div', 'rb-report');
    const ring = el('div', 'rb-ring');
    const pct = status.pct == null ? 0 : Math.max(0, Math.min(100, status.pct));
    ring.style.setProperty('--pct', pct + '%');
    if (reference && reference.average != null) {
      ring.style.setProperty('--ref', Math.max(0, Math.min(100, reference.average)) + '%');
      ring.classList.add('has-ref');
    }
    const ringInner = el('div', 'rb-ring-inner');
    ringInner.appendChild(el('span', 'rb-ring-pct', status.pct == null ? '—' : status.pct + '%'));
    ringInner.appendChild(el('span', 'rb-ring-label', 'りかいど'));
    ring.appendChild(ringInner);
    card.appendChild(ring);

    const side = el('div', 'rb-report-side');
    if (reference && reference.average != null && status.complete && status.pct != null) {
      // Compare only full weeks with full weeks, as the original reference did.
      const delta = status.pct - reference.average;
      side.appendChild(el('span', 'rb-ref-line', `いつもの ${reference.average}% より`));
      side.appendChild(el('span', 'rb-delta ' + (delta >= 0 ? 'up' : 'down'), `${delta > 0 ? '+' : ''}${delta}% ${delta >= 0 ? '↑' : '↓'}`));
      side.appendChild(el('span', 'rb-en', 'VS. PERSONAL RECENT AVERAGE'));
    } else if (reference && reference.average != null) {
      side.appendChild(el('span', 'rb-ref-line', `いつもの じぶん: ${reference.average}%`));
      side.appendChild(el('span', 'rb-ref-goal', 'しゅうを ぜんぶ おえたら くらべよう！'));
      side.appendChild(el('span', 'rb-en', 'PERSONAL RECENT AVERAGE · FINISH THIS WEEK TO COMPARE'));
    } else {
      side.appendChild(el('span', 'rb-ref-line', '1しゅう ぜんぶ きろくすると いつもの じぶんと くらべられるよ'));
      side.appendChild(el('span', 'rb-en', 'PERSONAL RECENT AVERAGE · AFTER ONE FULL WEEK'));
    }
    const chips = el('div', 'rb-chips');
    chips.appendChild(chip(`ゲーム ${status.advDone}/${status.gameStamps.length}`));
    chips.appendChild(chip(`Blitz ${status.blitzDone}/${status.blitzStamps.length}`));
    chips.appendChild(chip(`${done} / ${total} RECORDED`, status.complete ? 'gold' : ''));
    side.appendChild(chips);
    card.appendChild(side);
    mount.appendChild(card);

    // Blitz results this week.
    const blitzRow = el('div', 'rb-blitz');
    status.blitzStamps.forEach(s => {
      const box = el('div', 'rb-blitz-card' + (s.ms != null ? ' done' : ''));
      const img = el('img');
      img.src = BLITZ_ART[s.id] || BLITZ_ART.vocab;
      img.alt = '';
      img.width = 40; img.height = 40;
      box.appendChild(img);
      box.appendChild(el('span', 'rb-blitz-name', s.id.toUpperCase()));
      box.appendChild(el('span', 'rb-blitz-time', s.ms != null ? fmtMs(s.ms) : '—'));
      box.appendChild(el('span', 'rb-blitz-tier' + (s.tier ? ' ' + s.tier : ''), s.ms != null ? (BLITZ_TIER_LABELS[s.tier] || 'CLEAR') : 'まだ'));
      blitzRow.appendChild(box);
    });
    mount.appendChild(blitzRow);

    // Duels bonus row
    const duelIds = Object.keys(status.duel || {});
    if (duelIds.length) {
      const row = el('div', 'rb-chips');
      row.appendChild(chip('たいけつ / DUELS', 'muted'));
      duelIds.forEach(id => {
        const d = status.duel[id];
        row.appendChild(chip(`${id.toUpperCase()} ${d.w}勝 / ${d.p}戦`));
      });
      mount.appendChild(row);
    }
  }

  // Calendar month offset from the current month (0 = this month).
  let calendarOffset = 0;

  function monthKey(y, m) {
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  function renderCalendar(mount, dayLog, todayKey, checkIn) {
    mount.textContent = '';
    checkIn = checkIn && typeof checkIn === 'object' ? checkIn : {};
    const baseY = Number(todayKey.slice(0, 4));
    const baseM = Number(todayKey.slice(5, 7));
    const shifted = new Date(Date.UTC(baseY, baseM - 1 - calendarOffset, 1));
    const Y = shifted.getUTCFullYear();
    const M = shifted.getUTCMonth() + 1;
    const first = new Date(Date.UTC(Y, M - 1, 1));
    const days = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    const earliest = Object.keys(dayLog).concat(Object.keys(checkIn)).sort()[0] || todayKey;
    const canBack = monthKey(Y, M) > earliest.slice(0, 7);

    const head = el('div', 'rb-cal-head');
    const prev = el('button', 'rb-cal-nav', '‹');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous month / まえの月');
    prev.disabled = !canBack;
    prev.addEventListener('click', () => { calendarOffset++; renderCalendar(mount, dayLog, todayKey, checkIn); });
    const next = el('button', 'rb-cal-nav', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next month / つぎの月');
    next.disabled = calendarOffset === 0;
    next.addEventListener('click', () => { calendarOffset = Math.max(0, calendarOffset - 1); renderCalendar(mount, dayLog, todayKey, checkIn); });
    head.appendChild(prev);
    head.appendChild(el('span', 'rb-cal-month', `${Y}年${M}月`));
    head.appendChild(next);
    mount.appendChild(head);

    const board = el('div', 'rb-cal');
    const grid = el('div', 'rb-cal-grid');
    JP_DAYS.forEach((d, i) => grid.appendChild(el('div', 'rb-cal-dow' + (i === 0 ? ' sun' : i === 6 ? ' sat' : ''), d)));
    for (let i = 0; i < first.getUTCDay(); i++) grid.appendChild(el('div', 'rb-cal-cell empty'));

    let playedDays = 0;
    let checkedDays = 0;
    for (let d = 1; d <= days; d++) {
      const key = `${monthKey(Y, M)}-${String(d).padStart(2, '0')}`;
      const rec = dayLog[key];
      const future = key > todayKey;
      const played = !future && !!(rec && rec.g);
      const visited = !future && !played && !!(rec && rec.s);
      const checked = !future && !!(checkIn[key] && checkIn[key].st === 'done');
      if (played) playedDays++;
      if (checked) checkedDays++;
      let cls = 'rb-cal-cell';
      if (future) cls += ' future';
      if (played) cls += ' played';
      if (visited) cls += ' visited';
      if (checked) cls += ' checked';
      if (key === todayKey) cls += ' today';
      const cell = el('div', cls);
      cell.appendChild(el('span', 'rb-cal-num', String(d)));
      if (played || visited) cell.appendChild(el('span', 'rb-cal-dot'));
      const parts = [`${M}月${d}日`];
      if (played) parts.push('ゲーム');
      else if (visited) parts.push('ひらいた');
      if (checked) parts.push('チェック');
      cell.setAttribute('aria-label', parts.join(' · '));
      grid.appendChild(cell);
    }
    board.appendChild(grid);

    const legend = el('div', 'rb-cal-legend');
    [['played', 'ゲームを あそんだ'], ['checked', 'チェック した'], ['today', 'きょう']].forEach(([cls, text]) => {
      const item = el('span', 'rb-legend-item');
      item.appendChild(el('span', 'rb-legend-key ' + cls));
      item.appendChild(el('span', null, text));
      legend.appendChild(item);
    });
    board.appendChild(legend);
    mount.appendChild(board);

    const st = streak(dayLog, todayKey);
    const totals = el('div', 'rb-cal-totals');
    [[`${playedDays}日`, 'あそんだ日', 'orange'], [`${checkedDays}日`, 'チェックした日', 'teal'], [`${st}日`, 'ゲームれんぞく', 'gold']].forEach(([v, l, c]) => {
      const box = el('div', 'rb-cal-total ' + c);
      box.appendChild(el('b', null, v));
      box.appendChild(el('span', null, l));
      totals.appendChild(box);
    });
    mount.appendChild(totals);
  }

  function weekMedalCount(key) {
    try {
      const W = window.BoohaWeeklyMedals;
      const data = window.BoohaAdventure && BoohaAdventure.save ? BoohaAdventure.save.load() : null;
      const log = data && data.meta ? data.meta.medalLog : null;
      return W && log ? W.weekCount(log, key) : 0;
    } catch (_) {
      return 0;
    }
  }

  function renderPast(mount, weekLog, currentWeekKey, curr, games) {
    mount.textContent = '';
    const prefix = curr + ':';
    const hasCurriculumActivity = (wk) =>
      Object.keys((wk && wk.adv) || {}).some(k => k.startsWith(prefix)) ||
      Object.keys((wk && wk.blitz) || {}).some(k => k.startsWith(prefix));
    const keys = Object.keys(weekLog)
      .filter(k => k !== currentWeekKey && hasCurriculumActivity(weekLog[k]))
      .sort().reverse();
    if (!keys.length) {
      mount.appendChild(el('div', 'rb-empty-jp rb-past-empty', 'これから きろくが たまるよ！'));
      return;
    }

    // Honest running summary: only weeks with activity in the selected
    // curriculum enter the denominator, and only fully completed weeks enter
    // the score average.
    const stats = keys.map(k => weekStatus(weekLog[k], curr, games));
    const full = stats.filter(s => s.complete);
    const fullPcts = full.map(s => s.pct).filter(v => v != null);
    const avg = fullPcts.length
      ? Math.round(fullPcts.reduce((a, b) => a + b, 0) / fullPcts.length)
      : null;

    const chips = el('div', 'rb-chips');
    chips.appendChild(chip(`きろく ${keys.length}しゅう`));
    chips.appendChild(chip(`ぜんぶ きろく ${full.length}しゅう`, 'gold'));
    if (avg != null) chips.appendChild(chip(`へいきん ${avg}%`));
    mount.appendChild(chips);
    mount.appendChild(el('div', 'rb-en rb-past-en',
      `${full.length} OF ${keys.length} RECORDED WEEKS FULLY LOGGED` +
      (avg != null ? ` · FULL-WEEK AVG ${avg}%` : '')));

    const strip = el('div', 'rb-past-strip');
    keys.forEach((k, i) => {
      const s = stats[i];
      let tier = 'missed';
      let label = '休';
      let tierText = 'おやすみ';
      if (s.complete) {
        tier = s.pct >= 90 ? 'gold' : s.pct >= 75 ? 'silver' : 'bronze';
        label = s.pct + '%';
        tierText = tier.toUpperCase();
      } else if (s.advDone + s.blitzDone > 0) {
        tier = 'partial';
        label = `${s.advDone + s.blitzDone}/12`;
        tierText = 'とちゅう';
      }
      const card = el('div', 'rb-past-card ' + tier);
      card.appendChild(el('div', 'rb-past-seal', label));
      card.appendChild(el('span', 'rb-past-tier', tierText));
      card.appendChild(el('span', 'rb-past-week', formatPastWeekLabel(k)));
      const medals = weekMedalCount(k);
      if (medals) card.appendChild(el('span', 'rb-past-medals', `メダル ×${medals}`));
      card.setAttribute('aria-label', `${formatPastWeekLabel(k)}: ${tierText} ${label}${medals ? `, ${medals} medals` : ''}`);
      strip.appendChild(card);
    });
    mount.appendChild(strip);
  }

  /* ── Init ─────────────────────────────────────────────────────── */

  function init() {
    const wMount = document.getElementById('alog-week');
    const cMount = document.getElementById('alog-calendar');
    const pMount = document.getElementById('alog-past');
    if (!wMount) return;
    showWeeklyLoading(wMount);

    try {
      if (!window.BoohaDayRecord || !window.CALENDAR || !window.BoohaGameRegistry) {
        throw new Error('weekly log dependencies are unavailable');
      }

      const keys = BoohaDayRecord.getCurrentKeys();
      if (!keys || typeof keys.week !== 'string' || typeof keys.day !== 'string') {
        throw new Error('current calendar keys are unavailable');
      }
      const dayLog = BoohaDayRecord.getDayLog();
      const weekLog = BoohaDayRecord.getWeekLog();
      if (!weekLog || typeof weekLog !== 'object' || Array.isArray(weekLog)) {
        throw new Error('weekly log data is unavailable');
      }

      let curr = null;
      try {
        const s = localStorage.getItem('booha_profile_curr');
        if (['pb', 'br', 'bc'].includes(s)) curr = s;
      } catch (_) {}
      if (!curr) curr = inferCurriculum(weekLog, keys.week);

      const gamesFor = c => {
        if (!['pb', 'br', 'bc'].includes(c)
          || typeof BoohaGameRegistry.getForCurriculum !== 'function') {
          throw new Error('curriculum lookup is unavailable');
        }
        const entries = typeof BoohaGameRegistry.getForCurriculumInMazeOrder === 'function'
          ? BoohaGameRegistry.getForCurriculumInMazeOrder(c)
          : BoohaGameRegistry.getForCurriculum(c);
        if (!Array.isArray(entries) || !entries.length) {
          throw new Error(`curriculum ${c} has no game registry entries`);
        }
        return entries.map((g, index) => {
          if (!g || typeof g !== 'object') throw new Error(`invalid game entry ${index}`);
          const id = typeof g.baseId === 'string' && g.baseId
            ? g.baseId
            : typeof g.id === 'string' && g.id ? g.id.split(':').pop() : '';
          if (!id) throw new Error(`game entry ${index} has no id`);
          return { id, name: typeof g.name === 'string' && g.name ? g.name : id };
        });
      };

      const games = gamesFor(curr);
      let playerName = 'PLAYER';
      try {
        const raw = localStorage.getItem('booha_first_name') || '';
        if (raw) playerName = raw.trim().slice(0, 12).toUpperCase();
      } catch (_) {}

      const title = document.getElementById('alog-title');
      if (title) title.textContent = `${playerName}のぼうけんログ`;

      const paint = (c) => {
        try {
          try { localStorage.setItem('booha_profile_curr', c); } catch (_) {}
          // The game view above the record book follows the same tab.
          document.dispatchEvent(new CustomEvent('booha:profileCurr', { detail: { curr: c } }));
          const g = gamesFor(c);
          const reference = {
            average: recentFullWeekAverage(weekLog, keys.week, c, g),
          };
          renderWeek(wMount, weekStatus(weekLog[keys.week], c, g), c, playerName, paint, reference);
          wMount.setAttribute('aria-busy', 'false');
        } catch (error) {
          showMountFallback(wMount, 'This week’s progress', error);
          return;
        }

        if (pMount) {
          try {
            renderPast(pMount, weekLog, keys.week, c, gamesFor(c));
          } catch (error) {
            showMountFallback(pMount, 'Past progress', error);
          }
        }
      };
      paint(curr);

      if (cMount) {
        try {
          let checkIn = {};
          try {
            const saved = BoohaAdventure.save.load();
            checkIn = saved && saved.meta && saved.meta.checkIn ? saved.meta.checkIn : {};
          } catch (_) {}
          renderCalendar(cMount, dayLog && typeof dayLog === 'object' ? dayLog : {}, keys.day, checkIn);
          cMount.setAttribute('aria-busy', 'false');
        } catch (error) {
          showMountFallback(cMount, 'Adventure calendar', error);
        }
      }
    } catch (error) {
      showMountFallback(wMount, 'This week’s progress', error);
    }
  }

// Boot after BoohaAdventure, whose identity gate guarantees booha_userid is
  // present — otherwise BoohaDayRecord reads the legacy save, not the student's.
  showWeeklyLoading(document.getElementById('alog-week'));

  if (window.BOOHA_READY) {
    init();
  } else {
    document.addEventListener('booha:ready', init, { once: true });
  }
  document.addEventListener('booha:dayRecorded', init);

  return { init, _test: { inferCurriculum, weekStatus, streak, fmtMs, recentFullWeekAverage } };
})();

window.BoohaAdventureLog = BoohaAdventureLog;
