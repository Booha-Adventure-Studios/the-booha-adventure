
/* ═══════════════════════════════════════════════════════════════
   curriculum-config.js  —  Registry for all curricula & deck types

   PALETTE DESIGN:
   br  →  Jungle Expedition: electric lime, cobalt, amber, hot pink
   pb  →  Candy Dream: strawberry, peach, mint, cotton candy lavender
   bc  →  Midnight Signal: cyan, electric blue, violet, white signal
   ═══════════════════════════════════════════════════════════════ */

window.CURRICULUM_REGISTRY = {

  /* ─────────────────────────────────────────────
     BOO-RICULUM  —  JUNGLE EXPEDITION
     Wild, saturated, alive. No timid colors here.
  ───────────────────────────────────────────── */
  br: {
    audioFolder: 'boo_riculum',
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
        /* Electric lime + cobalt + amber + hot magenta */
        palettes: [
          ['#aaff22','#0088ff','#ffaa00','#ff2288'],
          ['#66ff00','#0066dd','#ffcc00','#ff44aa'],
          ['#ccff44','#22aaff','#ff8800','#ee00aa'],
          ['#88ff00','#0044cc','#ffbb11','#ff1166']
        ],
        moteColors: ['#aaff44','#ffcc00','#00aaff','#ff44aa','#ffffff'],
        bgColors:   ['#081a04','#0a2808','#04100a']
      },

      sentences: {
        deckMode:   'sentence',
        jsonFile:   'sentences.json',
        titleEn:    'Boo-riculum Sentences',
        titleJp:    'ブーリキュラム例文',
        errorLabel: 'Could not load sentences.',
        audioSub:   'sentences',
        /* Cobalt + lime + amber + coral */
        palettes: [
          ['#0088ff','#aaff22','#ffaa00','#ff6644'],
          ['#0066dd','#66ff00','#ff8800','#ff4422'],
          ['#22aaff','#ccff44','#ffcc00','#ff8866'],
          ['#1166ee','#88ff00','#ffbb11','#ff5533']
        ],
        moteColors: ['#0088ff','#aaff44','#ffcc00','#ffffff','#ff6644'],
        bgColors:   ['#030c18','#020814','#040c1c']
      },

      questions: {
        deckMode:   'sentence',
        jsonFile:   'questions.json',
        titleEn:    'Boo-riculum Questions',
        titleJp:    'ブーリキュラム質問',
        errorLabel: 'Could not load questions.',
        audioSub:   'questions',
        /* Amber + lime + hot pink + cobalt */
        palettes: [
          ['#ffaa00','#aaff22','#ff2288','#0088ff'],
          ['#ff8800','#66ff00','#ee0077','#0066dd'],
          ['#ffcc44','#ccff44','#ff44aa','#22aaff'],
          ['#ffbb11','#88ff00','#ff1166','#1166ee']
        ],
        moteColors: ['#ffaa00','#aaff44','#ff44aa','#ffffff','#0088ff'],
        bgColors:   ['#100a00','#180e00','#0c0800']
      },

      stream: {
        deckMode:   'stream',
        jsonFile:   'stream.json',
        titleEn:    'Boo-riculum Stream',
        titleJp:    'ブーリキュラム ストリーム',
        errorLabel: 'Could not load stream data.',
        audioSub:   null,
        palettes: [
          ['#aaff22','#0088ff','#ffaa00','#ff2288'],
          ['#0088ff','#ffaa00','#ff2288','#aaff22'],
          ['#ffaa00','#ff2288','#aaff22','#0088ff'],
          ['#ff2288','#aaff22','#0088ff','#ffaa00']
        ],
        moteColors: ['#aaff44','#0088ff','#ffcc00','#ff44aa','#ffffff'],
        bgColors:   ['#081a04','#030c18','#100a00']
      }
    }
  },


  /* ─────────────────────────────────────────────
     PRE-BOO  —  CANDY DREAM
     Strawberry. Peach. Mint. Cotton candy.
     Pastels that glow against deep berry-purple.
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
        /* Strawberry pink + lavender + peach + mint */
        palettes: [
          ['#ff6eb4','#cc88ff','#ffb088','#88ffcc'],
          ['#ff8ec8','#bb66ff','#ffa070','#66ffbb'],
          ['#ff44aa','#dd99ff','#ffcc99','#aaffe8'],
          ['#ff88cc','#aa55ee','#ff9966','#55ffaa']
        ],
        moteColors: ['#ff88cc','#cc88ff','#ffb088','#88ffcc','#ffffff'],
        bgColors:   ['#16081f','#1a0824','#100618']
      },

      sentences: {
        deckMode:   'sentence',
        jsonFile:   'sentences.json',
        titleEn:    'Pre-Boo Sentences',
        titleJp:    'プレブー例文',
        errorLabel: 'Could not load sentences.',
        audioSub:   'sentences',
        /* Peach creamsicle + lavender + mint + strawberry */
        palettes: [
          ['#ffb088','#cc88ff','#88ffcc','#ff6eb4'],
          ['#ffa070','#bb66ff','#66ffbb','#ff8ec8'],
          ['#ffcc99','#dd99ff','#aaffe8','#ff44aa'],
          ['#ff9966','#aa55ee','#55ffaa','#ff88cc']
        ],
        moteColors: ['#ffb088','#cc88ff','#88ffcc','#ffffff','#ff88cc'],
        bgColors:   ['#180a10','#1c0c14','#120808']
      },

      questions: {
        deckMode:   'sentence',
        jsonFile:   'questions.json',
        titleEn:    'Pre-Boo Questions',
        titleJp:    'プレブー質問',
        errorLabel: 'Could not load questions.',
        audioSub:   'questions',
        /* Lemon drop + mint + lavender + strawberry */
        palettes: [
          ['#ffee66','#88ffcc','#cc88ff','#ff6eb4'],
          ['#ffdd44','#66ffbb','#bb66ff','#ff8ec8'],
          ['#ffff88','#aaffe8','#dd99ff','#ff44aa'],
          ['#ffee55','#55ffaa','#aa55ee','#ff88cc']
        ],
        moteColors: ['#ffee66','#88ffcc','#cc88ff','#ffffff','#ff88cc'],
        bgColors:   ['#0e0c00','#140e00','#100a04']
      },

      stream: {
        deckMode:   'stream',
        jsonFile:   'stream.json',
        titleEn:    'Pre-Boo Stream',
        titleJp:    'プレブー ストリーム',
        errorLabel: 'Could not load stream data.',
        audioSub:   null,
        palettes: [
          ['#ff6eb4','#cc88ff','#88ffcc','#ffb088'],
          ['#cc88ff','#88ffcc','#ffb088','#ff6eb4'],
          ['#88ffcc','#ffb088','#ff6eb4','#cc88ff'],
          ['#ffb088','#ff6eb4','#cc88ff','#88ffcc']
        ],
        moteColors: ['#ff88cc','#cc88ff','#88ffcc','#ffee66','#ffffff'],
        bgColors:   ['#16081f','#180a10','#0e0c00']
      }
    }
  },


  /* ─────────────────────────────────────────────
     BOO-CONTINUUM  —  MIDNIGHT SIGNAL
     Cyan. Electric blue. Violet. White signal.
     Data in the dark. Cold, sharp, satisfying.
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
        /* Electric cyan + signal blue + violet + white */
        palettes: [
          ['#00f0ff','#0055ff','#aa00ff','#ffffff'],
          ['#00d8ee','#0044dd','#8800ee','#eeeeff'],
          ['#44f8ff','#2266ff','#cc22ff','#ccddff'],
          ['#00ccee','#0033cc','#9900dd','#aabbff']
        ],
        moteColors: ['#00f0ff','#0088ff','#aa44ff','#ffffff','#88ffff'],
        bgColors:   ['#03080f','#020610','#050310']
      },

      sentences: {
        deckMode:   'sentence',
        jsonFile:   'sentences.json',
        titleEn:    'Boo-Continuum Sentences',
        titleJp:    'ブーコンティニュアム例文',
        errorLabel: 'Could not load sentences.',
        audioSub:   'sentences',
        /* Signal blue + cyan + violet + ice */
        palettes: [
          ['#0055ff','#00f0ff','#aa00ff','#aaccff'],
          ['#0044dd','#00d8ee','#8800ee','#88bbff'],
          ['#2266ff','#44f8ff','#cc22ff','#bbddff'],
          ['#0033cc','#00ccee','#9900dd','#99ccff']
        ],
        moteColors: ['#0055ff','#00f0ff','#aaccff','#ffffff','#aa44ff'],
        bgColors:   ['#02040e','#030610','#020408']
      },

      questions: {
        deckMode:   'sentence',
        jsonFile:   'questions.json',
        titleEn:    'Boo-Continuum Questions',
        titleJp:    'ブーコンティニュアム質問',
        errorLabel: 'Could not load questions.',
        audioSub:   'questions',
        /* Violet + cyan + blue + white signal */
        palettes: [
          ['#aa00ff','#00f0ff','#0055ff','#ffffff'],
          ['#8800ee','#00d8ee','#0044dd','#eeeeff'],
          ['#cc22ff','#44f8ff','#2266ff','#ccddff'],
          ['#9900dd','#00ccee','#0033cc','#aabbff']
        ],
        moteColors: ['#aa44ff','#00f0ff','#ffffff','#0055ff','#dd88ff'],
        bgColors:   ['#050010','#080018','#030008']
      },

      stream: {
        deckMode:   'stream',
        jsonFile:   'stream.json',
        titleEn:    'Boo-Continuum Stream',
        titleJp:    'ブーコンティニュアム ストリーム',
        errorLabel: 'Could not load stream data.',
        audioSub:   null,
        palettes: [
          ['#00f0ff','#0055ff','#aa00ff','#ffffff'],
          ['#0055ff','#aa00ff','#ffffff','#00f0ff'],
          ['#aa00ff','#ffffff','#00f0ff','#0055ff'],
          ['#ffffff','#00f0ff','#0055ff','#aa00ff']
        ],
        moteColors: ['#00f0ff','#0055ff','#aa44ff','#ffffff','#44ffff'],
        bgColors:   ['#03080f','#02040e','#050010']
      }
    }
  }

};
