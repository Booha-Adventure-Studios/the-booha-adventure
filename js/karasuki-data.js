
window.KARASUKI_DATA = {
  startRoom: "room_03",

  rooms: {
    room_01: {
      bg: "assets/img/karasuki/room_01.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 }
      },
      exits: {
        right: { to: "room_02", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_06", spawn: "fromDown", dir: "up" }
      },
      collisions: [
        { x: 430, y: 70,  w: 100, h: 250 },
        { x: 430, y: 220, w: 220, h: 100 }
      ],
      hotspots: []
    },

    room_02: {
      bg: "assets/img/karasuki/room_02.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 }
      },
      exits: {
        left:  { to: "room_01", spawn: "fromRight", dir: "left" },
        right: { to: "room_03", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_07", spawn: "fromDown", dir: "up" }
      },
      collisions: [
        { x: 430, y: 70,  w: 100, h: 250 },
        { x: 0,   y: 220, w: 960, h: 100 }
      ],
      hotspots: []
    },

    room_03: {
      bg: "assets/img/karasuki/room_03.webp",
      spawns: {
        default:   { x: 480, y: 470 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        left:  { to: "room_02", spawn: "fromRight", dir: "left" },
        right: { to: "room_04", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_08", spawn: "fromDown", dir: "up" }
      },
      collisions: [
        { x: 430, y: 0,   w: 100, h: 540 },
        { x: 0,   y: 220, w: 960, h: 100 }
      ],
      hotspots: []
    },

    room_04: {
      bg: "assets/img/karasuki/room_04.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 }
      },
      exits: {
        left:  { to: "room_03", spawn: "fromRight", dir: "left" },
        right: { to: "room_05", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_09", spawn: "fromDown", dir: "up" }
      },
      collisions: [
        { x: 430, y: 70,  w: 100, h: 250 },
        { x: 0,   y: 220, w: 960, h: 100 }
      ],
      hotspots: []
    },

    room_05: {
      bg: "assets/img/karasuki/room_05.webp",
      spawns: {
        default:  { x: 480, y: 270 },
        fromLeft: { x: 120, y: 270 },
        fromUp:   { x: 480, y: 90 }
      },
      exits: {
        left: { to: "room_04", spawn: "fromRight", dir: "left" },
        up:   { to: "room_10", spawn: "fromDown", dir: "up" }
      },
      collisions: [
        { x: 430, y: 70,  w: 100, h: 250 },
        { x: 310, y: 220, w: 220, h: 100 }
      ],
      hotspots: []
    },

    room_06: {
      bg: "assets/img/karasuki/room_06.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        right: { to: "room_07", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_11", spawn: "fromDown", dir: "up" },
        down:  { to: "room_01", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 0,   w: 100, h: 540 },
        { x: 430, y: 220, w: 220, h: 100 }
      ],
      hotspots: []
    },

    room_07: {
      bg: "assets/img/karasuki/room_07.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        left:  { to: "room_06", spawn: "fromRight", dir: "left" },
        right: { to: "room_08", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_12", spawn: "fromDown", dir: "up" },
        down:  { to: "room_02", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 0,   w: 100, h: 540 },
        { x: 0,   y: 220, w: 960, h: 100 }
      ],
      hotspots: []
    },

    room_08: {
      bg: "assets/img/karasuki/room_08.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        left:  { to: "room_07", spawn: "fromRight", dir: "left" },
        right: { to: "room_09", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_13", spawn: "fromDown", dir: "up" },
        down:  { to: "room_03", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 0,   w: 100, h: 540 },
        { x: 0,   y: 220, w: 960, h: 100 }
      ],
      hotspots: []
    },

    room_09: {
      bg: "assets/img/karasuki/room_09.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromUp:    { x: 480, y: 90 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        left:  { to: "room_08", spawn: "fromRight", dir: "left" },
        right: { to: "room_10", spawn: "fromLeft", dir: "right" },
        up:    { to: "room_14", spawn: "fromDown", dir: "up" },
        down:  { to: "room_04", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 0,   w: 100, h: 540 },
        { x: 0,   y: 220, w: 960, h: 100 }
      ],
      hotspots: []
    },

    room_10: {
      bg: "assets/img/karasuki/room_10.webp",
      spawns: {
        default:  { x: 480, y: 270 },
        fromLeft: { x: 120, y: 270 },
        fromUp:   { x: 480, y: 90 },
        fromDown: { x: 480, y: 470 }
      },
      exits: {
        left: { to: "room_09", spawn: "fromRight", dir: "left" },
        up:   { to: "room_15", spawn: "fromDown", dir: "up" },
        down: { to: "room_05", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 0,   w: 100, h: 540 },
        { x: 310, y: 220, w: 220, h: 100 }
      ],
      hotspots: []
    },

    room_11: {
      bg: "assets/img/karasuki/room_11.webp",
      spawns: {
        default:  { x: 480, y: 270 },
        fromRight:{ x: 840, y: 270 },
        fromDown: { x: 480, y: 470 }
      },
      exits: {
        right: { to: "room_12", spawn: "fromLeft", dir: "right" },
        down:  { to: "room_06", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 220, w: 220, h: 100 },
        { x: 430, y: 220, w: 100, h: 250 }
      ],
      hotspots: []
    },

    room_12: {
      bg: "assets/img/karasuki/room_12.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        left:  { to: "room_11", spawn: "fromRight", dir: "left" },
        right: { to: "room_13", spawn: "fromLeft", dir: "right" },
        down:  { to: "room_07", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 220, w: 220, h: 100 },
        { x: 430, y: 220, w: 100, h: 250 }
      ],
      hotspots: []
    },

    room_13: {
      bg: "assets/img/karasuki/room_13.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        left:  { to: "room_12", spawn: "fromRight", dir: "left" },
        right: { to: "room_14", spawn: "fromLeft", dir: "right" },
        down:  { to: "room_08", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 220, w: 220, h: 100 },
        { x: 430, y: 220, w: 100, h: 250 }
      ],
      hotspots: []
    },

    room_14: {
      bg: "assets/img/karasuki/room_14.webp",
      spawns: {
        default:   { x: 480, y: 270 },
        fromLeft:  { x: 120, y: 270 },
        fromRight: { x: 840, y: 270 },
        fromDown:  { x: 480, y: 470 }
      },
      exits: {
        left:  { to: "room_13", spawn: "fromRight", dir: "left" },
        right: { to: "room_15", spawn: "fromLeft", dir: "right" },
        down:  { to: "room_09", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 430, y: 220, w: 220, h: 100 },
        { x: 430, y: 220, w: 100, h: 250 }
      ],
      hotspots: []
    },

    room_15: {
      bg: "assets/img/karasuki/room_15.webp",
      spawns: {
        default:  { x: 480, y: 270 },
        fromLeft: { x: 120, y: 270 },
        fromDown: { x: 480, y: 470 }
      },
      exits: {
        left: { to: "room_14", spawn: "fromRight", dir: "left" },
        down: { to: "room_10", spawn: "fromUp", dir: "down" }
      },
      collisions: [
        { x: 310, y: 220, w: 220, h: 100 },
        { x: 430, y: 220, w: 100, h: 250 }
      ],
      hotspots: []
    }
  },

  overlays: {}
};
