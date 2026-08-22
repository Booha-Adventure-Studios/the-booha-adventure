/*
 * Utsuroba ambient drifter dialogue.
 *
 * These are weekly conversation fragments, not reading episodes. They can
 * rotate freely without changing episode IDs, saved memory records, or the
 * Three Echoes convergence. Each fragment carries a small Japanese support
 * line; the renderer adds ruby readings without authors having to write HTML.
 */
(function () {
  'use strict';

  function jp(text, readings) { return { text: text, readings: readings }; }
  function line(en, text, readings) { return { en: en, jp: jp(text, readings) }; }

  window.UTSUROBA_DIALOGUE = {
    ks: [
      {
        idle: line('The rain is quiet tonight.', '雨は、今夜は静かです。', { '雨':'あめ', '今夜':'こんや', '静':'しず' }),
        offer: line('If you search for a memory, listen for the sound.', '記憶を探すなら、音を聞け。', { '記憶':'きおく', '探':'さが', '音':'おと', '聞':'き' }),
        restored: line('When the light returns, the road returns too.', '灯りが戻ると、道も戻る。', { '灯り':'あかり', '戻':'もど', '道':'みち' })
      },
      {
        idle: line('This week\'s light feels far away.', '今週の灯りは、少し遠い。', { '今週':'こんしゅう', '灯り':'あかり', '少':'すこ', '遠':'とお' }),
        offer: line('The lost thing is somewhere quiet.', '失くした物は、静かな場所にある。', { '失':'な', '物':'もの', '静':'しず', '場所':'ばしょ' }),
        restored: line('You found the words you had forgotten.', '君は、忘れた言葉を見つけた。', { '君':'きみ', '忘':'わす', '言葉':'ことば', '見':'み' })
      },
      {
        idle: line('When you arrive, the room grows brighter.', '君が来ると、部屋が明るくなる。', { '君':'きみ', '来':'く', '部屋':'へや', '明':'あか' }),
        offer: line('Do not lose sight of the light this time.', '今度は、灯りを見失うな。', { '今度':'こんど', '灯り':'あかり', '見失':'みうしな' }),
        restored: line('There is sound in this room again.', 'この部屋に、また音がある。', { '部屋':'へや', '音':'おと' })
      }
    ],

    nto: [
      {
        idle: line('I remembered something sweet today.', '今日は何か甘い物を思い出した。', { '今日':'きょう', '何':'なに', '甘':'あま', '物':'もの', '思い出':'おもいだ' }),
        offer: line('If you see a red thing, tell me.', '赤い物を見たら、ぼくに教えて。', { '赤':'あか', '物':'もの', '見':'み', '教':'おし' }),
        restored: line('The memory is bigger than a pocket.', '記憶は、ポケットより大きいんだね。', { '記憶':'きおく', '大':'おお' })
      },
      {
        idle: line('An empty pocket can still hold a happy feeling.', 'ポケットは空っぽでも、気持ちは元気。', { '空':'から', '気持':'きも', '元気':'げんき' }),
        offer: line('The lost memory may be laughing nearby.', 'なくした記憶は、近くで笑っている。', { '記憶':'きおく', '近':'ちか', '笑':'わら' }),
        restored: line('I remember, and my stomach feels lighter.', '思い出すと、お腹も少し軽い。', { '思い出':'おもいだ', '腹':'はら', '少':'すこ', '軽':'かる' })
      },
      {
        idle: line('When you arrive, my memory starts moving.', '君が来ると、ぼくの記憶が動く。', { '君':'きみ', '来':'く', '記憶':'きおく', '動':'うご' }),
        offer: line('Let us gather the clues one at a time.', '一つずつ、手がかりを集めよう。', { '一':'ひと', '手':'て', '集':'あつ' }),
        restored: line('You did not laugh at my little mystery.', '君は、ぼくの小さな謎を笑わなかった。', { '君':'きみ', '小':'ちい', '謎':'なぞ', '笑':'わら' })
      }
    ],

    cg: [
      {
        idle: line('The hallway sounds gentle today.', '廊下の音が、今日はやさしい。', { '廊下':'ろうか', '音':'おと', '今日':'きょう' }),
        offer: line('Let us check one frightening thing at a time.', '怖い物を一つずつ、確かめよう。', { '怖':'こわ', '物':'もの', '一':'ひと', '確':'たし' }),
        restored: line('Even a reflection cannot hurt you now.', '反射は怖くても、君を傷つけない。', { '反射':'はんしゃ', '怖':'こわ', '君':'きみ', '傷':'きず' })
      },
      {
        idle: line('Please do not look beyond the door yet.', '扉の向こうを、まだ見ないで。', { '扉':'とびら', '向':'む', '見':'み' }),
        offer: line('There may be a memory near the mirror.', '鏡の近くに、記憶があるかも。', { '鏡':'かがみ', '近':'ちか', '記憶':'きおく' }),
        restored: line('You came back, and the hallway feels wider.', '君が戻ると、廊下が広く見える。', { '君':'きみ', '戻':'もど', '廊下':'ろうか', '広':'ひろ', '見':'み' })
      },
      {
        idle: line('When someone is here, I feel a little safer.', '人の気配があると、少し安心する。', { '人':'ひと', '気配':'けはい', '少':'すこ', '安心':'あんしん' }),
        offer: line('Take a breath before you open the door.', '扉を開ける前に、息をしよう。', { '扉':'とびら', '開':'あ', '前':'まえ', '息':'いき' }),
        restored: line('You do not have to run away anymore.', '見つめても、もう逃げなくていい。', { '見':'み', '逃':'に' })
      }
    ],

    bh: [
      {
        idle: line('The rain on the window is soft today.', '窓の雨は、今日はやわらかい。', { '窓':'まど', '雨':'あめ', '今日':'きょう' }),
        offer: line('Let us look below the window one more time.', '窓の下を、もう一度見てみよう。', { '窓':'まど', '下':'した', '一度':'いちど', '見':'み' }),
        restored: line('I finally remembered why I stayed.', '残る理由を、やっと思い出した。', { '残':'のこ', '理由':'りゆう', '思い出':'おもいだ' })
      },
      {
        idle: line('I am still thinking about why I am here.', 'ここにいる理由を、まだ考えている。', { '理由':'りゆう', '考':'かんが' }),
        offer: line('There are words near the name.', '名前の近くに、残った言葉がある。', { '名前':'なまえ', '近':'ちか', '残':'のこ', '言葉':'ことば' }),
        restored: line('A name can be small and still remain.', '名前は小さくても、消えない。', { '名前':'なまえ', '小':'ちい', '消':'き' })
      },
      {
        idle: line('The window is not asking me to leave today.', '窓は、今日は出ていけと言っていない。', { '窓':'まど', '今日':'きょう', '出':'で', '言':'い' }),
        offer: line('After the rain stops, let us look for the answer.', '雨が止んだあとに、答えを探そう。', { '雨':'あめ', '止':'や', '後':'あと', '答':'こた', '探':'さが' }),
        restored: line('A welcome can live inside a window.', '歓迎の言葉は、窓の中にある。', { '歓迎':'かんげい', '言葉':'ことば', '窓':'まど', '中':'なか' })
      }
    ],

    bk: [
      {
        idle: line('Please do not come too close today.', '今日は誰も、近づきすぎないで。', { '今日':'きょう', '誰':'だれ', '近':'ちか' }),
        offer: line('We only need three short facts.', '短い事実を、三つだけ集める。', { '短':'みじか', '事実':'じじつ', '三':'みっ', '集':'あつ' }),
        restored: line('Words that push people away can also protect them.', '遠ざける言葉も、守ることがある。', { '遠':'とお', '言葉':'ことば', '守':'まも' })
      },
      {
        idle: line('The badge is still useful.', 'そのバッジは、まだ役に立つ。', { '役':'やく', '立':'た' }),
        offer: line('Do not decide the badge\'s meaning for me.', 'バッジの意味を、勝手に決めるな。', { '意味':'いみ', '勝手':'かって', '決':'き' }),
        restored: line('When no one stays near, even laughter disappears.', '誰も近くにいないと、笑い声も消える。', { '誰':'だれ', '近':'ちか', '笑':'わら', '声':'こえ', '消':'き' })
      },
      {
        idle: line('Without laughter, the room is very quiet.', '笑い声がないと、部屋は静かだ。', { '笑':'わら', '声':'こえ', '部屋':'へや', '静':'しず' }),
        offer: line('I want to know why someone laughed.', '誰かが笑った理由を、見つけたい。', { '誰':'だれ', '笑':'わら', '理由':'りゆう', '見':'み' }),
        restored: line('I have not decided when to remove the badge.', 'バッジを外す日は、まだ決めていない。', { '外':'はず', '日':'ひ', '決':'き' })
      }
    ],

    ph: [
      {
        idle: line('I found someone whose collar was crooked.', '襟が曲がっている人を、見つけました。', { '襟':'えり', '曲':'ま', '人':'ひと', '見':'み' }),
        offer: line('Let us look for one little ribbon.', '小さなリボンを、一つ探しましょう。', { '小':'ちい', '一':'ひと', '探':'さが' }),
        restored: line('I am still arranging things for the person who did not return.', '戻ってこない人のために、今も整えています。', { '戻':'もど', '人':'ひと', '今':'いま', '整':'ととの' })
      },
      {
        idle: line('I am carrying two ribbons today.', '今日はリボンを、二つ持っています。', { '今日':'きょう', '二':'ふた', '持':'も' }),
        offer: line('The feeling of waiting does not disappear.', '誰かを待つ気持ちは、忘れません。', { '誰':'だれ', '待':'ま', '気持':'きも', '忘':'わす' }),
        restored: line('The ribbon remains after goodbye.', 'リボンは、さよならの後も残ります。', { '後':'あと', '残':'のこ' })
      },
      {
        idle: line('People who wait need a beautiful place.', '待つ人には、きれいな場所が必要です。', { '待':'ま', '人':'ひと', '場所':'ばしょ', '必要':'ひつよう' }),
        offer: line('If we tie it carefully, the memory may settle.', 'きちんと結べば、記憶も落ち着きます。', { '結':'むす', '記憶':'きおく', '落':'お' }),
        restored: line('Your collar is fine today, darling.', '君の襟も、今日は大丈夫です。', { '君':'きみ', '襟':'えり', '今日':'きょう', '大丈夫':'だいじょうぶ' })
      }
    ]
  };

  // The original drifter arrays were English-only. Keep their wording and
  // progress behavior, but give every existing line a Japanese companion so
  // the whole conversation—not only the rotating opener—has reading support.
  const L = line;
  window.UTSUROBA_LEGACY_DIALOGUE = {
    ks: {
      idle: [
        L('…What.', '…何だ。', { '何':'なん' }),
        L('You\'re not from here.', '君は、ここから来た人ではない。', { '君':'きみ', '来':'き' }),
        L('Don\'t just stand there staring.', 'そこに立って、見つめるだけにするな。', { '立':'た', '見':'み' })
      ],
      offer: [
        L('…What.', '…何だ。', { '何':'なん' }),
        L('You again.', 'また君か。', { '君':'きみ' }),
        L('Don\'t just stand there.', 'そこに立っているだけにするな。', { '立':'た' }),
        L('I lost something.', '何かを失くした。', { '何':'なに', '失':'な' }),
        L('A memory.', '記憶だ。', { '記憶':'きおく' }),
        L('Go find it.', 'それを探してこい。', { '探':'さが' })
      ],
      restored: [
        L('You came back.', '君は戻ってきた。', { '君':'きみ', '戻':'もど' }),
        L('The lantern is quiet now.', '灯りは、今は静かだ。', { '灯り':'あかり', '今':'いま', '静':'しず' }),
        L('I remember what I could not say.', '言えなかったことを思い出した。', { '言':'い', '思い出':'おもいだ' })
      ]
    },
    nto: {
      idle: [
        L('Oh! Hey!', 'あっ、やあ！'),
        L('You\'re new, right?', '君は新しい人だよね？', { '君':'きみ', '新':'あたら' }),
        L('Hehe… I like you already!', 'えへへ…もう君が好きだよ！', { '君':'きみ', '好':'す' })
      ],
      offer: [
        L('Oh! Hey hey hey!', 'あっ、やあやあやあ！'),
        L('You came back!', '戻ってきたね！', { '戻':'もど' }),
        L('I\'ve been waiting!', 'ずっと待っていたよ！', { '待':'ま' }),
        L('I lost a memory somewhere out there…', 'あの辺で記憶を失くしたみたい…', { '辺':'へん', '記憶':'きおく', '失':'な' }),
        L('Will you find it for me? Please please please!', 'ぼくのために見つけてくれる？お願い、お願い、お願い！', { '見':'み', '願':'ねが' })
      ],
      restored: [
        L('You found it!', '見つけてくれたね！', { '見':'み' }),
        L('The candy was in my memory all along.', 'キャンディは、ずっとぼくの記憶の中にあったんだ。', { '記憶':'きおく', '中':'なか' }),
        L('Want to hear the silly part again?', 'おかしなところを、もう一度聞く？', { '一度':'いちど', '聞':'き' })
      ]
    },
    cg: {
      idle: [
        L('Ah—!', 'あっ—！'),
        L('S-sorry…', 'ご、ごめんなさい…'),
        L('I didn\'t see you there…', 'そこにいるのが見えませんでした…', { '見':'み' })
      ],
      offer: [
        L('Ah—!', 'あっ—！'),
        L('Oh… it\'s you.', 'ああ…君だったんですね。', { '君':'きみ' }),
        L('Sorry, you startled me again…', 'ごめんなさい、またびっくりしました…'),
        L('Um…', 'ええと…'),
        L('I think I lost something.', '何かを失くしたと思います。', { '何':'なに', '失':'な' }),
        L('A memory…', '記憶を…', { '記憶':'きおく' }),
        L('Would you… maybe… help me find it?', 'あの…もしかしたら…探すのを手伝ってくれますか？', { '探':'さが', '手伝':'てつだ' })
      ],
      restored: [
        L('You came back…', '戻ってきたんですね…', { '戻':'もど' }),
        L('The hallway feels smaller now.', '今は廊下が少し小さく感じます。', { '今':'いま', '廊下':'ろうか', '小':'ちい', '感':'かん' }),
        L('I can say what frightened me.', '怖かったことを言えるようになりました。', { '怖':'こわ', '言':'い' })
      ]
    },
    bh: {
      idle: [
        L('Hey…', 'やあ…'),
        L('You made it this far, huh.', 'ここまで来たんだね。', { '来':'き' }),
        L('I just got here myself.', 'ぼくも、ちょうどここへ来たところだ。', { '来':'き' }),
        L('Come back later.', 'あとで戻ってきて。', { '戻':'もど' })
      ],
      offer: [
        L('Hey…', 'やあ…'),
        L('You made it this far, huh.', 'ここまで来たんだね。', { '来':'き' }),
        L('I just got here myself.', 'ぼくも、ちょうどここへ来たところだ。', { '来':'き' }),
        L('I\'m not ready to settle in yet.', 'まだ、ここに落ち着く準備ができていない。', { '落':'お', '着':'つ', '準備':'じゅんび' }),
        L('But I did lose a memory.', 'でも、記憶を一つ失くした。', { '記憶':'きおく', '一':'ひと', '失':'な' }),
        L('Could you help me find it?', 'それを見つけるのを手伝ってくれる？', { '見':'み', '手伝':'てつだ' })
      ],
      restored: [
        L('You found my name.', 'ぼくの名前を見つけたんだね。', { '名前':'なまえ', '見':'み' }),
        L('The window was not asking me to leave.', '窓は、ぼくに出ていけと言っていたのではなかった。', { '窓':'まど', '出':'で', '言':'い' }),
        L('I remember why I stayed.', 'なぜ残ったのか、思い出した。', { '残':'のこ', '思い出':'おもいだ' })
      ]
    },
    bk: {
      idle: [
        L('…What are you.', '…お前は何だ。', { '何':'なん' }),
        L('Don\'t answer that.', 'それには答えるな。', { '答':'こた' }),
        L('You look like something someone stepped on.', '誰かに踏まれた何かみたいな顔をしている。', { '誰':'だれ', '踏':'ふ', '何':'なに', '顔':'かお' }),
        L('Come back later.', 'あとで戻ってこい。', { '戻':'もど' })
      ],
      offer: [
        L('…Still here.', '…まだここにいるのか。', { '今':'いま' }),
        L('Ugh. Fine.', 'うっ。分かった。', { '分':'わ' }),
        L('I lost something.', '何かを失くした。', { '何':'なに', '失':'な' }),
        L('Don\'t ask why it matters.', 'なぜ大事かは聞くな。', { '大事':'だいじ', '聞':'き' }),
        L('Find it. Don\'t make a thing of it.', '見つけろ。大げさにするな。', { '見':'み' })
      ],
      restored: [
        L('…You actually found it.', '…本当に見つけたのか。', { '本当':'ほんとう', '見':'み' }),
        L('Don\'t look so pleased with yourself.', 'そんなに得意そうな顔をするな。', { '得意':'とくい', '顔':'かお' }),
        L('Fine. You\'re not completely useless.', '分かった。まったく役に立たないわけではない。', { '分':'わ', '役':'やく', '立':'た' })
      ]
    },
    ph: {
      idle: [
        L('Oh my…', 'まあ…'),
        L('You\'re just the cutest thing, aren\'t you.', 'あなたは本当にかわいい子ね。', { '本当':'ほんとう', '子':'こ' }),
        L('Don\'t wander too far, okay?', 'あまり遠くへ行かないでね。', { '遠':'とお', '行':'い' }),
        L('Come back and see me later.', 'あとで戻ってきて、私に会いに来てね。', { '戻':'もど', '私':'わたし', '会':'あ' })
      ],
      offer: [
        L('Oh, you again! Wonderful.', 'まあ、またあなたね！すばらしいわ。'),
        L('Come here, let me fix your collar.', 'こちらへ来て、襟を直させてね。', { '来':'き', '襟':'えり', '直':'なお' }),
        L('I lost something of mine, sweetpea.', '私の大切な物を失くしたの、かわいい子。', { '私':'わたし', '大切':'たいせつ', '物':'もの', '失':'な' }),
        L('Would you find it for me? Pretty please?', '私のために見つけてくれる？お願いね。', { '私':'わたし', '見':'み', '願':'ねが' })
      ],
      restored: [
        L('There you are!', 'そこにいたのね！'),
        L('You found it—come here, let me squeeze your cheeks.', '見つけたのね—こちらへ来て、ほっぺをぎゅっとさせて。', { '見':'み', '来':'き' }),
        L('I knew you had a good heart.', 'あなたが優しい心を持っていると分かっていたわ。', { '優':'やさ', '心':'こころ', '持':'も' })
      ]
    }
  };
})();
