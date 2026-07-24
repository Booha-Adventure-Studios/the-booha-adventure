
/**
 * adventure-log.js
 * The Booha Adventure — Adventure Log (student profile sections)
 *
 * Renders into three mounts on adventure-profile.html:
 *   #alog-week      — This Week: 12 stamps + sealed score + blitz times + duels
 *   #alog-calendar  — attendance calendar for the current Tokyo month
 *   #alog-past      — past week seals
 *
 * Data comes ONLY from BoohaDayRecord (meta.dayLog / meta.weekLog).
 * All user-derived text is set via textContent — never innerHTML.
 */

const BoohaAdventureLog = (() => {
  'use strict';

  const BLITZ_TYPES = ['vocab', 'sentence', 'question'];
  const JP_DAYS     = ['日', '月', '火', '水', '木', '金', '土'];

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
      return { id: t, ms: blitz[key] != null ? blitz[key] : null };
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

  /* ── DOM builders (createElement + textContent only) ─────────── */

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  const CURR_LABELS = { pb: 'Pre-Boo', br: 'Boo-riculum', bc: 'Boo-continuum' };

  function renderWeek(mount, status, curr, playerName, onPick) {
    mount.textContent = '';

    // Curriculum selector — always visible so students can switch tracks
    const tabs = el('div', 'alog-curr-tabs');
    ['pb', 'br', 'bc'].forEach(c => {
      const b = el('button', 'alog-curr-tab' + (c === curr ? ' active' : ''),
                   c.toUpperCase());
      b.type = 'button';
      b.title = CURR_LABELS[c];
      b.setAttribute('aria-pressed', c === curr ? 'true' : 'false');
      b.addEventListener('click', () => { if (c !== curr && onPick) onPick(c); });
      tabs.appendChild(b);
    });
    mount.appendChild(tabs);

    const untouched = status.advDone === 0 && status.blitzDone === 0;
    if (untouched) {
      const box = el('div', 'alog-untouched');
      box.appendChild(el('div', 'alog-untouched-jp', '未プレイ'));
      box.appendChild(el('div', 'alog-untouched-en', 'NOT PLAYED THIS WEEK'));
      mount.appendChild(box);
      return;
    }

    // 9 game stamps
    const grid = el('div', 'alog-stamps');
    status.gameStamps.forEach(s => {
      const stamp = el('div', 'alog-stamp' + (s.pct != null ? ' done' : ''));
      stamp.appendChild(el('div', 'alog-stamp-glyph', s.pct != null ? '★' : ''));
      stamp.appendChild(el('div', 'alog-stamp-label', s.name));
      if (s.pct != null) stamp.appendChild(el('div', 'alog-stamp-pct', s.pct + '%'));
      grid.appendChild(stamp);
    });
    // 3 blitz stamps
    status.blitzStamps.forEach(s => {
      const stamp = el('div', 'alog-stamp blitz' + (s.ms != null ? ' done' : ''));
      stamp.appendChild(el('div', 'alog-stamp-glyph', s.ms != null ? '★' : ''));
      stamp.appendChild(el('div', 'alog-stamp-label', s.id.toUpperCase() + ' BLITZ'));
      if (s.ms != null) stamp.appendChild(el('div', 'alog-stamp-pct', fmtMs(s.ms)));
      grid.appendChild(stamp);
    });
    mount.appendChild(grid);

    // Counter line
    mount.appendChild(el('div', 'alog-count',
      `ゲーム ${status.advDone}/9 ・ ブリッツ ${status.blitzDone}/3`));

    // Weekly progress (completion) + score on completion
    const total    = status.gameStamps.length + status.blitzStamps.length;
    const done     = status.advDone + status.blitzDone;
    const progress = Math.round((done / total) * 100);

    const prog = el('div', 'alog-progress');
    prog.appendChild(el('div', 'alog-progress-label',
      `こんしゅうのたっせい ${progress}%`));
    const barWrap = el('div', 'alog-bar');
    const barFill = el('div', 'alog-bar-fill' + (status.complete ? ' full' : ''));
    barFill.style.width = progress + '%';
    barWrap.appendChild(barFill);
    prog.appendChild(barWrap);
    prog.appendChild(el('div', 'alog-progress-en',
      `${done} / ${total} COMPLETE`));
    mount.appendChild(prog);

    if (status.complete) {
      const score = el('div', 'alog-score');
      score.appendChild(el('div', 'alog-score-pct', status.pct + '%'));
      score.appendChild(el('div', 'alog-score-jp', 'こんしゅうのスコア（9ゲームのへいきん）'));
      score.appendChild(el('div', 'alog-score-en', `${playerName}'S WEEKLY SCORE`));
      mount.appendChild(score);
    }

    // Duels bonus row
    const duelIds = Object.keys(status.duel || {});
    if (duelIds.length) {
      const row = el('div', 'alog-duels');
      row.appendChild(el('span', 'alog-duel-label', 'たいけつ / DUELS'));
      duelIds.forEach(id => {
        const d = status.duel[id];
        row.appendChild(el('span', 'alog-duel-item',
          `${id.toUpperCase()} ${d.w}勝 / ${d.p}戦`));
      });
      mount.appendChild(row);
    }
  }

  function renderCalendar(mount, dayLog, todayKey) {
    mount.textContent = '';
    const [Y, M] = [Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7))];
    const first  = new Date(Date.UTC(Y, M - 1, 1));
    const days   = new Date(Date.UTC(Y, M, 0)).getUTCDate();

    mount.appendChild(el('div', 'alog-cal-month', `${Y}年${M}月`));

    const head = el('div', 'alog-cal-grid');
    JP_DAYS.forEach(d => head.appendChild(el('div', 'alog-cal-dow', d)));
    for (let i = 0; i < first.getUTCDay(); i++) head.appendChild(el('div', 'alog-cal-cell empty'));

    for (let d = 1; d <= days; d++) {
      const key    = `${Y}-${String(M).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec    = dayLog[key];
      const future = key > todayKey;
      let cls = 'alog-cal-cell';
      if (future)              cls += ' future';
      else if (rec && rec.g)   cls += ' played';
      else if (rec && rec.s)   cls += ' visited';
      if (key === todayKey)    cls += ' today';
      const cell = el('div', cls);
      cell.appendChild(el('div', 'alog-cal-num', String(d)));
      if (!future && rec && rec.g) cell.appendChild(el('div', 'alog-cal-star', '★'));
      head.appendChild(cell);
    }
    mount.appendChild(head);

    const legend = el('div', 'alog-cal-legend');
    legend.appendChild(el('span', 'alog-legend-star', '★'));
    legend.appendChild(el('span', null, ' ゲームをクリアした日 / PLAYED ・ '));
    legend.appendChild(el('span', 'alog-legend-visit', '□'));
    legend.appendChild(el('span', null, ' ひらいた日 / VISITED'));
    mount.appendChild(legend);

    const st = streak(dayLog, todayKey);
    mount.appendChild(el('div', 'alog-streak',
      st > 0 ? `ゲームれんぞく ${st}日 / ${st}-DAY GAME STREAK` : ''));
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
      mount.appendChild(el('div', 'alog-past-empty', 'これから きろくが たまるよ！'));
      return;
    }

    // Honest running summary: only weeks with activity in the selected
    // curriculum enter the denominator, and only fully completed weeks enter
    // the score average. Completely missed weeks need an explicit tracking
    // start before they can be counted fairly.
    const stats = keys.map(k => weekStatus(weekLog[k], curr, games));
    const full = stats.filter(s => s.complete);
    const fullPcts = full.map(s => s.pct).filter(v => v != null);
    const avg = fullPcts.length
      ? Math.round(fullPcts.reduce((a, b) => a + b, 0) / fullPcts.length)
      : null;

    const sum = el('div', 'alog-term');
    sum.appendChild(el('div', 'alog-term-jp',
      `きろくのある ${keys.length}しゅうのうち ${full.length}しゅう かんりょう`));
    sum.appendChild(el('div', 'alog-term-en',
      `${full.length} OF ${keys.length} RECORDED WEEKS COMPLETE` +
      (avg != null ? ` · COMPLETE-WEEK AVG ${avg}%` : '')));
    mount.appendChild(sum);

    const strip = el('div', 'alog-past-strip');
    keys.forEach((k, i) => {
      const s = stats[i];
      let badge;
      if (s.complete) {
        badge = el('div', 'alog-past-seal gold');
        badge.appendChild(el('div', 'alog-past-pct', s.pct + '%'));
      } else if (s.advDone + s.blitzDone > 0) {
        badge = el('div', 'alog-past-seal partial');
        badge.appendChild(el('div', 'alog-past-pct', `${s.advDone + s.blitzDone}/12`));
      } else {
        badge = el('div', 'alog-past-seal missed');
        badge.appendChild(el('div', 'alog-past-pct', '未'));
      }
      badge.appendChild(el('div', 'alog-past-week', k.slice(5)));
      strip.appendChild(badge);
    });
    mount.appendChild(strip);
  }

  /* ── Init ─────────────────────────────────────────────────────── */

  function init() {
    const wMount = document.getElementById('alog-week');
    const cMount = document.getElementById('alog-calendar');
    const pMount = document.getElementById('alog-past');
    if (!wMount || !window.BoohaDayRecord || !window.CALENDAR) return;

    const keys    = BoohaDayRecord.getCurrentKeys();
    if (!keys) return; // CALENDAR failed — sections stay empty rather than wrong
    const dayLog  = BoohaDayRecord.getDayLog();
    const weekLog = BoohaDayRecord.getWeekLog();
    let curr = null;
    try {
      const s = localStorage.getItem('booha_profile_curr');
      if (['pb', 'br', 'bc'].includes(s)) curr = s;
    } catch (_) {}
    if (!curr) curr = inferCurriculum(weekLog, keys.week);
    const gamesFor = c => BoohaGameRegistry.getForCurriculum(c).map(g => ({
      id: g.baseId || g.id.split(':').pop(), name: g.name
    }));
    const games = gamesFor(curr);

    let playerName = 'PLAYER';
    try {
      const raw = localStorage.getItem('booha_first_name') ||
                  (localStorage.getItem('booha_user_name') || '').split(/\s+/)[0];
      if (raw) playerName = raw.trim().slice(0, 12).toUpperCase();
    } catch (_) {}

    const title = document.getElementById('alog-title');
    if (title) title.textContent = `${playerName}のぼうけんログ`;

    const paint = (c) => {
      try { localStorage.setItem('booha_profile_curr', c); } catch (_) {}
      const g = gamesFor(c);
      renderWeek(wMount, weekStatus(weekLog[keys.week], c, g), c, playerName, paint);
      if (pMount) renderPast(pMount, weekLog, keys.week, c, g);
    };
    paint(curr);
    if (cMount) renderCalendar(cMount, dayLog, keys.day);
  }

// Boot after BoohaAdventure, whose identity gate guarantees booha_userid is
  // present — otherwise BoohaDayRecord reads the legacy save, not the student's.
  if (window.BOOHA_READY) {
    init();
  } else {
    document.addEventListener('booha:ready', init, { once: true });
  }

  return { init, _test: { inferCurriculum, weekStatus, streak, fmtMs } };
})();

window.BoohaAdventureLog = BoohaAdventureLog;
