/*
 * Muenba world data.
 *
 * The room graph intentionally follows the same 15-room arrangement used by
 * Karasuki and Utsuroba. Coordinates are in the shared 1536x1024 world space.
 * Room-specific walkable areas and atmosphere stay here so the engine does
 * not need special cases for individual cemetery images.
 */
(() => {
  'use strict';

  const WORLD_W = 1536;
  const WORLD_H = 1024;

  const NPP = {
    room_01: [
      { dir: 'right', x: 1134, y: 473, to: 'room_02', spawn: 'fromLeft' },
      { dir: 'up',    x: 631,  y: 308, to: 'room_06', spawn: 'fromDown' }
    ],
    room_02: [
      { dir: 'left',  x: 409,  y: 597, to: 'room_01', spawn: 'fromRight' },
      { dir: 'right', x: 1131, y: 470, to: 'room_03', spawn: 'fromLeft' },
      { dir: 'up',    x: 559,  y: 318, to: 'room_07', spawn: 'fromDown' }
    ],
    room_03: [
      { dir: 'left',  x: 411,  y: 426, to: 'room_02', spawn: 'fromRight' },
      { dir: 'right', x: 1086, y: 426, to: 'room_04', spawn: 'fromLeft' },
      { dir: 'up',    x: 760,  y: 346, to: 'room_08', spawn: 'fromDown' }
    ],
    room_04: [
      { dir: 'left',  x: 382,  y: 611, to: 'room_03', spawn: 'fromRight' },
      { dir: 'right', x: 1101, y: 504, to: 'room_05', spawn: 'fromLeft' },
      { dir: 'up',    x: 711,  y: 329, to: 'room_09', spawn: 'fromDown' }
    ],
    room_05: [
      { dir: 'left', x: 413, y: 605, to: 'room_04', spawn: 'fromRight' },
      { dir: 'up',   x: 710, y: 309, to: 'room_10', spawn: 'fromDown' }
    ],
    room_06: [
      { dir: 'right', x: 1069, y: 488, to: 'room_07', spawn: 'fromLeft' },
      { dir: 'up',    x: 695,  y: 307, to: 'room_11', spawn: 'fromDown' },
      { dir: 'down',  x: 999,  y: 756, to: 'room_01', spawn: 'fromUp' }
    ],
    room_07: [
      { dir: 'left',  x: 361,  y: 610, to: 'room_06', spawn: 'fromRight' },
      { dir: 'right', x: 1111, y: 497, to: 'room_08', spawn: 'fromLeft' },
      { dir: 'up',    x: 705,  y: 326, to: 'room_12', spawn: 'fromDown' },
      { dir: 'down',  x: 995,  y: 759, to: 'room_02', spawn: 'fromUp' }
    ],
    room_08: [
      { dir: 'left',  x: 352,  y: 603, to: 'room_07', spawn: 'fromRight' },
      { dir: 'right', x: 1131, y: 498, to: 'room_09', spawn: 'fromLeft' },
      { dir: 'up',    x: 713,  y: 338, to: 'room_13', spawn: 'fromDown' },
      { dir: 'down',  x: 1011, y: 770, to: 'room_03', spawn: 'fromUp' }
    ],
    room_09: [
      { dir: 'left',  x: 394,  y: 590, to: 'room_08', spawn: 'fromRight' },
      { dir: 'right', x: 1123, y: 502, to: 'room_10', spawn: 'fromLeft' },
      { dir: 'up',    x: 707,  y: 318, to: 'room_14', spawn: 'fromDown' },
      { dir: 'down',  x: 1000, y: 747, to: 'room_04', spawn: 'fromUp' }
    ],
    room_10: [
      { dir: 'left', x: 401, y: 603, to: 'room_09', spawn: 'fromRight' },
      { dir: 'up',   x: 705, y: 316, to: 'room_15', spawn: 'fromDown' },
      { dir: 'down', x: 994, y: 753, to: 'room_05', spawn: 'fromUp' }
    ],
    room_11: [
      { dir: 'right', x: 1208, y: 322, to: 'room_12', spawn: 'fromLeft' },
      { dir: 'down',  x: 1006, y: 784, to: 'room_06', spawn: 'fromUp' }
    ],
    room_12: [
      { dir: 'left',  x: 371,  y: 639, to: 'room_11', spawn: 'fromRight' },
      { dir: 'right', x: 1210, y: 434, to: 'room_13', spawn: 'fromLeft' },
      { dir: 'down',  x: 1037, y: 800, to: 'room_07', spawn: 'fromUp' }
    ],
    room_13: [
      { dir: 'left',  x: 368,  y: 626, to: 'room_12', spawn: 'fromRight' },
      { dir: 'right', x: 1233, y: 322, to: 'room_14', spawn: 'fromLeft' },
      { dir: 'down',  x: 1078, y: 796, to: 'room_08', spawn: 'fromUp' }
    ],
    room_14: [
      { dir: 'left',  x: 303,  y: 631, to: 'room_13', spawn: 'fromRight' },
      { dir: 'right', x: 1210, y: 405, to: 'room_15', spawn: 'fromLeft' },
      { dir: 'down',  x: 930,  y: 812, to: 'room_09', spawn: 'fromUp' }
    ],
    room_15: [
      { dir: 'left', x: 402,  y: 614, to: 'room_14', spawn: 'fromRight' },
      { dir: 'down', x: 1003, y: 790, to: 'room_10', spawn: 'fromUp' }
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

  // Broad cross-shaped walkable areas are an intentionally forgiving first
  // pass. They keep Booha on the photographed paths without pixel-perfect
  // tracing. Individual rooms can tighten these rectangles later.
  function makeWalkable() {
    return [
      { x: 450, y: 150, w: 636, h: 874 },
      { x: 0,   y: 410, w: WORLD_W, h: 260 }
    ];
  }

  const ATMOSPHERE = {
    room_01: { darkness: 0.42, tint: 'rgba(12, 24, 42, 0.10)', fog: 0.08 },
    room_02: { darkness: 0.46, tint: 'rgba(15, 28, 48, 0.11)', fog: 0.10 },
    room_03: { darkness: 0.39, tint: 'rgba(18, 32, 38, 0.09)', fog: 0.07 },
    room_04: { darkness: 0.44, tint: 'rgba(25, 29, 45, 0.10)', fog: 0.08 },
    room_05: { darkness: 0.48, tint: 'rgba(9, 20, 34, 0.12)',  fog: 0.12 },
    room_06: { darkness: 0.40, tint: 'rgba(20, 35, 34, 0.09)', fog: 0.06 },
    room_07: { darkness: 0.43, tint: 'rgba(16, 29, 44, 0.10)', fog: 0.09 },
    room_08: { darkness: 0.36, tint: 'rgba(24, 35, 37, 0.07)', fog: 0.05 },
    room_09: { darkness: 0.47, tint: 'rgba(25, 19, 36, 0.10)', fog: 0.11 },
    room_10: { darkness: 0.41, tint: 'rgba(10, 27, 39, 0.10)', fog: 0.08 },
    room_11: { darkness: 0.51, tint: 'rgba(12, 18, 31, 0.12)', fog: 0.13 },
    room_12: { darkness: 0.45, tint: 'rgba(26, 28, 42, 0.09)', fog: 0.09 },
    room_13: { darkness: 0.38, tint: 'rgba(20, 36, 34, 0.08)', fog: 0.06 },
    room_14: { darkness: 0.49, tint: 'rgba(18, 18, 30, 0.12)', fog: 0.12 },
    room_15: { darkness: 0.43, tint: 'rgba(22, 30, 42, 0.10)', fog: 0.08 }
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

  window.MUENBA_DATA = {
    world: 'muenba',
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    startRoom: 'room_01',
    rooms
  };
})();
