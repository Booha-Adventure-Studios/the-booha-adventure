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
 * Utsuroba / Muenba all use (1536x1024), starting with the original 3x3
 * garden and extending it with six themed side rooms.
 *
 * Exit coordinates are calibrated per the current DEV walkthrough for the
 * rooms that were measured; unmeasured exits retain the generous corridor
 * defaults until someone walks them with the DEV overlay.
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

  function exit(dir, to, spawn, coords) {
    const point = coords || EXIT_XY[dir];
    return { dir, x: point.x, y: point.y, to, spawn };
  }

  // 5x3 grid. room_01 is bottom-left and hosts Marietta / the entry from
  // Karasuki. Layout (rows bottom-to-top):
  //   13  14  15
  //   10  11  12
  //   07  08  09
  //   04  05  06
  //   01  02  03
  const NPP = {
    room_01: [
      exit('right', 'room_02', 'fromLeft'),
      exit('up',    'room_04', 'fromDown')
    ],
    room_02: [
      exit('left',  'room_01', 'fromRight', { x: 502, y: 521 }),
      exit('right', 'room_03', 'fromLeft', { x: 1092, y: 524 }),
      exit('up',    'room_05', 'fromDown')
    ],
    room_03: [
      exit('left',  'room_02', 'fromRight'),
      exit('up',    'room_06', 'fromDown', { x: 791, y: 422 })
    ],
    room_04: [
      exit('down',  'room_01', 'fromUp'),
      exit('right', 'room_05', 'fromLeft', { x: 1142, y: 611 }),
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
      exit('right', 'room_09', 'fromLeft', { x: 1107, y: 456 })
    ],
    room_09: [
      exit('down', 'room_06', 'fromUp'),
      exit('left', 'room_08', 'fromRight', { x: 518, y: 421 }),
      exit('up',   'room_12', 'fromDown', { x: 772, y: 234 })
    ],
    room_10: [
      exit('down',  'room_07', 'fromUp'),
      exit('right', 'room_11', 'fromLeft'),
      exit('up',    'room_13', 'fromDown')
    ],
    room_11: [
      exit('left',  'room_10', 'fromRight'),
      exit('right', 'room_12', 'fromLeft'),
      exit('down',  'room_08', 'fromUp'),
      exit('up',    'room_14', 'fromDown')
    ],
    room_12: [
      exit('left',  'room_11', 'fromRight'),
      exit('down',  'room_09', 'fromUp'),
      exit('up',    'room_15', 'fromDown')
    ],
    room_13: [
      exit('down',  'room_10', 'fromUp'),
      exit('right', 'room_14', 'fromLeft')
    ],
    room_14: [
      exit('left',  'room_13', 'fromRight'),
      exit('right', 'room_15', 'fromLeft'),
      exit('down',  'room_11', 'fromUp')
    ],
    room_15: [
      exit('left', 'room_14', 'fromRight'),
      exit('down', 'room_12', 'fromUp')
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
  // and its exit arrows, so the 15 rooms read as distinct cheerful places
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
    room_09: { name: 'Apricot Glow',       glow: '#ffcf9e' },
    room_10: { name: 'Clockwork Lavender', glow: '#c8b8ff' },
    room_11: { name: 'Gazebo Rose',        glow: '#ffb9d7' },
    room_12: { name: 'Bandstand Blue',     glow: '#9fdcff' },
    room_13: { name: 'Postbox Peach',      glow: '#ffc39f' },
    room_14: { name: 'Flower Meadow',       glow: '#b8efc9' },
    room_15: { name: 'Candy Cloud',         glow: '#f5a9e8' }
  };

  const rooms = {};
  for (let i = 1; i <= 15; i++) {
    const roomId = `room_${String(i).padStart(2, '0')}`;
    rooms[roomId] = {
      bg: `assets/img/grimmerglen/${roomId}.webp`,
      spawns: { ...SPAWNS },
      exits: NPP[roomId] || [],
      walkable: makeWalkable(),
      color: ROOM_COLOR[roomId]
    };
  }

  const MEMORY_STORIES = {
    banner: { en: 'I remember making this with my friend. We hung it up when the room felt too quiet.', jp: '友達とこれを作ったのを覚えている。部屋が静かすぎるとき、これをかざしたの。', readings: { '友達': 'ともだち', '作った': 'つくった', '覚えている': 'おぼえている', '部屋': 'へや', '静か': 'しずか', 'かざした': 'かざした' } },
    ticket: { en: 'I remember holding this before I rode my bike to meet a friend.', jp: '友達に会うために自転車に乗る前、これを持っていたのを覚えている。', readings: { '友達': 'ともだち', '会う': 'あう', '自転車': 'じてんしゃ', '乗る': 'のる', '前': 'まえ', '持っていた': 'もっていた', '覚えている': 'おぼえている' } },
    pillow: { en: 'I remember resting here after a long day with my friends.', jp: '友達と長い一日を過ごしたあと、ここで休んだのを覚えている。', readings: { '友達': 'ともだち', '長い': 'ながい', '一日': 'いちにち', '過ごした': 'すごした', '休んだ': 'やすんだ', '覚えている': 'おぼえている' } },
    backpack: { en: 'I remember carrying my favorite daydreams in this.', jp: 'お気に入りの夢をこれに入れて運んだのを覚えている。', readings: { 'お気に入り': 'おきにいり', '夢': 'ゆめ', '入れて': 'いれて', '運んだ': 'はこんだ', '覚えている': 'おぼえている' } },
    book: { en: 'I remember writing in this for October. She is my friend, and we always meet around Halloween time.', jp: 'オクトーバーのためにこれに書いたのを覚えている。オクトーバーは友達で、いつもハロウィンのころに会うの。', readings: { '書いた': 'かいた', '覚えている': 'おぼえている', '友達': 'ともだち', '会う': 'あう' } },
    teddyBear: { en: 'I remember hugging this when the night felt a little spooky.', jp: '夜が少しこわく感じたとき、これを抱きしめたのを覚えている。', readings: { '夜': 'よる', '少し': 'すこし', '感じた': 'かんじた', '抱きしめた': 'だきしめた', '覚えている': 'おぼえている' } },
    toGoCoffeeCup: { en: 'I remember drinking a warm cup of pamuri while watching the clouds.', jp: '雲を見ながら、あたたかいパムリを飲んだのを覚えている。', readings: { '雲': 'くも', '見ながら': 'みながら', '飲んだ': 'のんだ', '覚えている': 'おぼえている' } },
    ball: { en: 'I remember playing games every day with my friend.', jp: '友達と毎日ゲームをして遊んだのを覚えている。', readings: { '友達': 'ともだち', '毎日': 'まいにち', '遊んだ': 'あそんだ', '覚えている': 'おぼえている' } }
  };

  const MEMORY_CONTENT = {
    banner: { target: 'I made this with my friend.', jp: 'わたしは友達とこれを作った。', readings: { '友達': 'ともだち', '作った': 'つくった' }, full: ['I made this with my friend.', 'I played games with my friend.', 'I wrote this with my friend.'], partial: ['I made …', 'I played …', 'I wrote …'] },
    ticket: { target: 'I rode my bike to meet a friend.', jp: 'わたしは友達に会うために自転車に乗った。', readings: { '友達': 'ともだち', '会う': 'あう', '自転車': 'じてんしゃ', '乗った': 'のった' }, full: ['I rode my bike to meet a friend.', 'I played games with a friend.', 'I wrote a letter to a friend.'], partial: ['I rode …', 'I played …', 'I wrote …'] },
    pillow: { target: 'I rested here after a long day.', jp: '長い一日のあと、ここで休んだ。', readings: { '長い': 'ながい', '一日': 'いちにち', '休んだ': 'やすんだ' }, full: ['I rested here after a long day.', 'I played here after a long day.', 'I slept here after a long day.'], partial: ['I rested …', 'I played …', 'I slept …'] },
    backpack: { target: 'I carry my favorite daydreams in this.', jp: 'お気に入りの夢をこれに入れて運ぶ。', readings: { 'お気に入り': 'おきにいり', '夢': 'ゆめ', '入れて': 'いれて', '運ぶ': 'はこぶ' }, full: ['I carry my favorite daydreams in this.', 'I keep my favorite books in this.', 'I carry my favorite snacks in this.'], partial: ['I carry …', 'I keep …', 'I carry …'] },
    book: { target: 'I write in my book.', jp: 'わたしは本に書く。', readings: { '本': 'ほん', '書く': 'かく' }, full: ['I ride my bike.', 'I play games every day.', 'I write in my book.'], partial: ['I ride …', 'I play …', 'I write …'] },
    teddyBear: { target: 'I hug this when the night feels spooky.', jp: '夜がこわいとき、これを抱きしめる。', readings: { '夜': 'よる', '抱きしめる': 'だきしめる' }, full: ['I hug this when the night feels spooky.', 'I hold this when the day feels sunny.', 'I play with this when the night feels quiet.'], partial: ['I hug …', 'I hold …', 'I play …'] },
    toGoCoffeeCup: { target: 'I drink a warm cup of pamuri.', jp: 'あたたかいパムリを一杯飲む。', readings: { '温かい': 'あたたかい', '一杯': 'いっぱい', '飲む': 'のむ' }, full: ['I drink a warm cup of pamuri.', 'I make a warm cup of tea.', 'I carry a warm cup of cocoa.'], partial: ['I drink …', 'I make …', 'I carry …'] },
    ball: { target: 'I play games every day with my friend.', jp: '友達と毎日ゲームをして遊ぶ。', readings: { '友達': 'ともだち', '毎日': 'まいにち', '遊ぶ': 'あそぶ' }, full: ['I play games every day with my friend.', 'I ride my bike every day with my friend.', 'I write stories every day with my friend.'], partial: ['I play …', 'I ride …', 'I write …'] }
  };

  function makeMemoryExercises() {
    const exercises = {};
    Object.keys(MEMORY_CONTENT).forEach(type => {
      const item = MEMORY_CONTENT[type];
      const base = {
        promptEn: 'Type the sentence you remember.',
        promptJp: '思い出した文をタイプしてね。',
        promptReadings: { '思い出した': 'おもいだした', '文': 'ぶん' },
        accepted: [item.target.replace(/[.!?]+$/, '')]
      };
      exercises[type] = {
        start: Object.assign({}, base, { options: item.full, optionsVisible: true }),
        case: Object.assign({}, base, { options: item.partial, optionsVisible: true }),
        deep: Object.assign({}, base, { options: null, optionsVisible: false, helpText: item.jp, helpReadings: item.readings })
      };
    });
    return exercises;
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
      // Version 1 is the high-contrast purple/blue, cat-eared form. The
      // original yellow form remains in the folder as version_0 for future
      // comparison and is no longer used by the live world.
      sprite: 'assets/img/grimmerglen/booha_grimmerglen_version_1.webp'
    },
    marietta: {
      // room_01 is Marietta's room — the entry point from Karasuki and
      // where her "Talk to Marietta / Leave Grimmerglen" popup lives
      // (foundation pass 3), the same way Muenba's Nuppi anchors room_01
      // there.
      roomId: 'room_01',
      x: 434,
      y: 504,
      hitR: 76,
      // Booha currently renders at a 52px diameter; keep Marietta only a
      // little larger, fixed in place, with a soft glow instead of a bob.
      drawR: 36,
      poses: Array.from({ length: 5 }, (_, index) => {
        const pose = String(index + 1).padStart(2, '0');
        return `assets/img/grimmerglen/marietta/marietta_${pose}.webp`;
      })
    },
    dance: {
      marietta: Array.from({ length: 3 }, (_, index) => `assets/img/grimmerglen/dance/marietta_dance_${String(index + 1).padStart(2, '0')}.webp`),
      booha: Array.from({ length: 3 }, (_, index) => `assets/img/grimmerglen/dance/booha_grimmerglen_dance_version_1_${String(index + 1).padStart(2, '0')}.webp`)
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

    // Placement manifest -- 8 types x 3 instance slots. room_01 is reserved
    // for Marietta and the Karasuki return portal, so every memory object is
    // distributed across rooms 02-15. Runtime positions rotate through the
    // clearings on each room visit.
    objects: {
      banner:        [ { room: 'room_02', x: 500,  y: 220 }, { room: 'room_10', x: 520,  y: 840 }, { room: 'room_08', x: 1040, y: 220 } ],
      ticket:        [ { room: 'room_03', x: 1040, y: 840 }, { room: 'room_07', x: 190,  y: 540 }, { room: 'room_11', x: 500,  y: 220 } ],
      pillow:        [ { room: 'room_04', x: 1040, y: 840 }, { room: 'room_12', x: 520,  y: 840 }, { room: 'room_10', x: 1040, y: 220 } ],
      backpack:      [ { room: 'room_05', x: 500,  y: 220 }, { room: 'room_13', x: 1040, y: 840 }, { room: 'room_04', x: 520,  y: 220 } ],
      book:          [ { room: 'room_06', x: 1040, y: 220 }, { room: 'room_14', x: 520,  y: 840 }, { room: 'room_05', x: 1040, y: 840 } ],
      teddyBear:     [ { room: 'room_07', x: 520,  y: 840 }, { room: 'room_15', x: 1040, y: 840 }, { room: 'room_11', x: 1040, y: 220 } ],
      toGoCoffeeCup: [ { room: 'room_08', x: 190,  y: 540 }, { room: 'room_02', x: 1040, y: 840 }, { room: 'room_06', x: 190,  y: 540 } ],
      ball:          [ { room: 'room_09', x: 1340, y: 540 }, { room: 'room_03', x: 500,  y: 840 }, { room: 'room_07', x: 1340, y: 540 } ]
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
    // Retained as a content reference while the live exercises below use the
    // clarified same-sentence, fading-helper design.
    legacyMemories: {
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
    },

    stories: MEMORY_STORIES,
    memories: makeMemoryExercises()
  };
})();
