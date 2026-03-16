
window.KARASUKI_DATA = {
  startRoom: "room_03",

  rooms: {
    // ── ROW 1 ──────────────────────────────────────────────
    room_01: {
      bg: "assets/img/karasuki/room_01.webp",
      spawns: {
        default:   { x: 732,  y: 876  },
        fromLeft:  { x: 200,  y: 658  },
        fromRight: { x: 1400, y: 658  },
        fromUp:    { x: 1084, y: 220  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_02: {
      bg: "assets/img/karasuki/room_02.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 210,  y: 255  },
        fromRight: { x: 1390, y: 727  },
        fromUp:    { x: 765,  y: 200  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_03: {
      bg: "assets/img/karasuki/room_03.webp",
      spawns: {
        default:   { x: 732,  y: 876  },
        fromLeft:  { x: 280,  y: 328  },
        fromRight: { x: 1150, y: 237  },
        // FIX: was { x: 785, y: 240 } — too close to the "up" NPP at y:200.
        // Moved the ghost further down so the cooldown has room to breathe.
        fromUp:    { x: 785,  y: 360  },
        fromDown:  { x: 732,  y: 820  }
      }
    },

    room_04: {
      bg: "assets/img/karasuki/room_04.webp",
      exits: {
        up:    { x: 548,  y: 169 },
        right: { x: 1443, y: 734 },
        left:  { x: 94,   y: 635 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 124,  y: 642  },
        fromRight: { x: 1390, y: 658  },
        fromUp:    { x: 436,  y: 320  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    room_05: {
      bg: "assets/img/karasuki/room_05.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 280,  y: 328  },
        fromRight: { x: 1390, y: 658  },
        fromUp:    { x: 785,  y: 360  },
        fromDown:  { x: 732,  y: 876  }
      }
    },

    // ── ROW 2 ──────────────────────────────────────────────
    room_06: {
      bg: "assets/img/karasuki/room_06.webp",
      exits: {
        down: { x: 623, y: 937 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 684  },
        fromRight: { x: 1400, y: 684  },
        fromUp:    { x: 1096, y: 300  },
        fromDown:  { x: 623,  y: 700  }
      }
    },

    room_07: {
      bg: "assets/img/karasuki/room_07.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 687  },
        fromRight: { x: 1330, y: 615  },
        fromUp:    { x: 555,  y: 340  },
        fromDown:  { x: 901,  y: 720  }
      }
    },

    room_08: {
      bg: "assets/img/karasuki/room_08.webp",
      spawns: {
        // FIX: default was { x:357, y:342 } — exactly on the portal orb.
        // Moved to centre of room so returning from profile doesn't
        // immediately re-open the portal popup.
        default:   { x: 732,  y: 600  },
        fromLeft:  { x: 200,  y: 776  },
        fromRight: { x: 1380, y: 592  },
        fromUp:    { x: 984,  y: 320  },
        fromDown:  { x: 848,  y: 760  }
      },
      hotspots: [
        {
          id: "profile-portal",
          x: 357,
          y: 342,
          type: "portal",
          href: "adventure-profile.html",
          popup: {
            en: "Do you want to go to your profile page?",
            ja: "プロフィールページに行きますか？",
            kanji: "貴方の横顔の頁へ参りますか？"
          }
        }
      ]
    },

    room_09: {
      bg: "assets/img/karasuki/room_09.webp",
      exits: {
        right: { x: 1365, y: 224 },
        down:  { x: 918,  y: 883 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 702  },
        fromRight: { x: 1260, y: 320  },
        fromUp:    { x: 449,  y: 360  },
        fromDown:  { x: 918,  y: 720  }
      }
    },

    room_10: {
      bg: "assets/img/karasuki/room_10.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 200,  y: 702  },
        fromRight: { x: 1400, y: 700  },
        fromUp:    { x: 838,  y: 360  },
        fromDown:  { x: 776,  y: 720  }
      }
    },

    // ── ROW 3 ──────────────────────────────────────────────
    room_11: {
      bg: "assets/img/karasuki/room_11.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 300,  y: 312  },
        fromRight: { x: 1220, y: 312  },
        fromUp:    { x: 732,  y: 340  },
        fromDown:  { x: 804,  y: 720  }
      }
    },

    room_12: {
      bg: "assets/img/karasuki/room_12.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 310,  y: 344  },
        fromRight: { x: 1340, y: 716  },
        fromUp:    { x: 732,  y: 340  },
        fromDown:  { x: 751,  y: 740  }
      }
    },

    room_13: {
      bg: "assets/img/karasuki/room_13.webp",
      exits: {
        right: { x: 1421, y: 242 },
        left:  { x: 88,   y: 568 },
        down:  { x: 910,  y: 913 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 220,  y: 568  },
        fromRight: { x: 1340, y: 46  },
        fromUp:    { x: 732,  y: 340  },
        fromDown:  { x: 910,  y: 740  }
      }
    },

    room_14: {
      bg: "assets/img/karasuki/room_14.webp",
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 154,  y: 656  },
        fromRight: { x: 1340, y: 716  },
        fromUp:    { x: 732,  y: 340  },
        fromDown:  { x: 751,  y: 740  }
      }
    },

    room_15: {
      bg: "assets/img/karasuki/room_15.webp",
      exits: {
        left: { x: 88,  y: 568 },
        down: { x: 663, y: 894 }
      },
      spawns: {
        default:   { x: 732,  y: 700  },
        fromLeft:  { x: 220,  y: 568  },
        fromRight: { x: 1340, y: 716  },
        fromUp:    { x: 732,  y: 340  },
        fromDown:  { x: 663,  y: 740  }
      }
    }
  },

  overlays: {}
};
