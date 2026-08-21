/*
 * Utsuroba Reading Engine — Pass 4
 *
 * This module owns the reading UI and episode contract. Utsuroba only tells it
 * which drifter/quest is active and what to do when the episode is complete.
 */
(function () {
  let overlay = null;
  let style = null;
  let open = false;
  let closeCallback = null;

  function escapeText(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function installStyle() {
    if (style) return;
    style = document.createElement('style');
    style.textContent = `
      #utsuroba-reading-challenge .reading-card{position:relative;width:min(920px,100%);max-height:calc(100vh - 36px);overflow:auto;background:linear-gradient(160deg,#171020,#0b0712 65%,#130b1b);border:1px solid rgba(220,160,255,.45);border-radius:16px;padding:clamp(20px,3vw,34px);box-shadow:0 0 70px rgba(100,30,160,.34);box-sizing:border-box;}
      #utsuroba-reading-challenge .reading-close{position:absolute;right:14px;top:12px;background:transparent;border:0;color:rgba(255,255,255,.55);font-size:18px;cursor:pointer;padding:8px;}
      #utsuroba-reading-challenge .reading-eyebrow{color:#d8a8ff;font:700 11px/1.4 monospace;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px;}
      #utsuroba-reading-challenge h2{margin:0 42px 8px;color:#fff4ff;font-size:clamp(1.25rem,3vw,2rem);}
      #utsuroba-reading-challenge h2 span{display:block;color:rgba(255,220,255,.58);font-size:.52em;font-weight:400;margin-top:4px;}
      #utsuroba-reading-challenge h3{margin:5px 0 2px;color:#fff;font-size:clamp(1rem,2.3vw,1.25rem);}
      #utsuroba-reading-challenge .reading-intro{margin:0;color:#f5e8ff;line-height:1.5;font-size:clamp(.86rem,1.8vw,1rem);}
      #utsuroba-reading-challenge .reading-jp{margin:2px 0 12px;color:rgba(245,232,255,.54);font-size:.78rem;line-height:1.45;}
      #utsuroba-reading-challenge .reading-transcript{display:grid;gap:8px;margin:18px 0 20px;padding:14px;background:rgba(255,255,255,.045);border:1px solid rgba(220,160,255,.16);border-radius:10px;}
      #utsuroba-reading-challenge .reading-line{padding-left:12px;border-left:2px solid rgba(216,168,255,.45);}
      #utsuroba-reading-challenge .reading-speaker{color:#d8a8ff;font-size:.74rem;font-weight:700;letter-spacing:.05em;}
      #utsuroba-reading-challenge .reading-en{color:#fff;font-size:.9rem;line-height:1.35;margin-top:2px;}
      #utsuroba-reading-challenge .reading-question-label{color:#ffcb75;font:700 10px/1.4 monospace;letter-spacing:.14em;margin-top:8px;}
      #utsuroba-reading-challenge .reading-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px;}
      #utsuroba-reading-challenge .reading-choice{min-height:72px;text-align:left;padding:11px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(220,160,255,.34);border-radius:9px;color:#fff;cursor:pointer;font:inherit;transition:transform .15s,border-color .15s,background .15s;}
      #utsuroba-reading-challenge .reading-choice:hover{transform:translateY(-2px);background:rgba(216,168,255,.14);border-color:#d8a8ff;}
      #utsuroba-reading-challenge .reading-choice small{display:block;color:rgba(255,255,255,.48);font-size:.72rem;line-height:1.35;margin-top:5px;}
      #utsuroba-reading-challenge .reading-feedback{margin-top:12px;padding:10px 12px;border-left:3px solid #ffcb75;background:rgba(255,203,117,.08);color:#ffe7b2;font-size:.82rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-feedback small{display:block;color:rgba(255,231,178,.68);margin-top:3px;font-size:.9em;}
      #utsuroba-reading-challenge .reading-progress{margin-top:14px;text-align:right;color:rgba(255,255,255,.42);font:700 11px monospace;}
      #utsuroba-reading-challenge .reading-mechanic{margin:18px 0 20px;padding:13px 14px 15px;background:rgba(255,255,255,.035);border:1px solid rgba(255,203,117,.22);border-radius:12px;}
      #utsuroba-reading-challenge .reading-mechanic-heading{display:flex;justify-content:space-between;gap:12px;color:#ffdf9b;font:700 10px/1.4 monospace;letter-spacing:.14em;text-transform:uppercase;}
      #utsuroba-reading-challenge .reading-mechanic-heading span{color:rgba(255,223,155,.58);font-weight:400;letter-spacing:.04em;text-transform:none;}
      #utsuroba-reading-challenge .reading-mechanic-intro{margin:6px 0 2px;color:#fff4d7;font-size:.8rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-mechanic-intro-jp{margin:0;color:rgba(255,231,178,.58);font-size:.7rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-theatre-stage,#utsuroba-reading-challenge .reading-mechanic-board{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px;padding:12px 8px 8px;overflow:hidden;border:1px solid rgba(216,168,255,.18);border-radius:9px;background:radial-gradient(circle at 50% 0%,rgba(255,213,111,.18),transparent 42%),linear-gradient(180deg,#211832,#0d0916);}
      #utsuroba-reading-challenge .reading-mechanic-evidence-board{background:linear-gradient(160deg,rgba(102,179,255,.12),transparent 45%),linear-gradient(180deg,#152238,#0b1019);}
      #utsuroba-reading-challenge .reading-mechanic-emotion-thread{background:linear-gradient(160deg,rgba(255,145,175,.13),transparent 45%),linear-gradient(180deg,#281a2b,#100c16);}
      #utsuroba-reading-challenge .reading-theatre-stage::before{content:"";position:absolute;left:50%;top:0;width:2px;height:100%;background:linear-gradient(180deg,rgba(255,223,155,.55),transparent 70%);box-shadow:0 0 22px 9px rgba(255,203,117,.09);transform:translateX(-50%);pointer-events:none;}
      #utsuroba-reading-challenge .reading-theatre-act{position:relative;z-index:1;min-height:92px;padding:10px 8px;border:1px solid rgba(255,255,255,.1);border-radius:7px;background:rgba(0,0,0,.22);opacity:.48;transition:all .28s ease;box-sizing:border-box;}
      #utsuroba-reading-challenge .reading-theatre-act.is-current{opacity:1;border-color:rgba(255,203,117,.72);background:rgba(255,203,117,.1);box-shadow:0 0 18px rgba(255,203,117,.12);animation:readingActPulse 1.8s ease-in-out infinite;}
      #utsuroba-reading-challenge .reading-theatre-act.is-restored{opacity:1;border-color:rgba(216,168,255,.62);background:rgba(216,168,255,.1);}
      #utsuroba-reading-challenge .reading-theatre-act.is-restored::after{content:"✓";position:absolute;right:7px;top:5px;color:#ffe39c;font-weight:700;}
      #utsuroba-reading-challenge .reading-theatre-act .act-number{color:#ffcb75;font:700 .68rem monospace;letter-spacing:.1em;}
      #utsuroba-reading-challenge .reading-theatre-act .act-title{display:block;margin-top:7px;color:#fff;font-size:.78rem;line-height:1.25;}
      #utsuroba-reading-challenge .reading-theatre-act .act-title-jp{display:block;margin-top:3px;color:rgba(255,231,178,.55);font-size:.66rem;line-height:1.25;}
      #utsuroba-reading-challenge .reading-theatre-act .act-caption{display:block;margin-top:8px;color:rgba(255,255,255,.76);font-size:.68rem;line-height:1.3;}
      #utsuroba-reading-challenge .reading-theatre-act .act-caption-jp{display:block;margin-top:2px;color:rgba(255,231,178,.46);font-size:.61rem;line-height:1.3;}
      #utsuroba-reading-challenge .reading-theatre-locked{margin:8px 0 0;color:rgba(255,255,255,.34);font-size:.67rem;line-height:1.3;}
      #utsuroba-reading-challenge .reading-theatre-status{margin:8px 0 0;text-align:center;color:#ffdf9b;font-size:.72rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-theatre-status small{display:block;color:rgba(255,231,178,.54);font-size:.9em;}
      @keyframes readingActPulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      #utsuroba-reading-challenge .reading-complete{text-align:center;padding:clamp(36px,8vw,82px) clamp(20px,6vw,80px);}
      #utsuroba-reading-challenge .reading-success{color:#ffe8a8;font-size:clamp(1rem,2.5vw,1.35rem);line-height:1.5;margin:22px auto 4px;max-width:650px;}
      #utsuroba-reading-challenge .reading-primary{margin-top:24px;padding:12px 24px;border:1px solid #ffcb75;border-radius:8px;background:linear-gradient(135deg,#ffe7a8,#c78b31);color:#241507;font:700 .9rem Georgia,serif;cursor:pointer;}
      #utsuroba-reading-challenge .reading-loading{text-align:center;padding:80px 24px;color:#f1dcff;}
      @media(max-width:700px){#utsuroba-reading-challenge .reading-choices{grid-template-columns:1fr;}#utsuroba-reading-challenge .reading-card{padding:20px 16px;}}
    `;
    document.head.appendChild(style);
  }

  function close() {
    const callback = closeCallback;
    closeCallback = null;
    open = false;
    if (overlay) overlay.remove();
    if (style) style.remove();
    overlay = null;
    style = null;
    if (callback) callback();
  }

  async function start(options) {
    const opts = options || {};
    if (open) close();
    closeCallback = typeof opts.onClose === 'function' ? opts.onClose : null;
    open = true;
    installStyle();

    overlay = document.createElement('div');
    overlay.id = 'utsuroba-reading-challenge';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,0,12,.90);font-family:Georgia,serif;color:#f7f2e8;';
    overlay.innerHTML = '<div class="reading-card reading-loading">Opening the memory…<br><span>記憶を開いています…</span></div>';
    document.body.appendChild(overlay);

    let episode;
    try {
      await window.UTSUROBA_EPISODES_READY;
      episode = window.UTSUROBA_EPISODES[opts.quest && opts.quest.episodeId];
      if (!episode) throw new Error(`Unknown episode: ${opts.quest && opts.quest.episodeId}`);
    } catch (error) {
      console.error('[Utsuroba Reading] Could not open episode:', error);
      overlay.innerHTML = '<div class="reading-card reading-loading">This memory is cloudy. Please try again.<br><span>記憶がぼやけています。もう一度試してください。</span><br><button class="reading-primary" id="reading-error-close">Close / 閉じる</button></div>';
      overlay.querySelector('#reading-error-close').addEventListener('click', close);
      return false;
    }

    let questionIndex = Number.isInteger(opts.quest && opts.quest.readingIndex)
      ? opts.quest.readingIndex : 0;
    const mechanic = episode.mechanic || null;
    let mechanicIndex = mechanic && Number.isInteger(opts.quest && opts.quest.mechanicIndex)
      ? opts.quest.mechanicIndex
      : (mechanic && Number.isInteger(opts.quest && opts.quest.theatreIndex)
        ? opts.quest.theatreIndex : questionIndex);
    let lastFeedback = '';
    let lastFeedbackJP = '';

    function renderMechanic(restoredCount) {
      if (!mechanic) return '';
      const items = mechanic.acts || mechanic.items || mechanic.beats || [];
      if (!items.length) return '';
      const className = mechanic.type === 'memory-theatre'
        ? 'reading-theatre-stage'
        : `reading-mechanic-board reading-mechanic-${escapeText(mechanic.type)}`;
      const cards = items.map((item, index) => {
        const state = index < restoredCount ? 'is-restored' : (index === restoredCount ? 'is-current' : 'is-locked');
        const locked = index > restoredCount;
        const numberLabel = mechanic.type === 'memory-theatre' ? 'ACT' : (mechanic.type === 'evidence-board' ? 'CLUE' : 'BEAT');
        return `
          <div class="reading-theatre-act ${state}">
            <span class="act-number">${numberLabel} ${String(index + 1).padStart(2, '0')}</span>
            <span class="act-title">${escapeText(item.title)}</span>
            <span class="act-title-jp">${escapeText(item.titleJP)}</span>
            ${locked
              ? '<span class="reading-theatre-locked">Answer the next question to reveal this piece.<br>次の問題に答えると手がかりが現れます。</span>'
              : `<span class="act-caption">${escapeText(item.caption)}</span><span class="act-caption-jp">${escapeText(item.captionJP)}</span>`}
          </div>`;
      }).join('');
      const complete = restoredCount >= items.length;
      const statusJP = complete ? mechanic.completeJP : `${restoredCount} / ${items.length} 発見`;
      const statusEN = complete ? mechanic.complete : `${restoredCount} / ${items.length} ${mechanic.type === 'memory-theatre' ? 'acts restored' : 'pieces revealed'}`;
      return `
        <section class="reading-mechanic" aria-label="${escapeText(mechanic.name)}">
          <div class="reading-mechanic-heading">${escapeText(mechanic.name)} <span>${escapeText(mechanic.nameJP)}</span></div>
          <p class="reading-mechanic-intro">${escapeText(mechanic.instruction)}</p>
          <p class="reading-mechanic-intro-jp">${escapeText(mechanic.instructionJP)}</p>
          <div class="${className}">${cards}</div>
          <div class="reading-theatre-status">${escapeText(statusEN)}<small>${escapeText(statusJP)}</small></div>
        </section>`;
    }

    const finish = () => {
      const onComplete = opts.onComplete;
      close();
      if (onComplete) onComplete();
    };

    const render = () => {
      const question = episode.checks[questionIndex];
      const lines = episode.lines.map(line => `
        <div class="reading-line">
          <div class="reading-speaker">${escapeText(line.speaker)}</div>
          <div class="reading-en">${escapeText(line.en)}</div>
        </div>`).join('');

      if (!question) {
        overlay.innerHTML = `
          <div class="reading-card reading-complete">
            <div class="reading-eyebrow">${escapeText(episode.eyebrow)}</div>
            <h2>${escapeText(episode.title)}</h2>
            ${renderMechanic(mechanic ? (mechanic.acts || mechanic.items || mechanic.beats || []).length : mechanicIndex)}
            <p class="reading-success">${escapeText(episode.success)}</p>
            <p class="reading-jp">${escapeText(episode.successJP)}</p>
            <button class="reading-primary" id="reading-return-btn">Restore memory / 記憶を戻す</button>
          </div>`;
        overlay.querySelector('#reading-return-btn').addEventListener('click', finish);
        return;
      }

      const choices = question.choices.map((choice, i) => `
        <button class="reading-choice" data-choice="${i}">
          <span>${escapeText(choice)}</span>
          <small>${escapeText(question.choicesJP[i] || '')}</small>
        </button>`).join('');

      overlay.innerHTML = `
        <div class="reading-card">
          <button class="reading-close" id="reading-close-btn">✕</button>
          <div class="reading-eyebrow">${escapeText(episode.eyebrow)}</div>
          <h2>${escapeText(episode.title)} <span>${escapeText(episode.titleJP)}</span></h2>
          <p class="reading-intro">${escapeText(episode.intro)}</p>
          <p class="reading-jp">${escapeText(episode.introJP)}</p>
          ${renderMechanic(mechanicIndex)}
          <div class="reading-transcript">${lines}</div>
          <div class="reading-question-label">${escapeText(question.label)} · ${escapeText(question.labelJP)}</div>
          <h3>${escapeText(question.prompt)}</h3>
          <p class="reading-jp">${escapeText(question.promptJP)}</p>
          ${lastFeedback ? `<div class="reading-feedback">${escapeText(lastFeedback)}<small>${escapeText(lastFeedbackJP)}</small></div>` : ''}
          <div class="reading-choices">${choices}</div>
          <div class="reading-progress">${questionIndex + 1} / ${episode.checks.length}</div>
        </div>`;

      overlay.querySelector('#reading-close-btn').addEventListener('click', close);
      overlay.querySelectorAll('.reading-choice').forEach(button => {
        button.addEventListener('click', () => {
          const choice = Number(button.dataset.choice);
          if (choice === question.correct) {
            questionIndex += 1;
            if (mechanic && question.revealAct != null) {
              mechanicIndex = Math.max(mechanicIndex, question.revealAct + 1);
              lastFeedback = question.restoreText || 'The scene returns.';
              lastFeedbackJP = question.restoreTextJP || '場面が戻ります。';
            } else {
              lastFeedback = '';
              lastFeedbackJP = '';
            }
            if (opts.persist) {
              const progress = { readingIndex: questionIndex, mechanicIndex };
              if (mechanic.type === 'memory-theatre') progress.theatreIndex = mechanicIndex;
              opts.persist(progress);
            }
            render();
          } else {
            lastFeedback = `Not quite. Look again at the lines. ${question.evidence}`;
            lastFeedbackJP = question.evidenceJP || 'もう一度、会話を読み直しましょう。';
            setTimeout(render, 320);
          }
        });
      });
    };

    if (opts.persist) {
      const progress = { state: 'reading', readingState: 'active', readingIndex: questionIndex, mechanicIndex };
      if (mechanic && mechanic.type === 'memory-theatre') progress.theatreIndex = mechanicIndex;
      opts.persist(progress);
    }
    render();
    return true;
  }

  window.UtsurobaReading = {
    start,
    close,
    isOpen: () => open
  };
})();
