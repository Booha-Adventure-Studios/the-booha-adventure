
window.KARASUKI_DATA = {
  startRoom: "room_03",

  rooms: {
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

      collisions: [],

      hotspots: []
    }
  },

  overlays: {}
};
