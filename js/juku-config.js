
// js/juku-config.js
// English Juku — class slots and phase schedule. PURE DATA.
// This is the only file to edit when class times or phase lengths change.
//
// Text register: grade-2 kana-friendly throughout. The youngest reader
// sets the register; older students lose nothing.

window.JUKU_CONFIG = {

  // ── Class slots ──────────────────────────────────────────
  // start is Tokyo wall-clock time, 24h "HH:MM".
  // day is the Tokyo weekday (0=Sunday … 6=Saturday).
  // curriculum decides which weekly content the tests load (Stage 3+).
  slots: [
    { id: 'slot-a', label: '17:00 プレブー',        day: 6, start: '17:00', curriculum: 'pb' },
    { id: 'slot-b', label: '19:00 ブーカリキュラム', day: 6, start: '19:00', curriculum: 'br' }
  ],

  // How many minutes before start the lobby (survey) opens.
  lobbyOpenMin: 5,

  // Teacher authorization is verified server-side by sync-client.js. The PIN
  // is never stored in config, localStorage, the report, or sync metadata.
  teacherReview: {
    purpose: 'juku-report-review',
    readingScale: [0, 1, 2, 3]
  },

  // ── Content wiring ───────────────────────────────────────
  content: {
    // Production sessions fail closed if real content is unavailable.
    // Set true only while deliberately testing the built-in demo questions.
    allowDemo: false,

    counts: {
      order: 8,          // sentence-order items
      vocabMean: 8,      // vocab test: word→meaning items (rest are definition→word)
      mixedRead: 1,      // mixed: read item sampled from juku.json
      mixedTranslate: 1, // mixed: translation item sampled from juku.json
      mixedWrite: 1,     // mixed: productive-spelling item sampled from juku.json
      openWriting: 1,    // BR/BC: one teacher-reviewed short writing prompt
      proveIt: 1         // mixed: one re-asked item missed/wobbled earlier
    },

    // Assessment interaction by curriculum. Pre-Boo keeps carefully named
    // scaffolds; older students produce English without answer-piece clues.
    responseModes: {
      pb: {
        dictationWord: 'tiles',
        dictationSentence: 'tiles',
        translation: 'builder',
        spelling: 'tiles',
        openWriting: false
      },
      br: {
        dictationWord: 'text',
        dictationSentence: 'text',
        translation: 'text-review',
        spelling: 'text',
        openWriting: true
      },
      bc: {
        dictationWord: 'text',
        dictationSentence: 'text',
        translation: 'text-review',
        spelling: 'text',
        openWriting: true
      }
    },

    // Dictation (Stage 4) — broadcast schedule. Fewer, deeper responses
    // leave enough time for real typing while keeping every device synced.
    dictation: {
      transitionSec: 10, // tier-change splash between word and sentence
      // The lobby preloads the exact clips selected for this week's
      // broadcast. Four parallel loads are gentle on classroom Wi-Fi while
      // comfortably fitting inside the five-minute lobby.
      audioPreflight: { timeoutMs: 12000, concurrency: 4 },
      profiles: {
        // 850 seconds + a calm 50-second finish buffer.
        pb: { words: 8, wordSec: 30, sentences: 4, sentenceSec: 150 },
        // 830 seconds + a 70-second finish buffer.
        br: { words: 8, wordSec: 35, sentences: 6, sentenceSec: 90 },
        bc: { words: 8, wordSec: 35, sentences: 6, sentenceSec: 90 }
      },
      // sentence-tier word-bank decoys, drawn from the week's OTHER
      // sentence cards (seeded). pb gets a clean bank.
      distractors: { pb: 0, br: 3, bc: 3 }
    },

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
     
      return `content/${curr}/${folder}/sentences.json?juku=1`;
    },

    // Generic sibling of sentencesUrl — same folder, any file.
    contentUrl: function (curr, cw, file) {
      const FULL = { jan:'january', feb:'february', mar:'march', apr:'april',
                     may:'may', jun:'june', jul:'july', aug:'august',
                     sep:'september', oct:'october', nov:'november', dec:'december' };
      const m = String(cw.monthSlug).toLowerCase();
      return `content/${curr}/${FULL[m] || m}/${file}?juku=1`;
    },

    // Audio base — same URLs game-core.js builds; Juku records nothing new.
    // type: 'vocab' | 'sentences'. Accepts monthSlug in either form.
    audioBase: function (curr, cw, type) {
      const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';
      const FOLDER = { pb: 'pre_boo', br: 'boo_riculum', bc: 'boo_continuum' };
      const SHORT = { january:'jan', february:'feb', march:'mar', april:'apr',
                      may:'may', june:'jun', july:'jul', august:'aug',
                      september:'sep', october:'oct', november:'nov', december:'dec' };
      const m = String(cw.monthSlug).toLowerCase();
      return `${AUDIO_ROOT}/${SHORT[m] || m}/${FOLDER[curr]}/${type}/`;
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
