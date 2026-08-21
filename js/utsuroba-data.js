
window.UTSUROBA_DATA = {

  startRoom: "room_03",

  roomStandingCoords: {
    room_01: { x: 491, y: 557 },
    room_05: { x: 820, y: 580 },
    room_06: { x: 650, y: 550 },
    room_11: { x: 673, y: 491 },
    room_14: { x: 803, y: 543 },
    room_15: { x: 787, y: 490 },
  },

 drifterRoomPool: ['room_01','room_05','room_06','room_11','room_14','room_15'],

  drifters: [
    {
      id              : 'ks',
      name            : 'Kurobane Shizuma',
      nameKanji       : '黒羽 静魔',
     
      greeting        : ['…What.', 'You\'re not from here.', 'Don\'t just stand there staring.'],
      questLines      : ['…What.', 'You again.', 'Don\'t just stand there.', 'I lost something.', 'A memory.', 'Go find it.'],
      sprite1         : './assets/img/drifters/kurobane_shizuma-1.png',
      sprite2         : './assets/img/drifters/kurobane_shizuma-2.png',
      episodeId       : 'ks_lantern_v1',
      memoryCount     : 1,
      scale           : 0.18,
    },
    {
      id              : 'nto',
      name            : 'Ned the Oogle',
      nameKanji       : 'ネド・ザ・オーグル',
      
      greeting        : ['Oh! Hey!', 'You\'re new, right?', 'Hehe… I like you already!'],
      questLines      : ['Oh! Hey hey hey!', 'You came back!', 'I\'ve been waiting!', 'I lost a memory somewhere out there…', 'Will you find it for me? Please please please?'],
      sprite1         : './assets/img/drifters/ned-the-oogle-1.png',
      sprite2         : './assets/img/drifters/ned-the-oogle-2.png',
      episodeId       : 'nto_candy_v1',
      memoryCount     : 1,
      scale           : 0.18,
    },
    {
      id              : 'cg',
      name            : 'Chagrin Gobito',
      nameKanji       : 'チャグリン・ゴビト',
      
      greeting        : ['Ah—!', 'S-sorry…', 'I didn\'t see you there…'],
      questLines      : ['Ah—!', 'Oh… it\'s you.', 'Sorry, you startled me again…', 'Um…', 'I think I lost something.', 'A memory…', 'Would you… maybe… help me find it?'],
      sprite1         : './assets/img/drifters/chagrin_gobito-1.png',
      sprite2         : './assets/img/drifters/chagrin_gobito-2.png',
      episodeId       : 'cg_door_v1',
      memoryCount     : 1,
      scale           : 0.11,
    },
    {
      id          : 'bh',
      name        : 'Bryan Harper',
      nameKanji   : 'ブライアン・ハーパー',
     
      greeting    : ['Hey…', 'You made it this far, huh.', 'I just got here myself.', 'Come back later.'],
      sprite1     : './assets/img/drifters/bryan_harper-1.png',
      sprite2     : './assets/img/drifters/bryan_harper-2.png',
      memoryCount : 0,
      scale       : 0.25,
    },
    {
      id          : 'bk',
      name        : 'Blakesly Kassidy',
      nameKanji   : 'ブレイクスリー・カシディ',
      
      greeting    : ['…What are you.', 'Don\'t answer that.', 'You look like something someone stepped on.', 'Come back later.'],
      sprite1     : './assets/img/drifters/blakesly_kassidy-1.png',
      sprite2     : './assets/img/drifters/blakesly_kassidy-2.png',
      memoryCount : 0,
      scale       : 0.22,
    },
    {
      id          : 'ph',
      name        : 'Patricia Hollingshead',
      nameKanji   : 'パトリシア・ホリングスヘッド',
      
      greeting    : ['Oh my…', 'You\'re just the cutest thing, aren\'t you.', 'Don\'t wander too far, okay?', 'Come back and see me later.'],
      sprite1     : './assets/img/drifters/patricia_hollingshead-1.png',
      sprite2     : './assets/img/drifters/patricia_hollingshead-2.png',
      memoryCount : 0,
      scale       : 0.24,
    },
  ],

  rooms: {

    room_01: {
      bg: "./assets/img/utsuroba/room_01.webp",
      spawns: {
        default  : { x: 0.483, y: 0.500 },
        fromLeft : { x: 0.130, y: 0.643 },
        fromRight: { x: 0.911, y: 0.643 },
        fromUp   : { x: 0.706, y: 0.293 },
        fromDown : { x: 0.483, y: 0.801 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_02: {
      bg: "./assets/img/utsuroba/room_02.webp",
      spawns: {
        default  : { x: 0.483, y: 0.500 },
        fromLeft : { x: 0.137, y: 0.249 },
        fromRight: { x: 0.905, y: 0.710 },
        fromUp   : { x: 0.498, y: 0.293 },
        fromDown : { x: 0.483, y: 0.801 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_03: {
      bg: "./assets/img/utsuroba/room_03.webp",
      spawns: {
        default  : { x: 0.487, y: 0.647 },
        fromLeft : { x: 0.182, y: 0.320 },
        fromRight: { x: 0.749, y: 0.232 },
        fromUp   : { x: 0.511, y: 0.352 },
        fromDown : { x: 0.749, y: 0.681 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_04: {
      bg: "./assets/img/utsuroba/room_04.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.081, y: 0.627 },
        fromRight: { x: 0.905, y: 0.643 },
        fromUp   : { x: 0.284, y: 0.313 },
        fromDown : { x: 0.477, y: 0.801 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_05: {
      bg: "./assets/img/utsuroba/room_05.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.182, y: 0.627 },
        fromRight: { x: 0.905, y: 0.643 },
        fromUp   : { x: 0.511, y: 0.352 },
        fromDown : { x: 0.477, y: 0.801 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_06: {
      bg: "./assets/img/utsuroba/room_06.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.130, y: 0.668 },
        fromRight: { x: 0.911, y: 0.668 },
        fromUp   : { x: 0.714, y: 0.293 },
        fromDown : { x: 0.406, y: 0.684 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_07: {
      bg: "./assets/img/utsuroba/room_07.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.130, y: 0.671 },
        fromRight: { x: 0.866, y: 0.600 },
        fromUp   : { x: 0.362, y: 0.332 },
        fromDown : { x: 0.587, y: 0.703 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_08: {
      bg: "./assets/img/utsuroba/room_08.webp",
      spawns: {
        default  : { x: 0.477, y: 0.586 },
        fromLeft : { x: 0.130, y: 0.758 },
        fromRight: { x: 0.898, y: 0.578 },
        fromUp   : { x: 0.641, y: 0.313 },
        fromDown : { x: 0.552, y: 0.742 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_09: {
      bg: "./assets/img/utsuroba/room_09.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.130, y: 0.686 },
        fromRight: { x: 0.820, y: 0.313 },
        fromUp   : { x: 0.292, y: 0.352 },
        fromDown : { x: 0.598, y: 0.703 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_10: {
      bg: "./assets/img/utsuroba/room_10.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.130, y: 0.686 },
        fromRight: { x: 0.911, y: 0.684 },
        fromUp   : { x: 0.546, y: 0.352 },
        fromDown : { x: 0.506, y: 0.703 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_11: {
      bg: "./assets/img/utsuroba/room_11.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.195, y: 0.305 },
        fromRight: { x: 0.794, y: 0.305 },
        fromUp   : { x: 0.477, y: 0.332 },
        fromDown : { x: 0.523, y: 0.703 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_12: {
      bg: "./assets/img/utsuroba/room_12.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.202, y: 0.336 },
        fromRight: { x: 0.872, y: 0.699 },
        fromUp   : { x: 0.477, y: 0.332 },
        fromDown : { x: 0.489, y: 0.723 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_13: {
      bg: "./assets/img/utsuroba/room_13.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.143, y: 0.555 },
        fromRight: { x: 0.872, y: 0.236 },
        fromUp   : { x: 0.477, y: 0.332 },
        fromDown : { x: 0.593, y: 0.723 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_14: {
      bg: "./assets/img/utsuroba/room_14.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.100, y: 0.641 },
        fromRight: { x: 0.872, y: 0.699 },
        fromUp   : { x: 0.477, y: 0.332 },
        fromDown : { x: 0.489, y: 0.723 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    },

    room_15: {
      bg: "./assets/img/utsuroba/room_15.webp",
      spawns: {
        default  : { x: 0.477, y: 0.684 },
        fromLeft : { x: 0.143, y: 0.555 },
        fromRight: { x: 0.872, y: 0.699 },
        fromUp   : { x: 0.477, y: 0.332 },
        fromDown : { x: 0.432, y: 0.723 }
      },
      collisions: [{ x:0, y:0, w:1536, h:1024 }]
    }

  }
};
