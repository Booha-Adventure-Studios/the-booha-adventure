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
    room_01: { darkness: 0.46, tint: 'rgba(12, 24, 42, 0.10)', fog: 0.12, fogMood: 'low',     glow: '#4a9a72' }, // sickly green
    room_02: { darkness: 0.50, tint: 'rgba(15, 28, 48, 0.11)', fog: 0.15, fogMood: 'high',    glow: '#6f5aa8' }, // violet
    room_03: { darkness: 0.43, tint: 'rgba(18, 32, 38, 0.09)', fog: 0.10, fogMood: 'sparse',  glow: '#4a8a9e' }, // teal-blue
    room_04: { darkness: 0.48, tint: 'rgba(25, 29, 45, 0.10)', fog: 0.13, fogMood: 'cross',   glow: '#9e5a72' }, // dusky rose
    room_05: { darkness: 0.52, tint: 'rgba(9, 20, 34, 0.12)',  fog: 0.17, fogMood: 'sinking', glow: '#5a6fa8' }, // indigo
    room_06: { darkness: 0.44, tint: 'rgba(20, 35, 34, 0.09)', fog: 0.09, fogMood: 'low',     glow: '#7a9e4a' }, // moss
    room_07: { darkness: 0.47, tint: 'rgba(16, 29, 44, 0.10)', fog: 0.14, fogMood: 'cross',   glow: '#a87a4a' }, // rust amber
    room_08: { darkness: 0.40, tint: 'rgba(24, 35, 37, 0.07)', fog: 0.08, fogMood: 'sparse',  glow: '#4aa89e' }, // cyan-teal
    room_09: { darkness: 0.51, tint: 'rgba(25, 19, 36, 0.10)', fog: 0.16, fogMood: 'high',    glow: '#8a4aa8' }, // plum
    room_10: { darkness: 0.45, tint: 'rgba(10, 27, 39, 0.10)', fog: 0.12, fogMood: 'sinking', glow: '#a84a6f' }, // wine
    room_11: { darkness: 0.55, tint: 'rgba(12, 18, 31, 0.12)', fog: 0.18, fogMood: 'high',    glow: '#4a5a9e' }, // steel-indigo
    room_12: { darkness: 0.49, tint: 'rgba(26, 28, 42, 0.09)', fog: 0.14, fogMood: 'low',     glow: '#7aa85a' }, // olive-moss
    room_13: { darkness: 0.42, tint: 'rgba(20, 36, 34, 0.08)', fog: 0.09, fogMood: 'sparse',  glow: '#a8944a' }, // ochre
    room_14: { darkness: 0.53, tint: 'rgba(18, 18, 30, 0.12)', fog: 0.17, fogMood: 'sinking', glow: '#4a7aa8' }, // slate-blue
    room_15: { darkness: 0.47, tint: 'rgba(22, 30, 42, 0.10)', fog: 0.13, fogMood: 'cross',   glow: '#9e4a8a' }  // magenta-ash
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

  // The first 5 huntable ghosts (Pass 4), pulled out here so both muenba.js
  // (the briefing gate's target pick) and muenba-profile.html (the case-file
  // roster, Pass 5) read the exact same list instead of two copies drifting
  // apart. File names ARE their ids, per how they were delivered, except
  // tinklet/"Tinkley": the file on disk is tinklet.png, so that's what's
  // wired here with "Tinkley" kept only as the display name — flag if either
  // should change to match the other.
  const GHOSTS = [
    { id: 'fuzzle',  name: 'Fuzzle',  img: 'assets/img/muenba/ghosts/fuzzle.png'  },
    { id: 'glimmer', name: 'Glimmer', img: 'assets/img/muenba/ghosts/glimmer.png' },
    { id: 'nibsy',   name: 'Nibsy',   img: 'assets/img/muenba/ghosts/nibsy.png'   },
    { id: 'tinklet', name: 'Tinkley', img: 'assets/img/muenba/ghosts/tinklet.png' },
    { id: 'twiddle', name: 'Twiddle', img: 'assets/img/muenba/ghosts/twiddle.png' }
  ];
  // Shared sprite every ghost swaps to when clicked or when it turns to
  // chase (Pass 7) — not a huntable ghost of its own, so it's kept separate
  // from the GHOSTS roster above.
  const GHOST_ANGRY_CHANGE_IMG = 'assets/img/muenba/ghosts/angry_change.png';

  window.MUENBA_DATA = {
    world: 'muenba',
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    startRoom: 'room_01',
    rooms,
    ghosts: GHOSTS,
    ghostAngryChangeImg: GHOST_ANGRY_CHANGE_IMG
  };
})();
