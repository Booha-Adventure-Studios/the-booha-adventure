
/* ═══════════════════════════════════════════════════════════
   BUKISARA_DATA  —  15-room world data
   Mirrors karasuki-data.js structure exactly.
   bg paths  : /the-booha-adventure/assets/img/bukisara/room_NN.webp
   spawns    : default + directional (fromLeft / fromRight / fromUp / fromDown)
   collisions: walkable rects — fill in per room once backgrounds are final.
               Each room gets a full-canvas passable rect as a safe placeholder.
═══════════════════════════════════════════════════════════ */
window.BUKISARA_DATA = {

  startRoom: "room_01",

  rooms: {

    /* ── Room 01 ─────────────────────────────────────────── */
    room_01: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_01.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromRight: { x: 200, y: 512 },
        fromDown:  { x: 742, y: 200 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }   // placeholder — full canvas walkable
      ]
    },

    /* ── Room 02 ─────────────────────────────────────────── */
    room_02: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_02.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromDown:  { x: 742,  y: 200 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 03 ─────────────────────────────────────────── */
    room_03: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_03.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromDown:  { x: 742,  y: 200 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 04 ─────────────────────────────────────────── */
    room_04: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_04.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromDown:  { x: 742,  y: 200 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 05 ─────────────────────────────────────────── */
    room_05: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_05.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromDown:  { x: 742,  y: 200 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 06 ─────────────────────────────────────────── */
    room_06: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_06.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromDown:  { x: 742,  y: 200 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 07 ─────────────────────────────────────────── */
    room_07: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_07.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromDown:  { x: 742,  y: 200 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 08 ─────────────────────────────────────────── */
    room_08: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_08.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromDown:  { x: 742,  y: 200 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 09 ─────────────────────────────────────────── */
    room_09: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_09.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromDown:  { x: 742,  y: 200 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 10 ─────────────────────────────────────────── */
    room_10: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_10.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromDown:  { x: 742,  y: 200 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 11 ─────────────────────────────────────────── */
    room_11: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_11.webp",
      spawns: {
        default:  { x: 742, y: 512 },
        fromRight:{ x: 200,  y: 512 },
        fromUp:   { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 12 ─────────────────────────────────────────── */
    room_12: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_12.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 13 ─────────────────────────────────────────── */
    room_13: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_13.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 14 ─────────────────────────────────────────── */
    room_14: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_14.webp",
      spawns: {
        default:   { x: 742, y: 512 },
        fromLeft:  { x: 1300, y: 512 },
        fromRight: { x: 200,  y: 512 },
        fromUp:    { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

    /* ── Room 15 ─────────────────────────────────────────── */
    room_15: {
      bg: "/the-booha-adventure/assets/img/bukisara/room_15.webp",
      spawns: {
        default:  { x: 742, y: 512 },
        fromLeft: { x: 1300, y: 512 },
        fromUp:   { x: 742,  y: 800 },
      },
      collisions: [
        { x: 0, y: 0, w: 1536, h: 1024 }
      ]
    },

  } // end rooms
}; // end BUKISARA_DATA
