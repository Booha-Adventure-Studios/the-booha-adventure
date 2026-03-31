
window.UTSUROBA_DATA = {

  startRoom: "room_03",

  /* ─────────────────────────────────────────────────────────
     DRIFTERS
     memoryCount: how many q/a pairs exist for this drifter.
     Increment this number when you add new audio files.
     Coordinates are in 1536×1024 world space (same as NPP).
     roomCoords: one position per room — used whichever room
     the weekly rotation assigns this drifter to.
  ───────────────────────────────────────────────────────── */
  drifters: [
    {
      id          : 'ks',
      name        : 'Kurobane Shizuma',
      nameKanji   : '黒羽 静魔',
      nameHira    : 'くろはね しずま',
      greeting    : ['Hey…', 'You weird little ghost.', 'Go find my memories.'],
      greetingJP  : ['おい…', '変な小さな幽霊。', '俺の記憶を探してこい。'],
      sprite1     : './assets/img/drifters/kurobane_shizuma-1.png',
      sprite2     : './assets/img/drifters/kurobane_shizuma-2.png',
      audioPrefix : 'ks',
      memoryCount : 1,
      scale       : 0.15, 
      /* x, y in world coords — used for whichever room is assigned */
      roomCoords  : { x: 900, y: 480 }
    },
    {
      id          : 'nto',
      name        : 'Ned the Oogle',
      nameKanji   : 'ネド・ザ・オーグル',
      nameHira    : 'ねど・ざ・おーぐる',
      greeting    : ['Wow!', 'You\'re so cute!', 'Please, please, please help me find some memories!'],
      greetingJP  : ['わあ！', 'とってもかわいいね！', 'お願い、お願い、お願い！記憶を探すのを手伝って！'],
      sprite1     : './assets/img/drifters/ned-the-oogle-1.png',
      sprite2     : './assets/img/drifters/ned-the-oogle-2.png',
      audioPrefix : 'nto',
      memoryCount : 1,
      scale       : 0.17, 
      roomCoords  : { x: 650, y: 550 }
    },
    {
      id          : 'cg',
      name        : 'Chagrin Gobito',
      nameKanji   : 'チャグリン・ゴビト',
      nameHira    : 'ちゃぐりん・ごびと',
      greeting    : ['Ah!', 'You scared me!', 'Um… if it\'s okay… can you help me find some memories?'],
      greetingJP  : ['あっ！', 'びっくりした…！', 'あの…よかったら…記憶を探すの、手伝ってくれる？'],
      sprite1     : './assets/img/drifters/chagrin_gobito-1.png',
      sprite2     : './assets/img/drifters/chagrin_gobito-2.png',
      audioPrefix : 'cg',
      memoryCount : 1,
      scale       : 0.10, 
      roomCoords  : { x: 820, y: 580 }
    }
  ],

  /* ─────────────────────────────────────────────────────────
     DRIFTER ROOM POOL
     These 3 rooms rotate weekly. Each drifter is assigned
     one room per week via seeded shuffle. Add more rooms
     here if you want a larger rotation pool later.
  ───────────────────────────────────────────────────────── */
  drifterRoomPool: ['room_05', 'room_06', 'room_14'],

  /* ─────────────────────────────────────────────────────────
     DECOY COUNT
     How many decoy audio files exist (decoy_01.mp3 … decoy_NN.mp3).
     Increment when you add more decoys.
  ───────────────────────────────────────────────────────── */
  decoyCount: 6,

  /* How many decoys appear alongside the correct orb */
  decoysPerQuest: 3,

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
