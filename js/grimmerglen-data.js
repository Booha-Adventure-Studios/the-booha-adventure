/*
 * Grimmerglen world data.
 *
 * Grimmerglen is where daydreams and daymares pile up — nobody knows why,
 * they just end up here. Marietta (a chipmunk of a species also called "the
 * Marietta") narrates the place: equal parts adorable and a little spooky,
 * matching how fast and strangely daydreams/daymares arrive and how quickly
 * they slip away again once you try to hold onto them.
 *
 * The room graph follows the same shared-world-space convention Karasuki /
 * Utsuroba / Muenba all use (1536x1024), scaled down to a 3x3 grid of 9
 * rooms instead of their larger grids — same adjacency shape (corner rooms
 * get 2 exits, edge rooms get 3, the center room gets 4), just fewer rooms.
 *
 * Foundation pass 1: exit coordinates and walkable rectangles are the same
 * generous "cross corridor" placeholders Muenba shipped with initially —
 * nobody has walked these 9 rooms with the DEV tool yet, so these are a
 * starting point, not a calibrated pass. Re-measure per room once someone
 * has actually clicked through them (see grimmerglen.js's DEV overlay,
 * ?dev=1, for live x/y readout).
 */
(() => {
  'use strict';

  const WORLD_W = 1536;
  const WORLD_H = 1024;

  // Placeholder cross-corridor exit points — identical across rooms for now,
  // matching Muenba's Pass-1-era approach of one measured set of coordinates
  // reused everywhere until each room gets individually walked and tuned.
  const EXIT_XY = {
    up:    { x: 767, y: 284 },
    down:  { x: 764, y: 748 },
    left:  { x: 438, y: 496 },
    right: { x: 1152, y: 483 }
  };

  function exit(dir, to, spawn) {
    return { dir, x: EXIT_XY[dir].x, y: EXIT_XY[dir].y, to, spawn };
  }

  // 3x3 grid. room_01 is bottom-left and hosts Marietta / the entry from
  // Karasuki. Layout (rows bottom-to-top):
  //   07  08  09
  //   04  05  06
  //   01  02  03
  const NPP = {
    room_01: [
      exit('right', 'room_02', 'fromLeft'),
      exit('up',    'room_04', 'fromDown')
    ],
    room_02: [
      exit('left',  'room_01', 'fromRight'),
      exit('right', 'room_03', 'fromLeft'),
      exit('up',    'room_05', 'fromDown')
    ],
    room_03: [
      exit('left',  'room_02', 'fromRight'),
      exit('up',    'room_06', 'fromDown')
    ],
    room_04: [
      exit('down',  'room_01', 'fromUp'),
      exit('right', 'room_05', 'fromLeft'),
      exit('up',    'room_07', 'fromDown')
    ],
    room_05: [
      exit('down',  'room_02', 'fromUp'),
      exit('left',  'room_04', 'fromRight'),
      exit('right', 'room_06', 'fromLeft'),
      exit('up',    'room_08', 'fromDown')
    ],
    room_06: [
      exit('down', 'room_03', 'fromUp'),
      exit('left', 'room_05', 'fromRight'),
      exit('up',   'room_09', 'fromDown')
    ],
    room_07: [
      exit('down',  'room_04', 'fromUp'),
      exit('right', 'room_08', 'fromLeft')
    ],
    room_08: [
      exit('down',  'room_05', 'fromUp'),
      exit('left',  'room_07', 'fromRight'),
      exit('right', 'room_09', 'fromLeft')
    ],
    room_09: [
      exit('down', 'room_06', 'fromUp'),
      exit('left', 'room_08', 'fromRight')
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

  // Same "generous cross, not pixel-perfect" walkable shape every other
  // world started with — widened around the placeholder exit points above
  // so nothing reads as an invisible wall before real per-room tuning.
  function makeWalkable() {
    return [
      { x: 340, y: 110, w: 860,  h: 900 },
      { x: 60,  y: 360, w: 1416, h: 380 }
    ];
  }

  // One fun pastel accent per room — used to tint that room's ambient glow
  // and its exit arrows, so the 9 rooms read as 9 distinct cheerful places
  // rather than one room repeated. Bright and saturated on purpose (the
  // opposite instinct from Muenba's desaturated "eerie" palette) — this is
  // the daydream side of Grimmerglen's daydream/daymare identity.
  const ROOM_COLOR = {
    room_01: { name: 'Bubblegum Pink',   glow: '#ff9fc2' },
    room_02: { name: 'Buttercup Yellow', glow: '#ffe066' },
    room_03: { name: 'Sky Mint',         glow: '#7fe8e0' },
    room_04: { name: 'Lavender Dream',   glow: '#b8a4ff' },
    room_05: { name: 'Peach Fizz',       glow: '#ffb98a' },
    room_06: { name: 'Seafoam',          glow: '#8fe6c4' },
    room_07: { name: 'Cotton Candy Blue',glow: '#8fd0ff' },
    room_08: { name: 'Lilac Pop',        glow: '#e2a6f0' },
    room_09: { name: 'Apricot Glow',     glow: '#ffcf9e' }
  };

  const rooms = {};
  for (let i = 1; i <= 9; i++) {
    const roomId = `room_${String(i).padStart(2, '0')}`;
    rooms[roomId] = {
      bg: `assets/img/grimmerglen/${roomId}.webp`,
      spawns: { ...SPAWNS },
      exits: NPP[roomId] || [],
      walkable: makeWalkable(),
      color: ROOM_COLOR[roomId]
    };
  }

  window.GRIMMERGLEN_DATA = {
    world: { width: WORLD_W, height: WORLD_H },
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    startRoom: 'room_01',
    roomClass: 'grimmerglen-room grimmerglen-pastel-pop',
    spriteClass: 'grimmerglen-sprite',
    rooms,
    marietta: {
      // room_01 is Marietta's room — the entry point from Karasuki and
      // where her "Talk to Marietta / Leave Grimmerglen" popup lives
      // (foundation pass 3), the same way Muenba's Nuppi anchors room_01
      // there.
      roomId: 'room_01',
      x: 940,
      y: 400,
      hitR: 76,
      drawR: 60,
      poses: Array.from({ length: 5 }, (_, index) => {
        const pose = String(index + 1).padStart(2, '0');
        return `assets/img/grimmerglen/marietta/marietta_${pose}.webp`;
      })
    }
  };
})();
