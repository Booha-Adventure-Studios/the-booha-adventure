
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
  let talkTimer = null;

  buildUhibonUI();

  const iconBtn = document.getElementById('uhibon-icon-btn');
  const popout = document.getElementById('uhibon-popout');
  const charImg = document.getElementById('uhibon-char-img');
  const closeBtn = document.getElementById('uhibon-close-btn');
  const form = document.getElementById('uhibon-input-row');
  const input = document.getElementById('uhibon-input');
  const messages = document.getElementById('uhibon-messages');

  iconBtn.addEventListener('click', openUhibonChat);
  closeBtn.addEventListener('click', closeUhibonChat);

  input.addEventListener('input', () => {
    if (!isOpen) return;
    charImg.src = input.value.trim() ? IMG_STUDENT : IMG_OPEN;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    charImg.src = IMG_OPEN;

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
              <span>Uhibon</span>
              <button id="uhibon-close-btn" aria-label="Close chat">×</button>
            </div>

            <div id="uhibon-messages"></div>

            <form id="uhibon-input-row">
              <input id="uhibon-input" type="text" placeholder="Ask Uhibon..." autocomplete="off">
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
    charImg.src = IMG_OPEN;

    if (!messages.children.length) {
      botSpeak((window.UHIBON_KNOWLEDGE && window.UHIBON_KNOWLEDGE.intro) || "Hi, I’m Uhibon.");
    }

    setTimeout(() => input.focus(), 50);
  }

  function closeUhibonChat() {
    isOpen = false;
    stopTalking();
    popout.classList.remove('open');
    iconBtn.style.display = '';
  }

  function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `uhibon-msg ${sender}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchKnowledge(inputText) {
    const data = window.UHIBON_KNOWLEDGE || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const normalized = normalizeText(inputText);

    for (const entry of entries) {
      const keys = Array.isArray(entry.keywords) ? entry.keywords : [];
      for (const key of keys) {
        const k = normalizeText(key);
        if (k && normalized.includes(k)) {
          return entry.answer;
        }
      }
    }

    const fallback = Array.isArray(data.fallback) ? data.fallback : ["I don’t know that yet."];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function getUhibonReply(inputText) {
    return matchKnowledge(inputText);
  }

  async function botSpeak(text) {
    startTalking();
    await wait(Math.min(1200, Math.max(500, text.length * 18)));
    stopTalking();
    addMessage('bot', text);
  }

  function startTalking() {
    stopTalking();
    let flip = false;
    const charImg = document.getElementById('uhibon-char-img');
    charImg.src = IMG_TALK_1;

    talkTimer = setInterval(() => {
      flip = !flip;
      charImg.src = flip ? IMG_TALK_2 : IMG_TALK_1;
    }, 180);
  }

  function stopTalking() {
    const charImg = document.getElementById('uhibon-char-img');
    if (talkTimer) {
      clearInterval(talkTimer);
      talkTimer = null;
    }
    if (charImg) charImg.src = IMG_OPEN;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
