
window.KARASUKI_DATA = {
  startRoom: "room_03",

  rooms: {
    // ── ROW 1 ──────────────────────────────────────────────
    room_01: {
      bg: "assets/img/karasuki/room_01.webp",
      spawns: {
        default:   { x: 732,  y: 876  },
        fromLeft:  { x: 200,  y: 658  },   // near left edge, mirrors room_01 right exit y
        fromRight: { x: 1400, y: 658  },   // near right edge
        fromUp:    { x: 1084, y: 220  },   // just below room_01 up exit x
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_02: {
      bg: "assets/img/karasuki/room_02.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 210,  y: 255  },   // near room_02 left exit
        fromRight: { x: 1390, y: 727  },   // near room_02 right exit
        fromUp:    { x: 765,  y: 200  },   // just below room_02 up exit
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_03: {
      bg: "assets/img/karasuki/room_03.webp",
      spawns: {
        default:   { x: 732,  y: 876  },   // START
        fromLeft:  { x: 280,  y: 328  },   // near left exit
        fromRight: { x: 1150, y: 237  },   // near right exit
        fromUp:    { x: 785,  y: 240  },   // just below up exit
        fromDown:  { x: 732,  y: 820  }
      }
    },

    room_04: {
      bg: "assets/img/karasuki/room_04.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 280,  y: 328  },   // mirrors room_03 left exit
        fromRight: { x: 1390, y: 658  },   // mirrors room_01 right exit
        fromUp:    { x: 785,  y: 240  },   // mirrors room_03 up exit
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_05: {
      bg: "assets/img/karasuki/room_05.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 280,  y: 328  },   // mirrors room_03 left exit
        fromRight: { x: 1390, y: 658  },
        fromUp:    { x: 785,  y: 240  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    // ── ROW 2 ──────────────────────────────────────────────
    room_06: {
      bg: "assets/img/karasuki/room_06.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 684  },
        fromRight: { x: 1400, y: 684  },   // near room_06 right exit
        fromUp:    { x: 1096, y: 200  },   // just below room_06 up exit
        fromDown:  { x: 1468, y: 620  }    // near room_06 down exit
      }
    },

    room_07: {
      bg: "assets/img/karasuki/room_07.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 100,  y: 687  },   // near room_07 left exit
        fromRight: { x: 1420, y: 615  },   // near room_07 right exit
        fromUp:    { x: 555,  y: 220  },   // just below room_07 up exit
        fromDown:  { x: 901,  y: 820  }    // just above room_07 down exit
      }
    },

    room_08: {
      bg: "assets/img/karasuki/room_08.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 110,  y: 809  },   // near room_08 left exit
        fromRight: { x: 1450, y: 597  },   // near room_08 right exit
        fromUp:    { x: 992,  y: 220  },   // just below room_08 up exit
        fromDown:  { x: 860,  y: 810  }    // just above room_08 down exit
      }
    },

    room_09: {
      bg: "assets/img/karasuki/room_09.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 120,  y: 702  },   // near room_09 left exit
        fromRight: { x: 1420, y: 615  },   // mirrors room_07 right
        fromUp:    { x: 449,  y: 240  },   // just below room_09 up exit
        fromDown:  { x: 989,  y: 820  }    // just above room_09 down exit
      }
    },

    room_10: {
      bg: "assets/img/karasuki/room_10.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 120,  y: 702  },   // mirrors room_09 left
        fromRight: { x: 1400, y: 700  },
        fromUp:    { x: 838,  y: 240  },   // just below room_10 up exit
        fromDown:  { x: 776,  y: 820  }    // just above room_10 down exit
      }
    },

    // ── ROW 3 ──────────────────────────────────────────────
    room_11: {
      bg: "assets/img/karasuki/room_11.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 312  },
        fromRight: { x: 1300, y: 312  },   // near room_11 right exit
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 804,  y: 820  }    // just above room_11 down exit
      }
    },

    room_12: {
      bg: "assets/img/karasuki/room_12.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 240,  y: 344  },   // near room_12 left exit
        fromRight: { x: 1420, y: 716  },   // near room_12 right exit
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 751,  y: 840  }    // just above room_12 down exit
      }
    },

    room_13: {
      bg: "assets/img/karasuki/room_13.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 240,  y: 344  },   // mirrors room_12 left
        fromRight: { x: 1420, y: 716  },   // mirrors room_12 right
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 751,  y: 840  }    // mirrors room_12 down
      }
    },

    room_14: {
      bg: "assets/img/karasuki/room_14.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 240,  y: 344  },
        fromRight: { x: 1420, y: 716  },
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 751,  y: 840  }
      }
    },

    room_15: {
      bg: "assets/img/karasuki/room_15.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 240,  y: 344  },
        fromRight: { x: 1420, y: 716  },
        fromUp:    { x: 732,  y: 200  },
        fromDown:  { x: 751,  y: 840  }
      }
    }
  },

  overlays: {}
};
