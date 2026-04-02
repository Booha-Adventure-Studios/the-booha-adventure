
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

  // ── Language state ──
  // 'en' or 'jp' — user can toggle, persists in sessionStorage
  let currentLang = sessionStorage.getItem('uhibon-lang') || 'en';

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

  const iconBtn   = document.getElementById('uhibon-icon-btn');
  const popout    = document.getElementById('uhibon-popout');
  const charImg   = document.getElementById('uhibon-char-img');
  const closeBtn  = document.getElementById('uhibon-close-btn');
  const langBtn   = document.getElementById('uhibon-lang-toggle');
  const form      = document.getElementById('uhibon-input-row');
  const input     = document.getElementById('uhibon-input');
  const messages  = document.getElementById('uhibon-messages');

  if (!iconBtn || !popout || !charImg || !closeBtn || !langBtn || !form || !input || !messages) return;

  charImg.style.filter = GLOW_COLORS[glowIndex];
  updateLangBtn();

  iconBtn.addEventListener('click', openUhibonChat);
  closeBtn.addEventListener('click', closeUhibonChat);
  langBtn.addEventListener('click', toggleLang);

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

  // ── Language toggle ──────────────────────────────────────
  function toggleLang() {
    currentLang = currentLang === 'en' ? 'jp' : 'en';
    sessionStorage.setItem('uhibon-lang', currentLang);
    updateLangBtn();
  }

  function updateLangBtn() {
    langBtn.textContent = currentLang === 'en' ? 'JP' : 'EN';
    langBtn.title = currentLang === 'en' ? 'Switch to Japanese' : 'Switch to English';
  }

  // Extract the right string from a bilingual payload
  function pickLang(payload) {
    if (!payload || typeof payload === 'string') return payload || '';
    if (currentLang === 'jp') return payload.jp || payload.en || '';
    return payload.en || payload.jp || '';
  }

  // ── UI builder ───────────────────────────────────────────
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
              <button id="uhibon-lang-toggle" type="button" aria-label="Toggle language">JP</button>
              <button id="uhibon-close-btn" type="button" aria-label="Close chat">x</button>
            </div>

            <div id="uhibon-messages" aria-live="polite" aria-label="Chat messages"></div>

            <form id="uhibon-input-row">
              <input
                id="uhibon-input"
                type="text"
                placeholder="Ask Uhibon..."
                autocomplete="off"
              >
              <button id="uhibon-send-btn" type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // ── Open / close ─────────────────────────────────────────
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

  // ── Idle loop ────────────────────────────────────────────
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

  // ── Character state ───────────────────────────────────────
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

  // ── Message rendering ─────────────────────────────────────
  // Messages are now always single-language strings
  function addMessage(sender, payload) {
    const div = document.createElement('div');
    div.className = `uhibon-msg ${sender}`;

    // Resolve to a plain string in the active language
    const text = (sender === 'bot') ? pickLang(payload) : (typeof payload === 'string' ? payload : pickLang(payload));

    div.textContent = text;

    // Set lang attr for correct font rendering
    if (sender === 'bot') {
      div.lang = currentLang === 'jp' ? 'ja' : 'en';
    } else {
      div.lang = /[\u3040-\u9FFF\uF900-\uFAFF]/.test(text) ? 'ja' : 'en';
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function talkDuration(payload) {
    const text = pickLang(payload);
    const len = typeof text === 'string' ? text.length : 0;
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

  // ── Page knowledge ────────────────────────────────────────
  /*
    Each entry has { en, jp } strings.
    Uhibon's voice: playful, curious, a little strange and silly.
    Short sentences. Friendly but odd. No emoji. No long explanations.
    More like a friendly forest creature than a helpful assistant.
  */

  /* uhibon-page-contexts.js
   Drop this into uhibon-init.js in place of the existing PAGE_CONTEXTS block.
   Requires the engine patch: pickRandom(val) handles both flat { en, jp } and arrays.
*/

const PAGE_CONTEXTS = {

  /* ════════════════════════════════════════
     MAZE
  ════════════════════════════════════════ */

  maze: {
    intro: [
      { en: "Uuu-hi-hi-hi-hi. You found the Maze. Good. Very twisty in here.", jp: "うーひひひひ。めいろを みつけたね。よかった。くねくねしてるよ。" },
      { en: "Heehee. The Maze. Lots of paths. Some go somewhere good.", jp: "えへへ。めいろだね。みちが いっぱい。いい ところに いくのも あるよ。" },
      { en: "Uuu-hi-hi-hi-hi. Welcome to the twisty place.", jp: "うーひひひひ。ぐるぐるの ばしょへ ようこそ。" }
    ],

    quickReplies: [
      { en: "What is the Maze, anyway?",  jp: "めいろって なに？" },
      { en: "I think I am lost in here.", jp: "まよったかも。" },
      { en: "Is there a secret in here?", jp: "なにか かくれてる？" },
      { en: "Where should I go first?",   jp: "さいしょに どこへ いけばいい？" }
    ],

    entries: [
      {
        keywords: ["hello","hi","hey","howdy","yo","sup","what's up","hiya","konnichiwa","こんにちは","やあ"],
        answer: [
          { en: "Uuu-hi-hi-hi-hi! Hello, Maze explorer.", jp: "うーひひひひ！こんにちは、めいろたんけんしゃ。" },
          { en: "Heehee. You made it to the Maze. Hello.", jp: "えへへ。めいろに きたんだね。こんにちは。" },
          { en: "Hi hi! Lost already? That's okay.", jp: "やあやあ！もう まよった？だいじょうぶだよ。" },
          { en: "Oh! A visitor. Hello. Watch the walls.", jp: "あ！だれか きた。こんにちは。かべに きをつけてね。" }
        ]
      },
      {
        keywords: ["maze","what is the maze","what is this","めいろ","なに"],
        answer: [
          { en: "The Maze is the main walking-around place. Lots of paths. Some go somewhere interesting.", jp: "めいろは メインの たんけんばしょだよ。みちが いっぱいあって、おもしろい ところに いくのも あるよ。" },
          { en: "A big connected place. You explore it. Things happen.", jp: "おおきな つながった ばしょだよ。たんけんするんだ。いろいろ おこるよ。" }
        ]
      },
      {
        keywords: ["lost","i'm lost","i am lost","where am i","迷子","まよった"],
        answer: [
          { en: "Getting a little lost is fine. The Maze is used to it.", jp: "ちょっと まよっても だいじょうぶ。めいろは なれてるから。" },
          { en: "Heehee. Lost is just another word for exploring.", jp: "えへへ。まよってるって いうのは、たんけんしてるって ことだよ。" },
          { en: "Look for something interesting and go toward it.", jp: "おもしろそうな ものを みつけて、そっちへ いって。" }
        ]
      },
      {
        keywords: ["where do i go","which way","direction","どこ","みち","どっち","where now"],
        answer: [
          { en: "Pick the path that looks interesting. Boring paths are less fun.", jp: "きになる みちを えらんで。つまらない みちは つまらないよ。" },
          { en: "Try the one you almost didn't notice.", jp: "あやうく みのがした みちを ためしてみて。" }
        ]
      },
      {
        keywords: ["exit","goal","finish","clear","出口","ゴール","クリア"],
        answer: [
          { en: "Getting out is one thing. But sometimes the Maze wants you to find something first.", jp: "でることも いいけど、なにかを みつけてから のほうが いいかもね。" },
          { en: "You'll find the exit. But maybe not right away.", jp: "でぐちは みつかるよ。でも すぐじゃ ないかも。" }
        ]
      },
      {
        keywords: ["map","layout","地図","マップ"],
        answer: [
          { en: "No map. Sorry. That would ruin it a little.", jp: "ちずは ないよ。ごめんね。あったら ちょっと つまらなくなるもん。" },
          { en: "The Maze is the map. Kind of.", jp: "めいろ じたいが ちずみたいなものだよ。たぶんね。" }
        ]
      },
      {
        keywords: ["scary","creepy","こわい"],
        answer: [
          { en: "A bit spooky. But the kind that is still fun.", jp: "ちょっと こわいかも。でも たのしい こわさだよ。" },
          { en: "Heehee. I think it's more mysterious than scary.", jp: "えへへ。こわいより ふしぎな かんじだと おもうよ。" }
        ]
      },
      {
        keywords: ["secret","hidden","ひみつ","かくし"],
        answer: [
          { en: "Mazes are quite good at hiding small things.", jp: "めいろは ちいさい ものを かくすのが とくいなんだ。" },
          { en: "Maybe. Look at things that seem unimportant.", jp: "あるかも。なんでも ないように みえる ものを よく みてみて。" }
        ]
      },
      {
        keywords: ["wall","walls","tree","trees","かべ","き"],
        answer: [
          { en: "Walls are walls. Sometimes they are also a hint. Hard to tell.", jp: "かべは かべだよ。でも ヒントのときも あるかも。わかんないけど。" },
          { en: "The walls know things. They're not saying though.", jp: "かべは なにかを しってるよ。でも しゃべってくれないんだ。" }
        ]
      },
      {
        keywords: ["start","begin","first","さいしょ","はじめ"],
        answer: [
          { en: "Starting is easy. Just pick a direction.", jp: "はじめるのは かんたん。みちを きめて いくだけ。" },
          { en: "Go somewhere. The Maze rewards trying.", jp: "どこかに いって。めいろは ためした ひとに いいことが あるよ。" }
        ]
      },
      {
        keywords: ["why maze","why is there a maze","なんで めいろ"],
        answer: [
          { en: "Because straight lines are boring.", jp: "まっすぐだけだと つまらないからだよ。" },
          { en: "Adventures need a maze. That's just how it works.", jp: "ぼうけんには めいろが ひつようなんだよ。そういう ものなんだ。" }
        ]
      }
    ]
  },

  /* ════════════════════════════════════════
     KARASUKI
  ════════════════════════════════════════ */

  karasuki: {
    intro: [
      { en: "Uuu-hi-hi-hi-hi. Karasuki. Darker here. Quieter. Something is always nearby.", jp: "うーひひひひ。カラスキだよ。ここは くらい。しずか。なにかが いつも ちかくに いるんだ。" },
      { en: "Heehee. You found Karasuki. Strange place. Good strange.", jp: "えへへ。カラスキを みつけたね。へんな ばしょだよ。いい へんさだけど。" },
      { en: "Uuu-hi-hi-hi-hi. Welcome to the strange dark quiet place.", jp: "うーひひひひ。へんで くらくて しずかな ばしょへ ようこそ。" }
    ],

    quickReplies: [
      { en: "What even is Karasuki?",       jp: "カラスキって なに？" },
      { en: "Why does it feel so strange?", jp: "なんで こんなに へんな かんじがするの？" },
      { en: "Is something hiding in here?", jp: "なにかが かくれてる？" },
      { en: "Is it okay to explore here?",  jp: "ここを たんけんしても いい？" }
    ],

    entries: [
      {
        keywords: ["hello","hi","hey","howdy","yo","sup","what's up","hiya","konnichiwa","こんにちは","やあ"],
        answer: [
          { en: "Uuu-hi-hi-hi-hi. Hello. Quietly.", jp: "うーひひひひ。こんにちは。しずかにね。" },
          { en: "Heehee. Someone arrived. Hello, quiet adventurer.", jp: "えへへ。だれか きた。こんにちは、しずかな ぼうけんしゃ。" },
          { en: "Hi. Karasuki noticed you came in.", jp: "こんにちは。カラスキは きみが はいってきたの しってるよ。" },
          { en: "Oh. Hello. This place gets quieter when someone arrives. Strange.", jp: "あ。こんにちは。だれかが くると もっと しずかになるんだ。ふしぎだね。" }
        ]
      },
      {
        keywords: ["karasuki","what is karasuki","カラスキ","なに"],
        answer: [
          { en: "Karasuki is a strange place. Darker than usual. Quieter too. Not scary exactly. Just different.", jp: "カラスキは ふしぎな ばしょだよ。いつもより くらくて しずか。こわいわけじゃないけど、なんか ちがうんだ。" },
          { en: "Old. Strange. Quiet. Full of things that don't quite say what they are.", jp: "ふるくて へんで しずか。なにかを かくしてる ものが いっぱいあるよ。" }
        ]
      },
      {
        keywords: ["where am i","where is this","ここは","どこ"],
        answer: [
          { en: "You are in Karasuki. It feels a little lost and a little alive at the same time.", jp: "カラスキに いるよ。ちょっと まよったみたいで、でも ちょっと いきてる みたいな ばしょなんだ。" },
          { en: "Karasuki. Somewhere between here and somewhere else.", jp: "カラスキ。ここと どこかの あいだに ある ばしょだよ。" }
        ]
      },
      {
        keywords: ["why dark","dark","dim","くらい"],
        answer: [
          { en: "Karasuki likes mystery more than brightness. They don't agree on that point.", jp: "カラスキは あかるさより ふしぎが すきなんだ。そこは なかよくできないみたい。" },
          { en: "Some places just like the dark. Karasuki is one of them.", jp: "くらいのが すきな ばしょって あるんだよ。カラスキは そういう ばしょ。" }
        ]
      },
      {
        keywords: ["scary","creepy","こわい"],
        answer: [
          { en: "A little spooky. Not the loud kind. More like a quiet strange feeling.", jp: "ちょっと こわい。でも うるさい こわさじゃなくて、しずかに へんな かんじ。" },
          { en: "Heehee. Karasuki is the kind of spooky that makes you look twice.", jp: "えへへ。カラスキは もう いちど みたくなる こわさだよ。" }
        ]
      },
      {
        keywords: ["what do i do here","what should i do","なにをする","どうする"],
        answer: [
          { en: "Look around carefully. Karasuki is better if you take your time.", jp: "まわりを よく みてみて。カラスキは ゆっくり みると もっと いいんだよ。" },
          { en: "Slow down. Let Karasuki show you things.", jp: "ゆっくりして。カラスキが みせてくれるのを まってみて。" }
        ]
      },
      {
        keywords: ["weird","strange","why strange","へん","ふしぎ"],
        answer: [
          { en: "Because normal places don't become Karasuki.", jp: "ふつうの ばしょは カラスキに ならないからだよ。" },
          { en: "Strange is just how Karasuki is. It's comfortable with it.", jp: "へんなのが カラスキの ふつうなんだ。なれてるよ。" }
        ]
      },
      {
        keywords: ["lost","i'm lost","i am lost","まよった"],
        answer: [
          { en: "Being a little lost in Karasuki is maybe part of seeing it properly.", jp: "カラスキで ちょっと まようのも、ちゃんと みるための ひとつかもね。" },
          { en: "Heehee. Karasuki likes it when you stay a while.", jp: "えへへ。カラスキは すこし いてくれると うれしいんだよ。" }
        ]
      },
      {
        keywords: ["secret","hidden","ひみつ"],
        answer: [
          { en: "Karasuki feels full of secrets even when nothing is speaking.", jp: "カラスキは なにも しゃべってなくても、ひみつが いっぱい ありそうな かんじがするよ。" },
          { en: "Yes. Many. Don't rush.", jp: "あるよ。たくさん。いそがないでね。" }
        ]
      },
      {
        keywords: ["crow","crows","bird","からす","とり"],
        answer: [
          { en: "Karasuki and crows seem to understand each other.", jp: "カラスキと からすは なんとなく わかりあってるみたい。" },
          { en: "Crows know things. So does Karasuki. They get along.", jp: "からすは いろいろ しってるんだ。カラスキも そう。だから なかよし。" }
        ]
      },
      {
        keywords: ["can i leave","go back","exit","でられる","もどれる"],
        answer: [
          { en: "Probably yes. But Karasuki prefers not to be rushed.", jp: "たぶん だいじょうぶ。でも カラスキは いそがれるのが すきじゃないんだ。" },
          { en: "You can leave. But look around a little more first.", jp: "でられるよ。でも もう すこし みていって。" }
        ]
      },
      {
        keywords: ["who lives here","who is here","だれが いる"],
        answer: [
          { en: "Karasuki feels like the kind of place where something is always nearby.", jp: "カラスキは なんか いつも なにかが ちかくに いそうな ばしょだよ。" },
          { en: "Hard to say. But you probably aren't alone.", jp: "むずかしい しつもんだね。でも たぶん ひとりじゃ ないよ。" }
        ]
      }
    ]
  },

  /* ════════════════════════════════════════
     HOMEWORK
  ════════════════════════════════════════ */

  homework: {
    intro: [
      { en: "Uuu-hi-hi-hi-hi. Homework Tree. Good place. I can help.", jp: "うーひひひひ。しゅくだいの木だよ。いい ばしょ。てつだえるよ。" },
      { en: "Heehee. Homework time. You can do this.", jp: "えへへ。しゅくだいの じかんだよ。できるよ。" },
      { en: "Uuu-hi-hi-hi-hi. Practice place. Ask me things if you get stuck.", jp: "うーひひひひ。れんしゅうの ばしょだよ。まよったら きいてね。" }
    ],

    quickReplies: [
      { en: "What is Homework Tree?",     jp: "しゅくだいの木って なに？" },
      { en: "I am stuck on something.",   jp: "わからないところが あるよ。" },
      { en: "Why do I even do homework?", jp: "なんで しゅくだいするの？" },
      { en: "I don't want to do this.",   jp: "やりたくないな。" }
    ],

    entries: [
      {
        keywords: ["hello","hi","hey","howdy","yo","sup","what's up","hiya","konnichiwa","こんにちは","やあ"],
        answer: [
          { en: "Uuu-hi-hi-hi-hi! Hello. Ready to practice?", jp: "うーひひひひ！こんにちは。れんしゅう できる？" },
          { en: "Hi hi! Homework Tree adventurer. Good.", jp: "やあやあ！しゅくだいの木の ぼうけんしゃだね。いいね。" },
          { en: "Heehee. Hello. Let's make brains sparkle.", jp: "えへへ。こんにちは。あたまを ぴかぴかに しよう。" },
          { en: "Oh! You came to practice. That's the right idea.", jp: "あ！れんしゅうしに きたんだね。それが いいんだよ。" }
        ]
      },
      {
        keywords: ["homework","what is homework tree","homework tree","しゅくだい","しゅくだいの木"],
        answer: [
          { en: "Homework Tree is the place for practice and review. You come here to get better at things.", jp: "しゅくだいの木は れんしゅうと ふくしゅうの ばしょだよ。ここで じょうずになれるんだ。" },
          { en: "Practice and review. A little each time. It adds up.", jp: "れんしゅうと ふくしゅう。すこしずつ やると ちゃんと のびるんだよ。" }
        ]
      },
      {
        keywords: ["what do i do here","now what","どうする","なにをする"],
        answer: [
          { en: "Practice a little. Review a little. Try again. That is the whole thing.", jp: "すこし れんしゅうして、すこし ふくしゅうして、もういちど やってみよう。それだけだよ。" },
          { en: "Pick something and start. Starting is the hardest part.", jp: "なにか えらんで はじめて。はじめるのが いちばん むずかしいんだから。" }
        ]
      },
      {
        keywords: ["help","help me","can you help","たすけて","おしえて"],
        answer: [
          { en: "Yes. Tell me which part feels tricky.", jp: "うん。どこが むずかしいか おしえて。" },
          { en: "Sure. What part has you stuck?", jp: "いいよ。どこで まよってる？" }
        ]
      },
      {
        keywords: ["i don't understand","confused","stuck","わからない","こまった"],
        answer: [
          { en: "That is okay. We can make it smaller and easier to look at.", jp: "だいじょうぶ。もっと ちいさく わけて かんがえてみよう。" },
          { en: "Not understanding yet is fine. That's why you practice.", jp: "まだ わからなくて いいんだよ。だから れんしゅうするんだから。" }
        ]
      },
      {
        keywords: ["answer","just tell me","tell me the answer","答え","せいかい"],
        answer: [
          { en: "I would rather help you get there yourself. More fun that way.", jp: "じぶんで たどりつくのを てつだいたいな。そっちのほうが おもしろいから。" },
          { en: "Heehee. Try first. Then we can talk.", jp: "えへへ。まず やってみて。そのあと はなそう。" }
        ]
      },
      {
        keywords: ["why homework","why do homework","なんで しゅくだい"],
        answer: [
          { en: "Practice helps English get stronger. Small bits every day add up.", jp: "れんしゅうすると えいごが つよくなるよ。まいにち すこしずつで ちゃんと のびるんだ。" },
          { en: "Because you practiced today, future-you will thank you.", jp: "きょう れんしゅうしたら、みらいの きみが ありがとうって いってくれるよ。" }
        ]
      },
      {
        keywords: ["boring","homework is boring","つまらない"],
        answer: [
          { en: "A little boring is okay. Finishing still feels pretty good.", jp: "ちょっと つまらなくても いいよ。おわると きもちいいからね。" },
          { en: "Heehee. Do one part. See if it stays boring.", jp: "えへへ。ひとつ やってみて。それでも つまらいか みてみよう。" }
        ]
      },
      {
        keywords: ["hard","too hard","difficult","むずかしい"],
        answer: [
          { en: "Then do one small part first. Just one.", jp: "じゃあ まず ちいさい ひとつだけ やってみよう。ひとつだけ。" },
          { en: "Hard is okay. Hard means your brain is working.", jp: "むずかしくて いいんだよ。むずかしいのは あたまが はたらいてる しょうこだから。" }
        ]
      },
      {
        keywords: ["easy","too easy","かんたん"],
        answer: [
          { en: "Then do it neatly. Neat is its own kind of hard.", jp: "じゃあ ていねいに やってみよう。ていねいって それなりに むずかしいんだよ。" },
          { en: "Good. Go faster. See how clean you can make it.", jp: "いいね。もっと はやくやってみて。どれだけ きれいに できるか みてみよう。" }
        ]
      },
      {
        keywords: ["finished","done","i'm done","おわった"],
        answer: [
          { en: "Good. Finished is better than floating around forever.", jp: "いいね。いつまでも ふわふわしてるより、おわるのが いちばんだよ。" },
          { en: "Heehee! Done already. That's the right kind of fast.", jp: "えへへ！もう おわった。それが いい はやさだよ。" }
        ]
      },
      {
        keywords: ["don't want to","i don't want homework","やりたくない"],
        answer: [
          { en: "Do one tiny part anyway. Just the tiniest part.", jp: "それでも ちいさい ひとつだけ やってみよう。ほんの ちいさいやつだけ。" },
          { en: "Heehee. Five minutes. That is all. Then see how you feel.", jp: "えへへ。五分だけ。それだけ。そのあと どんな きもちか みてみて。" }
        ]
      },
      {
        keywords: ["reading","read","よみ","読む"],
        answer: [
          { en: "Read slowly first. Fast reading can come later.", jp: "さいしょは ゆっくり よんで。はやく よむのは あとでも できるよ。" }
        ]
      },
      {
        keywords: ["writing","write","かく","書く"],
        answer: [
          { en: "Writing by hand helps your brain remember things.", jp: "てで かくと あたまに のこりやすいよ。" }
        ]
      },
      {
        keywords: ["english","eigo","えいご"],
        answer: [
          { en: "Little by little is good. English grows with practice.", jp: "すこしずつ でいいよ。えいごは れんしゅうで のびるんだ。" }
        ]
      },
      {
        keywords: ["math","number","numbers","計算","すうがく","かず"],
        answer: [
          { en: "One step at a time. Rushing makes sneaky mistakes.", jp: "ひとつずつ やっていこう。いそぐと こっそり まちがえるから。" }
        ]
      }
    ]
  }

};

  // ── Context detection ─────────────────────────────────────
  function detectUhibonPageContext() {
    const bodyPage = document.body?.dataset?.uhibonPage?.trim()?.toLowerCase();
    if (bodyPage && PAGE_CONTEXTS[bodyPage]) return bodyPage;

    const href = `${window.location.pathname} ${window.location.search}`.toLowerCase();
    if (href.includes('karasuki')) return 'karasuki';
    if (href.includes('homework')) return 'homework';
    if (href.includes('maze'))     return 'maze';
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

// ── Knowledge matching ────────────────────────────────────

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u30ff\u3400-\u9fff\uF900-\uFAFF-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wordMatch(norm, k) {
    if (!k) return false;
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (/[\u3040-\u9FFF]/.test(k)) return norm.includes(k);
    return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(norm);
  }

  function pickRandom(val) {
    if (Array.isArray(val)) return val[Math.floor(Math.random() * val.length)];
    return val;
  }

  function matchKnowledge(inputText) {
    const norm = normalizeText(inputText);
    const data = window.UHIBON_KNOWLEDGE || {};

    for (const entry of getUhibonPageEntries()) {
      for (const key of entry.keywords || []) {
        const k = normalizeText(key);
        if (wordMatch(norm, k)) {
          const payload = entry.answer || { en: entry.en, jp: entry.jp };
          return pickRandom(payload);
        }
      }
    }

    for (const entry of data.entries || []) {
      for (const key of entry.keywords || []) {
        const k = normalizeText(key);
        if (wordMatch(norm, k)) return pickRandom(entry.answer);
      }
    }

    const fallback = Array.isArray(data.unknown) && data.unknown.length
      ? data.unknown
      : [{ en: "Try asking me in a different way.", jp: "ちがう ききかたで きいてみて。" }];

    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function getUhibonReply(inputText) {
    return matchKnowledge(inputText);
  }

    
})(); // end IIFE
};   // end window.uhibonInit
