
(function () {
  const IMG_BASE    = 'assets/img/uhibon/';
  const IMG_ICON    = IMG_BASE + 'chat-uhi.png';
  const IMG_OPEN    = IMG_BASE + 'uhi-w.png';
  const IMG_STUDENT = IMG_BASE + 'uhi-st.png';
  const IMG_TALK_1  = IMG_BASE + 'uhi-t1.png';
  const IMG_TALK_2  = IMG_BASE + 'uhi-t2.png';

  const root = document.getElementById('uhibon-chat-root');
  if (!root) return;

  let isOpen     = false;
  let talkTimer  = null;
  let talkFrame  = false;

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

  /* ── Build DOM ── */
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
                     autocomplete="off"
                     lang="ja">
              <button id="uhibon-send-btn" type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Open / close ── */
  function openUhibonChat() {
    if (isOpen) return;
    isOpen = true;
    popout.classList.add('open');
    iconBtn.style.display = 'none';
    setCharState('idle');

    if (!messages.children.length) {
      botSpeak(
        (window.UHIBON_KNOWLEDGE && window.UHIBON_KNOWLEDGE.intro)
        || "I am Uhibon… welcome, wanderer. 🕯️"
      );
    }
    setTimeout(() => input.focus(), 50);
  }

  function closeUhibonChat() {
    isOpen = false;
    stopTalking();
    popout.classList.remove('open');
    iconBtn.style.display = '';
  }

  /* ── Character state management ──────────────────────────────
     Instead of swapping src every 180 ms (which causes repaints
     and a visible flash), we:
       • swap src once for idle / student
       • use a CSS animation class for talking (no rapid src swap)
       • fade the image briefly when src must change
  ──────────────────────────────────────────────────────────── */
  function setCharSrc(src) {
    if (charImg.src.endsWith(src.replace(/^.*\//, ''))) return; // already set
    charImg.style.opacity = '0';
    setTimeout(() => {
      charImg.src = src;
      charImg.style.opacity = '1';
      charImg.style.transition = 'opacity .15s ease';
    }, 80);
  }

  function setCharState(state) {
    charImg.classList.remove('is-talking');

    if (state === 'talking') {
      setCharSrc(IMG_TALK_1);          // starting frame
      charImg.classList.add('is-talking');
    } else if (state === 'student') {
      setCharSrc(IMG_STUDENT);
    } else {
      setCharSrc(IMG_OPEN);            // idle
    }
  }

  /* ── Messages ── */
  function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `uhibon-msg ${sender}`;
    div.textContent = text;
    /* lang hint so the browser picks the right CJK rendering */
    div.lang = /[\u3000-\u9FFF\uF900-\uFAFF]/.test(text) ? 'ja' : 'en';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  /* ── Knowledge matching ── */
  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u9FFF-]/g, ' ')  // keep CJK
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchKnowledge(inputText) {
    const data    = window.UHIBON_KNOWLEDGE || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const norm    = normalizeText(inputText);

    for (const entry of entries) {
      const keys = Array.isArray(entry.keywords) ? entry.keywords : [];
      for (const key of keys) {
        const k = normalizeText(key);
        if (k && norm.includes(k)) return entry.answer;
      }
    }

    const fallback = Array.isArray(data.fallback)
      ? data.fallback
      : ["I don't know that yet… 🕯️"];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function getUhibonReply(inputText) {
    return matchKnowledge(inputText);
  }

  /* ── Bot speak ── */
  async function botSpeak(text) {
    setCharState('talking');
    await wait(Math.min(1400, Math.max(500, text.length * 16)));
    stopTalking();
    addMessage('bot', text);
  }

  function stopTalking() {
    if (talkTimer) {
      clearInterval(talkTimer);
      talkTimer = null;
    }
    setCharState('idle');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
