
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
  let currentTalkFrame = 1;

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
    if (input.value.trim()) {
      setCharState('student');
    } else {
      setCharState('idle');
    }
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
              <input
                id="uhibon-input"
                type="text"
                placeholder="Ask Uhibon… / 話しかけて…"
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
    iconBtn.style.display = 'none';
    setCharState('idle');

    if (!messages.children.length) {
      const intro =
        (window.UHIBON_KNOWLEDGE && window.UHIBON_KNOWLEDGE.intro) ||
        {
          en: "Uuu-hi-hi-hi-hi! Hello! I’m Uhibon.",
          jp: "Uuu-hi-hi-hi-hi! こんにちは！ウヒボンだよ。"
        };

      botSpeak(intro);
    }

    setTimeout(() => input.focus(), 50);
  }

  function closeUhibonChat() {
    isOpen = false;
    stopTalking();
    popout.classList.remove('open');
    iconBtn.style.display = '';
  }

  function setCharSrc(src) {
    const current = charImg.getAttribute('src');
    if (current === src) return;
    charImg.src = src;
  }

  function setCharState(state) {
    if (state === 'talking') {
      startTalkingAnimation();
      return;
    }

    stopTalkingAnimationOnly();

    if (state === 'student') {
      setCharSrc(IMG_STUDENT);
    } else {
      setCharSrc(IMG_OPEN);
    }
  }

  function startTalkingAnimation() {
    stopTalkingAnimationOnly();
    currentTalkFrame = 1;
    setCharSrc(IMG_TALK_1);

    talkTimer = setInterval(() => {
      currentTalkFrame = currentTalkFrame === 1 ? 2 : 1;
      setCharSrc(currentTalkFrame === 1 ? IMG_TALK_1 : IMG_TALK_2);
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
      const en = payload && payload.en ? payload.en : '';
      const jp = payload && payload.jp ? payload.jp : '';

      div.innerHTML = `
        <div class="uhibon-en">${escapeHtml(en)}</div>
        <div class="uhibon-jp">${escapeHtml(jp)}</div>
      `;
      div.lang = jp ? 'ja' : 'en';
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function containsJapanese(text) {
    return /[\u3000-\u30ff\u4e00-\u9fff\uf900-\ufaff]/.test(String(text || ''));
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u30ff\u4e00-\u9fff\uf900-\ufaff-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function includesAny(input, list) {
    const norm = normalizeText(input);
    return list.some(item => {
      const k = normalizeText(item);
      return k && norm.includes(k);
    });
  }

  function pickRandom(arr, fallback) {
    if (!Array.isArray(arr) || !arr.length) return fallback;
    return arr[Math.floor(Math.random() * arr.length)];
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
      'thanks', 'thank you', 'arigato', 'ありがとう', 'ありがと', 'thanks uhibon'
    ];

    const BYE = [
      'bye', 'goodbye', 'see you', 'later', 'またね', 'ばいばい', 'さようなら'
    ];

    const PRAISE = [
      'good job', 'nice', 'great', 'cute', 'cool', 'すごい', 'かわいい', 'えらい'
    ];

    if (includesAny(inputText, GREETINGS)) {
      return pickRandom(p.hello, {
        en: "Uuu-hi-hi-hi-hi! Hello!",
        jp: "Uuu-hi-hi-hi-hi! こんにちは！"
      });
    }

    if (includesAny(inputText, HOW_ARE_YOU)) {
      return pickRandom(p.howAreYou, {
        en: "Uuu-hi-hi-hi-hi! I’m good!",
        jp: "Uuu-hi-hi-hi-hi! げんきだよ！"
      });
    }

    if (includesAny(inputText, THANKS)) {
      return pickRandom(p.thanks, {
        en: "Uuu-hi-hi-hi-hi! You’re welcome!",
        jp: "Uuu-hi-hi-hi-hi! どういたしまして！"
      });
    }

    if (includesAny(inputText, BYE)) {
      return pickRandom(p.bye, {
        en: "Uuu-hi-hi-hi-hi! See you later!",
        jp: "Uuu-hi-hi-hi-hi! またね！"
      });
    }

    if (includesAny(inputText, PRAISE)) {
      return pickRandom(p.praise, {
        en: "Uuu-hi-hi-hi-hi! Good job!",
        jp: "Uuu-hi-hi-hi-hi! よくできたね！"
      });
    }

    return null;
  }

  function matchKnowledge(inputText) {
    const data = window.UHIBON_KNOWLEDGE || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const norm = normalizeText(inputText);

    for (const entry of entries) {
      const keys = Array.isArray(entry.keywords) ? entry.keywords : [];
      for (const key of keys) {
        const k = normalizeText(key);
        if (k && norm.includes(k)) {
          return entry.answer;
        }
      }
    }

    return null;
  }

  function getUhibonReply(inputText) {
    const data = window.UHIBON_KNOWLEDGE || {};
    const norm = normalizeText(inputText);

    if (!norm) {
      return pickRandom(data.confusion, {
        en: "Uuu-hi-hi-hi-hi! Say something to me!",
        jp: "Uuu-hi-hi-hi-hi! なにか いってみて！"
      });
    }

    const pleasantry = matchPleasantry(inputText);
    if (pleasantry) return pleasantry;

    const knowledge = matchKnowledge(inputText);
    if (knowledge) return knowledge;

    if (norm.length <= 2) {
      return pickRandom(data.confusion, {
        en: "Hmmm... I’m not sure what you mean.",
        jp: "うーん… ちょっと わからないな。"
      });
    }

    return pickRandom(data.unknown, {
      en: "Hmmm, what’s that? Uuu-hi-hi-hi-hi!",
      jp: "うーん、それ なあに？ Uuu-hi-hi-hi-hi!"
    });
  }

  async function botSpeak(payload) {
    const reply = normalizePayload(payload);

    setCharState('talking');

    const combinedLength = (reply.en + ' ' + reply.jp).trim().length;
    await wait(Math.min(1800, Math.max(700, combinedLength * 18)));

    stopTalking();
    addMessage('bot', reply);
  }

  function normalizePayload(payload) {
    if (typeof payload === 'string') {
      return {
        en: payload,
        jp: ''
      };
    }

    return {
      en: payload && payload.en ? payload.en : '',
      jp: payload && payload.jp ? payload.jp : ''
    };
  }

  function stopTalking() {
    stopTalkingAnimationOnly();
    setCharState('idle');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
