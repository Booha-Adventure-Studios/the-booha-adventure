
window.uhibonInit = function () {
  if (document.getElementById('uhibon-launcher')) return; // guard
  (function () {
  const IMG_BASE = 'assets/img/uhibon/';
  const IMG_ICON = IMG_BASE + 'chat-uhi.png';
  const IMG_OPEN = IMG_BASE + 'uhi-w.png';
  const IMG_STUDENT = IMG_BASE + 'uhi-st.png';
  const IMG_TALK_1 = IMG_BASE + 'uhi-t1.png';
  const IMG_TALK_2 = IMG_BASE + 'uhi-t2.png';

  const root = document.getElementById('uhibon-chat-root');
  if (!root) return;

  let isOpen = false;
  let idleTimer = null;
  let talkingAnimTimer = null;
  let talkingEndTimer = null;
  let charSwapTimer = null;
  let quickReplyTimer = null;
  let talkFrame = 0;
  let hasShownIntro = false;
  let glowIndex = 0;

  const GLOW_COLORS = [
    'drop-shadow(0 0 10px rgba(123,79,207,.80)) drop-shadow(0 0 26px rgba(60,20,100,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba(56,200,190,.75)) drop-shadow(0 0 26px rgba(20,80,90,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba(220,80,180,.75)) drop-shadow(0 0 26px rgba(100,20,70,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba(245,200,66,.75)) drop-shadow(0 0 26px rgba(120,80,10,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba(80,140,255,.75)) drop-shadow(0 0 26px rgba(20,40,120,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))'
  ];

  buildUhibonUI();

  const iconBtn = document.getElementById('uhibon-icon-btn');
  const popout = document.getElementById('uhibon-popout');
  const charImg = document.getElementById('uhibon-char-img');
  const closeBtn = document.getElementById('uhibon-close-btn');
  const form = document.getElementById('uhibon-input-row');
  const input = document.getElementById('uhibon-input');
  const messages = document.getElementById('uhibon-messages');

  if (!iconBtn || !popout || !charImg || !closeBtn || !form || !input || !messages) return;

  charImg.style.filter = GLOW_COLORS[glowIndex];

  iconBtn.addEventListener('click', openUhibonChat);
  closeBtn.addEventListener('click', closeUhibonChat);

  input.addEventListener('input', () => {
    if (!isOpen) return;
    if (isTalking()) return;
    setCharState(input.value.trim() ? 'student' : 'idle');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeUhibonChat();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text || isTalking()) return;

    addMessage('user', text);
    input.value = '';
    setCharState('idle');

    const reply = getUhibonReply(text);
    await botSpeak(reply);
  });

  function buildUhibonUI() {
    root.innerHTML = `
      <div id="uhibon-launcher">
        <button id="uhibon-icon-btn" type="button" aria-label="Open Uhibon chat">
          <img src="${IMG_ICON}" alt="Uhibon icon">
        </button>

        <div id="uhibon-popout" aria-hidden="true">
          <div id="uhibon-character">
            <img id="uhibon-char-img" src="${IMG_OPEN}" alt="Uhibon">
          </div>

          <div id="uhibon-chatbox">
            <div id="uhibon-header">
              <span>Uhibon</span>
              <button id="uhibon-close-btn" type="button" aria-label="Close chat">×</button>
            </div>

            <div id="uhibon-messages" aria-live="polite" aria-label="Chat messages"></div>

            <form id="uhibon-input-row">
              <input
                id="uhibon-input"
                type="text"
                placeholder="Ask Uhibon / はなしかけて"
                autocomplete="off"
                lang="ja"
              >
              <button id="uhibon-send-btn" type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function openUhibonChat() {
    if (isOpen) return;

    isOpen = true;
    popout.classList.add('open');
    popout.setAttribute('aria-hidden', 'false');
    iconBtn.style.display = 'none';
    setCharState('idle');

    if (!hasShownIntro && !messages.children.length) {
      hasShownIntro = true;

      const intro = getUhibonPageIntro();
      void botSpeak(intro).then(() => {
        const quick = getUhibonPageQuickReplies();
        if (!isOpen || !quick.length) return;

        const hint = quick[Math.floor(Math.random() * quick.length)];
        quickReplyTimer = setTimeout(() => {
          if (!isOpen) return;
          addMessage('bot', hint);
        }, 220);
      });
    }

    setTimeout(() => {
      if (isOpen) input.focus();
    }, 60);
  }

  function closeUhibonChat() {
    isOpen = false;

    stopIdleLoop();
    stopTalkingAnim();
    clearTimeout(talkingEndTimer);
    talkingEndTimer = null;
    clearTimeout(charSwapTimer);
    charSwapTimer = null;
    clearTimeout(quickReplyTimer);
    quickReplyTimer = null;

    popout.classList.remove('open');
    popout.setAttribute('aria-hidden', 'true');
    iconBtn.style.display = '';
    setStaticChar(IMG_OPEN);
  }

  function startIdleLoop() {
    stopIdleLoop();
    scheduleNextIdle();
  }

  function stopIdleLoop() {
    clearTimeout(idleTimer);
    idleTimer = null;
    charImg.classList.remove('idle-blink', 'idle-look');
  }

  function scheduleNextIdle() {
    if (!isOpen || isTalking()) return;

    const delay = 3200 + Math.random() * 2800;
    idleTimer = setTimeout(() => {
      if (!isOpen || isTalking()) return;
      doIdleAction();
    }, delay);
  }

  function doIdleAction() {
    glowIndex = (glowIndex + 1) % GLOW_COLORS.length;
    charImg.style.filter = GLOW_COLORS[glowIndex];

    const pick = Math.random();

    if (pick < 0.5) {
      charImg.classList.add('idle-blink');
      setTimeout(() => {
        charImg.classList.remove('idle-blink');
        scheduleNextIdle();
      }, 320);
    } else {
      charImg.classList.add('idle-look');
      setTimeout(() => {
        charImg.classList.remove('idle-look');
        scheduleNextIdle();
      }, 680);
    }
  }

  function setStaticChar(src) {
    clearTimeout(charSwapTimer);
    charSwapTimer = null;

    const file = src.replace(/^.*\//, '');
    const current = charImg.getAttribute('src') || '';
    if (current.endsWith(file)) return;

    charImg.style.transition = 'opacity .2s ease, filter 1.6s ease';
    charImg.style.opacity = '0';

    charSwapTimer = setTimeout(() => {
      charImg.src = src;
      charImg.style.opacity = '1';
      charSwapTimer = null;
    }, 130);
  }

  function setCharState(state) {
    charImg.classList.remove('is-talking', 'idle-blink', 'idle-look');

    if (state === 'talking') {
      stopIdleLoop();
      startTalkingAnim();
      return;
    }

    stopTalkingAnim();

    if (state === 'student') {
      setStaticChar(IMG_STUDENT);
      return;
    }

    setStaticChar(IMG_OPEN);
    if (isOpen) startIdleLoop();
  }

  function startTalkingAnim() {
    stopTalkingAnim();
    stopIdleLoop();

    charImg.classList.add('is-talking');
    talkFrame = 0;
    charImg.src = IMG_TALK_1;

    talkingAnimTimer = setInterval(() => {
      talkFrame = talkFrame ? 0 : 1;
      charImg.src = talkFrame ? IMG_TALK_2 : IMG_TALK_1;
    }, 170);
  }

  function stopTalkingAnim() {
    clearInterval(talkingAnimTimer);
    talkingAnimTimer = null;
    charImg.classList.remove('is-talking');
  }

  function isTalking() {
    return !!talkingAnimTimer || !!talkingEndTimer;
  }

  function addMessage(sender, payload) {
    const div = document.createElement('div');
    div.className = `uhibon-msg ${sender}`;

    if (
      sender === 'bot' &&
      payload &&
      typeof payload === 'object' &&
      (payload.en || payload.jp)
    ) {
      if (payload.en) {
        const en = document.createElement('span');
        en.className = 'uhibon-en';
        en.textContent = payload.en;
        div.appendChild(en);
      }

      if (payload.jp) {
        const jp = document.createElement('span');
        jp.className = 'uhibon-jp';
        jp.lang = 'ja';
        jp.textContent = payload.jp;
        div.appendChild(jp);
      }
    } else {
      const text =
        typeof payload === 'string'
          ? payload
          : (payload && (payload.en || payload.jp)) || '';

      div.textContent = text;
      div.lang = /[\u3040-\u9FFF\uF900-\uFAFF]/.test(text) ? 'ja' : 'en';
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function talkDuration(payload) {
    let len = 0;

    if (typeof payload === 'string') {
      len = payload.length;
    } else if (payload && typeof payload === 'object') {
      len = (payload.en || '').length + (payload.jp || '').length * 0.6;
    }

    return Math.min(4500, Math.max(600, Math.round(len * 38)));
  }

  async function botSpeak(payload) {
    clearTimeout(quickReplyTimer);
    quickReplyTimer = null;

    setCharState('talking');

    await new Promise((resolve) => {
      talkingEndTimer = setTimeout(resolve, talkDuration(payload));
    });

    talkingEndTimer = null;
    stopTalkingAnim();
    addMessage('bot', payload);

    if (isOpen) {
      setCharState(input.value.trim() ? 'student' : 'idle');
    }
  }

  const PAGE_CONTEXTS = {
    maze: {
      intro: {
        en: "Uuu-hi-hi-hi-hi. You are in the Maze now. Good place for wandering. Good place for finding things too.",
        jp: "うーひひひひ。いまは めいろの なかだよ。まようのに いいし、みつけるのにも いい ばしょだよ。"
      },

      quickReplies: [
        {
          en: "Need help in the Maze?",
          jp: "めいろで こまってる？"
        },
        {
          en: "Heehee. The Maze likes twisty feet.",
          jp: "えへへ。めいろは くねくね あしが すきなんだ。"
        },
        {
          en: "Ask me about paths, getting lost, or where to go.",
          jp: "みち、まよったとき、どこへ いくかを きいてね。"
        }
      ],

      entries: [
        {
          keywords: ["maze", "what is the maze", "めいろ"],
          answer: {
            en: "The Maze is the main walking-around place. It connects lots of things in Booha Adventure.",
            jp: "めいろは メインの たんけんばしょだよ。Booha Adventure の いろんな ばしょに つながっているよ。"
          }
        },
        {
          keywords: ["lost", "i'm lost", "i am lost", "where am i", "迷子", "まよった"],
          answer: {
            en: "Getting a little lost in the Maze is normal.",
            jp: "めいろで ちょっと まようのは ふつうだよ。"
          }
        },
        {
          keywords: ["where do i go", "which way", "where now", "direction", "どこ", "みち", "どっち"],
          answer: {
            en: "Try the path that looks interesting first. The Maze likes curious people.",
            jp: "さいしょは きになる みちに いってみて。めいろは きになる ひとが すきなんだ。"
          }
        },
        {
          keywords: ["help", "maze help", "can you help", "たすけて", "てつだって"],
          answer: {
            en: "Yes. In the Maze, the best first step is just to move and look carefully.",
            jp: "うん。めいろでは まず うごいて、よく みるのが だいじだよ。"
          }
        },
        {
          keywords: ["exit", "goal", "finish", "clear", "出口", "ゴール", "クリア"],
          answer: {
            en: "The goal is not always just getting out. Sometimes the Maze wants you to find something.",
            jp: "ゴールは ただ でることじゃ ないときも あるよ。なにかを みつけてほしいのかも。"
          }
        },
        {
          keywords: ["map", "layout", "floor", "地図", "マップ"],
          answer: {
            en: "The Maze is better to explore than to overthink.",
            jp: "めいろは かんがえすぎるより、たんけんしたほうが いいよ。"
          }
        },
        {
          keywords: ["scary", "is it scary", "creepy", "こわい"],
          answer: {
            en: "A little spooky maybe. But spooky can still be fun.",
            jp: "ちょっと こわいかも。でも こわいのも たのしいよ。"
          }
        },
        {
          keywords: ["why is there a maze", "why maze", "なんで めいろ"],
          answer: {
            en: "Because straight lines are boring.",
            jp: "まっすぐだけだと つまらないからだよ。"
          }
        },
        {
          keywords: ["can i go anywhere", "everywhere", "all places"],
          answer: {
            en: "Some places are easy to spot. Some hide a little better.",
            jp: "すぐ みつかる ばしょも あるし、ちょっと かくれる ばしょも あるよ。"
          }
        },
        {
          keywords: ["what should i do here", "what do i do in the maze"],
          answer: {
            en: "Walk, explore, notice things, and see where the paths lead.",
            jp: "あるいて、たんけんして、いろいろ みつけて、みちの さきを みてみよう。"
          }
        },
        {
          keywords: ["secret", "hidden", "something hidden", "ひみつ", "かくし"],
          answer: {
            en: "Mazes are good at keeping little secrets.",
            jp: "めいろは ちいさい ひみつを かくすのが とくいだよ。"
          }
        },
        {
          keywords: ["wall", "walls", "tree", "trees", "かべ", "き"],
          answer: {
            en: "Sometimes walls feel like walls. Sometimes they feel like a hint.",
            jp: "かべみたいな ときも あるし、ヒントみたいな ときも あるよ。"
          }
        },
        {
          keywords: ["start", "begin", "first", "さいしょ"],
          answer: {
            en: "In the Maze, starting is easy. Just pick a direction and go.",
            jp: "めいろでは はじめるのは かんたんだよ。みちを きめて いけば いいんだ。"
          }
        }
      ]
    },

    karasuki: {
      intro: {
        en: "Uuu-hi-hi-hi-hi. Karasuki is stranger than the Maze. Softer, darker, and a little more mysterious.",
        jp: "うーひひひひ。カラスキは めいろより もっと へんだよ。やわらかくて、くらくて、もっと ふしぎなんだ。"
      },

      quickReplies: [
        {
          en: "Ask me about Karasuki, where it is, or why it feels so strange.",
          jp: "カラスキのこと、どんな ばしょか、なんで へんなのかを きいてね。"
        },
        {
          en: "Heehee. Karasuki likes mystery.",
          jp: "えへへ。カラスキは ふしぎが すきなんだ。"
        },
        {
          en: "Some places want to be understood. Karasuki mostly wants to be explored.",
          jp: "わかってほしい ばしょも あるけど、カラスキは たんけんしてほしい ばしょなんだ。"
        }
      ],

      entries: [
        {
          keywords: ["karasuki", "what is karasuki", "カラスキ"],
          answer: {
            en: "Karasuki is a strange place. Darker than usual. Quieter too.",
            jp: "カラスキは ふしぎな ばしょだよ。いつもより くらくて、しずかな ばしょなんだ。"
          }
        },
        {
          keywords: ["where am i", "where is this", "this place", "ここは", "どこ"],
          answer: {
            en: "You are in Karasuki. A place that feels a little lost and a little alive.",
            jp: "いまは カラスキに いるよ。ちょっと まよったみたいで、ちょっと いきてる みたいな ばしょだよ。"
          }
        },
        {
          keywords: ["why is karasuki dark", "dark", "dim", "くらい"],
          answer: {
            en: "Because Karasuki likes mystery more than brightness.",
            jp: "カラスキは あかるさより ふしぎが すきだからだよ。"
          }
        },
        {
          keywords: ["is karasuki scary", "scary", "creepy", "こわい"],
          answer: {
            en: "A little spooky, yes. But not the shouty kind of spooky.",
            jp: "ちょっと こわいよ。でも びっくりする こわさじゃ ないよ。"
          }
        },
        {
          keywords: ["what do i do here", "what should i do here"],
          answer: {
            en: "Look around carefully. Karasuki is better when you take your time.",
            jp: "よく まわりを みてみて。カラスキは ゆっくり みると もっと いいよ。"
          }
        },
        {
          keywords: ["why is it strange", "weird", "strange", "へん"],
          answer: {
            en: "Because normal places do not become Karasuki.",
            jp: "ふつうの ばしょは カラスキに ならないからだよ。"
          }
        },
        {
          keywords: ["lost", "i'm lost", "i am lost", "まよった"],
          answer: {
            en: "In Karasuki, being a little lost may be part of seeing it properly.",
            jp: "カラスキでは ちょっと まようのも ちゃんと みるための ひとつかもね。"
          }
        },
        {
          keywords: ["secret", "secrets", "hidden", "ひみつ"],
          answer: {
            en: "Karasuki feels full of secrets, even when nothing is talking.",
            jp: "カラスキは なにも しゃべってなくても ひみつが いっぱい ありそうな かんじが するよ。"
          }
        },
        {
          keywords: ["village", "town", "place", "むら"],
          answer: {
            en: "Karasuki feels like a place with old thoughts still hanging around.",
            jp: "カラスキは ふるい かんがえが まだ ただよってる みたいな ばしょだよ。"
          }
        },
        {
          keywords: ["crow", "crows", "bird", "からす", "とり"],
          answer: {
            en: "Karasuki and crows feel like they understand each other.",
            jp: "カラスキと からすは なんだか なかよしみたいだね。"
          }
        },
        {
          keywords: ["can i leave", "go back", "exit", "でられる", "もどれる"],
          answer: {
            en: "Usually yes. But Karasuki prefers not to be rushed.",
            jp: "たぶん だいじょうぶ。でも カラスキは いそがれるのが すきじゃ ないよ。"
          }
        },
        {
          keywords: ["why do i like this place", "i like karasuki"],
          answer: {
            en: "Maybe because strange places feel interesting when they do not explain everything.",
            jp: "たぶん なんでも せつめいしない へんな ばしょは おもしろいからだね。"
          }
        },
        {
          keywords: ["who lives here", "who is here", "だれが いる"],
          answer: {
            en: "Karasuki feels like the kind of place where something is always nearby.",
            jp: "カラスキは いつも なにかが ちかくに いそうな ばしょだよ。"
          }
        }
      ]
    },

    homework: {
      intro: {
        en: "Uuu-hi-hi-hi-hi. Homework Tree time. I can help you think, practice, and understand.",
        jp: "うーひひひひ。しゅくだいの木の じかんだよ。かんがえたり、れんしゅうしたり、わかるように てつだえるよ。"
      },

      quickReplies: [
        {
          en: "Ask me what Homework Tree is, why homework matters, or what to do next.",
          jp: "しゅくだいの木って なにか、なんで しゅくだいを するのか、つぎに なにを するかを きいてね。"
        },
        {
          en: "Heehee. Practice helps things stick.",
          jp: "えへへ。れんしゅうすると あたまに のこりやすいよ。"
        },
        {
          en: "I can help you think. Not just guess.",
          jp: "こたえを てきとうに いうんじゃなくて、いっしょに かんがえるのを てつだえるよ。"
        }
      ],

      entries: [
        {
          keywords: ["homework", "what is homework tree", "homework tree", "しゅくだい", "しゅくだいの木"],
          answer: {
            en: "Homework Tree is the place for practice and review.",
            jp: "しゅくだいの木は れんしゅうと ふくしゅうの ばしょだよ。"
          }
        },
        {
          keywords: ["what do i do here", "what should i do here", "now what"],
          answer: {
            en: "Practice a little, review a little, and try again.",
            jp: "すこし れんしゅうして、すこし ふくしゅうして、もういちど やってみよう。"
          }
        },
        {
          keywords: ["help", "help me", "can you help", "たすけて", "おしえて"],
          answer: {
            en: "Yes. Tell me which part feels tricky.",
            jp: "うん。どこが むずかしいか いってみて。"
          }
        },
        {
          keywords: ["i don't understand", "confused", "stuck", "わからない", "こまった"],
          answer: {
            en: "That is okay. We can make it smaller and easier.",
            jp: "だいじょうぶ。もっと ちいさくして、もっと やさしく できるよ。"
          }
        },
        {
          keywords: ["answer", "just tell me", "tell me the answer", "答え", "せいかい"],
          answer: {
            en: "I would rather help you get there.",
            jp: "こたえだけより、そこまで いくのを てつだいたいな。"
          }
        },
        {
          keywords: ["why homework", "why do homework", "なんで しゅくだい"],
          answer: {
            en: "Because practice helps English get stronger.",
            jp: "れんしゅうすると えいごが つよくなるからだよ。"
          }
        },
        {
          keywords: ["boring", "homework is boring", "つまらない"],
          answer: {
            en: "A little bit boring is okay. Finishing still feels good.",
            jp: "ちょっと つまらなくても いいんだよ。おわると きもちいいからね。"
          }
        },
        {
          keywords: ["hard", "too hard", "difficult", "むずかしい"],
          answer: {
            en: "Then do one small part first.",
            jp: "じゃあ まず ちいさい ひとつから やってみよう。"
          }
        },
        {
          keywords: ["easy", "too easy", "かんたん"],
          answer: {
            en: "Then do it neatly and do it well.",
            jp: "じゃあ ていねいに きれいに やってみよう。"
          }
        },
        {
          keywords: ["reading", "read", "よみ", "読む"],
          answer: {
            en: "Read slowly first. Fast can come later.",
            jp: "さいしょは ゆっくり よんでみて。はやくは あとでも できるよ。"
          }
        },
        {
          keywords: ["writing", "write", "かく", "書く"],
          answer: {
            en: "Writing by hand helps your brain remember.",
            jp: "てで かくと あたまに のこりやすいよ。"
          }
        },
        {
          keywords: ["english", "eigo", "えいご"],
          answer: {
            en: "Little by little is good. English grows with practice.",
            jp: "すこしずつで いいよ。えいごは れんしゅうで のびるんだ。"
          }
        },
        {
          keywords: ["kanji", "漢字"],
          answer: {
            en: "Try looking at the parts carefully. Tiny pieces help.",
            jp: "ぶぶんを よく みてみて。ちいさい パーツが ヒントになるよ。"
          }
        },
        {
          keywords: ["math", "number", "numbers", "計算", "すうがく", "かず"],
          answer: {
            en: "Go one step at a time. Fast mistakes are sneaky.",
            jp: "ひとつずつ すすめよう。いそぐ ミスは こっそり くるからね。"
          }
        },
        {
          keywords: ["check my work", "is this right", "なおして", "あってる"],
          answer: {
            en: "Look at it one more time slowly. Slow eyes catch more.",
            jp: "もういちど ゆっくり みてみて。ゆっくりの めは よく みつけるよ。"
          }
        },
        {
          keywords: ["finished", "done", "i'm done", "おわった"],
          answer: {
            en: "Good. Finished is better than floating around forever.",
            jp: "いいね。いつまでも ふわふわしてるより、おわるのが いちばん いいよ。"
          }
        },
        {
          keywords: ["don't want to", "i don't want homework", "やりたくない"],
          answer: {
            en: "Do one tiny part anyway.",
            jp: "それでも ちいさい ひとつだけ やってみよう。"
          }
        }
      ]
    }
  };

  function detectUhibonPageContext() {
    const bodyPage = document.body?.dataset?.uhibonPage?.trim()?.toLowerCase();
    if (bodyPage && PAGE_CONTEXTS[bodyPage]) return bodyPage;

    const href = `${window.location.pathname} ${window.location.search}`.toLowerCase();

    if (href.includes('karasuki')) return 'karasuki';
    if (href.includes('homework')) return 'homework';
    if (href.includes('maze')) return 'maze';

    return null;
  }

  function getUhibonPageIntro() {
    const pageKey = detectUhibonPageContext();
    return (
      (pageKey && PAGE_CONTEXTS[pageKey]?.intro) ||
      window.UHIBON_KNOWLEDGE?.intro || {
        en: "Uuu-hi-hi-hi-hi.",
        jp: "うーひひひひ。"
      }
    );
  }

  function getUhibonPageEntries() {
    const pageKey = detectUhibonPageContext();
    return (pageKey && PAGE_CONTEXTS[pageKey]?.entries) || [];
  }

  function getUhibonPageQuickReplies() {
    const pageKey = detectUhibonPageContext();
    return (pageKey && PAGE_CONTEXTS[pageKey]?.quickReplies) || [];
  }

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u30ff\u3400-\u9fff\uF900-\uFAFF-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchKnowledge(inputText) {
    const norm = normalizeText(inputText);
    const data = window.UHIBON_KNOWLEDGE || {};

    for (const entry of getUhibonPageEntries()) {
      for (const key of entry.keywords || []) {
        const k = normalizeText(key);
        if (k && norm.includes(k)) return entry.answer;
      }
    }

    for (const entry of data.entries || []) {
      for (const key of entry.keywords || []) {
        const k = normalizeText(key);
        if (k && norm.includes(k)) return entry.answer;
      }
    }

    const fallback =
      Array.isArray(data.unknown) && data.unknown.length
        ? data.unknown
        : [
            {
              en: "Ask me in a different way.",
              jp: "ちがう ききかたで きいてみて。"
            }
          ];

    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function getUhibonReply(inputText) {
    return matchKnowledge(inputText);
  }
})();
