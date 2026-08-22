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
})();
