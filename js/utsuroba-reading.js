/*
 * Utsuroba Reading Engine — Pass 2
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
      #utsuroba-reading-challenge .reading-progress{margin-top:14px;text-align:right;color:rgba(255,255,255,.42);font:700 11px monospace;}
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
    let lastFeedback = '';

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
          <div class="reading-transcript">${lines}</div>
          <div class="reading-question-label">${escapeText(question.label)} · ${escapeText(question.labelJP)}</div>
          <h3>${escapeText(question.prompt)}</h3>
          <p class="reading-jp">${escapeText(question.promptJP)}</p>
          ${lastFeedback ? `<div class="reading-feedback">${escapeText(lastFeedback)}</div>` : ''}
          <div class="reading-choices">${choices}</div>
          <div class="reading-progress">${questionIndex + 1} / ${episode.checks.length}</div>
        </div>`;

      overlay.querySelector('#reading-close-btn').addEventListener('click', close);
      overlay.querySelectorAll('.reading-choice').forEach(button => {
        button.addEventListener('click', () => {
          const choice = Number(button.dataset.choice);
          if (choice === question.correct) {
            lastFeedback = '';
            questionIndex += 1;
            if (opts.persist) opts.persist({ readingIndex: questionIndex });
            render();
          } else {
            lastFeedback = `Not quite. Look again at the lines. ${question.evidence}`;
            setTimeout(render, 320);
          }
        });
      });
    };

    if (opts.persist) opts.persist({ state: 'reading', readingState: 'active', readingIndex: questionIndex });
    render();
    return true;
  }

  window.UtsurobaReading = {
    start,
    close,
    isOpen: () => open
  };
})();
