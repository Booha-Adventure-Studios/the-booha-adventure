
/**
 * score-system.js
 * The Booha Adventure — Score System
 * v2: writes to weekly.* and updates meta.allTimeStars on every submit.
 */

const BoohaScoreSystem = (() => {
  'use strict';

  function _getScores() {
    return BoohaAdventure.save.load().scores || {};
  }

  function _defaultEntry(gameId) {
    return {
      gameId,
      highScore:    0,
      stars:        0,
      completed:    false,
      attempts:     0,
      bestTime:     null,
      lastTime:     null,
      lastPlayedAt: null,
    };
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function submit(gameId, score, opts = {}) {
    const registry = BoohaAdventure.registry;

    // ── 1. Update permanent scores ─────────────────────────────────────────
    const scores      = _getScores();
    const entry       = scores[gameId] || _defaultEntry(gameId);
    const prevStars   = entry.stars;

    const isHighScore = score > entry.highScore;
    if (isHighScore) entry.highScore = score;

    const newStars = registry ? registry.starsForScore(gameId, score) : 0;
    if (newStars > entry.stars) entry.stars = newStars;

    const wasCompleted = !entry.completed && opts.completed;
    if (opts.completed) entry.completed = true;

    let isBestTime = false;
    if (opts.time != null) {
      entry.lastTime = opts.time;
      if (entry.bestTime === null || opts.time < entry.bestTime) {
        entry.bestTime = opts.time;
        isBestTime = true;
      }
    }

    entry.attempts++;
    entry.lastPlayedAt = Date.now();

    BoohaAdventure.save.patch('scores', { [gameId]: entry });

    // ── 2. Update weekly data ──────────────────────────────────────────────
    const data         = BoohaAdventure.save.load();
    const weekly       = data.weekly || {};
    const wScores      = weekly.gameScores      || {};
    const wStars       = weekly.gameStars       || {};
    const wCompleted   = weekly.completedGames  || {};
    const wWanderers   = weekly.wanderers       || [];

    const wasNewGame = !(wScores[gameId]);   // wScores is fresh from the new load()
    
    // Weekly high score
    if (!wScores[gameId] || score > wScores[gameId]) {
      wScores[gameId] = score;
    }

    // Weekly stars (best this week)
    const weeklyStars = registry ? registry.starsForScore(gameId, score) : 0;
    if (!wStars[gameId] || weeklyStars > wStars[gameId]) {
      wStars[gameId] = weeklyStars;
    }

    // Weekly completion
    if (opts.completed) {
      wCompleted[gameId] = true;
    }

// ── 3. Unlock wanderer for this game ───────────────────────────────────────
if (wasNewGame) {
  const TOTAL_WANDERERS = 22;
  const remaining = [];

  for (let i = 0; i < TOTAL_WANDERERS; i++) {
    if (!wWanderers.includes(i)) remaining.push(i);
  }

  if (remaining.length > 0) {
    const randIndex = Math.floor(Math.random() * remaining.length);
    const chosen = remaining[randIndex];
    wWanderers.push(chosen);
  }
}



    // ── 4. Update meta.allTimeStars ────────────────────────────────────────
    // Only add the improvement in stars (delta) to avoid double-counting.
    const starDelta = entry.stars - prevStars;
    if (starDelta > 0) {
      if (!data.meta) data.meta = { lastWeeklyKey: '', allTimeStars: 0 };
      if (typeof data.meta.allTimeStars !== 'number') data.meta.allTimeStars = 0;
      data.meta.allTimeStars += starDelta;
    }

    BoohaAdventure.save.save(data);

    // ── 5. Fire events ─────────────────────────────────────────────────────
    const detail = { gameId, score, isHighScore, isBestTime, stars: entry.stars, wasCompleted };
    document.dispatchEvent(new CustomEvent('booha:scoreSubmitted', { detail }));

    // Trigger unlock checks (achievements + bonus games)
    if (BoohaAdventure.unlocks) BoohaAdventure.unlocks.checkAll();

    return detail;
  }

  // ── Permanent read helpers ────────────────────────────────────────────────
  function getEntry(gameId) {
    return _getScores()[gameId] || _defaultEntry(gameId);
  }
  function getHighScore(gameId)  { return getEntry(gameId).highScore; }
  function getStars(gameId)      { return getEntry(gameId).stars; }
  function isCompleted(gameId)   { return getEntry(gameId).completed; }
  function getBestTime(gameId)   { return getEntry(gameId).bestTime; }
  function getLastTime(gameId)   { return getEntry(gameId).lastTime; }
  function getAll()              { return _getScores(); }

  function formatTime(ms) {
    if (ms == null) return '—';
    const totalSec = Math.floor(ms / 1000);
    const mins     = Math.floor(totalSec / 60);
    const secs     = totalSec % 60;
    const cents    = Math.floor((ms % 1000) / 10);
    return `${mins}:${String(secs).padStart(2,'0')}.${String(cents).padStart(2,'0')}`;
  }

  function totalStars() {
    return Object.values(_getScores()).reduce((s, e) => s + (e.stars || 0), 0);
  }
  function totalStarsFor(curriculum) {
    return Object.entries(_getScores())
      .filter(([id]) => id.startsWith(`${curriculum}:`))
      .reduce((s, [,e]) => s + (e.stars || 0), 0);
  }
  function totalCompleted() {
    return Object.values(_getScores()).filter(e => e.completed).length;
  }
  function totalCompletedFor(curriculum) {
    return Object.entries(_getScores())
      .filter(([id]) => id.startsWith(`${curriculum}:`))
      .filter(([,e]) => e.completed).length;
  }

  // ── Weekly read helpers ───────────────────────────────────────────────────
  function _getWeekly() {
    const data = BoohaAdventure.save.load();
    return data.weekly || {};
  }

  function weeklyStars() {
    const wStars = _getWeekly().gameStars || {};
    return Object.values(wStars).reduce((s, n) => s + (n || 0), 0);
  }

  function weeklyStarsFor(curriculum) {
    const wStars = _getWeekly().gameStars || {};
    return Object.entries(wStars)
      .filter(([id]) => id.startsWith(`${curriculum}:`))
      .reduce((s, [,n]) => s + (n || 0), 0);
  }

  function weeklyCompleted() {
    return Object.keys(_getWeekly().completedGames || {}).length;
  }

  function weeklyCompletedFor(curriculum) {
    return Object.keys(_getWeekly().completedGames || {})
      .filter(id => id.startsWith(`${curriculum}:`)).length;
  }

  function weeklyStarsForGame(saveId) {
    return (_getWeekly().gameStars || {})[saveId] || 0;
  }

  function weeklyScoreForGame(saveId) {
    return (_getWeekly().gameScores || {})[saveId] || 0;
  }

  function isCompletedWeekly(saveId) {
    return !!(_getWeekly().completedGames || {})[saveId];
  }

  function allTimeStars() {
    const data = BoohaAdventure.save.load();
    return (data.meta && data.meta.allTimeStars) || 0;
  }

  // ── Summary helpers ───────────────────────────────────────────────────────
  /**
   * Weekly summary for one curriculum — used by profile page.
   */
  function weeklySummaryFor(curriculum) {
    const registry  = BoohaAdventure.registry;
    const games     = registry ? registry.getForCurriculum(curriculum) : [];
    const wStars    = _getWeekly().gameStars    || {};
    const wScores   = _getWeekly().gameScores   || {};
    const wDone     = _getWeekly().completedGames || {};

    const entries = games.map(g => ({
      ...g,
      stars:      wStars[g.saveId]  || 0,
      highScore:  wScores[g.saveId] || 0,
      completed:  !!wDone[g.saveId],
    }));

    return {
      curriculum,
      completed:  entries.filter(e => e.completed).length,
      totalGames: entries.length,
      stars:      entries.reduce((s, e) => s + e.stars, 0),
      totalStars: entries.length * 3,
      entries,
    };
  }

  function weeklySummaryAll() {
    const curriculums = BoohaAdventure.registry
      ? BoohaAdventure.registry.CURRICULUMS
      : ['bc', 'br', 'pb'];
    const perCurriculum = curriculums.map(weeklySummaryFor);
    return {
      perCurriculum,
      completed:  weeklyCompleted(),
      totalGames: perCurriculum.reduce((s, c) => s + c.totalGames, 0),
      stars:      weeklyStars(),
      totalStars: perCurriculum.reduce((s, c) => s + c.totalStars, 0),
    };
  }

  // Permanent summary (kept for compatibility)
  function summaryFor(curriculum) {
    const scores  = _getScores();
    const registry = BoohaAdventure.registry;
    const games   = registry ? registry.getForCurriculum(curriculum) : [];
    const entries = games.map(g => ({
      ...g,
      ...(scores[g.saveId] || _defaultEntry(g.saveId)),
    }));
    return {
      curriculum,
      completed:  entries.filter(e => e.completed).length,
      totalGames: entries.length,
      stars:      entries.reduce((s, e) => s + (e.stars || 0), 0),
      totalStars: entries.length * 3,
      entries,
    };
  }

  function summaryAll() {
    const curriculums = BoohaAdventure.registry
      ? BoohaAdventure.registry.CURRICULUMS
      : ['bc', 'br', 'pb'];
    const perCurriculum = curriculums.map(summaryFor);
    return {
      perCurriculum,
      completed:  totalCompleted(),
      totalGames: perCurriculum.reduce((s, c) => s + c.totalGames, 0),
      stars:      totalStars(),
      totalStars: perCurriculum.reduce((s, c) => s + c.totalStars, 0),
    };
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    submit,
    getEntry, getHighScore, getStars, isCompleted,
    getBestTime, getLastTime, formatTime, getAll,
    totalStars, totalStarsFor, totalCompleted, totalCompletedFor,
    weeklyStars, weeklyStarsFor, weeklyCompleted, weeklyCompletedFor,
    weeklyStarsForGame, weeklyScoreForGame, isCompletedWeekly,
    allTimeStars,
    weeklySummaryFor, weeklySummaryAll,
    summaryFor, summaryAll,
    init() {}
  };

  BoohaAdventure.registerSystem('scoreSystem', api);
  return api;
})();

window.BoohaScoreSystem = BoohaScoreSystem;
