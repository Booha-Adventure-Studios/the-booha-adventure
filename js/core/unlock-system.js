
/**
 * unlock-system.js
 * The Booha Adventure — Unlock System
 * Defines unlock conditions and evaluates them against save data.
 * Unlocks are fired once and stored permanently.
 */

const BoohaUnlockSystem = (() => {
  'use strict';

  /**
   * UNLOCK DEFINITIONS
   * id          — unique key stored in save.unlocks
   * name        — human-readable label
   * description — shown in UI
   * condition() — returns true when this unlock should trigger
   *
   * All unlocks are triggered by game completion only.
   */
  const UNLOCKS = [
    // ── First completion ──────────────────────────────────────────────────
    {
      id:          'first_game',
      name:        'Adventure Begins!',
      description: 'Complete your first game.',
      condition()  { return BoohaAdventure.scores.totalCompleted() >= 1; },
    },

    // ── Individual game completions ───────────────────────────────────────
    {
      id:          'complete_maze',
      name:        'Maze Cleared',
      description: 'Complete Maze Adventure.',
      condition()  { return BoohaAdventure.scores.isCompleted('maze'); },
    },
    {
      id:          'complete_karasuki',
      name:        'Karasuki Clear!',
      description: 'Complete Karasuki.',
      condition()  { return BoohaAdventure.scores.isCompleted('karasuki'); },
    },
    {
      id:          'complete_homework',
      name:        'Homework Done!',
      description: 'Complete Homework Challenge.',
      condition()  { return BoohaAdventure.scores.isCompleted('homework'); },
    },
    {
      id:          'complete_study_deck',
      name:        'Deck Mastered',
      description: 'Complete Study Deck.',
      condition()  { return BoohaAdventure.scores.isCompleted('study_deck'); },
    },
    {
      id:          'complete_game_5',
      name:        'Game 5 Clear',
      description: 'Complete Game 5.',
      condition()  { return BoohaAdventure.scores.isCompleted('game_5'); },
    },
    {
      id:          'complete_game_6',
      name:        'Game 6 Clear',
      description: 'Complete Game 6.',
      condition()  { return BoohaAdventure.scores.isCompleted('game_6'); },
    },
    {
      id:          'complete_game_7',
      name:        'Game 7 Clear',
      description: 'Complete Game 7.',
      condition()  { return BoohaAdventure.scores.isCompleted('game_7'); },
    },
    {
      id:          'complete_game_8',
      name:        'Game 8 Clear',
      description: 'Complete Game 8.',
      condition()  { return BoohaAdventure.scores.isCompleted('game_8'); },
    },
    {
      id:          'complete_game_9',
      name:        'Game 9 Clear',
      description: 'Complete Game 9.',
      condition()  { return BoohaAdventure.scores.isCompleted('game_9'); },
    },

    // ── Milestone completions ─────────────────────────────────────────────
    {
      id:          'half_complete',
      name:        'Halfway There',
      description: 'Complete 5 out of 9 games.',
      condition()  { return BoohaAdventure.scores.totalCompleted() >= 5; },
    },
    {
      id:          'all_complete',
      name:        'Adventure Complete!',
      description: 'Complete all 9 games.',
      condition()  { return BoohaAdventure.scores.totalCompleted() >= 9; },
    },
  ];

  const _byId = {};
  UNLOCKS.forEach(u => { _byId[u.id] = u; });

  // ── Read unlock state ─────────────────────────────────────────────────────
  function _getUnlocks() {
    return BoohaAdventure.save.load().unlocks || {};
  }

  function isUnlocked(id) {
    return !!_getUnlocks()[id];
  }

  // ── Check all conditions and fire new unlocks ─────────────────────────────
  function checkAll() {
    const current = _getUnlocks();
    const newUnlocks = [];

    UNLOCKS.forEach(u => {
      if (current[u.id]) return; // already unlocked
      try {
        if (u.condition()) {
          current[u.id] = { unlockedAt: Date.now() };
          newUnlocks.push(u);
        }
      } catch (e) {
        console.warn(`[BoohaUnlockSystem] Condition error for "${u.id}":`, e);
      }
    });

    if (newUnlocks.length > 0) {
      BoohaAdventure.save.patch('unlocks', current);
      newUnlocks.forEach(u => {
        document.dispatchEvent(new CustomEvent('booha:unlocked', { detail: u }));
      });
    }

    return newUnlocks;
  }

  // ── Force unlock (for testing / admin) ───────────────────────────────────
  function forceUnlock(id) {
    const current = _getUnlocks();
    current[id] = { unlockedAt: Date.now(), forced: true };
    BoohaAdventure.save.patch('unlocks', current);
  }

  function getAll() {
    return UNLOCKS.map(u => ({
      ...u,
      unlocked: isUnlocked(u.id),
      unlockedAt: (_getUnlocks()[u.id] || {}).unlockedAt || null,
    }));
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    isUnlocked,
    checkAll,
    forceUnlock,
    getAll,
    init() {
      // Run a check on page load to catch any missed unlocks
      checkAll();
    }
  };

  BoohaAdventure.registerSystem('unlockSystem', api);
  return api;
})();

window.BoohaUnlockSystem = BoohaUnlockSystem;
