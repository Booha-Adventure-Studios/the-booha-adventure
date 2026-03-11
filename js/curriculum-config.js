
/* ═══════════════════════════════════════════════════════════════
   curriculum-config.js  —  Registry for all curricula & deck types
   Loaded as a plain <script> (no ES modules) by study-deck.html.

   FIXES applied:
   - audioFolder keys corrected to match R2 audio server paths
   - data-theme values corrected to match decks.css selectors
     (br → "br", pb → "pb", bc → "bc"; CSS updated to match)
   - jsonUrl now points to the correct /the-booha-adventure/content/ base
     (populated at bootstrap time with the month segment)
   - stream type added to every curriculum
   - palettes & moteColors filled in (were empty arrays)
   ═══════════════════════════════════════════════════════════════ */

window.CURRICULUM_REGISTRY = {

  /* ─────────────────────────────────────────────
     BOO-RICULUM  (key: br)
     data-theme="br"  →  green palette in decks.css
  ───────────────────────────────────────────── */
  br: {
    audioFolder: 'boo_riculum',          // R2 path segment
    navTarget:   '/the-booha-adventure/curriculum/br/study-index.html',
    navKey:      'br_scroll',
    types: {
      vocab: {
        deckMode:   'vocab',
        jsonFile:   'vocab.json',
        titleEn:    'Boo-riculum Vocabulary',
        titleJp:    'ブーリキュラム語彙',
        errorLabel: 'Could not load vocabulary.',
        audioSub:   'vocab',
        palettes: [
          ['#ff8fd8','#ffc04d','#7dd3fc','#86efac'],
          ['#f9a8d4','#fde68a','#93c5fd','#c4b5fd'],
          ['#fca5a5','#fdba74','#fcd34d','#86efac'],
          ['#a5b4fc','#67e8f9','#f9a8d4','#fde68a']
        ],
        moteColors: ['#ffffff','#ffe08a','#ffd1f4','#aee7ff'],
        bgColors:   ['#0d1a09','#1d3520']
      },
      sentences: {
        deckMode:   'sentence',
        jsonFile:   'sentences.json',
        titleEn:    'Boo-riculum Sentences',
        titleJp:    'ブーリキュラム例文',
        errorLabel: 'Could not load sentences.',
        audioSub:   'sentences',
        palettes: [
          ['#7dd3fc','#86efac','#fde68a','#f9a8d4'],
          ['#93c5fd','#c4b5fd','#fca5a5','#fdba74'],
          ['#67e8f9','#a5b4fc','#fde68a','#86efac'],
          ['#bae6fd','#d9f99d','#fef08a','#fecdd3']
        ],
        moteColors: ['#7dd3fc','#86efac','#fde68a','#ffffff'],
        bgColors:   ['#0d1a09','#071828']
      },
      questions: {
        deckMode:   'sentence',
        jsonFile:   'questions.json',
        titleEn:    'Boo-riculum Questions',
        titleJp:    'ブーリキュラム質問',
        errorLabel: 'Could not load questions.',
        audioSub:   'questions',
        palettes: [
          ['#fde68a','#fca5a5','#f9a8d4','#c4b5fd'],
          ['#fdba74','#fcd34d','#86efac','#67e8f9'],
          ['#fef08a','#fecdd3','#bae6fd','#d9f99d'],
          ['#ffd1f4','#ffe08a','#aee7ff','#ffffff']
        ],
        moteColors: ['#fde68a','#fca5a5','#ffffff','#aee7ff'],
        bgColors:   ['#1a1200','#0d1a09']
      },
      stream: {
        deckMode:   'stream',
        jsonFile:   'stream.json',          // combined 180-card JSON
        titleEn:    'Boo-riculum Stream',
        titleJp:    'ブーリキュラム ストリーム',
        errorLabel: 'Could not load stream data.',
        audioSub:   null,
        palettes: [
          ['#5dd4c4','#86efac','#7dd3fc','#c4b5fd'],
          ['#67e8f9','#a5b4fc','#f9a8d4','#fde68a'],
          ['#86efac','#fcd34d','#93c5fd','#fca5a5'],
          ['#aee7ff','#ffd1f4','#ffe08a','#d9f99d']
        ],
        moteColors: ['#5dd4c4','#86efac','#ffffff','#fde68a'],
        bgColors:   ['#0d1a09','#071828']
      }
    }
  },

  /* ─────────────────────────────────────────────
     PRE-BOO  (key: pb)
     data-theme="pb"  →  purple palette in decks.css
  ───────────────────────────────────────────── */
  pb: {
    audioFolder: 'pre_boo',
    navTarget:   '/the-booha-adventure/curriculum/pb/study-index.html',
    navKey:      'pb_scroll',
    types: {
      vocab: {
        deckMode:   'vocab',
        jsonFile:   'vocab.json',
        titleEn:    'Pre-Boo Vocabulary',
        titleJp:    'プレブー語彙',
        errorLabel: 'Could not load vocabulary.',
        audioSub:   'vocab',
        palettes: [
          ['#c4b5fd','#f9a8d4','#fde68a','#86efac'],
          ['#a78bfa','#fb7185','#fbbf24','#34d399'],
          ['#ddd6fe','#fecdd3','#fef08a','#d9f99d'],
          ['#c084fc','#f472b6','#facc15','#4ade80']
        ],
        moteColors: ['#c4b5fd','#f9a8d4','#ffffff','#fde68a'],
        bgColors:   ['#120a1a','#24163a']
      },
      sentences: {
        deckMode:   'sentence',
        jsonFile:   'sentences.json',
        titleEn:    'Pre-Boo Sentences',
        titleJp:    'プレブー例文',
        errorLabel: 'Could not load sentences.',
        audioSub:   'sentences',
        palettes: [
          ['#fdba74','#fcd34d','#86efac','#c4b5fd'],
          ['#fb923c','#fbbf24','#34d399','#a78bfa'],
          ['#fed7aa','#fef08a','#d9f99d','#ddd6fe'],
          ['#f97316','#eab308','#22c55e','#8b5cf6']
        ],
        moteColors: ['#fdba74','#c4b5fd','#ffffff','#86efac'],
        bgColors:   ['#120a1a','#1a0a2a']
      },
      questions: {
        deckMode:   'sentence',
        jsonFile:   'questions.json',
        titleEn:    'Pre-Boo Questions',
        titleJp:    'プレブー質問',
        errorLabel: 'Could not load questions.',
        audioSub:   'questions',
        palettes: [
          ['#fde68a','#fca5a5','#c4b5fd','#86efac'],
          ['#fbbf24','#f87171','#a78bfa','#34d399'],
          ['#fef08a','#fecdd3','#ddd6fe','#d9f99d'],
          ['#eab308','#ef4444','#7c3aed','#16a34a']
        ],
        moteColors: ['#fde68a','#c4b5fd','#ffffff','#f9a8d4'],
        bgColors:   ['#1a1200','#120a1a']
      },
      stream: {
        deckMode:   'stream',
        jsonFile:   'stream.json',
        titleEn:    'Pre-Boo Stream',
        titleJp:    'プレブー ストリーム',
        errorLabel: 'Could not load stream data.',
        audioSub:   null,
        palettes: [
          ['#c87aff','#f9a8d4','#fde68a','#86efac'],
          ['#a78bfa','#fb7185','#fbbf24','#34d399'],
          ['#ddd6fe','#fecdd3','#fef08a','#d9f99d'],
          ['#c084fc','#f472b6','#facc15','#4ade80']
        ],
        moteColors: ['#c87aff','#f9a8d4','#ffffff','#fde68a'],
        bgColors:   ['#120a1a','#1a0820']
      }
    }
  },

  /* ─────────────────────────────────────────────
     BOO-CONTINUUM  (key: bc)
     data-theme="bc"  →  teal palette in decks.css
  ───────────────────────────────────────────── */
  bc: {
    audioFolder: 'boo_continuum',
    navTarget:   '/the-booha-adventure/curriculum/bc/study-index.html',
    navKey:      'bc_scroll',
    types: {
      vocab: {
        deckMode:   'vocab',
        jsonFile:   'vocab.json',
        titleEn:    'Boo-Continuum Vocabulary',
        titleJp:    'ブーコンティニュアム語彙',
        errorLabel: 'Could not load vocabulary.',
        audioSub:   'vocab',
        palettes: [
          ['#00e5cc','#67e8f9','#86efac','#fde68a'],
          ['#2dd4bf','#22d3ee','#4ade80','#fbbf24'],
          ['#99f6e4','#a5f3fc','#d9f99d','#fef08a'],
          ['#14b8a6','#06b6d4','#22c55e','#eab308']
        ],
        moteColors: ['#00e5cc','#67e8f9','#ffffff','#fde68a'],
        bgColors:   ['#071818','#0a2828']
      },
      sentences: {
        deckMode:   'sentence',
        jsonFile:   'sentences.json',
        titleEn:    'Boo-Continuum Sentences',
        titleJp:    'ブーコンティニュアム例文',
        errorLabel: 'Could not load sentences.',
        audioSub:   'sentences',
        palettes: [
          ['#3cb4ff','#00e5cc','#86efac','#fde68a'],
          ['#38bdf8','#2dd4bf','#4ade80','#fbbf24'],
          ['#7dd3fc','#99f6e4','#d9f99d','#fef08a'],
          ['#0ea5e9','#14b8a6','#22c55e','#eab308']
        ],
        moteColors: ['#3cb4ff','#00e5cc','#ffffff','#86efac'],
        bgColors:   ['#071818','#040c28']
      },
      questions: {
        deckMode:   'sentence',
        jsonFile:   'questions.json',
        titleEn:    'Boo-Continuum Questions',
        titleJp:    'ブーコンティニュアム質問',
        errorLabel: 'Could not load questions.',
        audioSub:   'questions',
        palettes: [
          ['#ffc832','#00e5cc','#67e8f9','#86efac'],
          ['#fbbf24','#2dd4bf','#22d3ee','#4ade80'],
          ['#fef08a','#99f6e4','#a5f3fc','#d9f99d'],
          ['#eab308','#14b8a6','#06b6d4','#22c55e']
        ],
        moteColors: ['#ffc832','#00e5cc','#ffffff','#67e8f9'],
        bgColors:   ['#071400','#071818']
      },
      stream: {
        deckMode:   'stream',
        jsonFile:   'stream.json',
        titleEn:    'Boo-Continuum Stream',
        titleJp:    'ブーコンティニュアム ストリーム',
        errorLabel: 'Could not load stream data.',
        audioSub:   null,
        palettes: [
          ['#00e5cc','#3cb4ff','#86efac','#fde68a'],
          ['#2dd4bf','#38bdf8','#4ade80','#fbbf24'],
          ['#99f6e4','#7dd3fc','#d9f99d','#fef08a'],
          ['#14b8a6','#0ea5e9','#22c55e','#eab308']
        ],
        moteColors: ['#00e5cc','#3cb4ff','#ffffff','#fde68a'],
        bgColors:   ['#071818','#040c28']
      }
    }
  }

};
