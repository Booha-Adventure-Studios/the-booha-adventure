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
    room_05: { darkness: 0.44, tint: 'rgba(9, 20, 34, 0.12)',  fog: 0.17, fogMood: 'sinking', glow: '#5a6fa8', lanterns: [[1377,785], [1189,283], [877,246], [292,286], [346,292], [184,331], [607,209], [829,190], [1174,688], [529,164], [768,136], [604,324]] }, // indigo
    room_06: { darkness: 0.36, tint: 'rgba(20, 35, 34, 0.09)', fog: 0.09, fogMood: 'low',     glow: '#7a9e4a', lanterns: [[354,615], [1340,790], [1357,146], [1109,270], [1051,329], [298,145], [525,286], [477,171], [607,202], [153,368], [933,212]] }, // moss
    room_07: { darkness: 0.39, tint: 'rgba(16, 29, 44, 0.10)', fog: 0.14, fogMood: 'cross',   glow: '#a87a4a', lanterns: [[290,542], [1252,535], [951,349], [924,267], [767,149], [937,152], [595,276], [208,200], [861,235]] }, // rust amber
    room_08: { darkness: 0.32, tint: 'rgba(24, 35, 37, 0.07)', fog: 0.08, fogMood: 'sparse',  glow: '#4aa89e', lanterns: [[829,440], [679,415], [889,419]] }, // cyan-teal
    room_09: { darkness: 0.43, tint: 'rgba(25, 19, 36, 0.10)', fog: 0.16, fogMood: 'high',    glow: '#8a4aa8', lanterns: [[1157,762], [947,320], [328,777], [479,609], [658,220], [608,307], [893,254], [765,140], [351,226], [481,259]] }, // plum
    room_10: { darkness: 0.37, tint: 'rgba(10, 27, 39, 0.10)', fog: 0.12, fogMood: 'sinking', glow: '#a84a6f', lanterns: [[296,850], [314,331], [421,263], [654,237], [767,135]] }, // wine
    room_11: { darkness: 0.47, tint: 'rgba(12, 18, 31, 0.12)', fog: 0.18, fogMood: 'high',    glow: '#4a5a9e', lanterns: [[1147,638], [505,576], [548,320], [898,287], [593,232], [768,110], [588,144], [409,221], [470,165], [971,159], [898,201]] }, // steel-indigo
    room_12: { darkness: 0.41, tint: 'rgba(26, 28, 42, 0.09)', fog: 0.14, fogMood: 'low',     glow: '#7aa85a', lanterns: [[381,692], [1294,592], [1101,600], [286,285], [380,257], [487,296], [575,265], [1052,328], [912,186], [768,135], [629,189], [228,166]] }, // olive-moss
    room_13: { darkness: 0.34, tint: 'rgba(20, 36, 34, 0.08)', fog: 0.09, fogMood: 'sparse',  glow: '#a8944a', lanterns: [[1127,634], [522,332], [460,241], [610,286], [943,319], [1035,307], [648,246], [543,149], [765,141], [149,190], [896,186], [310,666]] }, // ochre
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
    { id: 'fuzzle',  role: 'hunt-target', name: 'Fuzzle',  kana: 'ファズル',       img: 'assets/img/muenba/ghosts/fuzzle.webp',  personality: 'Practices a different scare every time.', personalityJp: 'いつも<ruby>違<rt>ちが</rt></ruby>う<ruby>驚<rt>おどろ</rt></ruby>かし<ruby>方<rt>かた</rt></ruby>を<ruby>練習<rt>れんしゅう</rt></ruby>する。' },
    { id: 'glimmer', role: 'hunt-target', name: 'Glimmer', kana: 'グリマー',     img: 'assets/img/muenba/ghosts/glimmer.webp', personality: 'Polishes every sparkle until it runs away.', personalityJp: 'きらめきがなくなるまで<ruby>磨<rt>みが</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>ける。' },
    { id: 'nibsy',   role: 'hunt-target', name: 'Nibsy',   kana: 'ニブシー',     img: 'assets/img/muenba/ghosts/nibsy.webp',   personality: 'Collects tiny noises and forgets where they came from.', personalityJp: '<ruby>小<rt>ちい</rt></ruby>さな<ruby>音<rt>おと</rt></ruby>を<ruby>集<rt>あつ</rt></ruby>めて、どこから<ruby>来<rt>き</rt></ruby>たか<ruby>忘<rt>わす</rt></ruby>れてしまう。' },
    { id: 'tinklet', role: 'hunt-target', name: 'Tinkley', kana: 'ティンクリー', img: 'assets/img/muenba/ghosts/tinklet.webp', personality: 'Rings invisible bells at the worst possible moment.', personalityJp: '<ruby>一番<rt>いちばん</rt></ruby><ruby>悪<rt>わる</rt></ruby>いタイミングで<ruby>見<rt>み</rt></ruby>えないベルを<ruby>鳴<rt>な</rt></ruby>らす。' },
    { id: 'twiddle', role: 'hunt-target', name: 'Twiddle', kana: 'トゥイドル',  img: 'assets/img/muenba/ghosts/twiddle.webp', personality: 'Turns in circles whenever a decision gets too serious.', personalityJp: '<ruby>決断<rt>けつだん</rt></ruby>が<ruby>重<rt>おも</rt></ruby>くなると、くるくる<ruby>回<rt>まわ</rt></ruby>ってしまう。' }
  ];
  // Shared sprite every ghost swaps to when clicked or when it turns to
  // chase (Pass 7) — not a huntable ghost of its own, so it's kept separate
  // from the GHOSTS roster above.
  const GHOST_ANGRY_CHANGE_IMG = 'assets/img/muenba/ghosts/angry_change.webp';

  // Pass 15: a single generic "Jerk" archetype, spawned as several instances
  // by muenba.js to keep rooms feeling populated as the week's real ghosts
  // get caught. It is never huntable and never appears on the profile page,
  // so it is kept out of the GHOSTS roster on purpose — muenba.js reads it
  // separately via window.MUENBA_DATA.jerk.
  const JERK_GHOST = {
    id: 'jerk',
    role: 'jerk',
    huntable: false,
    alwaysAngry: true,
    dangerCanHide: false,
    name: 'Jerk',
    kana: 'イジワル',
    img: 'assets/img/muenba/ghosts/jerk.webp',
    personality: 'Doesn’t want to be found. Just wants to scare somebody.',
    personalityJp: '<ruby>見<rt>み</rt></ruby>つかりたくない。ただ<ruby>誰<rt>だれ</rt></ruby>かを<ruby>驚<rt>おどろ</rt></ruby>かしたいだけ。'
  };

  // Pass 4 content expansion: authored ghost cases stay English-only. The
  // runtime supplies Japanese furigana translations only for instructions
  // and directions, so each case remains a clean English reading record.
  const CASES = {
    fuzzle_case_01: {
      id: 'fuzzle_case_01',
      ghostId: 'fuzzle',
      title: 'Fuzzle Forgot the Fright',
      eyebrow: 'CASE FILE / CASE 01',
      intro: 'Fuzzle wanted to scare Nuppi. He forgot which scare to use.',
      start: {
        clues: [
          {
            title: 'The stone', text: 'Fuzzle hid behind a stone.', keywords: ['hid', 'stone'],
            check: {
              type: 'who',
              prompt: 'Who hid behind a stone?',
              promptJP: '<ruby>石<rt>いし</rt></ruby>の<ruby>後<rt>うし</rt></ruby>ろに<ruby>隠<rt>かく</rt></ruby>れたのは、だれですか？',
              choices: ['Fuzzle', 'Nuppi', 'Glimmer'],
              correct: 0
            }
          },
          {
            title: 'Three scares', text: 'Fuzzle tried three silly scares.', keywords: ['tried', 'scares'],
            check: {
              type: 'what',
              prompt: 'What did Fuzzle try?',
              promptJP: 'ファズルは、<ruby>何<rt>なに</rt></ruby>を<ruby>試<rt>ため</rt></ruby>しましたか？',
              choices: ['One quiet song', 'Three silly scares', 'A bright lantern'],
              correct: 1
            }
          },
          {
            title: 'No choice', text: 'Fuzzle did not choose one.', keywords: ['choose'],
            check: {
              type: 'which',
              prompt: 'Which scare did Fuzzle choose?',
              promptJP: 'ファズルは、どの<ruby>驚<rt>おどろ</rt></ruby>かし<ruby>方<rt>かた</rt></ruby>を<ruby>選<rt>えら</rt></ruby>びましたか？',
              choices: ['The first scare', 'The silly trumpet', 'None of them'],
              correct: 2
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why was Fuzzle’s energy confused?',
        promptJP: 'ファズルのエネルギーは、なぜ<ruby>混乱<rt>こんらん</rt></ruby>しましたか？',
        choices: [
          'Fuzzle tried too many scares.',
          'The stone ate the energy.',
          'Nuppi came after lunch.'
        ],
        correct: 0,
        resolution: 'Fuzzle’s energy is calm when Fuzzle chooses one scare.'
      },
      fresh: {
        clues: [
          {
            title: 'One plan', text: 'Fuzzle planned one scare for Nuppi behind a crooked gravestone.', keywords: ['planned', 'gravestone'],
            check: {
              type: 'where',
              prompt: 'Where did Fuzzle plan the scare?',
              promptJP: 'ファズルは、どこで<ruby>驚<rt>おどろ</rt></ruby>かす<ruby>計画<rt>けいかく</rt></ruby>を<ruby>立<rt>た</rt></ruby>てましたか？',
              choices: ['Behind a crooked gravestone', 'Beside a bright river', 'Inside Nuppi’s house'],
              correct: 0
            }
          },
          {
            title: 'Too many scares', text: 'Then Fuzzle practiced a pop, a hiss, and a silly trumpet sound.', keywords: ['practiced', 'hiss'],
            check: {
              type: 'what',
              prompt: 'What sounds did Fuzzle practice?',
              promptJP: 'ファズルは、どんな<ruby>音<rt>おと</rt></ruby>を<ruby>練習<rt>れんしゅう</rt></ruby>しましたか？',
              choices: ['A pop, a hiss, and a silly trumpet', 'A bell, a drum, and a whistle', 'One long quiet breath'],
              correct: 0
            }
          },
          {
            title: 'No ending', text: 'When Nuppi arrived, Fuzzle started all three scares and finished none.', keywords: ['arrived', 'finished'],
            check: {
              type: 'what-happened',
              prompt: 'What happened when Nuppi arrived?',
            promptJP: 'ヌッピが<ruby>来<rt>き</rt></ruby>たとき、<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>きましたか？',
              choices: ['Fuzzle started all three scares but finished none.', 'Fuzzle chose one scare and finished it.', 'Fuzzle went home before Nuppi arrived.'],
              correct: 0,
              requiresPrevious: true
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'What caused Fuzzle’s energy to tangle?',
        promptJP: '<ruby>何<rt>なに</rt></ruby>がファズルのエネルギーを<ruby>絡<rt>から</rt></ruby>ませましたか？',
        choices: [
          'Fuzzle kept switching between three unfinished scares.',
          'The gravestone swallowed the planned scare.',
          'Nuppi arrived before Fuzzle could hide.'
        ],
        correct: 0,
        resolution: 'Fuzzle’s energy untangles when one scare is chosen and finished.'
      },
      deep: {
        clues: [
          {
            title: 'A careful plan', text: 'Fuzzle stood behind a crooked gravestone and prepared one fright for Nuppi.', keywords: ['prepared', 'fright'],
            check: {
              type: 'who',
              prompt: 'Who was Fuzzle’s planned fright for?',
              promptJP: 'ファズルが<ruby>計画<rt>けいかく</rt></ruby>した<ruby>驚<rt>おどろ</rt></ruby>かしは、だれのためでしたか？',
              choices: ['Nuppi', 'Glimmer', 'The cemetery keeper'],
              correct: 0
            }
          },
          {
            title: 'Three beginnings', text: 'The plan grew into three different scares, but each one stopped before the ending.', keywords: ['grew', 'stopped'],
            check: {
              type: 'what-happened',
              prompt: 'What happened to Fuzzle’s one plan?',
              promptJP: 'ファズルのひとつの<ruby>計画<rt>けいかく</rt></ruby>は、どうなりましたか？',
              choices: ['It grew into three scares that stopped before the ending.', 'It became one perfect scare.', 'It disappeared behind the gravestone.'],
              correct: 0
            }
          },
          {
            title: 'A divided energy', text: 'When Nuppi arrived, Fuzzle’s energy pulled in three directions and no scare could finish.', keywords: ['pulled', 'directions'],
            check: {
              type: 'why',
              prompt: 'Why could none of the scares finish?',
              promptJP: 'なぜ、どの<ruby>驚<rt>おどろ</rt></ruby>かしも<ruby>終<rt>お</rt></ruby>わりませんでしたか？',
              choices: ['Fuzzle’s energy pulled in three directions.', 'The gravestone blocked every sound.', 'Nuppi arrived too quietly.'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'What does the evidence tell us about Fuzzle’s energy?',
        promptJP: 'この<ruby>証拠<rt>しょうこ</rt></ruby>に<ruby>一番<rt>いちばん</rt></ruby>よく<ruby>合<rt>あ</rt></ruby>う<ruby>説明<rt>せつめい</rt></ruby>はどれですか？',
        choices: [
          'The gravestone hid Fuzzle’s voice.',
          'Nuppi brought the wrong bell.',
          'Fuzzle’s energy split between three unfinished scares.'
        ],
        correct: 2,
        resolution: 'Fuzzle’s energy untangles when the unfinished scares become one choice.'
      }
    },
    glimmer_case_01: {
      id: 'glimmer_case_01',
      ghostId: 'glimmer',
      title: 'Glimmer Chased the Shine',
      eyebrow: 'CASE FILE / CASE 02',
      intro: 'Glimmer had one small light. It made many lights, and Glimmer chased them.',
      start: {
        clues: [
          {
            title: 'One small spark', text: 'Glimmer held one small spark.', keywords: ['held', 'spark'],
            check: {
              type: 'who',
              prompt: 'Who held the small spark?',
              promptJP: '小さな<ruby>光<rt>ひかり</rt></ruby>を<ruby>持<rt>も</rt></ruby>っていたのは、だれですか？',
              choices: ['Glimmer', 'Fuzzle', 'Nuppi'],
              correct: 0
            }
          },
          {
            title: 'Lights on things', text: 'The spark shone on leaves and stones.', keywords: ['shone', 'leaves'],
            check: {
              type: 'where',
              prompt: 'Where did the spark shine?',
              promptJP: 'その<ruby>光<rt>ひかり</rt></ruby>は、どこで<ruby>輝<rt>かがや</rt></ruby>きましたか？',
              choices: ['On leaves and stones', 'Under the river', 'Inside a pocket'],
              correct: 0
            }
          },
          {
            title: 'Too many lights', text: 'Glimmer chased every light it saw.', keywords: ['chased'],
            check: {
              type: 'what',
              prompt: 'What did Glimmer chase?',
              promptJP: 'グリマーは、<ruby>何<rt>なに</rt></ruby>を<ruby>追<rt>お</rt></ruby>いかけましたか？',
              choices: ['Every light it saw', 'Only the first spark', 'A dark stone'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why was Glimmer’s energy confused?',
        promptJP: 'グリマーのエネルギーは、なぜ<ruby>混乱<rt>こんらん</rt></ruby>しましたか？',
        choices: [
          'Glimmer chased every light.',
          'Nuppi turned off the lights.',
          'A leaf hid the spark.'
        ],
        correct: 0,
        resolution: 'Glimmer’s energy is calm when Glimmer follows one light.'
      },
      fresh: {
        clues: [
          {
            title: 'The first spark', text: 'Glimmer balanced one pale spark on a gravestone and wanted it to shine.', keywords: ['balanced', 'shine'],
            check: {
              type: 'which',
              prompt: 'Which spark did Glimmer want to shine?',
              promptJP: 'グリマーが<ruby>輝<rt>かがや</rt></ruby>かせたかったのは、どの<ruby>光<rt>ひかり</rt></ruby>ですか？',
              choices: ['One pale spark', 'Every reflection', 'A firefly’s light'],
              correct: 0
            }
          },
          {
            title: 'The shiny trail', text: 'Glimmer polished the spark against leaves, bells, and every shiny pebble nearby.', keywords: ['polished', 'pebble'],
            check: {
              type: 'what',
              prompt: 'What did Glimmer polish the spark against?',
              promptJP: 'グリマーは、<ruby>何<rt>なに</rt></ruby>に<ruby>光<rt>ひかり</rt></ruby>をこすって<ruby>磨<rt>みが</rt></ruby>きましたか？',
              choices: ['Leaves, bells, and shiny pebbles', 'Only one gravestone', 'Wet paths and tree roots'],
              correct: 0,
              requiresPrevious: true
            }
          },
          {
            title: 'The long chase', text: 'Each reflection looked like a new spark, so Glimmer chased one after another.', keywords: ['reflection', 'chased'],
            check: {
              type: 'why',
              prompt: 'Why did Glimmer chase one light after another?',
              promptJP: 'なぜグリマーは、<ruby>次々<rt>つぎつぎ</rt></ruby>に<ruby>光<rt>ひかり</rt></ruby>を<ruby>追<rt>お</rt></ruby>いかけましたか？',
              choices: ['Each reflection looked like a new spark.', 'The first spark went out at once.', 'Nuppi told Glimmer to run.'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why did Glimmer keep chasing?',
        promptJP: 'グリマーのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>散<rt>ち</rt></ruby>らばりましたか？',
        choices: [
          'Glimmer treated every reflection like a new spark.',
          'Nuppi turned on the cemetery lights.',
          'A firefly carried the first spark away.'
        ],
        correct: 0,
        resolution: 'Glimmer’s energy settles when one spark is chosen instead of every reflection.'
      },
      deep: {
        clues: [
          {
            title: 'A careful display', text: 'Glimmer prepared one pale spark and promised to make it the finest light in Muenba.', keywords: ['prepared', 'promised'],
            check: {
              type: 'what',
              prompt: 'What did Glimmer promise to make the finest light in Muenba?',
              promptJP: 'グリマーは、<ruby>何<rt>なに</rt></ruby>をムエンバで<ruby>一番<rt>いちばん</rt></ruby>きれいな<ruby>光<rt>ひかり</rt></ruby>にすると<ruby>約束<rt>やくそく</rt></ruby>しましたか？',
              choices: ['One pale spark', 'Every gravestone', 'A new lantern'],
              correct: 0
            }
          },
          {
            title: 'More shine, more trouble', text: 'Every polished surface made another reflection, and Glimmer treated each one like a new prize.', keywords: ['surface', 'prize'],
            check: {
              type: 'what-happened',
              prompt: 'What did every polished surface make?',
              promptJP: 'すべての<ruby>磨<rt>みが</rt></ruby>かれた<ruby>表面<rt>ひょうめん</rt></ruby>は、<ruby>何<rt>なに</rt></ruby>を<ruby>作<rt>つく</rt></ruby>りましたか？',
              choices: ['Another reflection', 'A darker forest', 'A second cemetery'],
              correct: 0
            }
          },
          {
            title: 'An everywhere ghost', text: 'By the time Nuppi arrived, Glimmer’s energy had spread across the cemetery, following a shine that could never end.', keywords: ['spread', 'following'],
            check: {
              type: 'meaning',
              prompt: 'What does “a shine that could never end” mean here?',
              promptJP: 'ここで「<ruby>終<rt>お</rt></ruby>わらない<ruby>輝<rt>かがや</rt></ruby>き」は、どんな<ruby>意味<rt>いみ</rt></ruby>ですか？',
              choices: ['Glimmer kept following new reflections.', 'The original spark became dark.', 'The cemetery lights turned off.'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'What can we infer from Glimmer’s endless chase?',
        promptJP: 'グリマーの<ruby>終<rt>お</rt></ruby>わらない<ruby>追<rt>お</rt></ruby>いかけから、<ruby>何<rt>なに</rt></ruby>が<ruby>分<rt>わ</rt></ruby>かりますか？',
        choices: [
          'The gravestones hid the original sparkle.',
          'Glimmer’s energy scattered because it chased reflections instead of one source.',
          'Nuppi brought too many lanterns to the cemetery.'
        ],
        correct: 1,
        resolution: 'Glimmer’s energy settles when it understands that many reflections can come from one source.'
      }
    },
    nibsy_case_01: {
      id: 'nibsy_case_01',
      ghostId: 'nibsy',
      title: 'Nibsy Lost the Little Sounds',
      eyebrow: 'CASE FILE / CASE 03',
      intro: 'Nibsy kept three little sounds. The sounds got mixed up.',
      start: {
        clues: [
          {
            title: 'Three sounds', text: 'Nibsy had a pebble sound, a leaf sound, and a faraway sound.', keywords: ['pebble', 'faraway'],
            check: {
              type: 'which',
              prompt: 'Which sounds did Nibsy have?',
              promptJP: 'ニブシーが<ruby>持<rt>も</rt></ruby>っていたのは、どんな<ruby>音<rt>おと</rt></ruby>ですか？',
              choices: ['A pebble sound, a leaf sound, and a faraway sound', 'A bell sound and two drum sounds', 'Only one quiet sound'],
              correct: 0
            }
          },
          {
            title: 'Labels gone', text: 'Each sound lost its label.', keywords: ['lost', 'label'],
            check: {
              type: 'what-happened',
              prompt: 'What happened to each sound’s label?',
              promptJP: 'それぞれの<ruby>音<rt>おと</rt></ruby>のラベルは、どうなりましたか？',
              choices: ['It was lost.', 'It became louder.', 'It moved to a stone.'],
              correct: 0
            }
          },
          {
            title: 'Wrong places', text: 'Nibsy put the sounds in the wrong places.', keywords: ['wrong', 'places'],
            check: {
              type: 'what',
              prompt: 'Where did Nibsy put the sounds?',
              promptJP: 'ニブシーは、<ruby>音<rt>おと</rt></ruby>をどこに<ruby>置<rt>お</rt></ruby>きましたか？',
              choices: ['In the wrong places', 'Back where they belonged', 'Inside the lanterns'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why was Nibsy’s energy confused?',
        promptJP: 'ニブシーのエネルギーは、なぜ<ruby>混乱<rt>こんらん</rt></ruby>しましたか？',
        choices: [
          'Nibsy mixed up the small sounds.',
          'The pebble made no sound.',
          'Nuppi hid the pocket.'
        ],
        correct: 0,
        resolution: 'Nibsy’s energy is calm when each sound has its place.'
      },
      fresh: {
        clues: [
          {
            title: 'Three pocket sounds', text: 'Nibsy carried a pebble plink, a leaf scritch, and a distant puff in one pocket.', keywords: ['carried', 'pocket'],
            check: {
              type: 'what',
              prompt: 'What did Nibsy carry in one pocket?',
              promptJP: 'ニブシーは、ひとつのポケットに<ruby>何<rt>なに</rt></ruby>を<ruby>入<rt>い</rt></ruby>れていましたか？',
              choices: ['A pebble plink, a leaf scritch, and a distant puff', 'Three bright sparks', 'One bell and two lanterns'],
              correct: 0
            }
          },
          {
            title: 'A missing label', text: 'The labels fell off, so Nibsy guessed where each sound had come from.', keywords: ['labels', 'guessed'],
            check: {
              type: 'why',
              prompt: 'Why did Nibsy guess where the sounds came from?',
              promptJP: 'なぜニブシーは、<ruby>音<rt>おと</rt></ruby>がどこから<ruby>来<rt>き</rt></ruby>たか<ruby>推測<rt>すいそく</rt></ruby>しましたか？',
              choices: ['The labels had fallen off.', 'The sounds were too quiet to hear.', 'Nuppi moved the sounds.'],
              correct: 0
            }
          },
          {
            title: 'One loud answer', text: 'When Nuppi asked for one sound, all three noises answered together.', keywords: ['asked', 'together'],
            check: {
              type: 'what-happened',
              prompt: 'What happened when Nuppi asked for one sound?',
              promptJP: 'ヌッピがひとつの<ruby>音<rt>おと</rt></ruby>を<ruby>聞<rt>き</rt></ruby>いたとき、<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>きましたか？',
              choices: ['All three noises answered together.', 'Only the pebble answered.', 'The pocket became silent.'],
              correct: 0,
              requiresPrevious: true
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why did the sounds tangle Nibsy’s energy?',
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
          {
            title: 'Three treasures', text: 'Nibsy recorded a pebble’s plink, a leaf’s scritch, and a faraway puff as three separate treasures.', keywords: ['recorded', 'treasures'],
            check: {
              type: 'which',
              prompt: 'Which three sounds did Nibsy record?',
              promptJP: 'ニブシーが<ruby>記録<rt>きろく</rt></ruby>したのは、どの3つの<ruby>音<rt>おと</rt></ruby>ですか？',
              choices: ['A pebble’s plink, a leaf’s scritch, and a faraway puff', 'Three bell rings from one tower', 'A footstep, a shout, and a door slam'],
              correct: 0
            }
          },
          {
            title: 'A quick guess', text: 'When the labels disappeared, Nibsy assigned each sound by memory and quietly swapped all three.', keywords: ['assigned', 'swapped'],
            check: {
              type: 'what-happened',
              prompt: 'What did Nibsy do after the labels disappeared?',
              promptJP: 'ラベルが<ruby>消<rt>き</rt></ruby>えたあと、ニブシーは<ruby>何<rt>なに</rt></ruby>をしましたか？',
              choices: ['Nibsy assigned the sounds by memory and swapped all three.', 'Nibsy threw all the sounds away.', 'Nibsy made three new labels.'],
              correct: 0
            }
          },
          {
            title: 'The problem', text: 'The pocket could not agree with itself: every sound insisted it belonged somewhere else.', keywords: ['insisted', 'belonged'],
            check: {
              type: 'meaning',
              prompt: 'What does it mean that every sound “belonged somewhere else”?',
              promptJP: 'すべての<ruby>音<rt>おと</rt></ruby>が「ほかの<ruby>場所<rt>ばしょ</rt></ruby>にある」とは、どんな<ruby>意味<rt>いみ</rt></ruby>ですか？',
              choices: ['The sounds were mixed up with the wrong places.', 'The sounds wanted to leave Muenba.', 'The pocket had no room left.'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'What does the mixed-up pocket tell us?',
        promptJP: '混ざったポケットから、<ruby>何<rt>なに</rt></ruby>が<ruby>分<rt>わ</rt></ruby>かりますか？',
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
      eyebrow: 'CASE FILE / CASE 04',
      intro: 'Tinkley had an invisible bell. It rang before Nuppi came.',
      start: {
        clues: [
          {
            title: 'A hidden bell', text: 'Tinkley had a bell that nobody could see.', keywords: ['nobody', 'bell'],
            check: {
              type: 'what',
              prompt: 'What did Tinkley have?',
              promptJP: 'ティンクリーは、<ruby>何<rt>なに</rt></ruby>を<ruby>持<rt>も</rt></ruby>っていましたか？',
              choices: ['A bell nobody could see', 'A lantern everyone could see', 'A pocket full of stones'],
              correct: 0
            }
          },
          {
            title: 'Too soon', text: 'The bell rang before Nuppi came.', keywords: ['rang', 'before'],
            check: {
              type: 'what-happened',
              prompt: 'What happened before Nuppi came?',
              promptJP: 'ヌッピが<ruby>来<rt>き</rt></ruby>る<ruby>前<rt>まえ</rt></ruby>に、<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>きましたか？',
              choices: ['The bell rang.', 'The bell disappeared.', 'Tinkley left the cemetery.'],
              correct: 0
            }
          },
          {
            title: 'Three rings', text: 'The bell rang three times too soon.', keywords: ['times', 'soon'],
            check: {
              type: 'how-many',
              prompt: 'How many times did the bell ring too soon?',
              promptJP: 'ベルは、<ruby>何回<rt>なんかい</rt></ruby>早く<ruby>鳴<rt>な</rt></ruby>りましたか？',
              choices: ['Once', 'Three times', 'Five times'],
              correct: 1
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why was Tinkley’s energy confused?',
        promptJP: 'ティンクリーのエネルギーは、なぜ<ruby>混乱<rt>こんらん</rt></ruby>しましたか？',
        choices: [
          'Tinkley rang the bell too early.',
          'Nuppi hid the bell.',
          'The bell was too quiet.'
        ],
        correct: 0,
        resolution: 'Tinkley’s energy is calm when the bell waits.'
      },
      fresh: {
        clues: [
          {
            title: 'The hidden bell', text: 'Tinkley held both hands around a bell that nobody else could see.', keywords: ['held', 'hands'],
            check: {
              type: 'who',
              prompt: 'Who could not see Tinkley’s bell?',
              promptJP: 'ティンクリーのベルを<ruby>見<rt>み</rt></ruby>られなかったのは、だれですか？',
              choices: ['Everyone else', 'Only Tinkley', 'The cemetery trees'],
              correct: 0
            }
          },
          {
            title: 'Practice rings', text: 'The bell rang while Tinkley practiced, waited, and even yawned.', keywords: ['practiced', 'yawned'],
            check: {
              type: 'when',
              prompt: 'When did the bell ring?',
              promptJP: 'ベルは、いつ<ruby>鳴<rt>な</rt></ruby>りましたか？',
              choices: ['While Tinkley practiced, waited, and yawned', 'Only after Nuppi arrived', 'While the cemetery was silent'],
              correct: 0
            }
          },
          {
            title: 'The missed moment', text: 'When Nuppi finally arrived, the bell had already announced him three times.', keywords: ['finally', 'announced'],
            check: {
              type: 'what-happened',
              prompt: 'What had already happened when Nuppi arrived?',
              promptJP: 'ヌッピが<ruby>来<rt>き</rt></ruby>たとき、すでに<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>きていましたか？',
              choices: ['The bell had announced him three times.', 'The bell had vanished.', 'Tinkley had gone to sleep.'],
              correct: 0,
              requiresPrevious: true
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why did Tinkley’s energy stay tangled?',
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
          {
            title: 'A perfect announcement', text: 'Tinkley planned one bright chime to mark Nuppi’s arrival in the cemetery.', keywords: ['planned', 'chime'],
            check: {
              type: 'why',
              prompt: 'Why did Tinkley plan one bright chime?',
              promptJP: 'なぜティンクリーは、ひとつの<ruby>明<rt>あか</rt></ruby>るい<ruby>音<rt>おと</rt></ruby>を<ruby>計画<rt>けいかく</rt></ruby>しましたか？',
              choices: ['To mark Nuppi’s arrival', 'To wake the cemetery trees', 'To hide the footsteps'],
              correct: 0
            }
          },
          {
            title: 'Practice without an ending', text: 'Tinkley rehearsed the chime before the footsteps, during the footsteps, and after the footsteps.', keywords: ['rehearsed', 'footsteps'],
            check: {
              type: 'when',
              prompt: 'When did Tinkley rehearse the chime?',
              promptJP: 'ティンクリーは、いつその<ruby>音<rt>おと</rt></ruby>を<ruby>練習<rt>れんしゅう</rt></ruby>しましたか？',
              choices: ['Before, during, and after the footsteps', 'Only before the footsteps', 'Only after Nuppi arrived'],
              correct: 0
            }
          },
          {
            title: 'A ceremony with no center', text: 'By the time Nuppi arrived, the bell had made every moment feel like the important one.', keywords: ['arrived', 'important'],
            check: {
              type: 'meaning',
              prompt: 'What does “every moment” show about the bell?',
              promptJP: '「すべての<ruby>瞬間<rt>しゅんかん</rt></ruby>」は、ベルについて<ruby>何<rt>なに</rt></ruby>を<ruby>示<rt>しめ</rt></ruby>していますか？',
              choices: ['It rang so often that no true moment stood out.', 'It rang exactly once at the right time.', 'It never rang near Nuppi.'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'What does the repeated ringing show?',
        promptJP: '<ruby>何度<rt>なんど</rt></ruby>も<ruby>鳴<rt>な</rt></ruby>るベルは、<ruby>何<rt>なに</rt></ruby>を<ruby>示<rt>しめ</rt></ruby>していますか？',
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
      eyebrow: 'CASE FILE / CASE 05',
      intro: 'Twiddle saw two paths. Twiddle could not choose one.',
      start: {
        clues: [
          {
            title: 'Two paths', text: 'Twiddle saw a crooked path and a mossy path.', keywords: ['crooked', 'mossy'],
            check: {
              type: 'which',
              prompt: 'Which paths did Twiddle see?',
              promptJP: 'トゥイドルが<ruby>見<rt>み</rt></ruby>たのは、どの<ruby>道<rt>みち</rt></ruby>ですか？',
              choices: ['A crooked path and a mossy path', 'A sunny road and a dark tunnel', 'A stone bridge and a river path'],
              correct: 0
            }
          },
          {
            title: 'One choice', text: 'Twiddle picked the crooked path.', keywords: ['picked'],
            check: {
              type: 'which',
              prompt: 'Which path did Twiddle pick first?',
              promptJP: 'トゥイドルが<ruby>最初<rt>さいしょ</rt></ruby>に<ruby>選<rt>えら</rt></ruby>んだのは、どの<ruby>道<rt>みち</rt></ruby>ですか？',
              choices: ['The mossy path', 'The crooked path', 'Neither path'],
              correct: 1
            }
          },
          {
            title: 'Turn back', text: 'Twiddle changed its mind and walked back.', keywords: ['changed', 'walked'],
            check: {
              type: 'what-happened',
              prompt: 'What did Twiddle do after changing its mind?',
              promptJP: 'トゥイドルは、<ruby>考<rt>かんが</rt></ruby>えを<ruby>変<rt>か</rt></ruby>えたあと、<ruby>何<rt>なに</rt></ruby>をしましたか？',
              choices: ['Walked back', 'Ran down the mossy path', 'Sat beside the stone'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why was Twiddle’s energy confused?',
        promptJP: 'トゥイドルのエネルギーは、なぜ<ruby>混乱<rt>こんらん</rt></ruby>しましたか？',
        choices: [
          'Twiddle changed its mind again and again.',
          'The paths disappeared.',
          'Nuppi moved the mossy path.'
        ],
        correct: 0,
        resolution: 'Twiddle’s energy is calm when Twiddle takes one path.'
      },
      fresh: {
        clues: [
          {
            title: 'Two paths', text: 'Twiddle stood between a crooked path and a mossy path, holding one pebble in each hand.', keywords: ['stood', 'holding'],
            check: {
              type: 'what',
              prompt: 'What was Twiddle holding?',
              promptJP: 'トゥイドルは、<ruby>何<rt>なに</rt></ruby>を<ruby>持<rt>も</rt></ruby>っていましたか？',
              choices: ['One pebble in each hand', 'Two lanterns in one hand', 'A bell and a leaf'],
              correct: 0
            }
          },
          {
            title: 'The first turn', text: 'Twiddle chose the crooked path, changed its mind, and walked back before reaching the first stone.', keywords: ['chose', 'reaching'],
            check: {
              type: 'what-happened',
              prompt: 'What happened before Twiddle reached the first stone?',
              promptJP: 'トゥイドルが<ruby>最初<rt>さいしょ</rt></ruby>の<ruby>石<rt>いし</rt></ruby>に<ruby>着<rt>つ</rt></ruby>く<ruby>前<rt>まえ</rt></ruby>に、<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>きましたか？',
              choices: ['Twiddle changed its mind and walked back.', 'Twiddle reached the stone and rested.', 'Nuppi closed the crooked path.'],
              correct: 0
            }
          },
          {
            title: 'The endless loop', text: 'When Nuppi arrived, Twiddle’s energy was circling the same two choices.', keywords: ['circling', 'choices'],
            check: {
              type: 'which',
              prompt: 'Which choices was Twiddle’s energy circling?',
              promptJP: 'トゥイドルのエネルギーは、どの<ruby>選択<rt>せんたく</rt></ruby>を<ruby>回<rt>まわ</rt></ruby>っていましたか？',
              choices: ['The same crooked and mossy paths', 'Three new paths', 'The cemetery gate and a lantern'],
              correct: 0,
              requiresPrevious: true
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'Why did Twiddle keep circling?',
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
          {
            title: 'A harmless choice', text: 'Twiddle first chose between a crooked path and a mossy path, certain that either one would be fine.', keywords: ['certain', 'either'],
            check: {
              type: 'which',
              prompt: 'Which paths did Twiddle think would be fine?',
              promptJP: 'トゥイドルは、どの<ruby>道<rt>みち</rt></ruby>でも<ruby>大丈夫<rt>だいじょうぶ</rt></ruby>だと<ruby>思<rt>おも</rt></ruby>いましたか？',
              choices: ['The crooked path or the mossy path', 'Only the longest path', 'The road outside Muenba'],
              correct: 0
            }
          },
          {
            title: 'A serious question', text: 'Then Twiddle wondered which path was more correct, and the easy choice became impossible.', keywords: ['wondered', 'impossible'],
            check: {
              type: 'what-happened',
              prompt: 'What happened when Twiddle wondered which path was more correct?',
              promptJP: 'どちらの<ruby>道<rt>みち</rt></ruby>がより<ruby>正<rt>ただ</rt></ruby>しいか<ruby>考<rt>かんが</rt></ruby>えたとき、<ruby>何<rt>なに</rt></ruby>が<ruby>起<rt>お</rt></ruby>きましたか？',
              choices: ['The easy choice became impossible.', 'The two paths joined together.', 'Twiddle chose the mossy path.'],
              correct: 0
            }
          },
          {
            title: 'A perfect circle', text: 'Twiddle’s energy repeated the same decision until every turn looked like both a beginning and an ending.', keywords: ['repeated', 'decision'],
            check: {
              type: 'meaning',
              prompt: 'What does “every turn” mean in this record?',
              promptJP: 'この<ruby>記録<rt>きろく</rt></ruby>の「すべての<ruby>曲<rt>ま</rt></ruby>がり」は、どんな<ruby>意味<rt>いみ</rt></ruby>ですか？',
              choices: ['Twiddle kept repeating the same decision.', 'Twiddle found many new paths.', 'Twiddle walked straight to Nuppi.'],
              correct: 0
            }
          }
        ],
        reviewClues: [1, 2],
        prompt: 'What made a simple choice become a loop?',
        promptJP: 'やさしい<ruby>選<rt>えら</rt></ruby>びがループになったのは、<ruby>何<rt>なに</rt></ruby>のためですか？',
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
    ghostAngryChangeImg: GHOST_ANGRY_CHANGE_IMG,
    jerk: JERK_GHOST
  };
})();
