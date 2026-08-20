
/**
 * game-registry.js
 * The Booha Adventure — Game Registry
 * Single source of truth for all curriculum games plus bonus-game definitions.
 *
 * Save IDs are scoped per curriculum: e.g. "bc:ask_question"
 * This keeps scores separate per curriculum as intended.
 *
 * Curriculums: 'bc' | 'br' | 'pb'
 */

const BoohaGameRegistry = (() => {
  'use strict';

  const CURRICULUMS = ['bc', 'br', 'pb'];

  /**
   * BASE GAME DEFINITIONS (curriculum-agnostic)
   * id          — base key; final save key = "{curriculum}:{id}"
   * name        — display name
   * file        — JS file in games/ (each curriculum loads its own data)
   * category    — game mechanic type
   * scoreMax    — maximum achievable score
   * starThresholds — [1-star min, 2-star min, 3-star min]
   */
  const BASE_GAMES = [
    {
      id:             'ask_question',
      name:           'Ask a Sentence',
      file:           'games/ask-question.js',
      category:       'speaking',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
    {
      id:             'say_sentence',
      name:           'Say a Sentence',
      file:           'games/say-sentence.js',
      category:       'speaking',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
    {
      id:             'say_word',
      name:           'Say a Word',
      file:           'games/say-word.js',
      category:       'speaking',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
    {
      id:             'sentence_order',
      name:           'Sentence Order',
      file:           'games/sentence-order.js',
      category:       'ordering',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
    {
      id:             'sentence_speed',
      name:           'Sentence Speed',
      file:           'games/sentence-speed.js',
      category:       'speed',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'sentence_tap',
      name:           'Sentence Tap',
      file:           'games/sentence-tap.js',
      category:       'tap',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
    {
      id:             'spell_word',
      name:           'Spell a Word',
      file:           'games/spell-word.js',
      category:       'spelling',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
    {
      id:             'vocab_speed',
      name:           'Vocab Speed',
      file:           'games/vocab-speed.js',
      category:       'speed',
      scoreMax:       100,
      starThresholds: [30, 60, 90],
    },
    {
      id:             'vocab_tap',
      name:           'Vocab Tap',
      file:           'games/vocab-tap.js',
      category:       'tap',
      scoreMax:       100,
      starThresholds: [40, 70, 90],
    },
  ];

  // Bonus games are intentionally kept outside the curriculum summaries.
  // They still receive the same score/stars machinery through their saveId.
  const BONUS_GAMES = [
    {
      id:             'feed_booha',
      name:           'Feed Booha',
      file:           'feed_booha.html',
      category:       'bonus',
      scoreMax:       87500,
      starThresholds: [20000, 50000, 75000],
      saveId:         'bonus:feed_booha',
      bonus:          true,
    },
    {
      id:             'booha_destruction',
      name:           'Booha Destruction',
      file:           'booha_destruction.html',
      category:       'bonus',
      scoreMax:       100000,
      starThresholds: [15000, 40000, 80000],
      saveId:         'bonus:booha_destruction',
      bonus:          true,
    },
  ];

  // ── Build full entries (9 games × 3 curriculums = 27) ────────────────────
  const GAMES = [];
  CURRICULUMS.forEach(curriculum => {
    BASE_GAMES.forEach(base => {
      GAMES.push({
        ...base,
        curriculum,
        saveId: `${curriculum}:${base.id}`,   // e.g. "bc:ask_question"
        indexFile: `curriculum/${curriculum}/games-index.html`,
      });
    });
  });

  // ── Internal indexes ──────────────────────────────────────────────────────
  const _bySaveId     = {};   // "bc:ask_question" → entry
  const _byBaseId     = {};   // "ask_question"    → [bc entry, br entry, pb entry]
  const _byCurriculum = {};   // "bc"              → [9 entries]

  GAMES.forEach(g => {
    _bySaveId[g.saveId] = g;

    if (!_byBaseId[g.id])         _byBaseId[g.id] = [];
    _byBaseId[g.id].push(g);

    if (!_byCurriculum[g.curriculum]) _byCurriculum[g.curriculum] = [];
    _byCurriculum[g.curriculum].push(g);
  });

  BONUS_GAMES.forEach(g => { _bySaveId[g.saveId] = g; });

  // ── Public API ────────────────────────────────────────────────────────────

  /** All 27 curriculum entries */
  function getAll() { return [...GAMES]; }

  /** Lookup by full save ID e.g. "bc:ask_question" */
  function getById(saveId) { return _bySaveId[saveId] || null; }

  /** All entries for one curriculum e.g. getForCurriculum('bc') */
  function getForCurriculum(curriculum) { return _byCurriculum[curriculum] || []; }

  /** All curriculum variants of one base game e.g. getAllVariants('vocab_tap') */
  function getAllVariants(baseId) { return _byBaseId[baseId] || []; }

  /** All base game definitions (9, curriculum-agnostic) */
  function getBaseGames() { return [...BASE_GAMES]; }

  /** Bonus games, kept separate from curriculum game summaries */
  function getBonusGames() { return [...BONUS_GAMES]; }

  /** All valid save IDs, including bonus games */
  function getAllSaveIds() {
    return [...GAMES, ...BONUS_GAMES].map(g => g.saveId);
  }

  /**
   * Build the save ID from parts — use this in game pages instead of
   * hardcoding strings, so typos are caught early.
   * @param {'bc'|'br'|'pb'} curriculum
   * @param {string} baseId  e.g. 'vocab_tap'
   */
  function saveId(curriculum, baseId) {
    return `${curriculum}:${baseId}`;
  }

  /**
   * Calculate star rating for a given score.
   * Accepts either a full saveId or a base game id (thresholds are the same).
   * @returns {0|1|2|3}
   */
  function starsForScore(gameIdOrSaveId, score) {
    const game = _bySaveId[gameIdOrSaveId]
      || (_byBaseId[gameIdOrSaveId] && _byBaseId[gameIdOrSaveId][0])
      || null;
    if (!game) return 0;
    const [s1, s2, s3] = game.starThresholds;
    if (score >= s3) return 3;
    if (score >= s2) return 2;
    if (score >= s1) return 1;
    return 0;
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    CURRICULUMS,
    BASE_GAMES,
    BONUS_GAMES,
    getAll,
    getById,
    getForCurriculum,
    getAllVariants,
    getBaseGames,
    getBonusGames,
    getAllSaveIds,
    saveId,
    starsForScore,
    init() { /* static data, no async init needed */ }
  };

  BoohaAdventure.registerSystem('gameRegistry', api);
  return api;
})();

window.BoohaGameRegistry = BoohaGameRegistry;
