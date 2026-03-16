
(function () {
  const IMG_BASE    = 'assets/img/uhibon/';
  const IMG_ICON    = IMG_BASE + 'chat-uhi.png';
  const IMG_OPEN    = IMG_BASE + 'uhi-w.png';
  const IMG_STUDENT = IMG_BASE + 'uhi-st.png';
  const IMG_TALK_1  = IMG_BASE + 'uhi-t1.png';
  const IMG_TALK_2  = IMG_BASE + 'uhi-t2.png';

  const root = document.getElementById('uhibon-chat-root');
  if (!root) return;

  let isOpen    = false;
  let talkTimer = null;
  let idleTimer = null;

  buildUhibonUI();

  const iconBtn  = document.getElementById('uhibon-icon-btn');
  const popout   = document.getElementById('uhibon-popout');
  const charImg  = document.getElementById('uhibon-char-img');
  const closeBtn = document.getElementById('uhibon-close-btn');
  const form     = document.getElementById('uhibon-input-row');
  const input    = document.getElementById('uhibon-input');
  const messages = document.getElementById('uhibon-messages');

  iconBtn .addEventListener('click', openUhibonChat);
  closeBtn.addEventListener('click', closeUhibonChat);

  input.addEventListener('input', () => {
    if (!isOpen) return;
    setCharState(input.value.trim() ? 'student' : 'idle');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    setCharState('idle');
    const reply = getUhibonReply(text);
    await botSpeak(reply);
  });

  /* ════════════════════════════════════════════════════════════
     BUILD DOM
  ════════════════════════════════════════════════════════════ */
  function buildUhibonUI() {
    root.innerHTML = `
      <div id="uhibon-launcher">
        <button id="uhibon-icon-btn" aria-label="Open Uhibon chat">
          <img src="${IMG_ICON}" alt="Uhibon icon">
        </button>
        <div id="uhibon-popout">
          <div id="uhibon-character">
            <img id="uhibon-char-img" src="${IMG_OPEN}" alt="Uhibon">
          </div>
          <div id="uhibon-chatbox">
            <div id="uhibon-header">
              <span>✦ Uhibon ✦</span>
              <button id="uhibon-close-btn" aria-label="Close chat">×</button>
            </div>
            <div id="uhibon-messages"></div>
            <form id="uhibon-input-row">
              <input id="uhibon-input" type="text"
                     placeholder="Ask Uhibon… / 話しかけて…"
                     autocomplete="off" lang="ja">
              <button id="uhibon-send-btn" type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════════════════════
     OPEN / CLOSE
  ════════════════════════════════════════════════════════════ */
  function openUhibonChat() {
    if (isOpen) return;
    isOpen = true;
    popout.classList.add('open');
    iconBtn.style.display = 'none';
    setCharState('idle');

    if (!messages.children.length) {
      const pageCtx = getPageContext();
      const intro   = pageCtx.intro
        || (window.UHIBON_KNOWLEDGE && window.UHIBON_KNOWLEDGE.intro)
        || { en: "I am Uhibon… welcome, wanderer. 🕯️",
             jp: "ウヒボンじゃ。ようこそ、旅人よ。" };
      botSpeak(intro);
    }
    setTimeout(() => input.focus(), 50);
  }

  function closeUhibonChat() {
    isOpen = false;
    stopTalking();
    stopIdleLoop();
    popout.classList.remove('open');
    iconBtn.style.display = '';
  }

  /* ════════════════════════════════════════════════════════════
     UPGRADE 1 — IDLE ANIMATION LOOP
     Uhibon fidgets organically every 3-6 s while waiting.
     Two CSS classes drive the micro-actions:
       .idle-blink  — quick squint (CSS scale Y on the img)
       .idle-look   — brief glance using a src swap + tilt
     Everything is class-based; no rapid timers.
  ════════════════════════════════════════════════════════════ */
  // Glow colour palette — each idle tick shifts to the next hue.
  // Pure CSS filter, no src swap, no opacity flicker.
  const GLOW_COLORS = [
    'drop-shadow(0 0 10px rgba(123, 79,207,.80)) drop-shadow(0 0 26px rgba( 60, 20,100,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba( 56,200,190,.75)) drop-shadow(0 0 26px rgba( 20, 80, 90,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba(220, 80,180,.75)) drop-shadow(0 0 26px rgba(100, 20, 70,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba(245,200, 66,.75)) drop-shadow(0 0 26px rgba(120, 80, 10,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
    'drop-shadow(0 0 10px rgba( 80,140,255,.75)) drop-shadow(0 0 26px rgba( 20, 40,120,.75)) drop-shadow(0 4px 32px rgba(0,0,0,.8))',
  ];
  let glowIndex = 0;

  function startIdleLoop() {
    stopIdleLoop();
    scheduleNextIdle();
  }

  function stopIdleLoop() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (charImg) charImg.classList.remove('idle-blink', 'idle-look');
  }

  function scheduleNextIdle() {
    const delay = 3200 + Math.random() * 2800;
    idleTimer = setTimeout(() => {
      if (!isOpen) return;
      doIdleAction();
    }, delay);
  }

  function doIdleAction() {
    // Shift glow colour — CSS transition on filter handles the blend smoothly
    glowIndex = (glowIndex + 1) % GLOW_COLORS.length;
    charImg.style.filter = GLOW_COLORS[glowIndex];

    const pick = Math.random();

    if (pick < 0.5) {
      // Blink — pure CSS scaleY squeeze, zero src swap
      charImg.classList.add('idle-blink');
      setTimeout(() => {
        charImg.classList.remove('idle-blink');
        scheduleNextIdle();
      }, 320);
    } else {
      // Glance — pure CSS tilt, zero src swap
      charImg.classList.add('idle-look');
      setTimeout(() => {
        charImg.classList.remove('idle-look');
        scheduleNextIdle();
      }, 680);
    }
  }

  /* ════════════════════════════════════════════════════════════
     CHARACTER STATE
  ════════════════════════════════════════════════════════════ */
  function setCharSrc(src) {
    const file = src.replace(/^.*\//, '');
    if (charImg.src.endsWith(file)) return;
    // Soft cross-fade only on deliberate state changes (idle→talk, etc.)
    // The idle glow/pose loop never calls this, so no strobe.
    charImg.style.transition = 'opacity .2s ease, filter 1.6s ease';
    charImg.style.opacity = '0';
    setTimeout(() => {
      charImg.src = src;
      charImg.style.opacity = '1';
    }, 130);
  }

  function setCharState(state) {
    charImg.classList.remove('is-talking', 'idle-blink', 'idle-look');

    if (state === 'talking') {
      stopIdleLoop();
      setCharSrc(IMG_TALK_1);
      charImg.classList.add('is-talking');
    } else if (state === 'student') {
      stopIdleLoop();
      setCharSrc(IMG_STUDENT);
    } else {
      // idle
      setCharSrc(IMG_OPEN);
      if (isOpen) startIdleLoop();
    }
  }

  /* ════════════════════════════════════════════════════════════
     MESSAGES — bilingual rendering
     reply can be a plain string OR { en, jp } object.
     Bot messages render two stacked spans so each language
     gets its own CSS class (.uhibon-en / .uhibon-jp).
  ════════════════════════════════════════════════════════════ */
  function addMessage(sender, payload) {
    const div = document.createElement('div');
    div.className = `uhibon-msg ${sender}`;

    if (sender === 'bot' && payload && typeof payload === 'object'
        && (payload.en || payload.jp)) {

      if (payload.en) {
        const en = document.createElement('span');
        en.className  = 'uhibon-en';
        en.textContent = payload.en;
        div.appendChild(en);
      }
      if (payload.jp) {
        const jp = document.createElement('span');
        jp.className  = 'uhibon-jp';
        jp.lang       = 'ja';
        jp.textContent = payload.jp;
        div.appendChild(jp);
      }

    } else {
      const text = typeof payload === 'string' ? payload
                 : (payload.en || payload.jp || '');
      div.textContent = text;
      div.lang = /[\u3040-\u9FFF\uF900-\uFAFF]/.test(text) ? 'ja' : 'en';
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  /* ════════════════════════════════════════════════════════════
     UPGRADE 2 — TALKING SPEED TIED TO SENTENCE LENGTH
     38 ms per character → short lines snap in fast,
     long replies feel weighty. Hard floor/ceiling keeps
     the experience comfortable.
       < 20 chars  → ~600 ms  (one-word answers)
       ~80 chars   → ~3 000 ms (a couple of sentences)
       cap at 4 500 ms so nothing overstays its welcome
  ════════════════════════════════════════════════════════════ */
  function talkDuration(payload) {
    let len = 0;
    if (typeof payload === 'string') {
      len = payload.length;
    } else if (payload && typeof payload === 'object') {
      // Japanese characters are denser to read — weight them slightly less
      len = (payload.en || '').length + (payload.jp || '').length * 0.6;
    }
    return Math.min(4500, Math.max(600, Math.round(len * 38)));
  }

  async function botSpeak(payload) {
    setCharState('talking');
    await wait(talkDuration(payload));
    stopTalking();
    addMessage('bot', payload);
  }

  function stopTalking() {
    if (talkTimer) { clearInterval(talkTimer); talkTimer = null; }
    setCharState('idle');
  }

  /* ════════════════════════════════════════════════════════════
     UPGRADE 3 — PAGE-AWARE KNOWLEDGE
     Detects current page via:
       1. <body data-uhibon-page="maze|karasuki|homework">
       2. URL path / query string keyword match
     Injects page-specific entries + a tailored intro greeting
     before falling back to the global UHIBON_KNOWLEDGE base.

     Extend: add more keys to PAGE_CONTEXTS, or set the body
     attribute on any page. Answers can be { en, jp } objects
     or plain strings — both render correctly.
  ════════════════════════════════════════════════════════════ */
  const PAGE_CONTEXTS = {

    maze: {
      intro: { en: "You've wandered into the maze… stay close and I'll guide you. 🗺️",
               jp: "迷宮へようこそ。迷ったら何でも聞いてね。" },
      entries: [
        { keywords: ['lost','where','direction','help','道','迷子','どこ'],
          answer: { en: "Follow the glowing tiles — they mark the safe path. Don't trust the moving walls.",
                    jp: "光るタイルに沿って進んで。動く壁には近づかないで。" } },
        { keywords: ['exit','escape','goal','finish','ゴール','出口','クリア'],
          answer: { en: "The exit shifts at midnight. Watch the top-right corner of the map.",
                    jp: "出口は真夜中に移動するよ。マップの右上を確認して。" } },
        { keywords: ['monster','enemy','danger','chase','敵','モンスター','危険'],
          answer: { en: "Stand still when the lanterns flicker. It can't see you if you don't move.",
                    jp: "ランタンが揺れたら動かないで。動かなければ見えないはず。" } },
        { keywords: ['map','layout','floor','マップ','地図','フロア'],
          answer: { en: "The map redraws itself each run. Trust your memory — not the walls.",
                    jp: "マップは毎回変わるよ。壁じゃなく自分の記憶を信じて。" } },
      ],
    },

    karasuki: {
      intro: { en: "Ah — you stand in Karasuki village. The crows know many secrets here. 🐦‍⬛",
               jp: "烏鋤村へようこそ。烏たちは多くの秘密を知っているよ。" },
      entries: [
        { keywords: ['shop','store','buy','item','売','店','購入','アイテム'],
          answer: { en: "Hagura's shop opens after the second bell. Bring crow feathers to trade.",
                    jp: "二の鐘の後にハグラの店が開くよ。烏の羽を持ってきてね。" } },
        { keywords: ['elder','chief','leader','village','村長','長老','村'],
          answer: { en: "The Elder lives beyond the torii gate. Bow before you speak.",
                    jp: "長老は鳥居の奥に住んでいる。話す前にお辞儀してね。" } },
        { keywords: ['quest','mission','task','request','クエスト','任務','依頼'],
          answer: { en: "Post your request on the crow-board by the well. Someone always answers.",
                    jp: "井戸そばの烏板に依頼を貼ってみて。必ず誰かが答えてくれるよ。" } },
        { keywords: ['festival','event','celebration','祭り','イベント','お祭り'],
          answer: { en: "The Kara Festival begins when three crows land on the shrine roof simultaneously.",
                    jp: "三羽の烏が同時に社の屋根に止まると、烏祭りが始まるよ。" } },
      ],
    },

    homework: {
      intro: { en: "Study time! I'll help you understand — not just hand you the answer. 📖",
               jp: "勉強の時間！答えをあげるだけじゃなく、理解を助けるよ。" },
      entries: [
        { keywords: ['stuck','confused','help','don\'t understand','わからない','教えて','困ってる'],
          answer: { en: "Tell me exactly which part is tricky — the question itself, or what to do next?",
                    jp: "どの部分が分からない？問題の意味？それとも次のステップ？" } },
        { keywords: ['answer','just tell me','give me','答え','正解','教えて'],
          answer: { en: "Let's get there together — what have you tried so far?",
                    jp: "一緒に考えよう。今まで何を試してみた？" } },
        { keywords: ['kanji','reading','writing','meaning','漢字','読み','書き','意味'],
          answer: { en: "Break the kanji into radicals — the left side usually hints at the meaning.",
                    jp: "漢字を部首に分けてみよう。左側が意味のヒントになることが多いよ。" } },
        { keywords: ['math','number','calculate','equation','数学','計算','方程式','数'],
          answer: { en: "Write out each step by hand — rushing past them is where mistakes hide.",
                    jp: "ひとつずつ手で書き出してみて。急ぐとそこにミスが潜むよ。" } },
      ],
    },

  };

  function getPageContext() {
    const url      = (window.location.pathname + window.location.search).toLowerCase();
    const dataPage = (document.body.dataset.uhibonPage || '').toLowerCase();

    for (const [key, ctx] of Object.entries(PAGE_CONTEXTS)) {
      if (dataPage === key || url.includes(key)) return ctx;
    }
    return {};
  }

  /* ── Knowledge matching ── */
  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u9FFF-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchKnowledge(inputText) {
    const norm    = normalizeText(inputText);
    const pageCtx = getPageContext();

    // 1 — page-specific (higher priority)
    for (const entry of (pageCtx.entries || [])) {
      for (const key of (entry.keywords || [])) {
        if (normalizeText(key) && norm.includes(normalizeText(key)))
          return entry.answer;
      }
    }

    // 2 — global knowledge base
    const data = window.UHIBON_KNOWLEDGE || {};
    for (const entry of (data.entries || [])) {
      for (const key of (entry.keywords || [])) {
        const k = normalizeText(key);
        if (k && norm.includes(k)) return entry.answer;
      }
    }

    // 3 — fallback
    const fallback = Array.isArray(data.fallback)
      ? data.fallback
      : [{ en: "The spirits are silent on that… try asking differently. 🕯️",
           jp: "その問いには霊も黙っているよ…言い方を変えてみて。" }];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function getUhibonReply(inputText) {
    return matchKnowledge(inputText);
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

})();
