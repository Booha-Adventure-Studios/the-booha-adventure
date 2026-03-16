
/* ══════════════════════════════════════════════════════════════
   booha-game-bridge.js
   Bridges the `booha:gameEnd` custom event (dispatched by every
   game's showResults()) to BoohaAdventure.scores.submit().

   Load this ONCE on every game page, after adventure-core.js
   and before the game script.

   <script src="/js/adventure-core.js"></script>
   <script src="/js/booha-game-bridge.js"></script>   ← add this
   <script src="/games/vocab-tap.js"></script>

   The event detail shape every game sends:
   {
     saveId:    "bc:vocab_tap",   // curriculum:game_id
     score:     85,               // 0–100
     completed: true,             // true if perfect run
   }
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.addEventListener('booha:gameEnd', function (e) {
    const { saveId, score, completed } = e.detail ?? {};

    /* ── Validation ── */
    if (!saveId) {
      console.warn('[booha-bridge] booha:gameEnd fired with no saveId — ignored.');
      return;
    }
    if (typeof score !== 'number' || isNaN(score)) {
      console.warn('[booha-bridge] booha:gameEnd fired with invalid score:', score);
      return;
    }

    /* ── Wait for BoohaAdventure to be ready ──────────────────────────
       adventure-core.js may still be initialising when a very fast game
       fires the event. Poll for up to 3 seconds before giving up.      */
    const MAX_WAIT_MS  = 3000;
    const POLL_MS      = 50;
    let   elapsed      = 0;

    function trySubmit() {
      const BA = window.BoohaAdventure;

      if (BA?.scores?.submit) {
        /* ── Submit to the save system ── */
        BA.scores.submit(saveId, score, { completed: !!completed });

        console.info(
          `[booha-bridge] ✓ submitted  saveId="${saveId}"  score=${score}  completed=${!!completed}`
        );
        return;
      }

      elapsed += POLL_MS;
      if (elapsed >= MAX_WAIT_MS) {
        console.error(
          '[booha-bridge] BoohaAdventure.scores.submit() not found after',
          MAX_WAIT_MS + 'ms. Score NOT saved. saveId:', saveId
        );
        return;
      }

      setTimeout(trySubmit, POLL_MS);
    }

    trySubmit();
  });

  console.info('[booha-bridge] listening for booha:gameEnd events.');
})();
