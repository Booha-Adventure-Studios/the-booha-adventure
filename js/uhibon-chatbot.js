
(function () {
  const IMG_BASE    = 'assets/img/uhibon/';
  const IMG_ICON    = IMG_BASE + 'chat-uhi.png';
  const IMG_OPEN    = IMG_BASE + 'uhi-w.png';
  const IMG_STUDENT = IMG_BASE + 'uhi-st.png';
  const IMG_TALK_1  = IMG_BASE + 'uhi-t1.png';
  const IMG_TALK_2  = IMG_BASE + 'uhi-t2.png';

  const root = document.getElementById('uhibon-chat-root');
  if (!root) return;

  let isOpen = false;
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

  iconBtn.addEventListener('click', openUhibonChat);
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
    await botSpeak(reply, text);
  });

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

  function openUhibonChat() {
    if (isOpen) return;

    isOpen = true;
    popout.classList.add('open');
    iconBtn.style.display = 'none';
    setCharState('idle');

    if (!messages.children.length) {
      const pageCtx = getPageContext();
      const intro =
        pageCtx.intro ||
        (window.UHIBON_KNOWLEDGE && window.UHIBON_KNOWLEDGE.intro) ||
        {
          en: "うーひひひ Hello! I’m Uhibon.",
          jp: "うーひひひ こんにちは！ウヒボンだよ。"
        };

      botSpeak(intro, '');
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

  function startIdleLoop() {
    stopIdleLoop();
    scheduleNextIdle();
  }

  function stopIdleLoop() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (charImg) charImg.classList.remove('idle-blink', 'idle-look');
  }

  function scheduleNextIdle() {
    const delay = 3000 + Math.random() * 3000;
    idleTimer = setTimeout(() => {
      if (!isOpen) return;
      doIdleAction();
    }, delay);
  }

  function doIdleAction() {
    const pick = Math.random();

    if (pick < 0.5) {
      charImg.classList.add('idle-blink');
      setTimeout(() => {
        charImg.classList.remove('idle-blink');
        scheduleNextIdle();
      }, 300);
    } else {
      setCharSrc(IMG_TALK_1);
      charImg.classList.add('idle-look');
      setTimeout(() => {
        charImg.classList.remove('idle-look');
        setCharSrc(IMG_OPEN);
        scheduleNextIdle();
      }, 650);
    }
  }

  function setCharSrc(src) {
    const file = src.replace(/^.*\//, '');
    if (charImg.src.endsWith(file)) return;

    charImg.style.opacity = '0';
    setTimeout(() => {
      charImg.src = src;
      charImg.style.opacity = '1';
      charImg.style.transition = 'opacity .15s ease';
    }, 80);
  }

  function setCharState(state) {
    charImg.classList.remove('is-talking', 'idle-blink', 'idle-look');

    if (state === 'talking') {
      stopIdleLoop();
      startTalkingAnimation();
    } else if (state === 'student') {
      stopTalkingAnimationOnly();
      stopIdleLoop();
      setCharSrc(IMG_STUDENT);
    } else {
      stopTalkingAnimationOnly();
      setCharSrc(IMG_OPEN);
      if (isOpen) startIdleLoop();
    }
  }

  function startTalkingAnimation() {
    stopTalkingAnimationOnly();
    let frame = 1;
    setCharSrc(IMG_TALK_1);

    talkTimer = setInterval(() => {
      frame = frame === 1 ? 2 : 1;
      setCharSrc(frame === 1 ? IMG_TALK_1 : IMG_TALK_2);
    }, 180);
  }

  function stopTalkingAnimationOnly() {
    if (talkTimer) {
      clearInterval(talkTimer);
      talkTimer = null;
    }
  }

  function addMessage(sender, payload) {
    const div = document.createElement('div');
    div.className = `uhibon-msg ${sender}`;

    if (typeof payload === 'string') {
      div.textContent = payload;
      div.lang = containsJapanese(payload) ? 'ja' : 'en';
    } else {
      const text = payload && payload.text ? payload.text : '';
      div.textContent = text;
      div.lang = payload && payload.lang ? payload.lang : (containsJapanese(text) ? 'ja' : 'en');
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  const PAGE_CONTEXTS = {
    maze: {
      intro: {
        en: "うーひひひ You found the maze. I can help with the main paths and where things lead.",
        jp: "うーひひひ めいろにきたね。みちや いきさきを すこし おしえられるよ。"
      },
      entries: [
        {
          keywords: ['lost', 'where', 'direction', 'help', '道', '迷子', 'どこ'],
          answer: {
            en: "うーひひひ Try following the glowing path first.",
            jp: "うーひひひ まずは ひかる みちを たどってみて。"
          }
        },
        {
          keywords: ['exit', 'goal', 'finish', 'ゴール', '出口', 'クリア'],
          answer: {
            en: "うーひひひ Keep exploring. The way out is part of the adventure.",
            jp: "うーひひひ たんけんを つづけてね。でぐちは ぼうけんの いちぶだよ。"
          }
        }
      ]
    },

    karasuki: {
      intro: {
        en: "うーひひひ Welcome to Karasuki. It is darker, stranger, and more mysterious here.",
        jp: "うーひひひ カラスキへ ようこそ。ここは もっと くらくて ふしぎな ばしょだよ。"
      },
      entries: [
        {
          keywords: ['karasuki', 'crow', 'dark', 'カラスキ', 'からす', 'くらい'],
          answer: {
            en: "うーひひひ Karasuki is a strange place for wandering and discovery.",
            jp: "うーひひひ カラスキは まよったり みつけたりする ふしぎな ばしょだよ。"
          }
        }
      ]
    },

    homework: {
      intro: {
        en: "うーひひひ Homework time. I can help you think about what to do next.",
        jp: "うーひひひ しゅくだいの じかんだね。つぎに なにをするか いっしょに かんがえよう。"
      },
      entries: [
        {
          keywords: ['stuck', 'confused', 'help', 'わからない', '教えて', 'こまった'],
          answer: {
            en: "うーひひひ Tell me which part is hard.",
            jp: "うーひひひ どの ぶぶんが むずかしいか おしえて。"
          }
        },
        {
          keywords: ['answer', '答え', '正解'],
          answer: {
            en: "うーひひひ I want to help you understand, not only give the answer.",
            jp: "うーひひひ こたえだけじゃなくて、わかるように てつだいたいな。"
          }
        }
      ]
    }
  };

  function getPageContext() {
    const url = (window.location.pathname + window.location.search).toLowerCase();
    const dataPage = ((document.body && document.body.dataset && document.body.dataset.uhibonPage) || '').toLowerCase();

    for (const [key, ctx] of Object.entries(PAGE_CONTEXTS)) {
      if (dataPage === key || url.includes(key)) return ctx;
    }
    return {};
  }

  function containsJapanese(text) {
    return /[\u3000-\u30ff\u4e00-\u9fff\uf900-\ufaff]/.test(String(text || ''));
  }

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u30ff\u4e00-\u9fff\uf900-\ufaff-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wantsJapaneseReply(userText) {
    return containsJapanese(userText);
  }

  function normalizePayload(payload, userText) {
    const wantsJapanese = wantsJapaneseReply(userText);

    if (typeof payload === 'string') {
      return {
        text: payload,
        lang: wantsJapanese ? 'ja' : 'en'
      };
    }

    const jaText = payload && payload.jp ? payload.jp : '';
    const enText = payload && payload.en ? payload.en : '';

    return {
      text: wantsJapanese ? jaText : enText,
      lang: wantsJapanese ? 'ja' : 'en'
    };
  }

  function pickRandom(arr, fallback) {
    if (!Array.isArray(arr) || !arr.length) return fallback;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function includesAny(input, list) {
    const norm = normalizeText(input);
    return list.some(item => {
      const k = normalizeText(item);
      return k && norm.includes(k);
    });
  }

  function matchPleasantry(inputText) {
    const data = window.UHIBON_KNOWLEDGE || {};
    const p = data.pleasantries || {};

    const GREETINGS = [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
      'こんにちは', 'こんばんは', 'やあ', 'もしもし'
    ];

    const HOW_ARE_YOU = [
      'how are you', 'how are you doing', '元気', 'げんき', 'おげんき'
    ];

    const THANKS = [
      'thanks', 'thank you', 'arigato', 'ありがとう', 'ありがと'
    ];

    const BYE = [
      'bye', 'goodbye', 'see you', 'later', 'またね', 'ばいばい', 'さようなら'
    ];

    const PRAISE = [
      'good job', 'nice', 'great', 'cute', 'cool', 'すごい', 'かわいい', 'えらい'
    ];

    if (includesAny(inputText, GREETINGS)) {
      return pickRandom(p.hello, {
        en: "うーひひひ Hello!",
        jp: "うーひひひ こんにちは！"
      });
    }

    if (includesAny(inputText, HOW_ARE_YOU)) {
      return pickRandom(p.howAreYou, {
        en: "うーひひひ I’m doing well!",
        jp: "うーひひひ げんきだよ！"
      });
    }

    if (includesAny(inputText, THANKS)) {
      return pickRandom(p.thanks, {
        en: "うーひひひ You’re welcome!",
        jp: "うーひひひ どういたしまして！"
      });
    }

    if (includesAny(inputText, BYE)) {
      return pickRandom(p.bye, {
        en: "うーひひひ See you later!",
        jp: "うーひひひ またね！"
      });
    }

    if (includesAny(inputText, PRAISE)) {
      return pickRandom(p.praise, {
        en: "うーひひひ Heehee! Thank you!",
        jp: "うーひひひ えへへ！ありがとう！"
      });
    }

    return null;
  }

  function matchKnowledge(inputText) {
    const norm = normalizeText(inputText);
    const pageCtx = getPageContext();

    for (const entry of (pageCtx.entries || [])) {
      for (const key of (entry.keywords || [])) {
        const k = normalizeText(key);
        if (k && norm.includes(k)) return entry.answer;
      }
    }

    const data = window.UHIBON_KNOWLEDGE || {};

    for (const entry of (data.entries || [])) {
      for (const key of (entry.keywords || [])) {
        const k = normalizeText(key);
        if (k && norm.includes(k)) return entry.answer;
      }
    }

    return null;
  }

  function getUhibonReply(inputText) {
    const data = window.UHIBON_KNOWLEDGE || {};
    const norm = normalizeText(inputText);

    if (!norm) {
      return pickRandom(data.confusion, {
        en: "うーひひひ Say something to me.",
        jp: "うーひひひ なにか いってみて。"
      });
    }

    const pleasantry = matchPleasantry(inputText);
    if (pleasantry) return pleasantry;

    const knowledge = matchKnowledge(inputText);
    if (knowledge) return knowledge;

    if (norm.length <= 2) {
      return pickRandom(data.confusion, {
        en: "うーひひひ Hmmm... I’m not sure what you mean.",
        jp: "うーひひひ うーん… ちょっと わからないな。"
      });
    }

    return pickRandom(data.unknown, {
      en: "うーひひひ Hmmm, what’s that?",
      jp: "うーひひひ うーん、それ なあに？"
    });
  }

  function talkDuration(payload, userText) {
    const reply = normalizePayload(payload, userText);
    const len = reply.text.length;
    return Math.min(4500, Math.max(600, Math.round(len * 38)));
  }

  async function botSpeak(payload, userText) {
    const reply = normalizePayload(payload, userText);

    setCharState('talking');
    await wait(talkDuration(payload, userText));
    stopTalking();
    addMessage('bot', reply);
  }

  function stopTalking() {
    stopTalkingAnimationOnly();
    setCharState('idle');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
