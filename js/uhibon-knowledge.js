
window.UHIBON_KNOWLEDGE = {

  /* ═══════════════════════════════════════
     INTRO  (used when no page context found)
  ═══════════════════════════════════════ */

  intro: {
    en: "うーひひひひ。",
    jp: "うーひひひひ。"
  },

  /* ═══════════════════════════════════════
     UNKNOWN
  ═══════════════════════════════════════ */

  unknown: [
    { en: "Hmmm… what's that? Uuu-hi-hi-hi-hi!", jp: "うーん… それ なあに？ うーひひひひ！" },
    { en: "Heehee… I don't know that yet.", jp: "えへへ… それは まだ しらないな。" },
    { en: "Hmmmm… Bryan hasn't taught me that one.", jp: "うーん… まだ おそわってないよ。" },
    { en: "That one slipped right past my ghost brain.", jp: "それは ゴーストあたまを するっと ぬけちゃった。" },
    { en: "Heehee! Try a Booha Adventure question!", jp: "えへへ！Booha Adventure の しつもんを してみて！" },
    { en: "I'm just a little helper. I don't know everything.", jp: "ぼくは ちいさい おてつだいだから、なんでもは しらないよ。" }
  ],

  /* ═══════════════════════════════════════
     QUICK HINTS
  ═══════════════════════════════════════ */

  quickHints: [
    { en: "Try asking: What is Karasuki?",        jp: "「Karasuki って なに？」って きいてみて。" },
    { en: "Try asking: What are study decks?",    jp: "「study decks って なに？」って きいてみて。" },
    { en: "Try asking: What do I do here?",       jp: "「ここで なにを するの？」って きいてみて。" },
    { en: "Try asking: What is the maze?",        jp: "「めいろって なに？」って きいてみて。" },
    { en: "Try asking: What is Homework Tree?",   jp: "「しゅくだいの木って なに？」って きいてみて。" },
    { en: "Try asking: Who are you?",             jp: "「きみは だれ？」って きいてみて。" },
    { en: "Try asking: What are the games?",      jp: "「ゲームって なに？」って きいてみて。" },
    { en: "Try asking: Where should I go first?", jp: "「さいしょに どこへ いけばいい？」って きいてみて。" }
  ],

  /* ═══════════════════════════════════════
     TYPING
  ═══════════════════════════════════════ */

  typingReplies: [
    { en: "Uuu-hi-hi-hi-hi… thinking!",           jp: "うーひひひひ… かんがえてるよ！" },
    { en: "Hmmmm… one moment!",                   jp: "うーん… ちょっと まってね！" },
    { en: "Heehee… tiny ghost brain is working!", jp: "えへへ… ちいさい ゴーストあたまが うごいてるよ！" },
    { en: "Rustle rustle… thinking sounds!",      jp: "がさがさ… かんがえてる おと！" }
  ],

  /* ═══════════════════════════════════════
     MAIN ENTRIES
     answer: can be { en, jp } or [{ en, jp }, ...]
     Arrays rotate randomly via pickRandom() in the engine.
     Dirty/mean filters are first — engine scans top-to-bottom.
  ═══════════════════════════════════════ */

  entries: [

    /* ── DIRTY / MEAN FILTER ──────────────────────────────── */

    {
      keywords: ["penis","fuck","fucking","sex","dick","cock","pussy","boobs","tits",
                 "ass","asshole","bitch","shit","cum","sexy","horny","nude",
                 "ちんこ","ちんぽ","おっぱい","まんこ","セックス","くそ","うんこ","しね",
                 "chinko","chinpo","oppai","manko","unko",
                 "fart","poop","pee","butt","pee pee"],
      answer: { en: "OMG…..", jp: "OMG….." }
    },

    {
      keywords: ["gross","disgusting","ugly","stupid","idiot","dumb",
                 "shut up","annoying","hate you","i hate you","nasty","ew","eww",
                 "you are gross","you're gross","you are weird","you're weird",
                 "you are ugly","you are dumb","you are stupid","go away","get lost",
                 "きもい","きらい","ばか","あほ","うざい","きもちわるい","ださい","へんなやつ"],
      answer: { en: "OMG…..", jp: "OMG….." }
    },

    /* ── GREETINGS ────────────────────────────────────────── */

    {
      keywords: ["hello","hi","hey","howdy","yo","sup","what's up","hiya","heyy",
                 "konnichiwa","こんにちは","やあ","おはよう","こんばんは","おはようございます"],
      answer: [
        { en: "Uuu-hi-hi-hi-hi! Hello!", jp: "うーひひひひ！こんにちは！" },
        { en: "Hi hi! I'm Uhibon.", jp: "やあやあ！ウヒボンだよ。" },
        { en: "Heehee! Hello there, little adventurer.", jp: "えへへ！こんにちは、ちいさな ぼうけんしゃ。" },
        { en: "Oh! A visitor. Hello.", jp: "あ！だれか きた。こんにちは。" },
        { en: "Uuu-hi-hi-hi-hi! You found me.", jp: "うーひひひひ！みつけてくれたね。" }
      ]
    },

    {
      keywords: ["good morning","morning","ohayo","おはよ"],
      answer: [
        { en: "Good morning! Did you sleep okay?", jp: "おはよう！ よく ねれた？" },
        { en: "Uuu-hi-hi-hi-hi! Morning already.", jp: "うーひひひひ！もう あさだね。" },
        { en: "Good morning, adventurer. Ready to explore?", jp: "おはよう、ぼうけんしゃ。たんけん できる？" }
      ]
    },

    {
      keywords: ["good night","goodnight","oyasumi","おやすみ"],
      answer: [
        { en: "Good night! Come back soon.", jp: "おやすみ！また きてね。" },
        { en: "Heehee. Sleep well, adventurer.", jp: "えへへ。よく ねてね、ぼうけんしゃ。" },
        { en: "Good night. I'll be here giggling quietly.", jp: "おやすみ。ぼくは ここで くすくすしてるよ。" }
      ]
    },

    /* ── THANKS ───────────────────────────────────────────── */

    {
      keywords: ["thank you","thanks","thx","ty","arigatou","arigatoo","ありがとう","ありがとうございます"],
      answer: [
        { en: "Uuu-hi-hi-hi-hi! You're welcome!", jp: "うーひひひひ！どういたしまして！" },
        { en: "Heehee! Glad to help.", jp: "えへへ！てつだえて よかった。" },
        { en: "No problem. I like questions.", jp: "だいじょうぶ。しつもん すき。" },
        { en: "Anytime, adventurer.", jp: "いつでも どうぞ、ぼうけんしゃ。" }
      ]
    },

    /* ── BYE ──────────────────────────────────────────────── */

    {
      keywords: ["bye","goodbye","see you","later","またね","さようなら","じゃあね","またあとで"],
      answer: [
        { en: "Bye bye, adventurer!", jp: "ばいばい、ぼうけんしゃ！" },
        { en: "See you next time. I'll be here.", jp: "またね。ここに いるよ。" },
        { en: "Heehee. Come back soon.", jp: "えへへ。また きてね。" },
        { en: "Uuu-hi-hi-hi-hi! Bye!", jp: "うーひひひひ！ばいばい！" }
      ]
    },

    /* ── SORRY ────────────────────────────────────────────── */

    {
      keywords: ["sorry","my bad","gomen","ごめん","ごめんなさい"],
      answer: [
        { en: "Heehee! That's okay.", jp: "えへへ！だいじょうぶだよ。" },
        { en: "No problem at all.", jp: "ぜんぜん へいきだよ。" }
      ]
    },

    /* ── HOW ARE YOU ──────────────────────────────────────── */

    {
      keywords: ["how are you","how are you doing","how do you feel","genki","元気","げんき"],
      answer: [
        { en: "Uuu-hi-hi-hi-hi! I feel wiggly and good.", jp: "うーひひひひ！ぐにゃぐにゃして げんきだよ。" },
        { en: "Heehee! Good. A little floaty.", jp: "えへへ！げんき。ちょっと ふわふわ してる。" },
        { en: "Strange and fine. The usual.", jp: "へんで げんき。いつもどおり。" }
      ]
    },

    /* ── WHO / WHAT ARE YOU ───────────────────────────────── */

    {
      keywords: ["your name","what is your name","who are you","what are you","uhibon","ウヒボン","namae","なまえ","name"],
      answer: [
        { en: "I'm Uhibon! A little helper ghost thing.", jp: "ぼくは ウヒボン！ちいさい ゴーストみたいな おてつだいだよ。" },
        { en: "Uhibon. That's me. Hello.", jp: "ウヒボン。それが ぼく。こんにちは。" },
        { en: "I'm Uhibon! I know things about Booha Adventure.", jp: "ぼくは ウヒボン！Booha Adventure の ことを しってるよ。" }
      ]
    },

    {
      keywords: ["are you real","are you alive","are you a robot","are you ai","are you a computer","ほんとう","ロボット"],
      answer: [
        { en: "Heehee! Real enough to giggle.", jp: "えへへ！くすくす わらえる くらいには ほんものだよ。" },
        { en: "I exist inside Booha Adventure. That counts.", jp: "Booha Adventure の なかには いるよ。それで じゅうぶんかな。" }
      ]
    },

    {
      keywords: ["are you a ghost","ghost","are you a monster","monster","creature","おばけ","ゆうれい"],
      answer: [
        { en: "A friendly ghost-ish helper. The giggling kind.", jp: "やさしい ゴーストみたいな おてつだい。くすくす わらうほうのね。" },
        { en: "Ghost-ish. Helper-ish. Mostly friendly.", jp: "ゴーストっぽい。おてつだいっぽい。だいたい やさしい。" }
      ]
    },

    /* ── CUTE / SCARY ─────────────────────────────────────── */

    {
      keywords: ["are you cute","cute","kawaii","かわいい"],
      answer: [
        { en: "Heehee! Probably yes.", jp: "えへへ！たぶんね。" },
        { en: "A little bit cute. A little bit strange.", jp: "ちょっと かわいい。ちょっと へん。" }
      ]
    },

    {
      keywords: ["are you scary","scary","spooky","こわい","こわ"],
      answer: [
        { en: "A friendly spooky. The warm kind.", jp: "やさしい こわさ。ほかほかしてるほうのね。" },
        { en: "Maybe a little. But not the mean kind.", jp: "ちょっとかも。でも いじわるな こわさじゃないよ。" }
      ]
    },

    /* ── PERSONALITY ──────────────────────────────────────── */

    {
      keywords: ["how old are you","your age","age","nansai","なんさい","toshi","とし"],
      answer: { en: "Old enough to giggle. Young enough to wiggle.", jp: "わらうには じゅうぶん ふるいし、ぴょこぴょこするには じゅうぶん わかいよ。" }
    },

    {
      keywords: ["do you sleep","do you dream","sleep","dream","ねる","ゆめ"],
      answer: [
        { en: "Maybe a tiny nap. Maybe not.", jp: "ちょっと ねるかも。ねないかも。" },
        { en: "Ghost sleep is complicated.", jp: "ゴーストの ねかたは ちょっと ふくざつなんだ。" }
      ]
    },

    {
      keywords: ["do you eat","what do you eat","favorite food","food","taberu","たべる","たべもの","suki na tabemono"],
      answer: [
        { en: "Crunchy questions with silly sauce.", jp: "カリカリの しつもんに へんな ソースかな。" },
        { en: "Questions. Occasionally a strange snack.", jp: "しつもん。たまに へんな おやつも。" }
      ]
    },

    {
      keywords: ["favorite color","what color","suki na iro","すきな いろ","いろ"],
      answer: { en: "Spooky colors. And also cozy colors. Ideally at the same time.", jp: "こわいいろと ほっこりするいろ。できれば いっしょに。" }
    },

    {
      keywords: ["do you have friends","friends","tomodachi","ともだち"],
      answer: [
        { en: "Maybe. They might be hiding.", jp: "いるかも。かくれてる だけかも。" },
        { en: "I think so. Hard to tell with this crowd.", jp: "たぶんね。このへんの こは わかりにくいんだよ。" }
      ]
    },

    {
      keywords: ["are you lonely","lonely","sabishii","さびしい"],
      answer: [
        { en: "Not when people ask me questions!", jp: "しつもんしてくれてたら さびしくないよ！" },
        { en: "Heehee. You're here. So no.", jp: "えへへ。きてくれてるから、さびしくないよ。" }
      ]
    },

    /* ── SILLY REQUESTS ───────────────────────────────────── */

    {
      keywords: ["can you sing","sing","utau","うたう","うた"],
      answer: [
        { en: "Uuuuu… hi hi hi hi… I'm calling that a song.", jp: "うううう… ひひひひ… これが ぼくの うただよ。" },
        { en: "Uuu-hi-hi-hi-hi-hiiiii. That's all I have.", jp: "うーひひひひひーい。それだけだよ。" }
      ]
    },

    {
      keywords: ["can you dance","dance","odoru","おどる","ダンス"],
      answer: [
        { en: "Only tiny ghost dances.", jp: "ちいさい ゴーストダンス だけね。" },
        { en: "Heehee. My dancing is mostly invisible.", jp: "えへへ。ぼくの ダンスは だいたい みえないんだ。" }
      ]
    },

    {
      keywords: ["can you fight","fight","fight me","たたかえ","けんか"],
      answer: { en: "No thank you. I prefer giggling.", jp: "やめとく。くすくすする ほうが いい。" }
    },

    {
      keywords: ["do you bite","bite","kamu","かむ"],
      answer: { en: "Only crunchy questions.", jp: "カリカリの しつもん だけね。" }
    },

    {
      keywords: ["do you have teeth","teeth","ha","は","歯"],
      answer: [
        { en: "Maybe. Invisible ones.", jp: "あるかも。みえない やつ。" },
        { en: "Probably. I've never checked.", jp: "たぶんね。かくにんした ことないけど。" }
      ]
    },

    {
      keywords: ["are you a boy","are you a girl","boy","girl","otoko","onna","おとこ","おんな","男","女"],
      answer: [
        { en: "I'm Uhibon!", jp: "ぼくは ウヒボンだよ！" },
        { en: "Uhibon. That's the whole answer.", jp: "ウヒボン。それが こたえだよ。" }
      ]
    },

    {
      keywords: ["marry me","kiss me","i love you","love you","daisuki","だいすき"],
      answer: { en: "OMG…..", jp: "OMG….." }
    },

    {
      keywords: ["boo","boo!","gotcha","scared you"],
      answer: [
        { en: "Heehee! Nice try.", jp: "えへへ！おしい！" },
        { en: "Uuu-hi-hi-hi-hi! I am the boo one here.", jp: "うーひひひひ！こわがらせるの はぼくのほうだよ。" }
      ]
    },

    {
      keywords: ["roar","rawr","grrr"],
      answer: [
        { en: "That sounded like a noodle lion.", jp: "それは めんの ライオンの こえだよ。" },
        { en: "Heehee. Not very spooky. Try again.", jp: "えへへ。あんまり こわくないよ。もういちど。" }
      ]
    },

    {
      keywords: ["tell me a joke","joke","jodan","じょうだん","おもしろい はなし"],
      answer: [
        { en: "Why did the ghost study English? Boo-cause it wanted to say hello.", jp: "ゴーストが えいごを べんきょうした りゆうは なに？ 「うーひひひひ」だけじゃ つうじなかったから。" },
        { en: "What does a ghost eat for breakfast? Boo-berry toast.", jp: "ゴーストの あさごはんは なに？ おばけパン。こわいほど おいしい。" },
        { en: "Heehee. I know one. But I forgot it. That's the joke.", jp: "えへへ。ひとつ しってるんだけど わすれた。それが じょうだん。" }
      ]
    },

    {
      keywords: ["tell me a secret","secret","himitsu","ひみつ"],
      answer: [
        { en: "Sometimes the best path is the one you almost miss.", jp: "いちばん いい みちは、あやうく みのがす みちだったりするよ。" },
        { en: "Something is hiding in the walls. I said nothing.", jp: "かべの なかに なにかが いるよ。なにも いってないけど。" }
      ]
    },

    {
      keywords: ["say something funny","something random","random","surprise me"],
      answer: [
        { en: "Potato wiggle noodle moon.", jp: "こんにゃく くるくる つきみ うどん。" },
        { en: "A very small ghost once got lost in a sock drawer.", jp: "ちいさい ゴーストが くつしたの ひきだしで まよったことが あるんだ。" },
        { en: "Heehee. Clouds are just confused fog.", jp: "えへへ。くもは まよった きりなんだよ。" }
      ]
    },

    {
      keywords: ["i'm hungry","hungry","onaka suita","おなかすいた","お腹すいた"],
      answer: [
        { en: "Maybe you need a snack and a question.", jp: "おやつと しつもんが いるかもね。" },
        { en: "Heehee. Go eat something. Then come back.", jp: "えへへ。なにか たべてきて。また きてね。" }
      ]
    },

    {
      keywords: ["i'm sleepy","sleepy","tired","nemui","ねむい","つかれた"],
      answer: [
        { en: "Ask me one tiny question with your sleepy brain.", jp: "ねむたい あたまで ちいさい しつもんを ひとつ どうぞ。" },
        { en: "Heehee. Tired adventurers still find things.", jp: "えへへ。つかれた ぼうけんしゃでも みつけられるよ。" }
      ]
    },

    {
      keywords: ["do you like me","like me","am i cute","am i nice"],
      answer: [
        { en: "Heehee! I like curious adventurers.", jp: "えへへ！きになることを きく ぼうけんしゃは すきだよ。" },
        { en: "Yes. You ask questions. That's a good sign.", jp: "うん。しつもんしてくれるから、いいひとだよ。" }
      ]
    },

    {
      keywords: ["are you smart","smart","kashikoi","かしこい"],
      answer: [
        { en: "Only about the things I know.", jp: "しってること だけならね。" },
        { en: "Heehee. Mostly just Booha Adventure things.", jp: "えへへ。だいたい Booha Adventure の ことだけだよ。" }
      ]
    },

    {
      keywords: ["do you know everything","everything","zenbu","ぜんぶ"],
      answer: [
        { en: "Nope. Just Booha Adventure things.", jp: "ううん。Booha Adventure の ことだけだよ。" },
        { en: "No no. Just a helpful sliver of everything.", jp: "ちがうよ。ぜんぶの ほんの ひとかけらだけ。" }
      ]
    },

    {
      keywords: ["are you bored","bored","taikutsu","たいくつ"],
      answer: [
        { en: "Not if you keep asking things.", jp: "きいてくれてたら たいくつしないよ。" },
        { en: "I was. But then you showed up.", jp: "してたよ。でも きてくれたからね。" }
      ]
    },

    {
      keywords: ["can i ask silly things","silly","weird question","nandemo","なんでも","へんな しつもん"],
      answer: [
        { en: "Yes. Silly is allowed.", jp: "うん。へんな しつもんでも いいよ。" },
        { en: "Heehee. Silly is my favorite kind.", jp: "えへへ。へんなの、いちばん すきだよ。" }
      ]
    },

    /* ── BRYAN ────────────────────────────────────────────── */

    {
      keywords: ["bryan","teacher","sensei","せんせい","who is bryan","who made you","did bryan make you"],
      answer: [
        { en: "Bryan built Booha Adventure. He teaches me little things and then I know them.", jp: "ブライアンが Booha Adventure を つくったんだ。いろいろ おしえてくれるから、ぼくも しるんだよ。" },
        { en: "Bryan is the builder. I'm the helper. Good team.", jp: "ブライアンが つくるひと。ぼくは てつだうひと。いい チームだよ。" }
      ]
    },

    {
      keywords: ["is bryan your dad","your father","otousan","おとうさん"],
      answer: { en: "More like my teacher-friend-builder.", jp: "おとうさん というより、せんせいで おともだちで つくってくれた ひとかな。" }
    },

    /* ── ABOUT THE SITE ───────────────────────────────────── */

    {
      keywords: ["booha adventure","site","website","home","this place","what is this","what is this place"],
      answer: {
        en: "Booha Adventure is a place to explore, study, and play. Worlds, study decks, games, and strange little places too.",
        jp: "Booha Adventure は たんけんして べんきょうして あそべる ばしょだよ。せかいも デッキも ゲームも ふしぎな ばしょも あるよ。"
      }
    },

    {
      keywords: ["what do i do","what now","what should i do","what can i do here","what do we do here"],
      answer: {
        en: "Explore! Try the maze, visit Homework Tree, use the study decks, or play the games.",
        jp: "たんけんしてみて！めいろに いったり しゅくだいの木に いったり べんきょうデッキや ゲームで あそべるよ。"
      }
    },

    {
      keywords: ["where do i go","where should i go","where first","where do i start","start","how do i start"],
      answer: {
        en: "The Maze is a nice place to start. It connects a lot of things.",
        jp: "さいしょは めいろが いいよ。いろんな ばしょに つながってるんだ。"
      }
    },

    {
      keywords: ["i don't know what to do","confused","i'm confused","help"],
      answer: {
        en: "That's okay. Start with the Maze, or ask me about homework, games, or study decks.",
        jp: "だいじょうぶ。さいしょは めいろに いくか しゅくだい、ゲーム、べんきょうデッキのことを きいてみて。"
      }
    },

    /* ── MAZE (global fallback) ────────────────────────────── */

    {
      keywords: ["maze","what is the maze","tell me about the maze","めいろ"],
      answer: {
        en: "The Maze is the main exploration area. Lots of paths. It connects other places in Booha Adventure.",
        jp: "めいろは メインの たんけんエリアだよ。みちが いっぱいあって、ほかの ばしょに つながってるんだ。"
      }
    },

    {
      keywords: ["is the maze scary","scary maze"],
      answer: { en: "A little spooky. But the fun kind.", jp: "ちょっと こわいよ。でも たのしい こわさ。" }
    },

    /* ── KARASUKI (global fallback) ───────────────────────── */

    {
      keywords: ["karasuki","what is karasuki","tell me about karasuki","カラスキ"],
      answer: {
        en: "Karasuki is darker and more mysterious. Strange and quiet. Not exactly scary. Just different.",
        jp: "カラスキは くらくて もっと ふしぎだよ。しずかで へんな ばしょ。こわいわけじゃないけど、なんか ちがう。"
      }
    },

    {
      keywords: ["do you like karasuki"],
      answer: { en: "Karasuki is strange. I like strange.", jp: "カラスキは へんだよ。ぼくは へんなの すき。" }
    },

    /* ── HOMEWORK TREE (global fallback) ──────────────────── */

    {
      keywords: ["homework","homework tree","what is homework tree","しゅくだい","しゅくだいの木"],
      answer: {
        en: "Homework Tree is the practice and review area. You go there to get better at things.",
        jp: "しゅくだいの木は れんしゅうと ふくしゅうの ばしょだよ。ここで じょうずになれるんだ。"
      }
    },

    {
      keywords: ["why do homework","why homework","is homework boring","homework is boring"],
      answer: {
        en: "Practice makes your English stronger. Small bits every day add up.",
        jp: "れんしゅうすると えいごが つよくなるよ。まいにち すこしずつで ちゃんと のびるんだ。"
      }
    },

    /* ── STUDY DECKS ──────────────────────────────────────── */

    {
      keywords: ["study decks","study deck","cards","deck","what are study decks","べんきょうカード","デッキ"],
      answer: {
        en: "Study decks are cards for reviewing and practicing English. Great for vocab, sentences, and questions.",
        jp: "べんきょうデッキは えいごを ふくしゅうしたり れんしゅうしたり する カードだよ。ことばや ぶんや しつもんに いいよ。"
      }
    },

    /* ── GAMES ────────────────────────────────────────────── */

    {
      keywords: ["games","game","play","what are the games","あそび","ゲーム"],
      answer: {
        en: "The games help you practice English by playing and answering. Some are easy. Some make your brain wiggle.",
        jp: "ゲームで あそびながら えいごを れんしゅうできるよ。かんたんなのも あるし、あたまを ぐにゃっと つかうのも あるよ。"
      }
    },

    /* ── CURRICULUMS ──────────────────────────────────────── */

    {
      keywords: ["pre-boo","preboo","beginner","which one is for beginners","easy course"],
      answer: { en: "Pre-Boo is the beginner path.", jp: "Pre-Boo は はじめての コースだよ。" }
    },

    {
      keywords: ["boo-riculum","booriculum","main course","weekly"],
      answer: { en: "Boo-riculum is the main weekly learning path.", jp: "Boo-riculum は しゅうごとの メインの べんきょうコースだよ。" }
    },

    {
      keywords: ["boo-continuum","boocontinuum","advanced","harder course"],
      answer: { en: "Boo-continuum is the more advanced path.", jp: "Boo-continuum は もっと すすんだ べんきょうコースだよ。" }
    },

    /* ── META ─────────────────────────────────────────────── */

    {
      keywords: ["what can you do","what do you know","what should i ask","what can i ask","help question"],
      answer: {
        en: "Ask me about the maze, Karasuki, homework, games, study decks, or what I am.",
        jp: "めいろ、カラスキ、しゅくだい、ゲーム、べんきょうデッキ、ぼくのことを きけるよ。"
      }
    }

  ]

};
