
// js/juku-config.js
// English Juku — class slots and phase schedule. PURE DATA.
// This is the only file to edit when class times or phase lengths change.
//
// Text register: grade-2 kana-friendly throughout. The youngest reader
// sets the register; older students lose nothing.

window.JUKU_CONFIG = {

  // ── Class slots ──────────────────────────────────────────
  // start is Tokyo wall-clock time, 24h "HH:MM".
  // curriculum decides which weekly content the tests load (Stage 3+).
  slots: [
    { id: 'slot-a', label: '17:00 プレブー',        start: '17:00', curriculum: 'pb' },
    { id: 'slot-b', label: '19:00 ブーカリキュラム', start: '19:00', curriculum: 'br' }
  ],

  // How many minutes before start the lobby (survey) opens.
  lobbyOpenMin: 5,

  // ── Content wiring ───────────────────────────────────────
  content: {
    counts: { order: 8 },   // items per test

    // Return the URL of the week's sentences JSON for a curriculum.
    // PLACEHOLDER — null activates demo mode (badged, never silent).
    // Example once the real scheme is known:
    //   sentencesUrl: (curr, cw) => `curriculum/${curr}/content/${cw.monthSlug}/sentences.json`,
  // Week 5 clamps to week 4's content — same rule as nav.js contentWeek.
    contentWeek: function (cw) {
      return cw.weekNumber === 5 ? 4 : cw.weekNumber;
    },

    // Monthly → weekly: 15 cards per week, selected by card n
    // (same ranges as deck-core.js WEEK_RANGES; equivalent to
    // game-core.js's positional slice on well-formed files, but
    // robust against reordering).
    cardsPerWeek: 15,
    filterWeek: function (cards, cw) {
      const w = this.contentWeek(cw);
      const lo = (w - 1) * this.cardsPerWeek + 1;
      const hi = w * this.cardsPerWeek;
      return cards.filter(c => c && c.n >= lo && c.n <= hi);
    },

   sentencesUrl: function (curr, cw) {
      // week IDs use abbreviated months (jul); content folders use full
      // names (july). Accept either form from calendar.js.
      const FULL = { jan:'january', feb:'february', mar:'march', apr:'april',
                     may:'may', jun:'june', jul:'july', aug:'august',
                     sep:'september', oct:'october', nov:'november', dec:'december' };
      const m = String(cw.monthSlug).toLowerCase();
      const folder = FULL[m] || m;
      return `content/${curr}/${folder}/sentences.json`;
    },
    
  },

  // ── Phase schedule (0–90) ────────────────────────────────
  // kind: 'broadcast' = app dictates item timing (synced, weekId seed)
  //       'window'    = self-paced inside the time box (per-student seed)
  //       'paper'     = devices show a calm screen; work is off-device
  //       'interval'  = rest
  //       'predict'   = self-prediction taps
  //       'results'   = scoring + report card, computed once
  phases: [
    { id: 'dictation', min: 15, kind: 'broadcast',
      jp: 'きいて かく', en: 'Listening Dictation' },
    { id: 'reading',   min: 15, kind: 'paper',
      jp: 'おんどく タイム', en: 'Reading Round' },
    { id: 'order',     min: 15, kind: 'window',
      jp: 'ことばの じゅんばん', en: 'Sentence Order Test' },
    { id: 'interval',  min: 5,  kind: 'interval',
      jp: 'きゅうけい', en: 'Interval' },
    { id: 'vocab',     min: 15, kind: 'window',
      jp: 'たんご テスト', en: 'Vocab & Meaning Test' },
    { id: 'mixed',     min: 17, kind: 'window',
      jp: 'ミックス テスト', en: 'Mixed Weekly Check' },
    { id: 'predict',   min: 3,  kind: 'predict',
      jp: 'なんてん かな？', en: 'Self-Prediction' },
    { id: 'results',   min: 5,  kind: 'results',
      jp: 'けっか', en: 'Results' }
  ]
};
