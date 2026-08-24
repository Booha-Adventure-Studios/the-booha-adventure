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
    { id: 'fuzzle',  name: 'Fuzzle',  kana: 'ファズル',       img: 'assets/img/muenba/ghosts/fuzzle.png',  personality: 'Practices a different scare every time.', personalityJp: 'いつも<ruby>違<rt>ちが</rt></ruby>う<ruby>驚<rt>おどろ</rt></ruby>かし<ruby>方<rt>かた</rt></ruby>を<ruby>練習<rt>れんしゅう</rt></ruby>する。' },
    { id: 'glimmer', name: 'Glimmer', kana: 'グリマー',     img: 'assets/img/muenba/ghosts/glimmer.png', personality: 'Polishes every sparkle until it runs away.', personalityJp: 'きらめきがなくなるまで<ruby>磨<rt>みが</rt></ruby>き<ruby>続<rt>つづ</rt></ruby>ける。' },
    { id: 'nibsy',   name: 'Nibsy',   kana: 'ニブシー',     img: 'assets/img/muenba/ghosts/nibsy.png',   personality: 'Collects tiny noises and forgets where they came from.', personalityJp: '<ruby>小<rt>ちい</rt></ruby>さな<ruby>音<rt>おと</rt></ruby>を<ruby>集<rt>あつ</rt></ruby>めて、どこから<ruby>来<rt>き</rt></ruby>たか<ruby>忘<rt>わす</rt></ruby>れてしまう。' },
    { id: 'tinklet', name: 'Tinkley', kana: 'ティンクリー', img: 'assets/img/muenba/ghosts/tinklet.png', personality: 'Rings invisible bells at the worst possible moment.', personalityJp: '<ruby>一番<rt>いちばん</rt></ruby><ruby>悪<rt>わる</rt></ruby>いタイミングで<ruby>見<rt>み</rt></ruby>えないベルを<ruby>鳴<rt>な</rt></ruby>らす。' },
    { id: 'twiddle', name: 'Twiddle', kana: 'トゥイドル',  img: 'assets/img/muenba/ghosts/twiddle.png', personality: 'Turns in circles whenever a decision gets too serious.', personalityJp: '<ruby>決断<rt>けつだん</rt></ruby>が<ruby>重<rt>おも</rt></ruby>くなると、くるくる<ruby>回<rt>まわ</rt></ruby>ってしまう。' }
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
      start: {
        clues: [
          { title: 'The stone', text: 'Fuzzle hid behind a stone.', keywords: ['hid', 'stone'] },
          { title: 'Three scares', text: 'Fuzzle tried three silly scares.', keywords: ['tried', 'scares'] },
          { title: 'No choice', text: 'Fuzzle could not choose one.', keywords: ['choose'] }
        ],
        prompt: 'Why did Fuzzle’s energy get mixed up?',
        promptJP: 'ファズルのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>混<rt>ま</rt></ruby>ざりましたか？',
        choices: [
          'Fuzzle tried too many scares.',
          'The stone ate the energy.',
          'Nuppi came after lunch.'
        ],
        correct: 0,
        resolution: 'Fuzzle’s energy settles when Fuzzle chooses one scare.'
      },
      fresh: {
        clues: [
          { title: 'One plan', text: 'Fuzzle planned one scare for Nuppi behind a crooked gravestone.', keywords: ['planned', 'gravestone'] },
          { title: 'Too many scares', text: 'Then Fuzzle practiced a pop, a hiss, and a silly trumpet sound.', keywords: ['practiced', 'hiss'] },
          { title: 'No ending', text: 'When Nuppi arrived, Fuzzle started all three scares and finished none.', keywords: ['arrived', 'finished'] }
        ],
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
          { title: 'A careful plan', text: 'Fuzzle stood behind a crooked gravestone and prepared one fright for Nuppi.', keywords: ['prepared', 'fright'] },
          { title: 'Three beginnings', text: 'The plan grew into three different scares, but each one stopped before the ending.', keywords: ['grew', 'stopped'] },
          { title: 'A divided energy', text: 'When Nuppi arrived, Fuzzle’s energy pulled in three directions and no scare could finish.', keywords: ['pulled', 'directions'] }
        ],
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
      eyebrow: 'GHOST CASE / CASE 02',
      intro: 'Glimmer wanted one perfect sparkle. After polishing it all night, Glimmer could not stop chasing every reflection it made.',
      start: {
        clues: [
          { title: 'One small spark', text: 'Glimmer held one small spark.', keywords: ['held', 'spark'] },
          { title: 'Lights on things', text: 'The spark shone on leaves and stones.', keywords: ['shone', 'leaves'] },
          { title: 'Too many lights', text: 'Glimmer chased every light it saw.', keywords: ['chased'] }
        ],
        prompt: 'Why did Glimmer’s energy split?',
        promptJP: 'グリマーのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>散<rt>ち</rt></ruby>らばりましたか？',
        choices: [
          'Glimmer chased every light.',
          'Nuppi turned off the lights.',
          'A leaf hid the spark.'
        ],
        correct: 0,
        resolution: 'Glimmer’s energy settles when Glimmer follows one light.'
      },
      fresh: {
        clues: [
          { title: 'The first spark', text: 'Glimmer balanced one pale spark on a gravestone and wanted it to shine.', keywords: ['balanced', 'shine'] },
          { title: 'The shiny trail', text: 'Glimmer polished the spark against leaves, bells, and every shiny pebble nearby.', keywords: ['polished', 'pebble'] },
          { title: 'The long chase', text: 'Each reflection looked like a new spark, so Glimmer chased one after another.', keywords: ['reflection', 'chased'] }
        ],
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
          { title: 'A careful display', text: 'Glimmer prepared one pale spark and promised to make it the finest light in Muenba.', keywords: ['prepared', 'promised'] },
          { title: 'More shine, more trouble', text: 'Every polished surface made another reflection, and Glimmer treated each one like a new prize.', keywords: ['surface', 'prize'] },
          { title: 'An everywhere ghost', text: 'By the time Nuppi arrived, Glimmer’s energy had spread across the cemetery, following a shine that could never end.', keywords: ['spread', 'following'] }
        ],
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
      eyebrow: 'GHOST CASE / CASE 03',
      intro: 'Nibsy collected tiny noises from every corner of Muenba. Now the sounds have mixed together, and Nibsy cannot remember which one belongs to which place.',
      start: {
        clues: [
          { title: 'Three sounds', text: 'Nibsy had a pebble sound, a leaf sound, and a faraway sound.', keywords: ['pebble', 'faraway'] },
          { title: 'Labels gone', text: 'Each sound lost its label.', keywords: ['lost', 'label'] },
          { title: 'Wrong places', text: 'Nibsy put the sounds in the wrong places.', keywords: ['wrong', 'places'] }
        ],
        prompt: 'Why did Nibsy’s energy get mixed up?',
        promptJP: 'ニブシーのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>混<rt>ま</rt></ruby>ざりましたか？',
        choices: [
          'Nibsy mixed up the small sounds.',
          'The pebble made no sound.',
          'Nuppi hid the pocket.'
        ],
        correct: 0,
        resolution: 'Nibsy’s energy settles when each sound has its place.'
      },
      fresh: {
        clues: [
          { title: 'Three pocket sounds', text: 'Nibsy carried a pebble plink, a leaf scritch, and a distant puff in one pocket.', keywords: ['carried', 'pocket'] },
          { title: 'A missing label', text: 'The labels fell off, so Nibsy guessed where each sound had come from.', keywords: ['labels', 'guessed'] },
          { title: 'One loud answer', text: 'When Nuppi asked for one sound, all three noises answered together.', keywords: ['asked', 'together'] }
        ],
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
          { title: 'Three treasures', text: 'Nibsy recorded a pebble’s plink, a leaf’s scritch, and a faraway puff as three separate treasures.', keywords: ['recorded', 'treasures'] },
          { title: 'A quick guess', text: 'When the labels disappeared, Nibsy assigned each sound by memory and quietly swapped all three.', keywords: ['assigned', 'swapped'] },
          { title: 'The problem', text: 'The pocket could not agree with itself: every sound insisted it belonged somewhere else.', keywords: ['insisted', 'belonged'] }
        ],
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
      eyebrow: 'GHOST CASE / CASE 04',
      intro: 'Tinkley prepared an invisible bell for a grand entrance. The bell kept ringing before the entrance happened, and the moment never felt right.',
      start: {
        clues: [
          { title: 'A hidden bell', text: 'Tinkley had a bell that nobody could see.', keywords: ['nobody', 'bell'] },
          { title: 'Too soon', text: 'The bell rang before Nuppi came.', keywords: ['rang', 'before'] },
          { title: 'Three rings', text: 'The bell rang three times too soon.', keywords: ['times', 'soon'] }
        ],
        prompt: 'Why did Tinkley’s energy get mixed up?',
        promptJP: 'ティンクリーのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>混<rt>ま</rt></ruby>ざりましたか？',
        choices: [
          'Tinkley rang the bell too early.',
          'Nuppi hid the bell.',
          'The bell was too quiet.'
        ],
        correct: 0,
        resolution: 'Tinkley’s energy settles when the bell waits.'
      },
      fresh: {
        clues: [
          { title: 'The hidden bell', text: 'Tinkley held both hands around a bell that nobody else could see.', keywords: ['held', 'hands'] },
          { title: 'Practice rings', text: 'The bell rang while Tinkley practiced, waited, and even yawned.', keywords: ['practiced', 'yawned'] },
          { title: 'The missed moment', text: 'When Nuppi finally arrived, the bell had already announced him three times.', keywords: ['finally', 'announced'] }
        ],
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
          { title: 'A perfect announcement', text: 'Tinkley planned one bright chime to mark Nuppi’s arrival in the cemetery.', keywords: ['planned', 'chime'] },
          { title: 'Practice without an ending', text: 'Tinkley rehearsed the chime before the footsteps, during the footsteps, and after the footsteps.', keywords: ['rehearsed', 'footsteps'] },
          { title: 'A ceremony with no center', text: 'By the time Nuppi arrived, the bell had made every moment feel like the important one.', keywords: ['arrived', 'important'] }
        ],
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
      eyebrow: 'GHOST CASE / CASE 05',
      intro: 'Twiddle found two possible paths through the cemetery. Every time a choice felt serious, Twiddle turned around and started the decision again.',
      start: {
        clues: [
          { title: 'Two paths', text: 'Twiddle saw a crooked path and a mossy path.', keywords: ['crooked', 'mossy'] },
          { title: 'One choice', text: 'Twiddle picked the crooked path.', keywords: ['picked'] },
          { title: 'Turn back', text: 'Twiddle changed its mind and walked back.', keywords: ['changed', 'walked'] }
        ],
        prompt: 'Why did Twiddle’s energy get mixed up?',
        promptJP: 'トゥイドルのエネルギーは<ruby>何<rt>なに</rt></ruby>で<ruby>混<rt>ま</rt></ruby>ざりましたか？',
        choices: [
          'Twiddle changed its mind again and again.',
          'The paths disappeared.',
          'Nuppi moved the mossy path.'
        ],
        correct: 0,
        resolution: 'Twiddle’s energy settles when Twiddle takes one path.'
      },
      fresh: {
        clues: [
          { title: 'Two paths', text: 'Twiddle stood between a crooked path and a mossy path, holding one pebble in each hand.', keywords: ['stood', 'holding'] },
          { title: 'The first turn', text: 'Twiddle chose the crooked path, changed its mind, and walked back before reaching the first stone.', keywords: ['chose', 'reaching'] },
          { title: 'The endless loop', text: 'When Nuppi arrived, Twiddle’s energy was circling the same two choices.', keywords: ['circling', 'choices'] }
        ],
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
          { title: 'A harmless choice', text: 'Twiddle first chose between a crooked path and a mossy path, certain that either one would be fine.', keywords: ['certain', 'either'] },
          { title: 'A serious question', text: 'Then Twiddle wondered which path was more correct, and the easy choice became impossible.', keywords: ['wondered', 'impossible'] },
          { title: 'A perfect circle', text: 'Twiddle’s energy repeated the same decision until every turn looked like both a beginning and an ending.', keywords: ['repeated', 'decision'] }
        ],
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
    ghostAngryChangeImg: GHOST_ANGRY_CHANGE_IMG
  };
})();
