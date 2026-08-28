
window.UTSUROBA_DATA = {

  startRoom: "room_03",

  readingConvergence: {
    gateRoom: "room_03",
    x: 0.50,
    y: 0.31,
    requiredDrifterIds: ["ks", "nto", "cg"],
    title: "The Three Echoes",
    titleJP: "三つの残響",
    intro: "The memories are different, but each person found a small truth inside the fear.",
    introJP: "記憶は違いますが、三人とも恐怖の中に小さな真実を見つけました。",
    cluePrompt: "Choose the key clue from each memory.",
    cluePromptJP: "それぞれの記憶から、大切な手がかりを選びましょう。",
    clueChecks: [
      {
        episodeId: "ks_lantern_v1",
        title: "Kurobane's clue",
        titleJP: "クロバネの手がかり",
        choices: [
          "The missing lantern explained why Chiyo could not find the way home.",
          "The second bell made Chiyo forget every room.",
          "Kurobane wanted to hide a new lantern."
        ],
        choicesJP: [
          "消えた灯りが、チヨが帰り道を見つけられなかった理由を説明した。",
          "二つ目の鐘が、チヨにすべての部屋を忘れさせた。",
          "クロバネは新しい灯りを隠したかった。"
        ],
        correct: 0
      },
      {
        episodeId: "nto_candy_v1",
        title: "Ned's clue",
        titleJP: "ネドの手がかり",
        choices: [
          "The missing candy may have been eaten and forgotten.",
          "The red wrapper proved that someone stole the candy.",
          "Ned never had a candy in the first place."
        ],
        choicesJP: [
          "なくなったキャンディは、食べて忘れたのかもしれない。",
          "赤い包み紙は、誰かがキャンディを盗んだ証拠だった。",
          "ネドは、最初からキャンディを持っていなかった。"
        ],
        correct: 0
      },
      {
        episodeId: "cg_door_v1",
        title: "Chagrin's clue",
        titleJP: "チャグリンの手がかり",
        choices: [
          "The frightening shape was only Chagrin's reflection.",
          "The door became a person in the dark.",
          "The hall was empty, so Chagrin had no reason to be afraid."
        ],
        choicesJP: [
          "怖い形は、チャグリン自身の反射だった。",
          "暗闇の中で、扉が人になった。",
          "廊下は空っぽだったので、チャグリンが怖がる理由はなかった。"
        ],
        correct: 0
      }
    ],
    clueSuccess: "Good clue. Keep building the connection.",
    clueSuccessJP: "よい手がかりです。つながりを作り続けましょう。",
    clueRetry: "Read that memory again and choose the clue it proves.",
    clueRetryJP: "その記憶をもう一度読み、証明される手がかりを選びましょう。",
    prompt: "What connects the three memories?",
    promptJP: "三つの記憶をつなぐものは何ですか？",
    choices: [
      "Each person understood something that first frightened them.",
      "Everyone lost the same object.",
      "None of them remembered another person."
    ],
    choicesJP: [
      "三人とも、最初は怖かったことを理解した。",
      "全員が同じ物をなくした。",
      "誰も他の人を覚えていなかった。"
    ],
    correct: 0,
    success: "The gate opens. Utsuroba is no longer only a place where memories disappear.",
    successJP: "門が開いた。うつろばは、記憶が消えるだけの場所ではなくなった。",
    garden: {
      title: "The Memory Garden",
      titleJP: "記憶の庭",
      intro: "The three memories have changed the place. Their truths can grow here now.",
      introJP: "三つの記憶が、この場所を変えました。真実がここで育ちます。",
      returnText: "Come back when a new memory needs a place to grow.",
      returnTextJP: "新しい記憶が育つ場所を必要としたら、また来てください。",
      quotes: [
        { drifterId: "ks", name: "Kurobane", quote: "A lost light can still show us why someone left." },
        { drifterId: "nto", name: "Ned", quote: "Sometimes the mystery is hiding in the person who remembers it." },
        { drifterId: "cg", name: "Chagrin", quote: "A frightening shape becomes smaller when we can name it." }
      ]
    }
  },

  readingRelationships: {
    triggerEpisodeId: "bh_window_v1",
    title: "A shared welcome",
    titleJP: "共有された歓迎"
  },

  // *JP fields below carry <ruby> furigana markup (see js/utsu-furigana.js)
  // rather than plain text — this object is only ever consumed by the
  // Weekly Reading Trail renderer in js/utsuroba.js, which renders these
  // fields directly (not through escapeHTML), so the markup is trusted and
  // safe to embed here. Do not reuse these *JP fields elsewhere without
  // checking that assumption still holds.
  readingChallenge: {
    title: "Weekly Reading Trail",
    titleJP: "<ruby>週間<rt>しゅうかん</rt></ruby><ruby>読書<rt>どくしょ</rt></ruby>トレイル",
    intro: "Collect four small wins before the curriculum week changes.",
    introJP: "カリキュラムの<ruby>週<rt>しゅう</rt></ruby>が<ruby>変<rt>か</rt></ruby>わる<ruby>前<rt>まえ</rt></ruby>に、<ruby>小<rt>ちい</rt></ruby>さな<ruby>成功<rt>せいこう</rt></ruby>を<ruby>四<rt>よっ</rt></ruby>つ<ruby>集<rt>あつ</rt></ruby>めましょう。",
    complete: "The trail is complete. Your reading has a shape this week.",
    completeJP: "トレイル<ruby>達成<rt>たっせい</rt></ruby>。<ruby>今週<rt>こんしゅう</rt></ruby>の<ruby>読書<rt>どくしょ</rt></ruby>が<ruby>形<rt>かたち</rt></ruby>になりました。",
    goals: [
      {id: "memories", target: 2, label: "Restore 2 memories", labelJP: "<ruby>記憶<rt>きおく</rt></ruby>を2つ<ruby>戻<rt>もど</rt></ruby>す", complete: "Two memories are glowing.", completeJP: "<ruby>二<rt>ふた</rt></ruby>つの<ruby>記憶<rt>きおく</rt></ruby>が<ruby>光<rt>ひか</rt></ruby>っています。"},
      {id: "evidence", target: 1, label: "Use evidence once", labelJP: "<ruby>証拠<rt>しょうこ</rt></ruby>を1<ruby>回<rt>かい</rt></ruby><ruby>使<rt>つか</rt></ruby>う", complete: "You looked closely.", completeJP: "よく<ruby>読<rt>よ</rt></ruby>みました。"},
      {id: "postcard", target: 1, label: "Save a postcard", labelJP: "<ruby>文章<rt>ぶんしょう</rt></ruby>カードを<ruby>保存<rt>ほぞん</rt></ruby>する", complete: "Your summary is saved.", completeJP: "まとめを<ruby>保存<rt>ほぞん</rt></ruby>しました。"},
      {id: "lens", target: 1, label: "Try a replay lens", labelJP: "<ruby>読<rt>よ</rt></ruby>み<ruby>返<rt>かえ</rt></ruby>しの<ruby>視点<rt>してん</rt></ruby>を<ruby>試<rt>ため</rt></ruby>す", complete: "You changed the way you read.", completeJP: "<ruby>読<rt>よ</rt></ruby>み<ruby>方<rt>かた</rt></ruby>を<ruby>変<rt>か</rt></ruby>えてみました。"}
    ]
  },

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
      sprite1         : './assets/img/drifters/kurobane_shizuma-1.webp',
      sprite2         : './assets/img/drifters/kurobane_shizuma-2.webp',
      episodeId       : 'ks_lantern_v1',
      restoredGreeting: ['You came back.', 'The lantern is quiet now.', 'I remember what I could not say.'],
      convergenceGreeting: ['The garden is open.', 'Ned found his candy. Chagrin found his reflection.', 'I think I know where Chiyo went now.'],
      relationshipGreeting: ['Bryan remembers a welcome.', 'Maybe Utsuroba is learning how to keep people here.', 'I want to hear the whole story.'],
      memoryCount     : 1,
      scale           : 0.18,
    },
    {
      id              : 'nto',
      name            : 'Ned the Oogle',
      nameKanji       : 'ネド・ザ・オーグル',
      
      greeting        : ['Oh! Hey!', 'You\'re new, right?', 'Hehe… I like you already!'],
      questLines      : ['Oh! Hey hey hey!', 'You came back!', 'I\'ve been waiting!', 'I lost a memory somewhere out there…', 'Will you find it for me? Please please please?'],
      sprite1         : './assets/img/drifters/ned-the-oogle-1.webp',
      sprite2         : './assets/img/drifters/ned-the-oogle-2.webp',
      episodeId       : 'nto_candy_v1',
      restoredGreeting: ['You found it!', 'The candy was in my memory all along.', 'Want to hear the silly part again?'],
      convergenceGreeting: ['The garden is growing!', 'Kurobane found his lantern, Chagrin found his reflection — my silly candy belongs with them too!', 'Maybe remembering together is the best part.'],
      relationshipGreeting: ['Bryan has a welcome memory!', 'That is much better than losing a candy.', 'We should save the sentence somewhere safe.'],
      memoryCount     : 1,
      scale           : 0.18,
    },
    {
      id              : 'cg',
      name            : 'Chagrin Gobito',
      nameKanji       : 'チャグリン・ゴビト',
      
      greeting        : ['Ah—!', 'S-sorry…', 'I didn\'t see you there…'],
      questLines      : ['Ah—!', 'Oh… it\'s you.', 'Sorry, you startled me again…', 'Um…', 'I think I lost something.', 'A memory…', 'Would you… maybe… help me find it?'],
      sprite1         : './assets/img/drifters/chagrin_gobito-1.webp',
      sprite2         : './assets/img/drifters/chagrin_gobito-2.webp',
      episodeId       : 'cg_door_v1',
      restoredGreeting: ['You came back…', 'The hallway feels smaller now.', 'I can say what frightened me.'],
      convergenceGreeting: ['The garden is quiet.', 'Kurobane found his lantern… Ned found his candy…', 'And I can look at the glass now.'],
      relationshipGreeting: ['Bryan found words under the rain.', 'Someone told him he could stay.', 'I like that memory.'],
      memoryCount     : 1,
      scale           : 0.11,
    },
    {
      id          : 'bh',
      name        : 'Bryan Harper',
      nameKanji   : 'ブライアン・ハーパー',
     
      greeting    : ['Hey…', 'You made it this far, huh.', 'I just got here myself.', 'Come back later.'],
      questLines  : ['Hey…', 'You made it this far, huh.', 'I just got here myself.', 'I’m not ready to settle in yet.', 'But I did lose a memory.', 'Could you help me find it?'],
      sprite1     : './assets/img/drifters/bryan_harper-1.webp',
      sprite2     : './assets/img/drifters/bryan_harper-2.webp',
      episodeId   : 'bh_window_v1',
      restoredGreeting: ['You found my name.', 'The window was not asking me to leave.', 'I remember why I stayed.'],
      relationshipGreeting: ['The others heard my memory.', 'Their stories made the welcome feel real.', 'I do not feel new here anymore.'],
      memoryCount : 1,
      scale       : 0.25,
    },
    {
      id          : 'bk',
      name        : 'Blakesly Kassidy',
      nameKanji   : 'ブレイクスリー・カシディ',
      
      greeting    : ['…What are you.', 'Don\'t answer that.', 'You look like something someone stepped on.', 'Come back later.'],
      questLines  : ['…Still here.', 'Ugh. Fine.', 'I lost something.', 'Don\'t ask why it matters.', 'Find it. Don\'t make a thing of it.'],
      sprite1     : './assets/img/drifters/blakesly_kassidy-1.webp',
      sprite2     : './assets/img/drifters/blakesly_kassidy-2.webp',
      episodeId   : 'bk_badge_v1',
      restoredGreeting: ['…You actually found it.', 'Don\'t look so pleased with yourself.', 'Fine. You\'re not completely useless.'],
      memoryCount : 1,
      scale       : 0.22,
    },
    {
      id          : 'ph',
      name        : 'Patricia Hollingshead',
      nameKanji   : 'パトリシア・ホリングスヘッド',
      
      greeting    : ['Oh my…', 'You\'re just the cutest thing, aren\'t you.', 'Don\'t wander too far, okay?', 'Come back and see me later.'],
      questLines  : ['Oh, you again! Wonderful.', 'Come here, let me fix your collar.', 'I lost something of mine, sweetpea.', 'Would you find it for me? Pretty please?'],
      sprite1     : './assets/img/drifters/patricia_hollingshead-1.webp',
      sprite2     : './assets/img/drifters/patricia_hollingshead-2.webp',
      episodeId   : 'ph_ribbon_v1',
      restoredGreeting: ['There you are!', 'You found it — come here, let me squeeze your cheeks.', 'I knew you had a good heart.'],
      memoryCount : 1,
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
