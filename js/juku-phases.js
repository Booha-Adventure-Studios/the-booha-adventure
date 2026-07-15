
// js/juku-phases.js  (Stage 2)
// English Juku — phase renderers. Load AFTER juku-engine.js.
//
// Stage 2 adds: check-in survey (lobby), self-prediction phase, slot
// recording. All answers write to booha_juku_save the moment they are
// tapped — device death loses nothing. Japanese first, English under.

(function () {
  'use strict';

  const CFG = window.JUKU_CONFIG;
  const J = window.JUKU;
  const root = document.getElementById('juku-root');

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Survey / prediction question sets ────────────────────
  // Authored constant strings only — never user data.

  const SURVEY_QS = [
    { key: 'mood', jp: 'きょうのちょうしは？', en: 'How are you today?',
      opts: [
        { v: 'genki',  jp: '😄 げんき' },
        { v: 'futsuu', jp: '😐 ふつう' },
        { v: 'nemui',  jp: '😴 ねむい' },
        { v: 'chotto', jp: '😟 ちょっと…' }
      ]},
    { key: 'review', jp: 'こんしゅう、れんしゅうした？', en: 'Did you review this week?',
      opts: [
        { v: 'lots', jp: 'たくさんした' },
        { v: 'some', jp: 'すこしした' },
        { v: 'none', jp: 'してない…' }
      ]},
    { key: 'hardest', jp: 'いちばんむずかしそうなのは？', en: 'Which feels hardest?',
      opts: [
        { v: 'dictation', jp: 'ディクテーション' },
        { v: 'order',     jp: '語順テスト' },
        { v: 'vocab',     jp: '語い・意味' },
        { v: 'mixed',     jp: 'ミックス' }
      ]},
    { key: 'expect', jp: 'きょうの予想スコアは？', en: 'What score do you expect?',
      opts: [
        { v: '90+',   jp: '90〜100' },
        { v: '80-89', jp: '80〜89' },
        { v: '70-79', jp: '70〜79' },
        { v: '60-69', jp: '60〜69' },
        { v: '<60',   jp: '〜59' }
      ]}
  ];

  const PREDICT_QS = [
    { key: 'expect', jp: 'きょうは何点だったと思う？', en: 'How do you think you did?',
      opts: [
        { v: '90+',   jp: '90〜100' },
        { v: '80-89', jp: '80〜89' },
        { v: '70-79', jp: '70〜79' },
        { v: '60-69', jp: '60〜69' },
        { v: '<60',   jp: '〜59' }
      ]},
    { key: 'worst', jp: 'いちばんむずかしかったのは？', en: 'Which was hardest?',
      opts: [
        { v: 'dictation', jp: 'ディクテーション' },
        { v: 'order',     jp: '語順テスト' },
        { v: 'vocab',     jp: '語い・意味' },
        { v: 'mixed',     jp: 'ミックス' }
      ]}
  ];

  // ── Question block renderer ──────────────────────────────
  // Answers can be changed until the phase/window closes; every tap
  // writes immediately. `section` is 'survey' or 'prediction'.

  function questionsHTML(qs, saved) {
    return qs.map(q => {
      const chosen = saved && saved[q.key];
      const opts = q.opts.map(o =>
        `<button class="juku-opt ${chosen === o.v ? 'sel' : ''}"
                 data-q="${q.key}" data-v="${o.v}">${o.jp}</button>`
      ).join('');
      return `
        <div class="juku-q">
          <p class="juku-q-jp">${q.jp}</p>
          <p class="juku-q-en">${q.en}</p>
          <div class="juku-opts">${opts}</div>
        </div>`;
    }).join('');
  }

  function wireQuestions(container, section) {
    container.querySelectorAll('.juku-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q, v = btn.dataset.v;
        // visual: single-select within this question
        container.querySelectorAll(`.juku-opt[data-q="${q}"]`)
          .forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        // write immediately
        J.patchWeek(w => {
          if (!w[section]) w[section] = {};
          w[section][q] = v;
          w[section].at = Date.now();
        });
      });
    });
  }

  // ── Screens ──────────────────────────────────────────────

  function renderMenu() {
    const tk = J.tokyoNow();
    const buttons = CFG.slots.map(s => {
      const r = J.resolve(s, tk);
      const live = r.state === 'phase' || r.state === 'lobby';
      return `<button class="juku-slot-btn ${live ? 'live' : ''}" data-slot="${s.id}">
        ${s.label}${live ? '<span class="live-dot"></span>' : ''}
      </button>`;
    }).join('');
    root.innerHTML = `
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>英語塾</h1>
        <p class="en">English Juku</p>
        <p class="juku-sub">クラスをえらんでね<br><span class="en">Choose your class</span></p>
        <div class="juku-slot-list">${buttons}</div>
      </div>`;
    root.querySelectorAll('.juku-slot-btn').forEach(b => {
      b.addEventListener('click', () => {
        J.selectSlot(b.dataset.slot);
        window.dispatchEvent(new Event('juku:slotChosen'));
      });
    });
  }

  function renderBefore(res, slot) {
    root.innerHTML = `
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>英語塾</h1>
        <p class="juku-sub">${slot.label}</p>
        <div class="juku-count" id="juku-count">${fmt(res.secToStart)}</div>
        <p class="juku-sub2">まだ開いていません。じゅんびしてまってね。<br>
        <span class="en">Not open yet — get ready.</span></p>
        <button class="juku-back-btn" id="juku-slot-back">クラスをえらびなおす</button>
      </div>`;
    wireBack();
  }

  function renderLobby(res, slot) {
    // Record which slot this week's lesson happened in (first entry wins)
    J.patchWeek(w => { if (!w.slot) w.slot = slot.id; });

    const { week } = J.weekRecord();
    root.innerHTML = `
      <div class="juku-panel">
        <h1>まもなく開始</h1>
        <p class="en">Starting soon</p>
        <p class="juku-sub">${slot.label}</p>
        <div class="juku-count big" id="juku-count">${fmt(res.secToStart)}</div>
        <p class="juku-sub2">ノート・えんぴつ・きもちのじゅんび。<br>
        <span class="en">Notebook, pencil, mind — ready.</span></p>
        <div class="juku-survey" id="juku-survey">
          ${questionsHTML(SURVEY_QS, week.survey)}
        </div>
      </div>`;
    wireQuestions(document.getElementById('juku-survey'), 'survey');
  }

  function renderPredict(res, slot) {
    const { week } = J.weekRecord();
    root.innerHTML = `
      ${spineHTML(res.phaseIdx)}
      <div class="juku-panel">
        <h1>${res.phase.jp}</h1>
        <p class="en">${res.phase.en}</p>
        <div class="juku-count" id="juku-count">${fmt(res.phaseRemainSec)}</div>
        <div class="juku-survey" id="juku-predict">
          ${questionsHTML(PREDICT_QS, week.prediction)}
        </div>
      </div>`;
    wireQuestions(document.getElementById('juku-predict'), 'prediction');
  }

  function renderPhase(res, slot) {
    if (res.phase.kind === 'predict') { renderPredict(res, slot); return; }
    root.innerHTML = `
      ${spineHTML(res.phaseIdx)}
      <div class="juku-panel">
        <h1>${res.phase.jp}</h1>
        <p class="en">${res.phase.en}</p>
        <div class="juku-count" id="juku-count">${fmt(res.phaseRemainSec)}</div>
        <div class="juku-task" id="juku-task">
          ${placeholderFor(res.phase)}
        </div>
      </div>`;
  }

  function placeholderFor(p) {
    switch (p.kind) {
      case 'paper':
        return `<p class="juku-paper">📖 目を上げて。<br><span class="en">Eyes up — reading round with Bryan.</span></p>`;
      case 'interval':
        return `<p class="juku-paper">☕ 休けい。せのび、水、えんぴつ。<br><span class="en">Break time.</span></p>`;
      case 'results':
        return `<p class="juku-paper">🧾 （Stage 5：レポート）</p>`;
      case 'broadcast':
        return `<p class="juku-paper">🎧 （Stage 4：ディクテーション）</p>`;
      default: // window
        return `<p class="juku-paper">✏️ （Stage 3：テスト）</p>`;
    }
  }

  function renderClosed(slot) {
    root.innerHTML = `
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>本日は終了</h1>
        <p class="en">Finished for today</p>
        <p class="juku-sub">おつかれさま。また来週。</p>
        <button class="juku-back-btn" id="juku-slot-back">もどる</button>
      </div>`;
    wireBack();
  }

  function wireBack() {
    const b = document.getElementById('juku-slot-back');
    if (b) b.addEventListener('click', () => { J.clearSlot(); });
  }

  // ── Progress spine ───────────────────────────────────────

  function spineHTML(activeIdx) {
    const cells = CFG.phases.map((p, i) => {
      const cls = i < activeIdx ? 'done' : i === activeIdx ? 'now' : '';
      return `<div class="jsp-cell ${cls}" style="flex:${p.min}" title="${p.jp}"></div>`;
    }).join('');
    return `<div class="juku-spine">${cells}</div>`;
  }

  // ── Engine hookup ────────────────────────────────────────

  function onPhaseChange(res, slot) {
    if (!slot)                    { renderMenu(); return; }
    if (res.state === 'before')   { renderBefore(res, slot); return; }
    if (res.state === 'lobby')    { renderLobby(res, slot); return; }
    if (res.state === 'closed')   { renderClosed(slot); return; }
    renderPhase(res, slot);
  }

  function onTick(res, slot) {
    const c = document.getElementById('juku-count');
    if (!c) return;
    if (res.state === 'before' || res.state === 'lobby') c.textContent = fmt(res.secToStart);
    else if (res.state === 'phase') c.textContent = fmt(res.phaseRemainSec);
  }

  window.addEventListener('juku:slotChosen', () => {
    onPhaseChange(J.slot ? J.resolve(J.slot, J.tokyoNow()) : { state: 'menu' }, J.slot);
  });

  J.start(onPhaseChange, onTick);

})();
