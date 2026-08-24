/*
 * Muenba world data.
 *
 * The room graph intentionally follows the same 15-room arrangement used by
 * Karasuki and Utsuroba. Coordinates are in the shared 1536x1024 world space.
 * Room-specific walkable areas and atmosphere stay here so the engine does
 * not need special cases for individual cemetery images.
 *
 * Pass 1 calibration: every room's cemetery corridor is framed identically,
 * so all four exit directions share one measured x/y across all 15 rooms
 * instead of per-room guesses. Walkable area was widened around those same
 * measured points — Booha was clipping an invisible wall before this pass.
 */
(() => {
  'use strict';

  const WORLD_W = 1536;
  const WORLD_H = 1024;

  // Pass 9C: nudged toward the corridor edges while keeping generous space
  // from the viewport crop on landscape phones and tablets. These remain
  // identical across every room because the cemetery framing is identical.
  const EXIT_XY = {
    up:    { x: 767, y: 284 },
    down:  { x: 764, y: 748 },
    left:  { x: 438, y: 496 },
    right: { x: 1152, y: 483 }
  };

  function exit(dir, to, spawn) {
    return { dir, x: EXIT_XY[dir].x, y: EXIT_XY[dir].y, to, spawn };
  }

  const NPP = {
    room_01: [
      exit('right', 'room_02', 'fromLeft'),
      exit('up',    'room_06', 'fromDown')
    ],
    room_02: [
      exit('left',  'room_01', 'fromRight'),
      exit('right', 'room_03', 'fromLeft'),
      exit('up',    'room_07', 'fromDown')
    ],
    room_03: [
      exit('left',  'room_02', 'fromRight'),
      exit('right', 'room_04', 'fromLeft'),
      exit('up',    'room_08', 'fromDown')
    ],
    room_04: [
      exit('left',  'room_03', 'fromRight'),
      exit('right', 'room_05', 'fromLeft'),
      exit('up',    'room_09', 'fromDown')
    ],
    room_05: [
      exit('left', 'room_04', 'fromRight'),
      exit('up',   'room_10', 'fromDown')
    ],
    room_06: [
      exit('right', 'room_07', 'fromLeft'),
      exit('up',    'room_11', 'fromDown'),
      exit('down',  'room_01', 'fromUp')
    ],
    room_07: [
      exit('left',  'room_06', 'fromRight'),
      exit('right', 'room_08', 'fromLeft'),
      exit('up',    'room_12', 'fromDown'),
      exit('down',  'room_02', 'fromUp')
    ],
    room_08: [
      exit('left',  'room_07', 'fromRight'),
      exit('right', 'room_09', 'fromLeft'),
      exit('up',    'room_13', 'fromDown'),
      exit('down',  'room_03', 'fromUp')
    ],
    room_09: [
      exit('left',  'room_08', 'fromRight'),
      exit('right', 'room_10', 'fromLeft'),
      exit('up',    'room_14', 'fromDown'),
      exit('down',  'room_04', 'fromUp')
    ],
    room_10: [
      exit('left', 'room_09', 'fromRight'),
      exit('up',   'room_15', 'fromDown'),
      exit('down', 'room_05', 'fromUp')
    ],
    room_11: [
      exit('right', 'room_12', 'fromLeft'),
      exit('down',  'room_06', 'fromUp')
    ],
    room_12: [
      exit('left',  'room_11', 'fromRight'),
      exit('right', 'room_13', 'fromLeft'),
      exit('down',  'room_07', 'fromUp')
    ],
    room_13: [
      exit('left',  'room_12', 'fromRight'),
      exit('right', 'room_14', 'fromLeft'),
      exit('down',  'room_08', 'fromUp')
    ],
    room_14: [
      exit('left',  'room_13', 'fromRight'),
      exit('right', 'room_15', 'fromLeft'),
      exit('down',  'room_09', 'fromUp')
    ],
    room_15: [
      exit('left', 'room_14', 'fromRight'),
      exit('down', 'room_10', 'fromUp')
    ]
  };

  const SPAWNS = {
    default:      { x: 768, y: 512 },
    fromKarasuki: { x: 768, y: 820 },
    fromLeft:     { x: 205, y: 560 },
    fromRight:    { x: 1330, y: 560 },
    fromUp:       { x: 768, y: 220 },
    fromDown:     { x: 768, y: 820 }
  };

  // Widened cross around the four measured exit points above — the old
  // rectangles technically covered each exit hotspot but left almost no
  // breathing room around them, which read as an invisible wall. This
  // still follows the same "broad shape, not pixel-perfect tracing"
  // approach Karasuki/Utsuroba started with; identical across rooms since
  // the corridor is identical across rooms.
  function makeWalkable() {
    return [
      { x: 340, y: 110, w: 860,  h: 900 }, // vertical corridor (up/down)
      { x: 60,  y: 360, w: 1416, h: 380 }  // horizontal corridor (left/right)
    ];
  }

  // One eerie accent color per room so the cemetery doesn't feel like the
  // same room repeated 15 times — used by the engine to tint that room's
  // ambient glow and its exit arrows. Kept desaturated/muted on purpose;
  // this is mood lighting, not a rainbow.
  const ATMOSPHERE = {
    room_01: { darkness: 0.38, tint: 'rgba(12, 24, 42, 0.10)', fog: 0.12, fogMood: 'low',     glow: '#4a9a72', lanterns: [[241,697], [927,224], [204,318], [925,226], [767,129], [663,95], [578,316], [240,207]] }, // sickly green
    room_02: { darkness: 0.42, tint: 'rgba(15, 28, 48, 0.11)', fog: 0.15, fogMood: 'high',    glow: '#6f5aa8', lanterns: [[358,652], [315,247], [606,296], [1171,715], [931,299], [850,140], [768,127], [607,189], [655,178], [498,97], [199,150], [1206,311], [916,173], [477,292]] }, // violet
    room_03: { darkness: 0.35, tint: 'rgba(18, 32, 38, 0.09)', fog: 0.10, fogMood: 'sparse',  glow: '#4a8a9e', lanterns: [[1301,115], [457,109], [769,134], [602,299], [946,302], [1158,791], [361,803]] }, // teal-blue
    room_04: { darkness: 0.40, tint: 'rgba(25, 29, 45, 0.10)', fog: 0.13, fogMood: 'cross',   glow: '#9e5a72', lanterns: [[451,564], [598,321], [1186,775], [1273,576], [1159,324], [461,182], [900,197], [1089,262], [1147,247], [940,260], [535,224]] }, // dusky rose
    room_05: { darkness: 0.44, tint: 'rgba(9, 20, 34, 0.12)',  fog: 0.17, fogMood: 'sinking', glow: '#5a6fa8', lanterns: [[1377,785], [1189,283], [877,246], [292,286], [346,292], [184,331], [607,209], [829,190], [1174,688], [529,164], [768,136]] }, // indigo
    room_06: { darkness: 0.36, tint: 'rgba(20, 35, 34, 0.09)', fog: 0.09, fogMood: 'low',     glow: '#7a9e4a', lanterns: [[354,615], [1340,790], [1357,146], [1109,270], [1051,329], [298,145], [525,286], [477,171], [607,202], [153,368]] }, // moss
    room_07: { darkness: 0.39, tint: 'rgba(16, 29, 44, 0.10)', fog: 0.14, fogMood: 'cross',   glow: '#a87a4a', lanterns: [[290,542], [1252,535], [951,349], [924,267], [767,149], [937,152], [595,276], [208,200]] }, // rust amber
    room_08: { darkness: 0.32, tint: 'rgba(24, 35, 37, 0.07)', fog: 0.08, fogMood: 'sparse',  glow: '#4aa89e', lanterns: [[829,440], [679,415], [889,419]] }, // cyan-teal
    room_09: { darkness: 0.43, tint: 'rgba(25, 19, 36, 0.10)', fog: 0.16, fogMood: 'high',    glow: '#8a4aa8', lanterns: [[1157,762], [947,320], [328,777], [479,609], [658,220], [608,307], [893,254], [765,140]] }, // plum
    room_10: { darkness: 0.37, tint: 'rgba(10, 27, 39, 0.10)', fog: 0.12, fogMood: 'sinking', glow: '#a84a6f', lanterns: [[296,850], [314,331], [421,263], [654,237], [767,135]] }, // wine
    room_11: { darkness: 0.47, tint: 'rgba(12, 18, 31, 0.12)', fog: 0.18, fogMood: 'high',    glow: '#4a5a9e', lanterns: [[1147,638], [505,576], [548,320], [898,287], [593,232], [768,110], [588,144], [409,221], [470,165], [971,159], [898,201]] }, // steel-indigo
    room_12: { darkness: 0.41, tint: 'rgba(26, 28, 42, 0.09)', fog: 0.14, fogMood: 'low',     glow: '#7aa85a', lanterns: [[381,692], [1294,592], [1101,600], [286,285], [380,257], [487,296], [575,265], [1052,328], [912,186], [768,135], [629,189], [228,166]] }, // olive-moss
    room_13: { darkness: 0.34, tint: 'rgba(20, 36, 34, 0.08)', fog: 0.09, fogMood: 'sparse',  glow: '#a8944a', lanterns: [[1127,634], [522,332], [460,241], [610,286], [943,319], [1035,307], [648,246], [543,149], [765,141], [149,190], [896,186]] }, // ochre
    room_14: { darkness: 0.45, tint: 'rgba(18, 18, 30, 0.12)', fog: 0.17, fogMood: 'sinking', glow: '#4a7aa8', lanterns: [[301,702], [1320,727], [605,274], [1060,350], [1314,282], [981,201], [575,189], [641,227], [938,226]] }, // slate-blue
    room_15: { darkness: 0.39, tint: 'rgba(22, 30, 42, 0.10)', fog: 0.13, fogMood: 'cross',   glow: '#9e4a8a', lanterns: [[285,777], [964,307], [1241,296], [612,222], [979,228], [1126,178]] }  // magenta-ash
  };

  const rooms = {};
  for (let i = 1; i <= 15; i++) {
    const roomId = `room_${String(i).padStart(2, '0')}`;
    rooms[roomId] = {
      bg: `assets/img/muenba/${roomId}.webp`,
      spawns: { ...SPAWNS },
      exits: NPP[roomId] || [],
      walkable: makeWalkable(),
      atmosphere: ATMOSPHERE[roomId]
    };
  }

  // The first 5 huntable ghosts live here so both muenba.js and
  // muenba-profile.html read the exact same list instead of two copies
  // drifting apart. File names ARE their ids, per how they were delivered, except
  // tinklet/"Tinkley": the file on disk is tinklet.png, so that's what's
  // wired here with "Tinkley" kept only as the display name — flag if either
  // should change to match the other.
  const GHOSTS = [
    { id: 'fuzzle',  name: 'Fuzzle',  kana: 'フズル',       img: 'assets/img/muenba/ghosts/fuzzle.png',  personality: 'Practices a different scare every time.' },
    { id: 'glimmer', name: 'Glimmer', kana: 'グリマー',     img: 'assets/img/muenba/ghosts/glimmer.png', personality: 'Polishes every sparkle until it runs away.' },
    { id: 'nibsy',   name: 'Nibsy',   kana: 'ニブシー',     img: 'assets/img/muenba/ghosts/nibsy.png',   personality: 'Collects tiny noises and forgets where they came from.' },
    { id: 'tinklet', name: 'Tinkley', kana: 'ティンクリー', img: 'assets/img/muenba/ghosts/tinklet.png', personality: 'Rings invisible bells at the worst possible moment.' },
    { id: 'twiddle', name: 'Twiddle', kana: 'トゥイドル',  img: 'assets/img/muenba/ghosts/twiddle.png', personality: 'Turns in circles whenever a decision gets too serious.' }
  ];
  // Shared sprite every ghost swaps to when clicked or when it turns to
  // chase (Pass 7) — not a huntable ghost of its own, so it's kept separate
  // from the GHOSTS roster above.
  const GHOST_ANGRY_CHANGE_IMG = 'assets/img/muenba/ghosts/angry_change.png';

  // Pass 4 content expansion: authored ghost cases stay English-only. The
  // runtime supplies Japanese furigana translations only for instructions
  // and directions, so each case remains a clean English reading record.
  const CASES = {
    fuzzle_case_01: {
      id: 'fuzzle_case_01',
      ghostId: 'fuzzle',
      title: 'Fuzzle Forgot the Fright',
      eyebrow: 'GHOST CASE / CASE 01',
      intro: 'Fuzzle had one job: scare the next visitor. Now Fuzzle cannot remember what the scare was supposed to be.',
      fresh: {
        clues: [
          { title: 'The hiding place', text: 'Fuzzle waited behind a crooked gravestone.' },
          { title: 'Too many scares', text: 'Fuzzle practiced “Boo,” “Hiss,” and “Ta-da!”' },
          { title: 'The missing ending', text: 'When Nuppi arrived, Fuzzle could not remember which scare it had chosen.' }
        ],
        prompt: 'What tangled Fuzzle’s energy?',
        promptJP: '<ruby>何<rt>なに</rt></ruby>がフズルのエネルギーを<ruby>絡<rt>から</rt></ruby>ませましたか？',
        choices: [
          'A gravestone swallowed the scare.',
          'Fuzzle practiced too many scares.',
          'Nuppi used the scare too early.'
        ],
        correct: 1,
        resolution: 'Fuzzle’s energy untangles when one silly scare is chosen.'
      },
      deep: {
        clues: [
          { title: 'A serious plan', text: 'Fuzzle stood behind a crooked gravestone and prepared one perfect fright.' },
          { title: 'A growing collection', text: 'The perfect fright became three beginnings: “Boo,” “Hiss,” and “Ta-da!”' },
          { title: 'A tangled moment', text: 'When Nuppi arrived, Fuzzle’s energy pulled in three directions and none of the scares could finish.' }
        ],
        prompt: 'Which explanation best fits the evidence?',
        promptJP: 'この<ruby>証拠<rt>しょうこ</rt></ruby>に<ruby>一番<rt>いちばん</rt></ruby>よく<ruby>合<rt>あ</rt></ruby>う<ruby>説明<rt>せつめい</rt></ruby>はどれですか？',
        choices: [
          'The gravestone borrowed Fuzzle’s voice.',
          'Nuppi forgot to bring a loud enough bell.',
          'Fuzzle’s energy split between too many unfinished ideas.'
        ],
        correct: 2,
        resolution: 'Fuzzle’s energy untangles when the unfinished scares become one choice.'
      }
    },
    glimmer_case_01: {
      id: 'glimmer_case_01',
      ghostId: 'glimmer',
      title: 'Glimmer Chased the Shine',
      eyebrow: 'GHOST CASE / CASE 02',
      intro: 'Glimmer wanted one perfect sparkle. After polishing it all night, Glimmer could not stop chasing every reflection it made.',
      fresh: {
        clues: [
          { title: 'The tiny light', text: 'Glimmer sat on a gravestone with one pale spark balanced on its fingertip.' },
          { title: 'The polishing', text: 'Glimmer polished the spark against leaves, bells, and every shiny pebble nearby.' },
          { title: 'The runaway shine', text: 'When Nuppi arrived, Glimmer’s energy leapt from reflection to reflection and could not settle.' }
        ],
        prompt: 'What made Glimmer’s energy scatter?',
        promptJP: 'グリマーのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>散<rt>ち</rt></ruby>らばりましたか？',
        choices: [
          'Glimmer kept chasing every reflection of its sparkle.',
          'Nuppi turned on the cemetery lights.',
          'A firefly carried the brightest shine away.'
        ],
        correct: 0,
        resolution: 'Glimmer’s energy settles when one small sparkle is allowed to shine by itself.'
      },
      deep: {
        clues: [
          { title: 'A careful display', text: 'Glimmer prepared one pale spark and promised to make it the finest light in Muenba.' },
          { title: 'More shine, more trouble', text: 'Every polished surface made another reflection, and Glimmer treated each one like a new prize.' },
          { title: 'An everywhere ghost', text: 'By the time Nuppi arrived, Glimmer’s energy was spread across the cemetery, following a shine that never ended.' }
        ],
        prompt: 'Which explanation best fits the evidence?',
        promptJP: 'この<ruby>証拠<rt>しょうこ</rt></ruby>に<ruby>一番<rt>いちばん</rt></ruby>よく<ruby>合<rt>あ</rt></ruby>う<ruby>説明<rt>せつめい</rt></ruby>はどれですか？',
        choices: [
          'The gravestones hid the original sparkle.',
          'Glimmer’s energy scattered because it chased its own reflections.',
          'Nuppi brought too many lanterns to the cemetery.'
        ],
        correct: 1,
        resolution: 'Glimmer’s energy settles when it chooses one true sparkle and lets the reflections fade.'
      }
    },
    nibsy_case_01: {
      id: 'nibsy_case_01',
      ghostId: 'nibsy',
      title: 'Nibsy Lost the Little Sounds',
      eyebrow: 'GHOST CASE / CASE 03',
      intro: 'Nibsy collected tiny noises from every corner of Muenba. Now the sounds have mixed together, and Nibsy cannot remember which one belongs to which place.',
      fresh: {
        clues: [
          { title: 'The little collection', text: 'Nibsy carried three sounds in a pocket: a pebble plink, a leaf scritch, and a distant puff.' },
          { title: 'The missing labels', text: 'The labels fell off, so Nibsy guessed where each sound had come from.' },
          { title: 'Everything at once', text: 'When Nuppi asked for one sound, all three noises answered together.' }
        ],
        prompt: 'What tangled Nibsy’s energy?',
        promptJP: 'ニブシーのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>絡<rt>から</rt></ruby>まりましたか？',
        choices: [
          'The cemetery swallowed all the sound labels.',
          'Nuppi made the pocket too small.',
          'Nibsy mixed up the tiny sounds it was collecting.'
        ],
        correct: 2,
        resolution: 'Nibsy’s energy settles when each little sound gets its own place again.'
      },
      deep: {
        clues: [
          { title: 'A careful collector', text: 'Nibsy recorded a pebble’s plink, a leaf’s scritch, and a faraway puff as three separate treasures.' },
          { title: 'A careless shortcut', text: 'When the labels disappeared, Nibsy assigned each sound by memory and quietly swapped all three.' },
          { title: 'A noisy contradiction', text: 'The pocket could not agree with itself: every sound insisted it belonged somewhere else.' }
        ],
        prompt: 'Which explanation best fits the evidence?',
        promptJP: 'この<ruby>証拠<rt>しょうこ</rt></ruby>に<ruby>一番<rt>いちばん</rt></ruby>よく<ruby>合<rt>あ</rt></ruby>う<ruby>説明<rt>せつめい</rt></ruby>はどれですか？',
        choices: [
          'Nibsy’s energy tangled because the sounds lost their places.',
          'The pebbles learned to make three sounds each.',
          'Nuppi gave Nibsy a pocket full of silence.'
        ],
        correct: 0,
        resolution: 'Nibsy’s energy settles when every sound is returned to the place that made it.'
      }
    },
    tinkley_case_01: {
      id: 'tinkley_case_01',
      ghostId: 'tinklet',
      title: 'Tinkley Rang Too Soon',
      eyebrow: 'GHOST CASE / CASE 04',
      intro: 'Tinkley prepared an invisible bell for a grand entrance. The bell kept ringing before the entrance happened, and the moment never felt right.',
      fresh: {
        clues: [
          { title: 'The invisible bell', text: 'Tinkley held both hands around a bell that nobody else could see.' },
          { title: 'The early chime', text: 'The bell rang when Tinkley practiced, when Tinkley waited, and once while Tinkley was yawning.' },
          { title: 'The missed moment', text: 'When Nuppi finally arrived, the bell had already announced him three times.' }
        ],
        prompt: 'What tangled Tinkley’s energy?',
        promptJP: 'ティンクリーのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>絡<rt>から</rt></ruby>まりましたか？',
        choices: [
          'Nuppi hid the invisible bell in a tree.',
          'Tinkley rang the bell before the right moment arrived.',
          'The cemetery forgot how entrances work.'
        ],
        correct: 1,
        resolution: 'Tinkley’s energy settles when the bell waits for one real moment.'
      },
      deep: {
        clues: [
          { title: 'A perfect announcement', text: 'Tinkley planned one bright chime to mark Nuppi’s arrival in the cemetery.' },
          { title: 'Practice without an ending', text: 'Tinkley rehearsed the chime before the footsteps, during the footsteps, and after the footsteps.' },
          { title: 'A ceremony with no center', text: 'By the time Nuppi arrived, the bell had made every moment feel like the important one.' }
        ],
        prompt: 'Which explanation best fits the evidence?',
        promptJP: 'この<ruby>証拠<rt>しょうこ</rt></ruby>に<ruby>一番<rt>いちばん</rt></ruby>よく<ruby>合<rt>あ</rt></ruby>う<ruby>説明<rt>せつめい</rt></ruby>はどれですか？',
        choices: [
          'The bell became too heavy for an invisible ghost.',
          'Nuppi arrived too quietly to be announced.',
          'Tinkley’s energy scattered because it could not wait for the true moment.'
        ],
        correct: 2,
        resolution: 'Tinkley’s energy settles when one chime is saved for one unmistakable moment.'
      }
    },
    twiddle_case_01: {
      id: 'twiddle_case_01',
      ghostId: 'twiddle',
      title: 'Twiddle Turned in Circles',
      eyebrow: 'GHOST CASE / CASE 05',
      intro: 'Twiddle found two possible paths through the cemetery. Every time a choice felt serious, Twiddle turned around and started the decision again.',
      fresh: {
        clues: [
          { title: 'Two paths', text: 'Twiddle stood between a crooked path and a mossy path, holding one pebble in each hand.' },
          { title: 'The first turn', text: 'Twiddle chose the crooked path, changed its mind, and walked back before reaching the first stone.' },
          { title: 'The endless loop', text: 'When Nuppi arrived, Twiddle’s energy was circling the same two choices.' }
        ],
        prompt: 'What tangled Twiddle’s energy?',
        promptJP: 'トゥイドルのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>絡<rt>から</rt></ruby>まりましたか？',
        choices: [
          'Twiddle changed its mind before either path could begin.',
          'The two paths moved while Twiddle was looking away.',
          'Nuppi placed the pebbles on the wrong side.'
        ],
        correct: 0,
        resolution: 'Twiddle’s energy settles when one path is chosen long enough to take a step.'
      },
      deep: {
        clues: [
          { title: 'A harmless choice', text: 'Twiddle first chose between a crooked path and a mossy path, certain that either one would be fine.' },
          { title: 'A serious question', text: 'Then Twiddle wondered which path was more correct, and the easy choice became impossible.' },
          { title: 'A perfect circle', text: 'Twiddle’s energy repeated the same decision until every turn looked like both a beginning and an ending.' }
        ],
        prompt: 'Which explanation best fits the evidence?',
        promptJP: 'この<ruby>証拠<rt>しょうこ</rt></ruby>に<ruby>一番<rt>いちばん</rt></ruby>よく<ruby>合<rt>あ</rt></ruby>う<ruby>説明<rt>せつめい</rt></ruby>はどれですか？',
        choices: [
          'The cemetery paths secretly changed places.',
          'Twiddle’s energy looped because every choice had to be perfect.',
          'Nuppi asked Twiddle to walk in a circle.'
        ],
        correct: 1,
        resolution: 'Twiddle’s energy settles when a choice becomes a step instead of another question.'
      }
    }
  };

  window.MUENBA_DATA = {
    world: 'muenba',
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    startRoom: 'room_01',
    rooms,
    ghosts: GHOSTS,
    cases: CASES,
    // Cases unlock in this order. Keeping progression explicit lets Nuppi's
    // board and the capture flow share one contract as more ghosts arrive.
    caseOrder: ['fuzzle_case_01', 'glimmer_case_01', 'nibsy_case_01', 'tinkley_case_01', 'twiddle_case_01'],
    ghostAngryChangeImg: GHOST_ANGRY_CHANGE_IMG
  };
})();
