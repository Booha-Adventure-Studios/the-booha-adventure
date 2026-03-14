
window.KARASUKI_DATA = {
  startRoom: "entrance",

  rooms: {
    entrance: {
      bg: "assets/karasuki/rooms/entrance.png",

      spawns: {
        default: { x: 180, y: 390 },
        fromRight: { x: 780, y: 390 },
        fromUp: { x: 470, y: 430 }
      },

      exits: {
        right: { to: "archives_hall", spawn: "fromLeft", dir: "right" },
        up: { to: "forest_crossing", spawn: "fromDown", dir: "up" }
      },

      collisions: [
        { x: 0, y: 0, w: 960, h: 40 },
        { x: 0, y: 500, w: 960, h: 40 },
        { x: 0, y: 0, w: 50, h: 540 },
        { x: 910, y: 0, w: 50, h: 540 },
        { x: 300, y: 120, w: 180, h: 110 }
      ],

      hotspots: [
        {
          id: "archivesSign",
          x: 690,
          y: 180,
          w: 150,
          h: 180,
          prompt: "ENTER ARCHIVES",
          action: "overlay",
          target: "archives"
        }
      ]
    },

    archives_hall: {
      bg: "assets/karasuki/rooms/archives_hall.png",

      spawns: {
        default: { x: 100, y: 390 },
        fromLeft: { x: 100, y: 390 },
        fromRight: { x: 780, y: 390 }
      },

      exits: {
        left: { to: "entrance", spawn: "fromRight", dir: "left" }
      },

      collisions: [
        { x: 0, y: 0, w: 960, h: 40 },
        { x: 0, y: 500, w: 960, h: 40 },
        { x: 0, y: 0, w: 50, h: 540 },
        { x: 910, y: 0, w: 50, h: 540 },
        { x: 390, y: 90, w: 180, h: 260 }
      ],

      hotspots: [
        {
          id: "archivesDoor",
          x: 410,
          y: 110,
          w: 140,
          h: 220,
          prompt: "OPEN ARCHIVES",
          action: "overlay",
          target: "archives"
        }
      ]
    },

    forest_crossing: {
      bg: "assets/karasuki/rooms/forest_crossing.png",

      spawns: {
        default: { x: 470, y: 420 },
        fromDown: { x: 470, y: 420 }
      },

      exits: {
        down: { to: "entrance", spawn: "fromUp", dir: "down" }
      },

      collisions: [
        { x: 0, y: 0, w: 960, h: 40 },
        { x: 0, y: 500, w: 960, h: 40 },
        { x: 0, y: 0, w: 50, h: 540 },
        { x: 910, y: 0, w: 50, h: 540 }
      ],

      hotspots: [
        {
          id: "coreGamesMarker",
          x: 640,
          y: 140,
          w: 160,
          h: 180,
          prompt: "CORE GAMES",
          action: "goto",
          href: "game-index.html"
        }
      ]
    }
  },

  overlays: {
    archives: {
      image: "assets/karasuki/rooms/archives_overlay.png",
      hotspots: [
        {
          id: "archiveGames",
          x: 10,
          y: 22,
          w: 19,
          h: 38,
          action: "goto",
          href: "game-index.html"
        },
        {
          id: "archiveStudy",
          x: 34,
          y: 22,
          w: 19,
          h: 38,
          action: "goto",
          href: "study-index.html"
        },
        {
          id: "archiveLore",
          x: 58,
          y: 22,
          w: 19,
          h: 38,
          action: "popup",
          message: "Later this can open a note, memory drawer, or lore shelf."
        }
      ]
    }
  }
};
