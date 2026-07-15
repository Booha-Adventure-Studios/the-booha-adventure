
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
    sentencesUrl: function (curr, cw) {
      return `content/${curr}/${cw.monthSlug}/sentences.json`;
    },

    // Normalize one raw sentence entry to { n, en, jp }.
    // Adjust if the JSON's field names differ.
    mapSentence: function (raw) {
      // hira preferred: the youngest reader sets the register
      return { n: raw.n, en: raw.en, jp: raw.hira || raw.jp || '', mp3: raw.mp3 || null };
    }
    
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
