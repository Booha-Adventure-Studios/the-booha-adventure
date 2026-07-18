
// js/juku-phases.js  (Stage 2.1)
// English Juku — phase renderers. Load AFTER juku-engine.js.
//
// Text register: grade-2 kana-friendly (pre-boo students read everything).
// Survey: taps auto-save (device-death insurance); submit is a state on
// top — a できた！ button, a ✓ done card, and えらびなおす to reopen.
// X / navigation exist ONLY outside the lesson: once the clock crosses
// start, it's an exam room. No exit invitation until けっか ends.

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
    { key: 'mood', jp: 'きょうの ちょうしは？', en: 'How are you today?',
      opts: [
        { v: 'genki',  jp: '😄 げんき' },
        { v: 'futsuu', jp: '😐 ふつう' },
        { v: 'nemui',  jp: '😴 ねむい' },
        { v: 'chotto', jp: '😟 ちょっと…' }
      ]},
    { key: 'review', jp: 'こんしゅう、れんしゅう した？', en: 'Did you review this week?',
      opts: [
        { v: 'lots', jp: 'たくさん した' },
        { v: 'some', jp: 'すこし した' },
        { v: 'none', jp: 'してない…' }
      ]},
    { key: 'hardest', jp: 'いちばん むずかしそうなのは？', en: 'Which feels hardest?',
      opts: [
        { v: 'dictation', jp: 'きいてかく' },
        { v: 'order',     jp: 'じゅんばん' },
        { v: 'vocab',     jp: 'たんご' },
        { v: 'mixed',     jp: 'ミックス' }
      ]},
    { key: 'expect', jp: 'きょうは なんてん とれそう？', en: 'What score do you expect?',
      opts: [
        { v: '90+',   jp: '90〜100' },
        { v: '80-89', jp: '80〜89' },
        { v: '70-79', jp: '70〜79' },
        { v: '60-69', jp: '60〜69' },
        { v: '<60',   jp: '〜59' }
      ]}
  ];

  const PREDICT_QS = [
    { key: 'expect', jp: 'きょうは なんてんだったと おもう？', en: 'How do you think you did?',
      opts: [
        { v: '90+',   jp: '90〜100' },
        { v: '80-89', jp: '80〜89' },
        { v: '70-79', jp: '70〜79' },
        { v: '60-69', jp: '60〜69' },
        { v: '<60',   jp: '〜59' }
      ]},
    { key: 'worst', jp: 'いちばん むずかしかったのは？', en: 'Which was hardest?',
      opts: [
        { v: 'dictation', jp: 'きいてかく' },
        { v: 'order',     jp: 'じゅんばん' },
        { v: 'vocab',     jp: 'たんご' },
        { v: 'mixed',     jp: 'ミックス' }
      ]}
  ];

  // ── Question block renderer ──────────────────────────────

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

  function allAnswered(qs, saved) {
    return !!saved && qs.every(q => saved[q.key]);
  }

  function wireQuestions(container, section, qs, onChange) {
    container.querySelectorAll('.juku-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q, v = btn.dataset.v;
        container.querySelectorAll(`.juku-opt[data-q="${q}"]`)
          .forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        J.patchWeek(w => {
          if (!w[section]) w[section] = {};
          w[section][q] = v;
          w[section].at = Date.now();
        });
        if (onChange) onChange();
      });
    });
  }

  // ── Exit controls (outside the lesson only) ──────────────

  function exitX() {
    return `<a class="juku-x" href="index.html" aria-label="とじる">✕</a>`;
  }

  function navFooter() {
    return `
      <div class="juku-nav">
        <a class="juku-nav-btn" href="index.html">スタディデッキへ<br><span class="en">Study Decks</span></a>
        <a class="juku-nav-btn" href="maze.html">めいろへ<br><span class="en">Maze</span></a>
      </div>`;
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
      ${exitX()}
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>英語塾</h1>
        <p class="en">English Juku</p>
        <p class="juku-sub">クラスを えらんでね<br><span class="en">Choose your class</span></p>
        <div class="juku-slot-list">${buttons}</div>
        ${navFooter()}
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
      ${exitX()}
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>英語塾</h1>
        <p class="juku-sub">${slot.label}</p>
        <div class="juku-count" id="juku-count">${fmt(res.secToStart)}</div>
        <p class="juku-sub2">まだ あいてないよ。じゅんびして まっててね。<br>
        <span class="en">Not open yet — get ready.</span></p>
        <button class="juku-back-btn" id="juku-slot-back">クラスを えらびなおす</button>
      </div>`;
    wireBack();
  }

  function renderLobby(res, slot) {
    const { week } = J.weekRecord();
    
    const submitted = week.survey && week.survey.submitted;

    root.innerHTML = `
      <div class="juku-panel">
        <h1>まもなく はじまるよ</h1>
        <p class="en">Starting soon</p>
        <p class="juku-sub">${slot.label}</p>
        <div class="juku-count big" id="juku-count">${fmt(res.secToStart)}</div>
        <p class="juku-sub2">ノート・えんぴつ・きもちの じゅんび。<br>
        <span class="en">Notebook, pencil, mind — ready.</span></p>
        <div class="juku-survey" id="juku-survey"></div>
      </div>`;

    const box = document.getElementById('juku-survey');
    if (submitted) renderSurveyDone(box);
    else renderSurveyOpen(box, week);
  }

  function renderSurveyOpen(box, week) {
    box.innerHTML = `
      ${questionsHTML(SURVEY_QS, week.survey)}
      <button class="juku-submit ${allAnswered(SURVEY_QS, week.survey) ? '' : 'off'}"
              id="juku-survey-submit">できた！</button>`;
    const submitBtn = document.getElementById('juku-survey-submit');
    wireQuestions(box, 'survey', SURVEY_QS, () => {
      const { week: w2 } = J.weekRecord();
      submitBtn.classList.toggle('off', !allAnswered(SURVEY_QS, w2.survey));
    });
    submitBtn.addEventListener('click', () => {
      const { week: w2 } = J.weekRecord();
      if (!allAnswered(SURVEY_QS, w2.survey)) return;
      J.patchWeek(w => { w.survey.submitted = true; });
      renderSurveyDone(box);
    });
  }

  function renderSurveyDone(box) {
    box.innerHTML = `
      <div class="juku-done">
        <p class="juku-done-jp">✓ うけつけ OK！</p>
        <p class="en">Check-in complete</p>
        <button class="juku-edit" id="juku-survey-edit">えらびなおす</button>
      </div>`;
    document.getElementById('juku-survey-edit').addEventListener('click', () => {
      J.patchWeek(w => { if (w.survey) w.survey.submitted = false; });
      const { week } = J.weekRecord();
      renderSurveyOpen(box, week);
    });
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
    wireQuestions(document.getElementById('juku-predict'), 'prediction', PREDICT_QS);
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
        </div>
      </div>`;
    const taskEl = document.getElementById('juku-task');
    if (!(window.JUKU_TESTS && window.JUKU_TESTS.render(taskEl, res, slot))) {
      taskEl.innerHTML = placeholderFor(res.phase);
    }
  }

  function placeholderFor(p) {
    switch (p.kind) {
      case 'paper':
        return `<p class="juku-paper">📖 めを あげて。<br><span class="en">Eyes up — reading round with Bryan.</span></p>`;
      case 'interval':
        return `<p class="juku-paper">☕ きゅうけい。せのび、みず、えんぴつ。<br><span class="en">Break time.</span></p>`;
        
     case 'results':
        return `<p class="juku-paper">🧾 （Stage 5：レポート）</p>`;
      default: // window
        
        return `<p class="juku-paper">✏️ （Stage 3：テスト）</p>`;
    }
  }

  function renderClosed(slot) {
    root.innerHTML = `
      ${exitX()}
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>きょうは おしまい</h1>
        <p class="en">Finished for today</p>
        <p class="juku-sub">おつかれさま。また らいしゅう！</p>
        <button class="juku-back-btn" id="juku-slot-back">もどる</button>
        ${navFooter()}
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
    // Broadcast phases are clock-driven: the tests file derives the
    // current item from this forward. Fires regardless of #juku-count.
    if (window.JUKU_TESTS && window.JUKU_TESTS.tick) window.JUKU_TESTS.tick(res, slot);
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
