// js/juku-phases.js
// English Juku — phase renderers. Load AFTER juku-engine.js.
// The engine owns the clock and calls these; renderers never read the clock
// themselves except through the resolution object they are handed.
//
// Stage 1: slot menu, lobby, progress spine, placeholder phase panels,
// closed screen. Real task UIs replace the placeholders stage by stage.

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

  // Authored constant strings only in innerHTML — never user data.
  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  // ── Progress spine ───────────────────────────────────────
  // The thin bar: every phase visible, current one lit. The 90 minutes
  // always feels finite and legible.

  function spineHTML(activeIdx) {
    const cells = CFG.phases.map((p, i) => {
      const cls = i < activeIdx ? 'done' : i === activeIdx ? 'now' : '';
      return `<div class="jsp-cell ${cls}" style="flex:${p.min}" title="${p.jp}"></div>`;
    }).join('');
    return `<div class="juku-spine">${cells}</div>`;
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
        <p class="juku-sub">クラスをえらんでね</p>
        <div class="juku-slot-list">${buttons}</div>
      </div>`;
    root.querySelectorAll('.juku-slot-btn').forEach(b => {
      b.addEventListener('click', () => {
        J.selectSlot(b.dataset.slot);
        // engine tick picks up the new slot within a second; force it now:
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
        <p class="juku-sub2">まだ開いていません。じゅんびしてまってね。</p>
        <button class="juku-back-btn" id="juku-slot-back">クラスをえらびなおす</button>
      </div>`;
    wireBack();
  }

  function renderLobby(res, slot) {
    // Stage 2 replaces the notice with the 4-question check-in survey.
    root.innerHTML = `
      <div class="juku-panel">
        <img class="juku-crest" src="assets/img/juku-logo.png" alt="">
        <h1>まもなく開始</h1>
        <p class="juku-sub">${slot.label}</p>
        <div class="juku-count big" id="juku-count">${fmt(res.secToStart)}</div>
        <p class="juku-sub2">ノート・えんぴつ・きもちのじゅんび。<br>
        <span class="en">Notebook, pencil, mind — ready.</span></p>
        <div class="juku-survey-slot" id="juku-survey"><!-- Stage 2: check-in survey --></div>
      </div>`;
  }

  function renderPhase(res, slot) {
    const p = res.phase;
    root.innerHTML = `
      ${spineHTML(res.phaseIdx)}
      <div class="juku-panel">
        <p class="juku-eyebrow">${p.en}</p>
        <h1>${p.jp}</h1>
        <div class="juku-count" id="juku-count">${fmt(res.phaseRemainSec)}</div>
        <div class="juku-task" id="juku-task">
          ${placeholderFor(p)}
        </div>
      </div>`;
  }

  function placeholderFor(p) {
    // Stage 1 placeholders. Each is replaced by a real task renderer:
    //  Stage 3: window tests   Stage 4: broadcast dictation   Stage 5: results
    switch (p.kind) {
      case 'paper':
        return `<p class="juku-paper">📖 目を上げて。<br><span class="en">Eyes up — reading round with Bryan.</span></p>`;
      case 'interval':
        return `<p class="juku-paper">☕ 休けい。せのび、水、えんぴつ。</p>`;
      case 'results':
        return `<p class="juku-paper">🧾 （Stage 5：レポート）</p>`;
      case 'predict':
        return `<p class="juku-paper">🤔 （Stage 2：自己予想）</p>`;
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
        <p class="juku-sub">おつかれさま。また来週。</p>
        <button class="juku-back-btn" id="juku-slot-back">もどる</button>
      </div>`;
    wireBack();
  }

  function wireBack() {
    const b = document.getElementById('juku-slot-back');
    if (b) b.addEventListener('click', () => { J.clearSlot(); });
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
    // slot changed outside the tick — repaint immediately
    onPhaseChange(J.slot ? J.resolve(J.slot, J.tokyoNow()) : { state: 'menu' }, J.slot);
  });

  J.start(onPhaseChange, onTick);

})();
