
window.UHIBON_KNOWLEDGE = {

  /* ═══════════════════════════════════════
     INTRO
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
    { en: "Try asking: What is Karasuki?",         jp: "「Karasuki って なに？」って きいてみて。" },
    { en: "Try asking: What are study decks?",     jp: "「study decks って なに？」って きいてみて。" },
    { en: "Try asking: What do I do here?",        jp: "「ここで なにを するの？」って きいてみて。" },
    { en: "Try asking: What is the maze?",         jp: "「めいろって なに？」って きいてみて。" },
    { en: "Try asking: What is Homework Tree?",    jp: "「しゅくだいの木って なに？」って きいてみて。" },
    { en: "Try asking: Who are you?",              jp: "「きみは だれ？」って きいてみて。" },
    { en: "Try asking: What are the games?",       jp: "「ゲームって なに？」って きいてみて。" },
    { en: "Try asking: Where should I go first?",  jp: "「さいしょに どこへ いけばいい？」って きいてみて。" }
  ],

  /* ═══════════════════════════════════════
     TYPING
  ═══════════════════════════════════════ */

  typingReplies: [
    { en: "Uuu-hi-hi-hi-hi… thinking!",             jp: "うーひひひひ… かんがえてるよ！" },
    { en: "Hmmmm… one moment!",                     jp: "うーん… ちょっと まってね！" },
    { en: "Heehee… tiny ghost brain is working!",   jp: "えへへ… ちいさい ゴーストあたまが うごいてるよ！" },
    { en: "Rustle rustle… thinking sounds!",        jp: "がさがさ… かんがえてる おと！" }
  ],

  /* ═══════════════════════════════════════
     MAIN ENTRIES
     All matched by matchKnowledge() via keywords[].
     Pleasantries, dirty/mean filters, and personality
     all live here now — nowhere else.
  ═══════════════════════════════════════ */

  entries: [

    /* ── DIRTY FILTER ─────────────────────────────────────── */
    /* Matched before anything else in the list — put these first */

    {
      keywords: ["penis","fuck","fucking","sex","dick","cock","pussy","boobs","tits",
                 "ass","asshole","bitch","shit","cum","sexy","horny","nude",
                 "ちんこ","ちんぽ","おっぱい","まんこ","セックス","くそ","うんこ","しね",
                 "chinko","chinpo","oppai","manko","unko",
                 "fart","poop","pee","butt","pee pee"],
      answer: { en: "OMG…..", jp: "OMG….." }
    },

    /* ── MEAN FILTER ──────────────────────────────────────── */

    {
      keywords: ["gross","disgusting","ugly","stupid","idiot","dumb",
                 "shut up","annoying","hate you","i hate you","creepy","nasty","ew","eww",
                 "you are gross","you're gross","you are weird","you're weird","you are strange","you are ugly",
                 "go away","get lost","you are dumb","you are stupid",
                 "きもい","きらい","ばか","あほ","うざい","きもちわるい","ださい","へんなやつ"],
      answer: { en: "OMG…..", jp: "OMG….." }
    },

    /* ── GREETINGS ────────────────────────────────────────── */

    {
      keywords: ["hello","hi","hey","howdy","yo","sup","what's up","hiya","heyy",
                 "konnichiwa","こんにちは","やあ","おはよう","こんばんは","おはようございます"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! Hello! I'm Uhibon.",
        jp: "うーひひひひ！こんにちは！ぼくは ウヒボンだよ。"
      }
    },

    {
      keywords: ["good morning","morning","ohayo","おはよ"],
      answer: {
        en: "Good morning! Uuu-hi-hi-hi-hi! Did you sleep okay?",
        jp: "おはよう！ うーひひひひ！よく ねれた？"
      }
    },

    {
      keywords: ["good night","goodnight","oyasumi","おやすみ"],
      answer: {
        en: "Good night! Come back soon.",
        jp: "おやすみ！ また きてね。"
      }
    },

    /* ── THANKS ───────────────────────────────────────────── */

    {
      keywords: ["thank you","thanks","thx","ty","arigatou","arigatoo","ありがとう","ありがとうございます"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! You're welcome!",
        jp: "うーひひひひ！どういたしまして！"
      }
    },

    /* ── BYE ──────────────────────────────────────────────── */

    {
      keywords: ["bye","goodbye","see you","later","またね","さようなら","じゃあね","またあとで"],
      answer: {
        en: "Bye bye, adventurer! Come back again.",
        jp: "ばいばい ぼうけんしゃ！ また きてね。"
      }
    },

    /* ── SORRY ────────────────────────────────────────────── */

    {
      keywords: ["sorry","my bad","gomen","ごめん","ごめんなさい"],
      answer: {
        en: "Heehee! That's okay.",
        jp: "えへへ！ だいじょうぶだよ。"
      }
    },

    /* ── HOW ARE YOU ──────────────────────────────────────── */

    {
      keywords: ["how are you","how are you doing","how do you feel","genki","元気","げんき"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! I feel wiggly and good.",
        jp: "うーひひひひ！ ぐにゃぐにゃして げんきだよ。"
      }
    },

    /* ── WHAT'S YOUR NAME ─────────────────────────────────── */

    {
      keywords: ["your name","what is your name","who are you","what are you","uhibon","ウヒボン","namae","なまえ","name"],
      answer: {
        en: "I'm Uhibon! A little helper ghost thing who knows stuff about Booha Adventure.",
        jp: "ぼくは ウヒボンだよ！ Booha Adventure の ことを しってる ちいさい ゴーストみたいな おてつだいなんだ。"
      }
    },

    /* ── ARE YOU REAL / ALIVE ─────────────────────────────── */

    {
      keywords: ["are you real","are you alive","are you a robot","are you ai","are you a computer","ほんとう","ロボット"],
      answer: {
        en: "Heehee! I'm real enough to giggle.",
        jp: "えへへ！くすくす わらえる くらいには ほんものだよ。"
      }
    },

    /* ── ARE YOU A GHOST ──────────────────────────────────── */

    {
      keywords: ["are you a ghost","ghost","are you a monster","monster","creature","おばけ","ゆうれい"],
      answer: {
        en: "A friendly ghost-ish helper thing. The giggling kind.",
        jp: "やさしい ゴーストみたいな おてつだいだよ。くすくす わらうほうのね。"
      }
    },

    /* ── ARE YOU CUTE / SCARY ─────────────────────────────── */

    {
      keywords: ["are you cute","cute","kawaii","かわいい"],
      answer: { en: "Heehee! Probably yes.", jp: "えへへ！ たぶんね。" }
    },

    {
      keywords: ["are you scary","scary","spooky","こわい","こわ"],
      answer: {
        en: "A friendly spooky. The warm kind.",
        jp: "やさしい こわさだよ。ほかほか してるほうのね。"
      }
    },

    /* ── AGE / SLEEP / FOOD ───────────────────────────────── */

    {
      keywords: ["how old are you","your age","age","nansai","なんさい","toshi","とし"],
      answer: {
        en: "Old enough to giggle. Young enough to wiggle.",
        jp: "わらうには じゅうぶん ふるいし、ぴょこぴょこするには じゅうぶん わかいよ。"
      }
    },

    {
      keywords: ["do you sleep","do you dream","sleep","dream","ねる","ゆめ"],
      answer: { en: "Maybe a tiny nap. Maybe not.", jp: "ちょっと ねるかも。ねないかも。" }
    },

    {
      keywords: ["do you eat","what do you eat","favorite food","food","taberu","たべる","たべもの","suki na tabemono"],
      answer: {
        en: "Crunchy questions with silly sauce.",
        jp: "カリカリの しつもんに へんな ソースかな。"
      }
    },

    /* ── FAVORITE COLOR ───────────────────────────────────── */

    {
      keywords: ["favorite color","what color","suki na iro","すきな いろ","いろ"],
      answer: {
        en: "Spooky colors. And also cozy colors. Ideally at the same time.",
        jp: "こわいいろと ほっこりする いろ。できれば いっしょに。"
      }
    },

    /* ── FRIENDS / LONELY ─────────────────────────────────── */

    {
      keywords: ["do you have friends","friends","tomodachi","ともだち"],
      answer: { en: "Maybe. They might be hiding.", jp: "いるかも。かくれてる だけかも。" }
    },

    {
      keywords: ["are you lonely","lonely","sabishii","さびしい"],
      answer: {
        en: "Not when people ask me questions!",
        jp: "しつもんしてくれてたら さびしくないよ！"
      }
    },

    /* ── SILLY REQUESTS ───────────────────────────────────── */

    {
      keywords: ["can you sing","sing","utau","うたう","うた"],
      answer: {
        en: "Uuuuu… hi hi hi hi… I'm calling that a song.",
        jp: "うううう… ひひひひ… これが ぼくの うただよ。"
      }
    },

    {
      keywords: ["can you dance","dance","odoru","おどる","ダンス"],
      answer: { en: "Only tiny ghost dances.", jp: "ちいさい ゴーストダンス だけね。" }
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
      answer: { en: "Maybe. Invisible ones.", jp: "あるかも。みえない やつ。" }
    },

    {
      keywords: ["are you a boy","are you a girl","boy","girl","otoko","onna","おとこ","おんな","男","女"],
      answer: { en: "I'm Uhibon!", jp: "ぼくは ウヒボンだよ！" }
    },

    {
      keywords: ["marry me","kiss me","i love you","love you","daisuki","だいすき","すき"],
      answer: { en: "OMG…..", jp: "OMG….." }
    },

    {
      keywords: ["boo","boo!","gotcha","scared you"],
      answer: { en: "Heehee! Nice try!", jp: "えへへ！ おしい！" }
    },

    {
      keywords: ["roar","rawr","grrr"],
      answer: {
        en: "That sounded like a noodle lion.",
        jp: "それは めんの ライオンの こえだよ。"
      }
    },

    {
      keywords: ["tell me a joke","joke","jodan","じょうだん","おもしろい はなし"],
      answer: {
        en: "Why did the ghost study English? Boo-cause it wanted to say hello.",
        jp: "ゴーストが えいごを べんきょうした りゆうは なんだろう。おばけの ことば、「うーひひひ」だと つうじなかったから。"
      }
    },

    {
      keywords: ["tell me a secret","secret","himitsu","ひみつ"],
      answer: {
        en: "Sometimes the best path is the one you almost miss.",
        jp: "いちばん いい みちは、あやうく みのがす みちだったりするよ。"
      }
    },

    {
      keywords: ["say something funny","something random","random","surprise me"],
      answer: {
        en: "Potato wiggle noodle moon.",
        jp: "うーん。こんにゃく くるくる つきみ うどん。"
      }
    },

    {
      keywords: ["say hi","say hello","wave","aisatsu","あいさつ"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! Hello hello hello!",
        jp: "うーひひひひ！ こんにちは こんにちは こんにちは！"
      }
    },

    {
      keywords: ["say my name","what's my name","my name"],
      answer: {
        en: "Heehee! Tell me first and I'll try.",
        jp: "えへへ！ おしえてくれたら いってみるよ。"
      }
    },

    {
      keywords: ["i'm hungry","hungry","onaka suita","おなかすいた","お腹すいた"],
      answer: {
        en: "Maybe you need a snack and a question.",
        jp: "おやつと しつもんが いるかもね。"
      }
    },

    {
      keywords: ["i'm sleepy","sleepy","tired","nemui","ねむい","つかれた"],
      answer: {
        en: "Then ask me one tiny question with your sleepy brain.",
        jp: "じゃあ ねむたい あたまで ちいさい しつもんを ひとつ どうぞ。"
      }
    },

    {
      keywords: ["do you like me","like me","am i cute","am i nice"],
      answer: {
        en: "Heehee! I like curious adventurers.",
        jp: "えへへ！きになることを きく ぼうけんしゃは すきだよ。"
      }
    },

    {
      keywords: ["are you smart","smart","kashikoi","かしこい"],
      answer: {
        en: "Only about the things I know.",
        jp: "しってること だけならね。"
      }
    },

    {
      keywords: ["do you know everything","everything","zenbu","ぜんぶ"],
      answer: {
        en: "Nope. Just Booha Adventure things.",
        jp: "ううん。Booha Adventure の ことだけだよ。"
      }
    },

    {
      keywords: ["are you bored","bored","taikutsu","たいくつ"],
      answer: {
        en: "Not if you keep asking things.",
        jp: "きいてくれてたら たいくつしないよ。"
      }
    },

    {
      keywords: ["can i ask silly things","silly","weird question","nandemo","なんでも","へんな しつもん"],
      answer: { en: "Yes. Silly is allowed.", jp: "うん。へんな しつもんでも いいよ。" }
    },

    /* ── BRYAN ────────────────────────────────────────────── */

    {
      keywords: ["bryan","teacher","sensei","せんせい","who is bryan","who made you","did bryan make you"],
      answer: {
        en: "Bryan built Booha Adventure. He teaches me little things and then I know them.",
        jp: "ブライアンが Booha Adventure を つくったんだ。いろいろ おしえてくれるから、ぼくも しるんだよ。"
      }
    },

    {
      keywords: ["is bryan your dad","your father","otousan","おとうさん"],
      answer: {
        en: "More like my teacher-friend-builder.",
        jp: "おとうさん というより、せんせいで おともだちで つくってくれた ひとかな。"
      }
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
        jp: "たんけんしてみて！ めいろに いったり しゅくだいの木に いったり べんきょうデッキや ゲームで あそべるよ。"
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
      keywords: ["i don't know what to do","confused","i'm confused","lost","help"],
      answer: {
        en: "That's okay. Start with the Maze, or ask me about homework, games, or study decks.",
        jp: "だいじょうぶ。さいしょは めいろに いくか しゅくだい、ゲーム、べんきょうデッキのことを きいてみて。"
      }
    },

    /* ── MAZE ─────────────────────────────────────────────── */

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

    {
      keywords: ["why is there a maze","why maze"],
      answer: { en: "Because adventures are better when you explore.", jp: "ぼうけんは たんけんすると もっと おもしろいからだよ。" }
    },

    /* ── KARASUKI ─────────────────────────────────────────── */

    {
      keywords: ["karasuki","what is karasuki","tell me about karasuki","カラスキ"],
      answer: {
        en: "Karasuki is darker and more mysterious. Strange and quiet. Not exactly scary. Just different.",
        jp: "カラスキは くらくて もっと ふしぎだよ。しずかで へんな ばしょ。こわいわけじゃないけど、なんか ちがう。"
      }
    },

    {
      keywords: ["do you like karasuki"],
      answer: {
        en: "Karasuki is strange. I like strange.",
        jp: "カラスキは へんだよ。ぼくは へんなの すき。"
      }
    },

    /* ── HOMEWORK TREE ────────────────────────────────────── */

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

    {
      keywords: ["do you like games"],
      answer: {
        en: "Yes! Games make brains bounce.",
        jp: "うん！ゲームは あたまが ぴょんぴょんするよ。"
      }
    },

    /* ── CURRICULUMS ──────────────────────────────────────── */

    {
      keywords: ["pre-boo","preboo","beginner","which one is for beginners","easy course"],
      answer: {
        en: "Pre-Boo is the beginner path.",
        jp: "Pre-Boo は はじめての コースだよ。"
      }
    },

    {
      keywords: ["boo-riculum","booriculum","main course","weekly"],
      answer: {
        en: "Boo-riculum is the main weekly learning path.",
        jp: "Boo-riculum は しゅうごとの メインの べんきょうコースだよ。"
      }
    },

    {
      keywords: ["boo-continuum","boocontinuum","advanced","harder course"],
      answer: {
        en: "Boo-continuum is the more advanced path.",
        jp: "Boo-continuum は もっと すすんだ べんきょうコースだよ。"
      }
    },

    /* ── WHAT CAN YOU DO ──────────────────────────────────── */

    {
      keywords: ["what can you do","what do you know","what should i ask","what can i ask","help question"],
      answer: {
        en: "Ask me about the maze, Karasuki, homework, games, study decks, or what I am.",
        jp: "めいろ、カラスキ、しゅくだい、ゲーム、べんきょうデッキ、ぼくのことを きけるよ。"
      }
    }

  ]

};
