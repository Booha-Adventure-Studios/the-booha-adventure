
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
   * Total stars across all games (for scoreboard / progress displays).
   */
  function totalStars() {
    const scores = _getScores();
    return Object.values(scores).reduce((sum, e) => sum + (e.stars || 0), 0);
  }

  /**
   * Number of completed games.
   */
  function totalCompleted() {
    const scores = _getScores();
    return Object.values(scores).filter(e => e.completed).length;
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
    totalCompleted,
    init() { /* reads from save, no setup needed */ }
  };

  BoohaAdventure.registerSystem('scoreSystem', api);
  return api;
})();

window.BoohaScoreSystem = BoohaScoreSystem;
