
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js — Vocabulary Tap Match
   Old tapmatch style:
   3 rounds × 5 cards
   Tap EN card, then tap matching JP slot
   ══════════════════════════════════════════════════════════════ */
(async function () {
  const CFG = window.GAME_CONFIG;
  const U   = window.GAME_UTILS;
  if (!CFG || !U) return;

  U.setTitle('Vocabulary Tap');
  U.unlockAudio();

  const sfxBase = CFG.sfxBase || '';
  await Promise.all([
    U.loadSFX('ding', sfxBase + 'ding.mp3'),
    U.loadSFX('fart', sfxBase + 'fart.mp3'),
  ]);

  function getCardKey(card, i) {
    return String(
      card.id ??
      card.n ??
      card.mp3 ??
      `${card.en || ''}__${card.jp || ''}__${i}`
    );
  }

  function normalizeCards(list) {
    return list.map((card, i) => ({
      ...card,
      _key: getCardKey(card, i)
    }));
  }

  const allCards = normalizeCards(U.shuffle((CFG.cards || []).slice())).slice(0, 15);

  U.mount(`
    <style>
      .vt-wrap{
        max-width:900px;
        margin:0 auto;
        padding:0 1rem 3rem;
      }

      .vt-hud{
        display:flex;
        gap:10px;
        justify-content:center;
        flex-wrap:wrap;
        margin:0 0 1rem;
      }

      .vt-pill{
        padding:.65rem 1rem;
        border-radius:999px;
        background:rgba(255,255,255,.08);
        border:1px solid rgba(255,255,255,.14);
        color:#fff;
        font-weight:800;
      }

      .vt-instructions{
        text-align:center;
        margin:1rem 0 1.2rem;
      }

      .vt-title{
        font-family:var(--game-font-title);
        font-size:clamp(28px,6vw,48px);
        color:var(--game-primary);
        text-shadow:0 0 18px var(--game-primary);
        line-height:1.05;
      }

      .vt-sub{
        margin-top:.4rem;
        color:var(--game-muted);
        font-size:clamp(13px,2.4vw,18px);
      }

      .vt-layout{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:16px;
        align-items:start;
      }

      @media (max-width: 780px){
        .vt-layout{
          grid-template-columns:1fr;
        }
      }

      .vt-panel{
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.12);
        border-radius:24px;
        padding:14px;
        box-shadow:0 10px 30px rgba(0,0,0,.18);
        backdrop-filter:blur(8px);
      }

      .vt-panel-title{
        text-align:center;
        font-weight:900;
        margin:0 0 .8rem;
        font-size:clamp(14px,2.5vw,18px);
        color:#fff;
        letter-spacing:.02em;
      }

      .vt-bank{
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
      }

      .vt-card{
        min-height:64px;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:.9rem .8rem;
        border-radius:18px;
        background:rgba(255,255,255,.10);
        border:2px solid rgba(255,255,255,.12);
        color:#fff;
        cursor:pointer;
        user-select:none;
        transition:transform .15s ease, border-color .15s ease, background .15s ease, opacity .15s ease;
        font-family:var(--game-font-title);
        font-size:clamp(18px,3vw,28px);
        line-height:1.1;
      }

      .vt-card:hover{
        transform:translateY(-1px);
      }

      .vt-card.selected{
        border-color:var(--game-primary);
        background:rgba(255,255,255,.16);
        box-shadow:0 0 0 3px rgba(255,255,255,.06), 0 0 24px color-mix(in srgb, var(--game-primary) 55%, transparent);
      }

      .vt-card.done{
        opacity:.35;
        pointer-events:none;
      }

      .vt-slots{
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
      }

      .vt-slot{
        border-radius:18px;
        border:2px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.08);
        padding:.8rem;
        min-height:88px;
        cursor:pointer;
        transition:transform .15s ease, border-color .15s ease, background .15s ease;
      }

      .vt-slot:hover{
        transform:translateY(-1px);
      }

      .vt-slot.selected-target{
        border-color:var(--game-primary);
      }

      .vt-jp{
        font-family:var(--game-font-jp);
        font-size:clamp(18px,3vw,24px);
        color:#fff;
        text-align:center;
        line-height:1.2;
      }

      .vt-hira{
        margin-top:4px;
        font-family:var(--game-font-jp);
        font-size:clamp(11px,2vw,14px);
        color:var(--game-muted);
        text-align:center;
      }

      .vt-drop{
        margin-top:10px;
        min-height:42px;
        border-radius:14px;
        border:2px dashed rgba(255,255,255,.18);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:.45rem .55rem;
        text-align:center;
      }

      .vt-drop.empty{
        color:rgba(255,255,255,.42);
        font-size:12px;
        font-weight:800;
        letter-spacing:.06em;
      }

      .vt-drop.filled{
        border-style:solid;
        border-color:rgba(255,255,255,.14);
        background:rgba(255,255,255,.10);
        color:#fff;
        font-family:var(--game-font-title);
        font-size:clamp(16px,2.8vw,24px);
        line-height:1.1;
      }

      .vt-slot.correct{
        border-color:#22c55e;
        background:rgba(34,197,94,.16);
      }

      .vt-slot.wrong{
        border-color:#ef4444;
        background:rgba(239,68,68,.14);
        animation:vtShake .35s ease;
      }

      @keyframes vtShake{
        0%{ transform:translateX(0); }
        20%{ transform:translateX(-5px); }
        40%{ transform:translateX(5px); }
        60%{ transform:translateX(-4px); }
        80%{ transform:translateX(4px); }
        100%{ transform:translateX(0); }
      }
    </style>

    <div class="vt-wrap">
      <div id="vt-hud" class="vt-hud">
        <div class="vt-pill">Round <b id="vt-round">1</b>/3</div>
        <div class="vt-pill">Score <b id="vt-score">0</b>/15</div>
      </div>

      <div id="vt-prompt" class="vt-instructions">
        <div class="vt-title">Tap the English</div>
        <div class="vt-sub">英語をタップして、合う日本語をタップ</div>
      </div>

      <div id="vt-game" class="vt-layout">
        <div class="vt-panel">
          <div class="vt-panel-title">ENGLISH</div>
          <div id="vt-bank" class="vt-bank"></div>
        </div>

        <div class="vt-panel">
          <div class="vt-panel-title">JAPANESE</div>
          <div id="vt-slots" class="vt-slots"></div>
        </div>
      </div>

      <div id="vt-results" class="results-panel">
        <div class="results-msg" id="vt-rmsg"></div>
        <div class="results-score" id="vt-rscore"></div>
        <div class="results-actions">
          <button class="game-btn game-btn-primary" id="vt-replay">もう一度</button>
          <button class="game-btn game-btn-secondary" id="vt-back">メニューへ</button>
        </div>
      </div>
    </div>
  `);

  const roundEl = document.getElementById('vt-round');
  const scoreEl = document.getElementById('vt-score');
  const bankEl  = document.getElementById('vt-bank');
  const slotsEl = document.getElementById('vt-slots');
  const gameEl  = document.getElementById('vt-game');
  const promptEl = document.getElementById('vt-prompt');
  const hudEl   = document.getElementById('vt-hud');
  const results = document.getElementById('vt-results');
  const rMsg    = document.getElementById('vt-rmsg');
  const rScore  = document.getElementById('vt-rscore');

  let score = 0;
  let roundIdx = 0;
  let roundCards = [];
  let selectedKey = null;
  let matchedKeys = new Set();
  let locked = false;

  function getRoundCards(ri) {
    return U.shuffle(allCards.slice(ri * 5, ri * 5 + 5));
  }

  function startRound(ri) {
    roundIdx = ri;
    roundCards = getRoundCards(ri);
    selectedKey = null;
    matchedKeys = new Set();
    locked = false;
    roundEl.textContent = String(ri + 1);
    render();
  }

  function render() {
    renderBank();
    renderSlots();
  }

  function renderBank() {
    const available = roundCards.filter(card => !matchedKeys.has(card._key));
    bankEl.innerHTML = '';

    available.forEach(card => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vt-card' + (selectedKey === card._key ? ' selected' : '');
      btn.textContent = card.en || '';
      btn.addEventListener('click', () => onEnglishTap(card));
      bankEl.appendChild(btn);
    });
  }

  function renderSlots() {
    slotsEl.innerHTML = '';

    roundCards.forEach(card => {
      const matched = matchedKeys.has(card._key);

      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'vt-slot';
      slot.innerHTML = `
        <div class="vt-jp">${card.jp || ''}</div>
        <div class="vt-hira">${card.hira || ''}</div>
        <div class="vt-drop ${matched ? 'filled' : 'empty'}">
          ${matched ? (card.en || '') : 'TAP HERE'}
        </div>
      `;

      if (!matched && selectedKey) slot.classList.add('selected-target');
      if (matched) slot.classList.add('correct');

      slot.addEventListener('click', () => onJapaneseTap(card, slot));
      slotsEl.appendChild(slot);
    });
  }

  function onEnglishTap(card) {
    if (locked) return;
    if (matchedKeys.has(card._key)) return;

    selectedKey = (selectedKey === card._key) ? null : card._key;
    renderBank();
    renderSlots();
  }

  function onJapaneseTap(targetCard, slotEl) {
    if (locked) return;
    if (!selectedKey) return;
    if (matchedKeys.has(targetCard._key)) return;

    const selectedCard = roundCards.find(c => c._key === selectedKey);
    if (!selectedCard) return;

    locked = true;

    const correct = selectedCard._key === targetCard._key;

    if (correct) {
      matchedKeys.add(targetCard._key);
      selectedKey = null;
      score++;
      scoreEl.textContent = String(score);

      slotEl.classList.add('correct');
      U.showBurst('ok');
      U.playSFX('ding');
      U.confetti(slotEl);

      setTimeout(() => {
        locked = false;
        render();

        if (matchedKeys.size === roundCards.length) {
          if (roundIdx < 2) {
            setTimeout(() => startRound(roundIdx + 1), 500);
          } else {
            setTimeout(showResults, 400);
          }
        }
      }, 320);
    } else {
      slotEl.classList.add('wrong');
      U.playSFX('fart');

      setTimeout(() => {
        selectedKey = null;
        locked = false;
        render();
      }, 420);
    }
  }

  function showResults() {
    gameEl.style.display = 'none';
    promptEl.style.display = 'none';
    hudEl.style.display = 'none';
    results.classList.add('show');

    const msg = U.getResultMsg(score);
    rMsg.textContent = msg.jp;
    rScore.textContent = `${score} / 15`;

    if (score === 15) U.confetti(results, 120);

    const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
    snd.setAttribute('playsinline', '');
    snd.play().catch(() => {});
  }

  document.getElementById('vt-replay').addEventListener('click', () => {
    score = 0;
    scoreEl.textContent = '0';
    results.classList.remove('show');
    gameEl.style.display = '';
    promptEl.style.display = '';
    hudEl.style.display = '';
    startRound(0);
  });

  document.getElementById('vt-back').addEventListener('click', () => {
    window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
  });

  startRound(0);
})();
