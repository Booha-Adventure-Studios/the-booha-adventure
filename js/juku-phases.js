
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
        { v: 'reading',   jp: 'おんどく' },
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
        { v: 'reading',   jp: 'おんどく' },
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
        
        const prev = container.querySelector(`.juku-opt[data-q="${q}"].sel`);
        container.querySelectorAll(`.juku-opt[data-q="${q}"]`)
          .forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        const ok = J.patchWeek(w => {
          if (!w[section]) w[section] = {};
          w[section][q] = v;
          w[section].at = Date.now();
        });
        if (ok === null) {
          // Roll the highlight back — a selected-looking button that was
          // never written is the same lie as an accepted answer.
          btn.classList.remove('sel');
          if (prev) prev.classList.add('sel');
          return;
        }
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

// ── Attendance ───────────────────────────────────────────
  // Stamped on first lobby or live-phase entry — reaching the scheduled
  // class environment is attendance, survey finished or not. Closed-state
  // report finalization (JUKU_RESULTS.finalize) requires this evidence,
  // so a student opening the app after class never mints a zero report.

function stampAttendance(slot) {
    // finalize() gates the report on this evidence, so a silent failure here
    // means the student sits the whole lesson and gets no report at all.
    // Retried on every lobby/phase render, so a transient failure self-heals.
    const ok = J.patchWeek(w => {
      if (!w.attendance) {
        w.attendance = { firstSeenAt: Date.now(), slot: slot.id,
                         curriculum: slot.curriculum };
      }
    });
    if (ok === null) console.error('[juku] Attendance NOT stamped — report will not finalize.');
  }

  // Load and validate the week's real assessment data during the lobby.
  // The live renderers repeat the same check, so arriving late also fails
  // closed rather than receiving demo questions.
  function runPreflight(el, slot) {
    if (!el || !(window.JUKU_TESTS && JUKU_TESTS.preflight)) return;
    el.className = 'juku-preflight checking';
    el.textContent = '教材を かくにんしています… / Checking lesson content…';
    JUKU_TESTS.preflight(slot).then(result => {
      if (!el.isConnected) return;
      if (result.ok) {
        el.className = 'juku-preflight ready';
        const audio = result.audio;
        el.textContent = audio && audio.required
          ? `✓ 教材・音声 OK (${audio.ready}/${audio.required}) / Lesson and audio ready`
          : '✓ 教材 OK / Lesson content ready';
      } else {
        el.className = 'juku-preflight failed';
        el.textContent = '⚠ 教材を よみこめません。先生を よんでください。 / Content unavailable.';
      }
    }).catch(() => {
      if (!el.isConnected) return;
      el.className = 'juku-preflight failed';
      el.textContent = '⚠ 教材を よみこめません。先生を よんでください。 / Content unavailable.';
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

  function renderUnavailable(slot) {
    root.innerHTML = `
      ${exitX()}
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>土よう日の クラスです</h1>
        <p class="en">English Juku opens on Saturday only.</p>
        <p class="juku-sub">${slot.label}</p>
        <button class="juku-back-btn" id="juku-slot-back">クラスを えらびなおす</button>
      </div>`;
    wireBack();
  }

function renderLobby(res, slot) {
    stampAttendance(slot);
    const { week } = J.weekRecord();
    if (week.survey && week.survey.submitted) { renderLobbyReady(res, slot); return; }

    root.innerHTML = `
      <div class="juku-panel">
        <h1>まもなく はじまるよ</h1>
        <p class="en">Starting soon</p>
        <p class="juku-sub">${slot.label}</p>
        <div class="juku-count big" id="juku-count">${fmt(res.secToStart)}</div>
        <p class="juku-sub2">ノート・えんぴつ・きもちの じゅんび。<br>
        <span class="en">Notebook, pencil, mind — ready.</span></p>
        <div id="juku-preflight"></div>
        <div class="juku-survey" id="juku-survey"></div>
      </div>`;

    runPreflight(document.getElementById('juku-preflight'), slot);
    renderSurveyOpen(document.getElementById('juku-survey'), week);
  }

  // Ghost waiting room: check-in done, the big confirmation box has said
  // its piece. Timer stays (the class is clock-governed) but demoted —
  // it now answers "when do we begin?", not "how long do I have?".
  function renderLobbyReady(res, slot) {
    root.innerHTML = `
      <div class="juku-panel">
        <p class="juku-sub">${slot.label}</p>
        <div class="juku-count" id="juku-count">${fmt(res.secToStart)}</div>
        <div id="juku-preflight"></div>
        <div class="juku-ghost-room" id="juku-ghost-room"></div>
        <button class="juku-edit" id="juku-survey-edit">えらびなおす</button>
      </div>`;
    runPreflight(document.getElementById('juku-preflight'), slot);
    if (window.JUKU_GHOSTS) {
      window.JUKU_GHOSTS.mount(document.getElementById('juku-ghost-room'),
                               { name: true, venue: 'lobby' });
    }
    document.getElementById('juku-survey-edit').addEventListener('click', () => {
      if (window.JUKU_GHOSTS) window.JUKU_GHOSTS.unmount();
      J.patchWeek(w => { if (w.survey) w.survey.submitted = false; });
      renderLobby(J.resolve(J.slot, J.tokyoNow()), slot);
    });
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
      const rec = J.tryWeekRecord('Cannot read survey before submission');
      if (!rec) {
        submitBtn.textContent = '⚠ ほぞん できなかった — せんせいを よんでね';
        return;
      }
      const w2 = rec.week;
      if (!allAnswered(SURVEY_QS, w2.survey)) return;
      if (J.patchWeek(w => { w.survey.submitted = true; }) === null) {
        submitBtn.textContent = '⚠ ほぞん できなかった — もう いちど';
        return;
      }
      if (window.BoohaSync) BoohaSync.checkpoint('juku');
      renderLobbyReady(J.resolve(J.slot, J.tokyoNow()), J.slot);
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
    stampAttendance(slot);
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
    // Results is a phase renderer, not a test task — routed here, never
    // through JUKU_TESTS. Dependency direction: engine → phases → tests
    //                                                          → results.
    if (res.phase.kind === 'results' && window.JUKU_RESULTS) {
      window.JUKU_RESULTS.render(taskEl, res, slot);
      return;
    }
    
    if (!(window.JUKU_TESTS && window.JUKU_TESTS.render(taskEl, res, slot))) {
      taskEl.innerHTML = placeholderFor(res.phase);
      // Interval is a sanctioned waiting state — ghosts allowed.
      if (res.phase.kind === 'interval' && window.JUKU_GHOSTS) {
        window.JUKU_GHOSTS.mount(taskEl, { name: false, venue: 'interval' });
      }
    }
  }

  
  function placeholderFor(p) {
    switch (p.kind) {
      case 'paper':
        return `<p class="juku-paper">📖 15ふん、こえに だして よみます。<br>
          先生が じゅんばんに ききます。<br>
          <span class="en">Fifteen minutes of reading only. Read aloud while the teacher listens in turn.</span></p>`;
      case 'interval':
        return `<p class="juku-paper">☕ きゅうけい。せのび、みず、えんぴつ。<br><span class="en">Break time.</span></p>`;
        
    default: // window
        
        return `<p class="juku-paper">✏️ （Stage 3：テスト）</p>`;
    }
  }

  function renderClosed(slot) {
    // Report compute-if-null, gated on attendance evidence inside
    // finalize() — the closed screen itself creates a week record just
    // by existing, so the gate lives in the results file, not here.
    if (window.JUKU_RESULTS) window.JUKU_RESULTS.finalize();
    root.innerHTML = `
    
      ${exitX()}
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>きょうは おしまい</h1>
        <p class="en">Finished for today</p>
        <p class="juku-sub">おつかれさま。また らいしゅう！</p>
        <div class="juku-task" id="juku-closed-review"></div>
        <button class="juku-back-btn" id="juku-slot-back">もどる</button>
        ${navFooter()}
      </div>`;
    if (window.JUKU_RESULTS && window.JUKU_RESULTS.renderClosedReview) {
      window.JUKU_RESULTS.renderClosedReview(
        document.getElementById('juku-closed-review'), slot);
    }
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
    // A clock-driven section transition is a durable checkpoint for every
    // answer committed during the section that just ended.
    if (window.BoohaSync) BoohaSync.checkpoint('juku');
    if (window.JUKU_GHOSTS) window.JUKU_GHOSTS.unmount();
    if (!slot)                    { renderMenu(); return; }
    
    if (res.state === 'before-day') { renderUnavailable(slot); return; }
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

  function startJuku() {
    J.start(onPhaseChange, onTick);
  }

  // A borrowed device must restore the remote Juku blob before the engine can
  // create or commit a week record. sync-client.js is loaded after juku-engine.
  if (window.BOOHA_SYNC_READY) startJuku();
  else document.addEventListener('booha:syncReady', startJuku, { once: true });

})();
