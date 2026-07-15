// js/juku-config.js
// English Juku — class slots and phase schedule. PURE DATA.
// This is the only file to edit when class times or phase lengths change.

window.JUKU_CONFIG = {

  // ── Class slots ──────────────────────────────────────────
  // start is Tokyo wall-clock time, 24h "HH:MM".
  // Total lesson length = sum of phase minutes (90).
  slots: [
    { id: 'slot-a', label: '17:00 クラス', start: '17:00' },
    { id: 'slot-b', label: '19:00 クラス', start: '19:00' }
  ],

  // How many minutes before start the lobby (survey) opens.
  lobbyOpenMin: 5,

  // ── Phase schedule (0–90) ────────────────────────────────
  // kind: 'broadcast' = app dictates item timing (synced, weekId seed)
  //       'window'    = self-paced inside the time box (PIN+weekId seed)
  //       'paper'     = devices show a calm screen; work is off-device
  //       'interval'  = rest
  //       'predict'   = self-prediction taps
  //       'results'   = scoring + report card, computed once
  phases: [
    { id: 'dictation', min: 15, kind: 'broadcast',
      jp: 'リスニング・ディクテーション', en: 'Listening Dictation' },
    { id: 'reading',   min: 15, kind: 'paper',
      jp: '音読ラウンド', en: 'Reading Round' },
    { id: 'order',     min: 15, kind: 'window',
      jp: '語順テスト', en: 'Sentence Order Test' },
    { id: 'interval',  min: 5,  kind: 'interval',
      jp: '休けい', en: 'Interval' },
    { id: 'vocab',     min: 15, kind: 'window',
      jp: '語い・意味テスト', en: 'Vocab & Meaning Test' },
    { id: 'mixed',     min: 17, kind: 'window',
      jp: 'ウィークリーチェック', en: 'Mixed Weekly Check' },
    { id: 'predict',   min: 3,  kind: 'predict',
      jp: '自己予想', en: 'Self-Prediction' },
    { id: 'results',   min: 5,  kind: 'results',
      jp: 'けっか', en: 'Results' }
  ]
};
