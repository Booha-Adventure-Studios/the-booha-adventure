
/**
 * game-registry.js
 * The Booha Adventure — Game Registry
 * Single source of truth for all games.
 * Add new games here without touching save code.
 */

const BoohaGameRegistry = (() => {
  'use strict';

  /**
   * GAME DEFINITIONS
   * id          — unique string key used in save data
   * name        — display name
   * file        — HTML page (relative to repo root)
   * week        — which curriculum week this game belongs to (1–9+)
   * category    — type of game for filtering / theming
   * scoreMax    — maximum achievable score (for star calculation)
   * starThresholds — [1-star min, 2-star min, 3-star min]
   */
  const GAMES = [
    {
      id:             'maze',
      name:           'Maze Adventure',
      file:           'maze.html',
      week:           1,
      category:       'navigation',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'karasuki',
      name:           'Karasuki',
      file:           'karasuki.html',
      week:           2,
      category:       'language',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'homework',
      name:           'Homework Challenge',
      file:           'homework.html',
      week:           3,
      category:       'quiz',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
    {
      id:             'study_deck',
      name:           'Study Deck',
      file:           'study-deck.html',
      week:           4,
      category:       'flashcard',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'game_5',
      name:           'Game 5',        // ← update when named
      file:           'games/game5.html',
      week:           5,
      category:       'unknown',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'game_6',
      name:           'Game 6',
      file:           'games/game6.html',
      week:           6,
      category:       'unknown',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'game_7',
      name:           'Game 7',
      file:           'games/game7.html',
      week:           7,
      category:       'unknown',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'game_8',
      name:           'Game 8',
      file:           'games/game8.html',
      week:           8,
      category:       'unknown',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'game_9',
      name:           'Game 9',
      file:           'games/game9.html',
      week:           9,
      category:       'unknown',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
  ];

  // ── Internal index ────────────────────────────────────────────────────────
  const _byId   = {};
  const _byWeek = {};

  GAMES.forEach(g => {
    _byId[g.id] = g;
    if (!_byWeek[g.week]) _byWeek[g.week] = [];
    _byWeek[g.week].push(g);
  });

  // ── Public API ────────────────────────────────────────────────────────────
  function getAll()         { return [...GAMES]; }
  function getById(id)      { return _byId[id] || null; }
  function getByWeek(week)  { return _byWeek[week] || []; }
  function getAllIds()       { return GAMES.map(g => g.id); }

  /**
   * Calculate star rating for a given score on a given game.
   * @returns {0|1|2|3}
   */
  function starsForScore(gameId, score) {
    const game = getById(gameId);
    if (!game) return 0;
    const [s1, s2, s3] = game.starThresholds;
    if (score >= s3) return 3;
    if (score >= s2) return 2;
    if (score >= s1) return 1;
    return 0;
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    getAll,
    getById,
    getByWeek,
    getAllIds,
    starsForScore,
    init() { /* static data, no async init needed */ }
  };

  BoohaAdventure.registerSystem('gameRegistry', api);
  return api;
})();

window.BoohaGameRegistry = BoohaGameRegistry;
