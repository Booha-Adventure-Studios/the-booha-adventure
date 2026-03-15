
/**
 * score-system.js
 * The Booha Adventure — Score System
 * Records high scores, star ratings, completion, and best time per game.
 * Fires unlock checks automatically after a score is submitted.
 */

const BoohaScoreSystem = (() => {
  'use strict';

  // ── Internal helpers ──────────────────────────────────────────────────────
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
      bestTime:     null,   // milliseconds — lower is better; null = never timed
      lastTime:     null,   // time from the most recent run
      lastPlayedAt: null,
    };
  }

  // ── Submit a score ────────────────────────────────────────────────────────
  /**
   * Record a new score for a game.
   * Automatically recalculates stars from the registry.
   * Fires 'booha:scoreSubmitted' and triggers unlock checks.
   *
   * @param {string} gameId
   * @param {number} score        Raw score achieved this run
   * @param {object} [opts]
   *   opts.completed {boolean}   Mark the game as completed
   *   opts.time      {number}    Completion time in milliseconds (lower = better)
   * @returns {{ isHighScore, isBestTime, stars, wasCompleted }}
   */
  function submit(gameId, score, opts = {}) {
    const scores   = _getScores();
    const entry    = scores[gameId] || _defaultEntry(gameId);
    const registry = BoohaAdventure.registry;

    const isHighScore = score > entry.highScore;
    if (isHighScore) entry.highScore = score;

    const newStars = registry ? registry.starsForScore(gameId, score) : 0;
    if (newStars > entry.stars) entry.stars = newStars;

    const wasCompleted = !entry.completed && opts.completed;
    if (opts.completed) entry.completed = true;

    // Time tracking — only record if a time was passed
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

    const detail = { gameId, score, isHighScore, isBestTime, stars: entry.stars, wasCompleted };
    document.dispatchEvent(new CustomEvent('booha:scoreSubmitted', { detail }));

    // Trigger unlock checks
    if (BoohaAdventure.unlocks) BoohaAdventure.unlocks.checkAll();

    return detail;
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  function getEntry(gameId) {
    const scores = _getScores();
    return scores[gameId] || _defaultEntry(gameId);
  }

  function getHighScore(gameId) {
    return getEntry(gameId).highScore;
  }

  function getStars(gameId) {
    return getEntry(gameId).stars;
  }

  function isCompleted(gameId) {
    return getEntry(gameId).completed;
  }

  /** Best completion time in ms (null if never timed). */
  function getBestTime(gameId) {
    return getEntry(gameId).bestTime;
  }

  /** Last completion time in ms (null if never timed). */
  function getLastTime(gameId) {
    return getEntry(gameId).lastTime;
  }

  /**
   * Format a time in ms as "mm:ss.xx" for display.
   * e.g. 75430 → "1:15.43"
   */
  function formatTime(ms) {
    if (ms == null) return '—';
    const totalSec = Math.floor(ms / 1000);
    const mins     = Math.floor(totalSec / 60);
    const secs     = totalSec % 60;
    const cents    = Math.floor((ms % 1000) / 10);
    return `${mins}:${String(secs).padStart(2, '0')}.${String(cents).padStart(2, '0')}`;
  }

  function getAll() {
    return _getScores();
  }

  /**
   * Total stars across all games and all curriculums combined.
   */
  function totalStars() {
    const scores = _getScores();
    return Object.values(scores).reduce((sum, e) => sum + (e.stars || 0), 0);
  }

  /**
   * Total stars for one curriculum only. e.g. totalStarsFor('bc')
   */
  function totalStarsFor(curriculum) {
    const scores = _getScores();
    return Object.entries(scores)
      .filter(([id]) => id.startsWith(`${curriculum}:`))
      .reduce((sum, [, e]) => sum + (e.stars || 0), 0);
  }

  /**
   * Number of completed games across all curriculums.
   */
  function totalCompleted() {
    const scores = _getScores();
    return Object.values(scores).filter(e => e.completed).length;
  }

  /**
   * Number of completed games for one curriculum only. e.g. totalCompletedFor('br')
   */
  function totalCompletedFor(curriculum) {
    const scores = _getScores();
    return Object.entries(scores)
      .filter(([id]) => id.startsWith(`${curriculum}:`))
      .filter(([, e]) => e.completed)
      .length;
  }

  /**
   * Full summary for one curriculum — useful for games-index.html displays.
   * Returns { completed, totalGames, stars, totalStars, entries }
   */
  function summaryFor(curriculum) {
    const scores   = _getScores();
    const registry = BoohaAdventure.registry;
    const games    = registry ? registry.getForCurriculum(curriculum) : [];
    const entries  = games.map(g => ({
      ...g,
      ...(scores[g.saveId] || _defaultEntry(g.saveId)),
    }));
    return {
      curriculum,
      completed:  entries.filter(e => e.completed).length,
      totalGames: entries.length,
      stars:      entries.reduce((sum, e) => sum + (e.stars || 0), 0),
      totalStars: entries.length * 3,
      entries,
    };
  }

  /**
   * Combined summary across all three curriculums.
   */
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
    getEntry,
    getHighScore,
    getStars,
    isCompleted,
    getBestTime,
    getLastTime,
    formatTime,
    getAll,
    totalStars,
    totalStarsFor,
    totalCompleted,
    totalCompletedFor,
    summaryFor,
    summaryAll,
    init() { /* reads from save, no setup needed */ }
  };

  BoohaAdventure.registerSystem('scoreSystem', api);
  return api;
})();

window.BoohaScoreSystem = BoohaScoreSystem;
