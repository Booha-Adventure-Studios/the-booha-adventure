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
    booha: {
      sprite: 'assets/img/grimmerglen/booha_grimmerglen.webp'
    },
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
    },
    collectibles: {
      banner: 'assets/img/grimmerglen/collectibles/banner.webp',
      ticket: 'assets/img/grimmerglen/collectibles/ticket.webp',
      pillow: 'assets/img/grimmerglen/collectibles/pillow.webp',
      backpack: 'assets/img/grimmerglen/collectibles/backpack.webp',
      book: 'assets/img/grimmerglen/collectibles/book.webp',
      teddyBear: 'assets/img/grimmerglen/collectibles/teddy_bear.webp',
      toGoCoffeeCup: 'assets/img/grimmerglen/collectibles/to_go_coffee_cup.webp',
      ball: 'assets/img/grimmerglen/collectibles/ball.webp'
    },

    // Pass 7: the 8 object types' canonical key list, matching the
    // `collectibles` art-path keys above exactly (same 8 strings) so
    // anything that walks one can index the other directly.
    objectTypes: ['banner', 'ticket', 'pillow', 'backpack', 'book', 'teddyBear', 'toGoCoffeeCup', 'ball'],

    // Placement manifest -- 8 types x 3 instance slots. Each type's three
    // copies live in different rooms, while rooms may hold several different
    // object types. Coordinates stay in the current generous cross-corridor
    // walkable shape until the later per-room calibration pass.
    objects: {
      banner:        [ { room: 'room_01', x: 250,  y: 580 }, { room: 'room_02', x: 260,  y: 420 }, { room: 'room_03', x: 1260, y: 650 } ],
      ticket:        [ { room: 'room_01', x: 1240, y: 650 }, { room: 'room_05', x: 250,  y: 650 }, { room: 'room_06', x: 1240, y: 400 } ],
      pillow:        [ { room: 'room_01', x: 600,  y: 690 }, { room: 'room_04', x: 250,  y: 650 }, { room: 'room_06', x: 450,  y: 650 } ],
      backpack:      [ { room: 'room_02', x: 760,  y: 580 }, { room: 'room_05', x: 760,  y: 390 }, { room: 'room_07', x: 250,  y: 420 } ],
      book:          [ { room: 'room_02', x: 1240, y: 660 }, { room: 'room_03', x: 420,  y: 600 }, { room: 'room_07', x: 1250, y: 680 } ],
      teddyBear:     [ { room: 'room_03', x: 900,  y: 700 }, { room: 'room_06', x: 900,  y: 600 }, { room: 'room_08', x: 250,  y: 650 } ],
      toGoCoffeeCup: [ { room: 'room_04', x: 1080, y: 680 }, { room: 'room_07', x: 760,  y: 600 }, { room: 'room_09', x: 260,  y: 650 } ],
      ball:          [ { room: 'room_05', x: 1250, y: 650 }, { room: 'room_08', x: 1200, y: 420 }, { room: 'room_09', x: 1240, y: 650 } ]
    },

    // The 8 objects' typing content -- one GrimmerglenTyping.renderExercise()
    // -shaped exercise per tier (24 total), rather than separately authoring
    // a "given" and a "from-memory" phase for each: the fading support arc
    // instead happens ACROSS the 3 tiers, reusing the engine exactly as
    // built -- Starter shows its answer chip immediately (optionsVisible:
    // true), Case hides the same chip behind the engine's own "Need a
    // hint?" toggle (optionsVisible:false, options still present), and
    // Deep drops the chip entirely (options:null) for pure recall. That's
    // the same options-shown -> hint-only -> none progression the Pass 6
    // tutorial already demonstrates across its 3 steps, just stretched
    // across one object's 3 tiers instead of one conversation's 3 turns.
    //
    // English content here is freely adapted from the lore the user gave
    // (recorded verbatim in the project plan doc's Content & lore section)
    // -- not required to match it word for word, confirmed by the user
    // when this pass started ("you can change any of the English content
    // you want, I was giving context"). Calibrated toward genuinely simple
    // Starter sentences per the plan's own ESL-overshoot warning. Two real
    // names from the user's lore (Bryan Harper, October Moriyama) were
    // shortened to first names only in the graded sentences to keep typing
    // difficulty in line with each tier, not because the names themselves
    // were a problem -- easy to restore in full during real content review.
    memories: {
      banner: {
        start: {
          promptEn: 'I made this banner.',
          promptJp: 'わたしはこの旗を作った。',
          promptReadings: { '旗': 'はた', '作った': 'つくった' },
          accepted: ['i made this banner'],
          options: ['I made this banner.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'I made this banner with my friend.',
          promptJp: 'わたしは友達とこの旗を作った。',
          promptReadings: { '旗': 'はた', '作った': 'つくった', '友達': 'ともだち' },
          accepted: ['i made this banner with my friend'],
          options: ['I made this banner with my friend.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'I made this banner with my friend Jamariko.',
          promptJp: 'わたしは友達のジャマリコとこの旗を作った。',
          promptReadings: { '旗': 'はた', '作った': 'つくった', '友達': 'ともだち' },
          accepted: ['i made this banner with my friend jamariko'],
          options: null,
          optionsVisible: false
        }
      },
      ticket: {
        start: {
          promptEn: 'This is my ticket.',
          promptJp: 'これはわたしの切符です。',
          promptReadings: { '切符': 'きっぷ' },
          accepted: ['this is my ticket'],
          options: ['This is my ticket.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'I rode the train to Utsuroba.',
          promptJp: 'わたしは電車でウツロバへ行った。',
          promptReadings: { '電車': 'でんしゃ', '行った': 'いった' },
          accepted: ['i rode the train to utsuroba'],
          options: ['I rode the train to Utsuroba.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'I rode the train to Utsuroba to meet my friend Bryan.',
          promptJp: 'わたしは友達のブライアンに会うために電車でウツロバへ行った。',
          promptReadings: { '友達': 'ともだち', '会う': 'あう', '電車': 'でんしゃ', '行った': 'いった' },
          accepted: ['i rode the train to utsuroba to meet my friend bryan'],
          options: null,
          optionsVisible: false
        }
      },
      pillow: {
        start: {
          promptEn: 'This is my pillow.',
          promptJp: 'これはわたしの枕です。',
          promptReadings: { '枕': 'まくら' },
          accepted: ['this is my pillow'],
          options: ['This is my pillow.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'I had a sleepover with my friends.',
          promptJp: 'わたしは友達とお泊まり会をした。',
          promptReadings: { '友達': 'ともだち', 'お泊まり会': 'おとまりかい' },
          accepted: ['i had a sleepover with my friends'],
          options: ['I had a sleepover with my friends.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'I had a fun sleepover with all my Marietta friends.',
          promptJp: 'わたしはマリエッタの友達みんなと楽しいお泊まり会をした。',
          promptReadings: { '友達': 'ともだち', '楽しい': 'たのしい', 'お泊まり会': 'おとまりかい' },
          accepted: ['i had a fun sleepover with all my marietta friends'],
          options: null,
          optionsVisible: false
        }
      },
      backpack: {
        start: {
          promptEn: 'This is my backpack.',
          promptJp: 'これはわたしのリュックです。',
          promptReadings: {},
          accepted: ['this is my backpack'],
          options: ['This is my backpack.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'I keep my daydreams in my backpack.',
          promptJp: 'わたしは夢をリュックに入れる。',
          promptReadings: { '夢': 'ゆめ', '入れる': 'いれる' },
          accepted: ['i keep my daydreams in my backpack'],
          options: ['I keep my daydreams in my backpack.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'I secretly keep my favorite daydreams in my backpack.',
          promptJp: 'わたしはお気に入りの夢をこっそりリュックに入れる。',
          promptReadings: { 'お気に入り': 'おきにいり', '夢': 'ゆめ', '入れる': 'いれる' },
          accepted: ['i secretly keep my favorite daydreams in my backpack'],
          options: null,
          optionsVisible: false
        }
      },
      book: {
        start: {
          promptEn: 'This is my book.',
          promptJp: 'これはわたしの本です。',
          promptReadings: { '本': 'ほん' },
          accepted: ['this is my book'],
          options: ['This is my book.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'I write about my trips in this book.',
          promptJp: 'わたしはこの本に旅のことを書く。',
          promptReadings: { '本': 'ほん', '旅': 'たび', '書く': 'かく' },
          accepted: ['i write about my trips in this book'],
          options: ['I write about my trips in this book.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'I write about my trips in this book for my friend October.',
          promptJp: 'わたしは友達のオクトーバーのために、この本に旅のことを書く。',
          promptReadings: { '友達': 'ともだち', '本': 'ほん', '旅': 'たび', '書く': 'かく' },
          accepted: ['i write about my trips in this book for my friend october'],
          options: null,
          optionsVisible: false
        }
      },
      teddyBear: {
        start: {
          promptEn: 'This is my teddy bear.',
          promptJp: 'これはわたしのテディベアです。',
          promptReadings: {},
          accepted: ['this is my teddy bear'],
          options: ['This is my teddy bear.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'My teddy bear was a gift.',
          promptJp: 'わたしのテディベアはプレゼントだった。',
          promptReadings: {},
          accepted: ['my teddy bear was a gift'],
          options: ['My teddy bear was a gift.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'Mister Happy gave me this teddy bear as a gift.',
          promptJp: 'ミスター・ハッピーがこのテディベアをプレゼントしてくれた。',
          promptReadings: {},
          accepted: ['mister happy gave me this teddy bear as a gift'],
          options: null,
          optionsVisible: false
        }
      },
      toGoCoffeeCup: {
        start: {
          promptEn: 'This is my coffee cup.',
          promptJp: 'これはわたしのコーヒーカップです。',
          promptReadings: {},
          accepted: ['this is my coffee cup'],
          options: ['This is my coffee cup.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'I love drinking pamuri from this cup.',
          promptJp: 'わたしはこのカップでパムリを飲むのが大好き。',
          promptReadings: { '飲む': 'のむ', '大好き': 'だいすき' },
          accepted: ['i love drinking pamuri from this cup'],
          options: ['I love drinking pamuri from this cup.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'My favorite drink pamuri is sweet and made here in Grimmerglen.',
          promptJp: 'わたしの大好きな飲み物パムリは、ここグリマーグレンで作られた甘い飲み物です。',
          promptReadings: { '大好き': 'だいすき', '飲み物': 'のみもの', '作られた': 'つくられた', '甘い': 'あまい' },
          accepted: ['my favorite drink pamuri is sweet and made here in grimmerglen'],
          options: null,
          optionsVisible: false
        }
      },
      ball: {
        start: {
          promptEn: 'This is my ball.',
          promptJp: 'これはわたしのボールです。',
          promptReadings: {},
          accepted: ['this is my ball'],
          options: ['This is my ball.'],
          optionsVisible: true
        },
        case: {
          promptEn: 'I play ball with my friend Columbus.',
          promptJp: 'わたしは友達のコロンブスとボールで遊ぶ。',
          promptReadings: { '友達': 'ともだち', '遊ぶ': 'あそぶ' },
          accepted: ['i play ball with my friend columbus'],
          options: ['I play ball with my friend Columbus.'],
          optionsVisible: false
        },
        deep: {
          promptEn: 'I play ball with my friend Columbus inside his daydreams.',
          promptJp: 'わたしは友達のコロンブスの夢の中でボールをして遊ぶ。',
          promptReadings: { '友達': 'ともだち', '夢': 'ゆめ', '遊ぶ': 'あそぶ' },
          accepted: ['i play ball with my friend columbus inside his daydreams'],
          options: null,
          optionsVisible: false
        }
      }
    }
  };
})();
