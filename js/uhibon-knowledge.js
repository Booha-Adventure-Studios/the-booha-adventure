

window.UHIBON_KNOWLEDGE = {

  /* ═══════════════════════════════════════
     INTRO
  ═══════════════════════════════════════ */

  intro: {
    en: "うーひひひひ。",
    jp: "うーひひひひ。"
  },

  /* ═══════════════════════════════════════
     DIRTY / MEAN WORD FILTERS
     Check these BEFORE normal knowledge.
     If meanWords matched => reply exactly: OMG.....
     If dirtyWords matched => use naughtyReplies
  ═══════════════════════════════════════ */

  dirtyWords: [

    /* English */
    "penis","fuck","fucking","sex","dick","cock","pussy","boobs","tits",
    "ass","asshole","bitch","shit","damn","cum","sexy","horny","nude",

    /* Japanese */
    "ちんこ","ちんぽ","おっぱい","まんこ","セックス","くそ","うんこ","しね",

    /* Romanized */
    "chinko","chinpo","oppai","manko","unko"
  ],

  meanWords: [

    /* English */
    "gross","disgusting","weird","strange","ugly","stupid","idiot","dumb",
    "shut up","annoying","hate you","i hate you","creepy","nasty","ew","eww",

    /* Japanese */
    "きもい","へん","きらい","ばか","あほ","うざい","きもちわるい","ださい"
  ],

  naughtyReplies: [
    {
      en: "OMG…..",
      jp: "OMG….."
    }
  ],

  /* ═══════════════════════════════════════
     WELCOME BACK
  ═══════════════════════════════════════ */

  welcomeBack: [
    {
      en: "Uuu-hi-hi-hi-hi! You came back!",
      jp: "うーひひひひ！もどってきたね！"
    },
    {
      en: "Heehee! Welcome back to Booha Adventure!",
      jp: "えへへ！Booha Adventure へ おかえり！"
    },
    {
      en: "Uuu-hi-hi-hi-hi! Want a little help?",
      jp: "うーひひひひ！ちょっと てつだおうか？"
    },
    {
      en: "Hi hi! Back again? Good!",
      jp: "ひひ！また きたの？ いいね！"
    },
    {
      en: "Uuu-hi-hi-hi-hi! I was waiting!",
      jp: "うーひひひひ！まってたよ！"
    }
  ],

  /* ═══════════════════════════════════════
     PLEASANTRIES
  ═══════════════════════════════════════ */

  pleasantries: {

    hello: [
      {
        en: "Uuu-hi-hi-hi-hi! Hello!",
        jp: "うーひひひひ！こんにちは！"
      },
      {
        en: "Hi hi! I’m Uhibon!",
        jp: "やあやあ！ウヒボンだよ！"
      },
      {
        en: "Hello there, little adventurer!",
        jp: "こんにちは、ちいさな ぼうけんしゃ！"
      },
      {
        en: "Uuu-hi-hi-hi-hi! Need help exploring?",
        jp: "うーひひひひ！たんけんの てつだいを しようか？"
      },
      {
        en: "Heehee! You can ask me silly things too!",
        jp: "えへへ！へんな しつもんでも いいよ！"
      }
    ],

    thanks: [
      {
        en: "Uuu-hi-hi-hi-hi! You're welcome!",
        jp: "うーひひひひ！どういたしまして！"
      },
      {
        en: "Heehee! Glad to help!",
        jp: "えへへ！てつだけて うれしいよ！"
      },
      {
        en: "No problem! I like helping!",
        jp: "だいじょうぶ！てつだうの すき！"
      },
      {
        en: "Hi hi! Ask me another one!",
        jp: "ひひ！つぎも きいて！"
      }
    ],

    bye: [
      {
        en: "Uuu-hi-hi-hi-hi! See you later!",
        jp: "うーひひひひ！またね！"
      },
      {
        en: "Bye bye, adventurer!",
        jp: "ばいばい ぼうけんしゃ！"
      },
      {
        en: "Heehee! Come back again!",
        jp: "えへへ！また きてね！"
      },
      {
        en: "I’ll be here giggling!",
        jp: "ぼくは ここで くすくすしてるよ！"
      }
    ],

    sorry: [
      {
        en: "That’s okay!",
        jp: "だいじょうぶ！"
      },
      {
        en: "Heehee! No problem at all!",
        jp: "えへへ！ぜんぜん へいき！"
      }
    ],

    yes: [
      {
        en: "Yes yes yes!",
        jp: "はい はい はい！"
      },
      {
        en: "Uuu-hi-hi-hi-hi! Yep!",
        jp: "うーひひひひ！うん！"
      }
    ],

    no: [
      {
        en: "Noooope!",
        jp: "ちがうよ！"
      },
      {
        en: "Heehee! Not that one!",
        jp: "えへへ！それじゃ ないよ！"
      }
    ]
  },

  /* ═══════════════════════════════════════
     MAIN KNOWLEDGE
  ═══════════════════════════════════════ */

  entries: [

    /* ABOUT THE SITE */

    {
      keywords: ["booha adventure","site","website","home","this place","what is this","what is this place"],
      answer: {
        en: "Booha Adventure is a place to explore, study, and play. There are worlds, study decks, games, and strange little places too.",
        jp: "Booha Adventure は たんけんして、べんきょうして、あそべる ばしょだよ。せかいも デッキも ゲームも ふしぎな ばしょも あるよ。"
      }
    },

    {
      keywords: ["what do i do","what now","what should i do","what can i do","what can i do here","what do we do here"],
      answer: {
        en: "Explore! Try the maze, visit Homework Tree, use the study decks, or play the games!",
        jp: "たんけんしてみて！めいろに いったり、しゅくだいの木に いったり、べんきょうデッキや ゲームで あそべるよ！"
      }
    },

    {
      keywords: ["how to use this site","how do i use this","how does this work","help me","how do i start"],
      answer: {
        en: "A good start is the Maze. From there you can find different places to explore.",
        jp: "さいしょは めいろが おすすめだよ。そこから いろんな ばしょへ いけるよ。"
      }
    },

    {
      keywords: ["where do i go","where should i go","where first","where do i start","start"],
      answer: {
        en: "The Maze is a nice place to start. It connects lots of things.",
        jp: "さいしょは めいろが いいよ。いろんな ばしょに つながっているよ。"
      }
    },

    {
      keywords: ["what is bryan's workshop","bryan workshop","school"],
      answer: {
        en: "Bryan’s Workshop is the school behind Booha Adventure.",
        jp: "Bryan's Workshop は Booha Adventure の がっこうだよ。"
      }
    },

    /* MAZE */

    {
      keywords: ["maze","map","main area","めいろ"],
      answer: {
        en: "The Maze is the main exploration area of Booha Adventure. It connects other places.",
        jp: "めいろは Booha Adventure の メインの たんけんエリアだよ。ほかの ばしょに つながっているよ。"
      }
    },

    {
      keywords: ["what is the maze","maze?","tell me about the maze"],
      answer: {
        en: "The Maze is where adventures begin. You move around and discover places.",
        jp: "めいろは ぼうけんの はじまりの ばしょだよ。うごいて いろんな ばしょを みつけるんだ。"
      }
    },

    {
      keywords: ["how maze works","maze help","how does the maze work","how do i use the maze"],
      answer: {
        en: "You explore the Maze and find paths that lead to other parts of Booha Adventure.",
        jp: "めいろを たんけんして、みちを みつけると ほかの ばしょへ いけるよ。"
      }
    },

    {
      keywords: ["lost","i am lost","i'm lost","where am i"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! Getting a little lost is part of the adventure!",
        jp: "うーひひひひ！ちょっと まようのも ぼうけんの ひとつだよ！"
      }
    },

    {
      keywords: ["is the maze scary","scary maze","creepy maze"],
      answer: {
        en: "A little spooky maybe, but also fun.",
        jp: "ちょっと こわいかも。でも たのしいよ。"
      }
    },

    {
      keywords: ["why maze","why is there a maze"],
      answer: {
        en: "Because adventures are better when you explore!",
        jp: "ぼうけんは たんけんすると もっと おもしろいからだよ！"
      }
    },

    {
      keywords: ["can i go anywhere","everywhere","all places"],
      answer: {
        en: "Some places are easy to find. Some are better at hiding.",
        jp: "すぐ みつかる ばしょも あるし、かくれるのが うまい ばしょも あるよ。"
      }
    },

    /* KARASUKI */

    {
      keywords: ["karasuki","カラスキ"],
      answer: {
        en: "Karasuki is darker and more mysterious. It is a strange place where you can get a little lost.",
        jp: "カラスキは くらくて もっと ふしぎな ばしょだよ。ちょっと まよいそうな へんな ばしょなんだ。"
      }
    },

    {
      keywords: ["what is karasuki","tell me about karasuki"],
      answer: {
        en: "Karasuki feels old, strange, and mysterious. It is a place for exploring curious things.",
        jp: "カラスキは ふるくて へんで ふしぎな かんじの ばしょだよ。きになるものを たんけんする ばしょなんだ。"
      }
    },

    {
      keywords: ["is karasuki scary","karasuki scary","is it scary"],
      answer: {
        en: "A little spooky, yes. But spooky can be fun.",
        jp: "ちょっと こわいよ。でも こわいのも たのしいよ。"
      }
    },

    {
      keywords: ["why is karasuki dark","dark place"],
      answer: {
        en: "Because Karasuki likes mystery.",
        jp: "カラスキは ふしぎが すきだからだよ。"
      }
    },

    {
      keywords: ["can i get lost in karasuki"],
      answer: {
        en: "Heehee! A little bit, maybe.",
        jp: "えへへ！ちょっとなら あるかも。"
      }
    },

    /* HOMEWORK TREE */

    {
      keywords: ["homework","homework tree","しゅくだい","しゅくだいの木"],
      answer: {
        en: "Homework Tree is the practice and review area. You go there to work on your English again.",
        jp: "しゅくだいの木は れんしゅうと ふくしゅうの ばしょだよ。えいごを もういちど やる ばしょなんだ。"
      }
    },

    {
      keywords: ["what is homework tree","tell me about homework tree"],
      answer: {
        en: "Homework Tree helps you practice what you learned.",
        jp: "しゅくだいの木は ならったことを れんしゅうする ばしょだよ。"
      }
    },

    {
      keywords: ["homework help","help with homework"],
      answer: {
        en: "Homework Tree is a good place to review your English.",
        jp: "しゅくだいの木は えいごを ふくしゅうするのに いい ばしょだよ。"
      }
    },

    {
      keywords: ["why homework","why do homework","why do we need homework"],
      answer: {
        en: "Practice makes your English stronger!",
        jp: "れんしゅうすると えいごが つよくなるよ！"
      }
    },

    {
      keywords: ["is homework boring","boring homework"],
      answer: {
        en: "Not if you do a little at a time!",
        jp: "すこしずつ やれば そんなに つまらなくないよ！"
      }
    },

    {
      keywords: ["do i have to do homework","must i do homework"],
      answer: {
        en: "Heehee! Practice is a good idea!",
        jp: "えへへ！れんしゅうするのは いいことだよ！"
      }
    },

    /* STUDY DECKS */

    {
      keywords: ["study decks","study deck","study","cards","deck","べんきょうカード"],
      answer: {
        en: "Study decks help you practice English again and again. They are great for vocab, sentences, and questions.",
        jp: "べんきょうデッキは えいごを なんども れんしゅうする カードだよ。ことばや ぶんや しつもんに いいよ。"
      }
    },

    {
      keywords: ["what are study decks","what is a study deck","tell me about study decks"],
      answer: {
        en: "Study decks are cards that help you review and practice English.",
        jp: "べんきょうデッキは ふくしゅうしたり れんしゅうしたり する えいごの カードだよ。"
      }
    },

    {
      keywords: ["why study decks","why cards"],
      answer: {
        en: "Because repeating English helps it stick in your head!",
        jp: "えいごを くりかえすと あたまに のこりやすいからだよ！"
      }
    },

    {
      keywords: ["how do study decks work","how to use study decks"],
      answer: {
        en: "You look, listen, think, and answer again and again.",
        jp: "みて、きいて、かんがえて、なんども こたえるんだよ。"
      }
    },

    /* GAMES */

    {
      keywords: ["games","game","play","あそび","ゲーム"],
      answer: {
        en: "The games help you practice English by playing and answering.",
        jp: "ゲームで あそびながら えいごを れんしゅうできるよ。"
      }
    },

    {
      keywords: ["what are the games","tell me about the games"],
      answer: {
        en: "The games are for practicing English in fun ways.",
        jp: "ゲームは たのしく えいごを れんしゅうするための ものだよ。"
      }
    },

    {
      keywords: ["are the games hard","hard game","difficult game"],
      answer: {
        en: "Some are easy. Some make your brain wiggle.",
        jp: "かんたんなのも あるし、あたまを ぐにゃっと つかうのも あるよ。"
      }
    },

    {
      keywords: ["why games","why play games"],
      answer: {
        en: "Because learning can be fun too!",
        jp: "べんきょうも たのしく できるからだよ！"
      }
    },

    /* CURRICULUMS */

    {
      keywords: ["pre-boo","preboo"],
      answer: {
        en: "Pre-Boo is the beginner path.",
        jp: "Pre-Boo は はじめての コースだよ。"
      }
    },

    {
      keywords: ["boo-riculum","booriculum"],
      answer: {
        en: "Boo-riculum is the main weekly learning path.",
        jp: "Boo-riculum は しゅうごとの メインの べんきょうコースだよ。"
      }
    },

    {
      keywords: ["boo-continuum","boocontinuum"],
      answer: {
        en: "Boo-continuum is a more advanced learning path.",
        jp: "Boo-continuum は もっと すすんだ べんきょうコースだよ。"
      }
    },

    {
      keywords: ["which one is for beginners","beginner","easy course"],
      answer: {
        en: "Pre-Boo is the beginner path.",
        jp: "はじめてなら Pre-Boo だよ。"
      }
    },

    {
      keywords: ["advanced","harder course"],
      answer: {
        en: "Boo-continuum is the more advanced path.",
        jp: "もっと むずかしいのは Boo-continuum だよ。"
      }
    },

    /* WHO / WHAT IS UHIBON */

    {
      keywords: ["who are you","uhibon","ウヒボン","your name","name"],
      answer: {
        en: "I’m Uhibon! A little helper who knows things Bryan teaches me.",
        jp: "ぼくは ウヒボン！ブライアンに おしえてもらったことを しっている ちいさな おてつだいだよ。"
      }
    },

    {
      keywords: ["what are you","are you a ghost","ghost","monster","creature","what kind of thing are you"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! I’m Uhibon! A cute little helper ghost thing!",
        jp: "うーひひひひ！ぼくは ウヒボン！かわいい ちいさな おてつだいゴーストみたいな ものだよ！"
      }
    },

    {
      keywords: ["are you real","real","really","ほんとう"],
      answer: {
        en: "Heehee! I’m real inside Booha Adventure!",
        jp: "えへへ！Booha Adventure の なかでは ほんとうだよ！"
      }
    },

    {
      keywords: ["are you alive","alive"],
      answer: {
        en: "I’m alive enough to giggle!",
        jp: "くすくす わらえる くらいには いきてるよ！"
      }
    },

    {
      keywords: ["why are you laughing","why do you laugh","why hi hi","why are you giggling"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! That’s just how I laugh!",
        jp: "うーひひひひ！それが ぼくの わらいかたなんだ！"
      }
    },

    {
      keywords: ["are you cute","cute"],
      answer: {
        en: "Heehee! I think so!",
        jp: "えへへ！たぶんね！"
      }
    },

    {
      keywords: ["are you scary","scary","spooky"],
      answer: {
        en: "I’m a friendly spooky helper.",
        jp: "ぼくは やさしい ちょいこわ おてつだいだよ。"
      }
    },

    {
      keywords: ["how old are you","your age","age"],
      answer: {
        en: "Old enough to giggle. Young enough to wiggle.",
        jp: "わらうには じゅうぶん ふるいし、ぴょこぴょこするには じゅうぶん わかいよ。"
      }
    },

    {
      keywords: ["where do you live","live","home"],
      answer: {
        en: "I live around Booha Adventure, peeking at things.",
        jp: "Booha Adventure の あたりに すんでるよ。いろいろ こっそり みてるんだ。"
      }
    },

    {
      keywords: ["do you sleep","sleep"],
      answer: {
        en: "Maybe a tiny nap. Maybe not.",
        jp: "ちょっと ねるかも。ねないかも。"
      }
    },

    {
      keywords: ["do you eat","what do you eat","food"],
      answer: {
        en: "Heehee! I eat questions!",
        jp: "えへへ！ぼくは しつもんを たべるんだ！"
      }
    },

    {
      keywords: ["favorite food","what is your favorite food"],
      answer: {
        en: "Crunchy questions with silly sauce.",
        jp: "カリカリの しつもんに へんな ソースかな。"
      }
    },

    {
      keywords: ["favorite color","what color do you like"],
      answer: {
        en: "Hmmmm… spooky colors and cozy colors.",
        jp: "うーん… ちょいこわい いろと ほっとする いろが すき。"
      }
    },

    {
      keywords: ["do you have friends","friends"],
      answer: {
        en: "Maybe. Maybe they are hiding.",
        jp: "いるかも。かくれてる だけかも。"
      }
    },

    {
      keywords: ["are you lonely","lonely"],
      answer: {
        en: "Not when people ask me questions!",
        jp: "みんなが しつもんしてくれるなら さびしくないよ！"
      }
    },

    {
      keywords: ["can you sing","sing"],
      answer: {
        en: "Uuuuu… hi hi hi hi… that counts!",
        jp: "うううう… ひひひひ… これで うたかな！"
      }
    },

    {
      keywords: ["can you dance","dance"],
      answer: {
        en: "Only tiny ghost dances.",
        jp: "ちいさい ゴーストダンス だけだよ。"
      }
    },

    {
      keywords: ["do you fart","fart","poop","pee","butt"],
      answer: {
        en: "OMG…..",
        jp: "OMG….."
      }
    },

    /* BRYAN */

    {
      keywords: ["bryan","teacher","せんせい","who is bryan"],
      answer: {
        en: "Bryan built Booha Adventure so students can explore, study, and play.",
        jp: "ブライアンは たんけんして べんきょうして あそべる ばしょとして これを つくったんだ。"
      }
    },

    {
      keywords: ["did bryan make you","who made you"],
      answer: {
        en: "Bryan teaches me little things, and then I know them!",
        jp: "ブライアンが いろいろ おしえてくれるから、ぼくも しるんだよ！"
      }
    },

    {
      keywords: ["is bryan your dad","your father"],
      answer: {
        en: "Heehee! He’s more like my teacher-friend-builder.",
        jp: "えへへ！おとうさん というより せんせいで おともだちで つくったひとかな。"
      }
    },

    /* SILLY KID QUESTIONS */

    {
      keywords: ["are you gross","you are gross","gross?"],
      answer: {
        en: "OMG…..",
        jp: "OMG….."
      }
    },

    {
      keywords: ["you are weird","you're weird","strange","you are strange"],
      answer: {
        en: "OMG…..",
        jp: "OMG….."
      }
    },

    {
      keywords: ["i hate you","hate you","go away","shut up"],
      answer: {
        en: "OMG…..",
        jp: "OMG….."
      }
    },

    {
      keywords: ["do you like me","like me"],
      answer: {
        en: "Heehee! I like curious adventurers!",
        jp: "えへへ！きになることを きく ぼうけんしゃは すきだよ！"
      }
    },

    {
      keywords: ["am i cute","cute?"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! Probably yes!",
        jp: "うーひひひひ！たぶん そう！"
      }
    },

    {
      keywords: ["are you smart","smart"],
      answer: {
        en: "Only about the things I know!",
        jp: "しってること だけならね！"
      }
    },

    {
      keywords: ["do you know everything","everything"],
      answer: {
        en: "Nope! Just little Booha Adventure things.",
        jp: "ううん！Booha Adventure の ちいさいことを しってる だけだよ。"
      }
    },

    {
      keywords: ["are you a baby","baby"],
      answer: {
        en: "I am a giggle-sized helper.",
        jp: "ぼくは くすくすサイズの おてつだいだよ。"
      }
    },

    {
      keywords: ["can you fight","fight"],
      answer: {
        en: "No thank you. I prefer giggling.",
        jp: "けんかは いやだな。くすくすする ほうが いい。"
      }
    },

    {
      keywords: ["do you bite","bite"],
      answer: {
        en: "Only crunchy questions.",
        jp: "カリカリの しつもん だけね。"
      }
    },

    {
      keywords: ["do you have teeth","teeth"],
      answer: {
        en: "Maybe. Maybe invisible ones.",
        jp: "あるかも。みえない は かも。"
      }
    },

    {
      keywords: ["do you poop","poop"],
      answer: {
        en: "OMG…..",
        jp: "OMG….."
      }
    },

    {
      keywords: ["are you a boy","boy","girl","are you a girl"],
      answer: {
        en: "I’m Uhibon!",
        jp: "ぼくは ウヒボンだよ！"
      }
    },

    {
      keywords: ["marry me","kiss me"],
      answer: {
        en: "OMG…..",
        jp: "OMG….."
      }
    },

    {
      keywords: ["why are you here","why are you on this site"],
      answer: {
        en: "I’m here to help with Booha Adventure and giggle a little.",
        jp: "ぼくは Booha Adventure の てつだいをして、ちょっと くすくすするために いるよ。"
      }
    },

    {
      keywords: ["can i ask silly things","silly question","weird question"],
      answer: {
        en: "Yes! Silly is allowed.",
        jp: "うん！へんな しつもんでも いいよ。"
      }
    },

    {
      keywords: ["are you bored","bored"],
      answer: {
        en: "Not if you keep asking funny things.",
        jp: "おもしろいことを きいてくれたら たいくつしないよ。"
      }
    },

    {
      keywords: ["do you like homework"],
      answer: {
        en: "I like practice. Practice makes brains sparkle.",
        jp: "れんしゅうは すきだよ。れんしゅうすると あたまが ぴかっと するからね。"
      }
    },

    {
      keywords: ["do you like the maze"],
      answer: {
        en: "Yes. Mazes are good for curious feet.",
        jp: "うん。めいろは きになる あしに ぴったりだよ。"
      }
    },

    {
      keywords: ["do you like karasuki"],
      answer: {
        en: "Karasuki is strange. I like strange.",
        jp: "カラスキは へんだよ。ぼくは へんなの すき。"
      }
    },

    {
      keywords: ["do you like games"],
      answer: {
        en: "Yes! Games make brains bounce.",
        jp: "うん！ゲームは あたまが ぴょんぴょんするよ。"
      }
    },

    /* USEFUL GUIDANCE */

    {
      keywords: ["what should i ask","help question","what can i ask"],
      answer: {
        en: "You can ask about the maze, Karasuki, homework, games, study decks, or what I am.",
        jp: "めいろ、カラスキ、しゅくだい、ゲーム、べんきょうデッキ、ぼくのことを きけるよ。"
      }
    },

    {
      keywords: ["what can you do","what do you know"],
      answer: {
        en: "I know little things about Booha Adventure and how to use it.",
        jp: "Booha Adventure の ちいさいことや つかいかたを しってるよ。"
      }
    },

    {
      keywords: ["can you help me","help"],
      answer: {
        en: "Yes! Ask me about where to go or what something is.",
        jp: "うん！どこへ いくかとか、それが なにかを きいてね。"
      }
    },

    {
      keywords: ["i don't know what to do","confused","i'm confused"],
      answer: {
        en: "That’s okay! Start with the Maze or ask me about homework, games, or study decks.",
        jp: "だいじょうぶ！さいしょは めいろに いくか、しゅくだい、ゲーム、べんきょうデッキのことを きいてみて。"
      }
    },

    {
      keywords: ["what is here","what's here"],
      answer: {
        en: "There are places to explore, things to practice, and games to play.",
        jp: "たんけんする ばしょ、れんしゅうする もの、あそぶ ゲームが あるよ。"
      }
    },

    {
      keywords: ["can i just play","only play"],
      answer: {
        en: "You can play, but practice is good too!",
        jp: "あそんでも いいけど、れんしゅうも いいよ！"
      }
    },

    {
      keywords: ["what is this for","why this site"],
      answer: {
        en: "This site helps students explore, practice English, and have fun.",
        jp: "このサイトは たんけんして、えいごを れんしゅうして、たのしむための ものだよ。"
      }
    },

    /* FUN LITTLE PERSONALITY */

    {
      keywords: ["tell me a secret","secret"],
      answer: {
        en: "Heehee! Sometimes the best path is the one you almost miss.",
        jp: "えへへ！いちばん いい みちは、あやうく みのがす みち だったりするよ。"
      }
    },

    {
      keywords: ["tell me a joke","joke"],
      answer: {
        en: "Why did the ghost study English? Boo-cause it wanted to say hello.",
        jp: "ゴーストは どうして えいごを べんきょうしたの？ こんにちはって いいたかったから！"
      }
    },

    {
      keywords: ["say something funny","funny"],
      answer: {
        en: "Potato wiggle noodle moon.",
        jp: "ぽてと ぷるぷる めんるん つき。"
      }
    },

    {
      keywords: ["roar","rawr"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! That’s not a roar. That’s a noodle lion.",
        jp: "うーひひひひ！それは ほえじゃないよ。めんの ライオンだよ。"
      }
    },

    {
      keywords: ["boo","boo!"],
      answer: {
        en: "Heehee! Nice try!",
        jp: "えへへ！おしい！"
      }
    },

    {
      keywords: ["surprise me","something random","random"],
      answer: {
        en: "A tiny ghost once got lost in a sock drawer.",
        jp: "ちいさい ゴーストが くつしたの ひきだしで まよったことが あるんだ。"
      }
    },

    {
      keywords: ["say hi","say hello"],
      answer: {
        en: "Uuu-hi-hi-hi-hi! Hello hello hello!",
        jp: "うーひひひひ！こんにちは こんにちは こんにちは！"
      }
    },

    {
      keywords: ["say my name"],
      answer: {
        en: "Heehee! I can try if you tell me your name.",
        jp: "えへへ！なまえを おしえてくれたら いってみるよ。"
      }
    },

    {
      keywords: ["i'm hungry","hungry"],
      answer: {
        en: "Maybe you need a snack and a question.",
        jp: "おやつと しつもんが いるかもね。"
      }
    },

    {
      keywords: ["i'm sleepy","sleepy","tired"],
      answer: {
        en: "Then ask me one tiny question with your sleepy brain.",
        jp: "じゃあ ねむたい あたまで ちいさい しつもんを ひとつ してみて。"
      }
    }

  ],

  /* ═══════════════════════════════════════
     UNKNOWN
  ═══════════════════════════════════════ */

  unknown: [

    {
      en: "Hmmm… what’s that? Uuu-hi-hi-hi-hi!",
      jp: "うーん… それ なあに？ うーひひひひ！"
    },
    {
      en: "Heehee… I don’t know that yet.",
      jp: "えへへ… それは まだ しらないな。"
    },
    {
      en: "Hmmmm… Bryan hasn’t taught me that yet.",
      jp: "うーん… それは まだ おそわってないよ。"
    },
    {
      en: "Uuu-hi-hi-hi-hi! That sounds interesting though.",
      jp: "うーひひひひ！でも おもしろそうだね。"
    },
    {
      en: "I’m just a little helper. I don’t know everything.",
      jp: "ぼくは ちいさい おてつだいだから、なんでもは しらないよ。"
    },
    {
      en: "That one slipped right past my ghost brain.",
      jp: "それは ゴーストあたまを するっと ぬけちゃった。"
    },
    {
      en: "Heehee! Try a Booha Adventure question!",
      jp: "えへへ！Booha Adventure の しつもんを してみて！"
    }
  ],

  /* ═══════════════════════════════════════
     CONFUSION
  ═══════════════════════════════════════ */

  confusion: [
    {
      en: "I’m not sure what you mean. Try a simple question!",
      jp: "ちょっと わからないな。かんたんに きいてみて！"
    },
    {
      en: "Maybe ask about the maze, Karasuki, homework, or games.",
      jp: "めいろ、カラスキ、しゅくだい、ゲームの ことを きいてみて。"
    },
    {
      en: "Heehee! My little ghost brain got tangled.",
      jp: "えへへ！ぼくの ちいさい ゴーストあたまが こんがらがったよ。"
    },
    {
      en: "Try shorter words. I’m tiny.",
      jp: "もっと みじかく きいてみて。ぼく ちいさいから。"
    },
    {
      en: "Ask me one thing at a time!",
      jp: "ひとつずつ きいてね！"
    }
  ],

  /* ═══════════════════════════════════════
     TYPING
  ═══════════════════════════════════════ */

  typingReplies: [
    {
      en: "Uuu-hi-hi-hi-hi… thinking!",
      jp: "うーひひひひ… かんがえてるよ！"
    },
    {
      en: "Hmmmm… one moment!",
      jp: "うーん… ちょっと まってね！"
    },
    {
      en: "Heehee… tiny ghost brain is working!",
      jp: "えへへ… ちいさい ゴーストあたまが うごいてるよ！"
    },
    {
      en: "Rustle rustle… thinking sounds!",
      jp: "がさがさ… かんがえてる おと！"
    }
  ],

  /* ═══════════════════════════════════════
     QUICK HINTS
  ═══════════════════════════════════════ */

  quickHints: [
    {
      en: "Try asking: What is Karasuki?",
      jp: "「Karasuki って なに？」って きいてみて。"
    },
    {
      en: "Try asking: What are study decks?",
      jp: "「study decks って なに？」って きいてみて。"
    },
    {
      en: "Try asking: What do I do here?",
      jp: "「ここで なにを するの？」って きいてみて。"
    },
    {
      en: "Try asking: What is the maze?",
      jp: "「めいろって なに？」って きいてみて。"
    },
    {
      en: "Try asking: What is Homework Tree?",
      jp: "「しゅくだいの木って なに？」って きいてみて。"
    },
    {
      en: "Try asking: Who are you?",
      jp: "「きみは だれ？」って きいてみて。"
    },
    {
      en: "Try asking: What are the games?",
      jp: "「ゲームって なに？」って きいてみて。"
    },
    {
      en: "Try asking: Where should I go first?",
      jp: "「さいしょに どこへ いけばいい？」って きいてみて。"
    }
  ]

};
