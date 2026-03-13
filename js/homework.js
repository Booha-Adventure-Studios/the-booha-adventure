
(function () {
  const root = document.getElementById('root');
  if (!root || !window.CALENDAR) return;

  const MONTH_SHORT = {
    january: 'jan',
    february: 'feb',
    march: 'mar',
    april: 'apr',
    may: 'may',
    june: 'jun',
    july: 'jul',
    august: 'aug',
    september: 'sep',
    october: 'oct',
    november: 'nov',
    december: 'dec'
  };

  const MONTH_FOLDER = {
    jan: 'january',
    feb: 'february',
    mar: 'march',
    apr: 'april',
    may: 'may',
    jun: 'june',
    jul: 'july',
    aug: 'august',
    sep: 'september',
    oct: 'october',
    nov: 'november',
    dec: 'december'
  };

  const CURR_LABEL = {
    pb: 'Pre-Boo',
    br: 'Boo-riculum',
    bc: 'Boo-continuum'
  };

  const TYPE_LABEL = {
    vocab: 'Vocabulary',
    sentences: 'Sentences',
    questions: 'Questions'
  };

  function getStateFromUrl() {
    const url = new URL(window.location.href);
    return {
      week: url.searchParams.get('week') || '',
      curr: url.searchParams.get('curr') || '',
      type: url.searchParams.get('type') || '',
      hideKnown: url.searchParams.get('hideKnown') === '1'
    };
  }

  function setUrlState(next) {
    const url = new URL(window.location.href);
    Object.entries(next).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined || v === false) {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, String(v));
      }
    });
    history.replaceState({}, '', url);
  }

  function padWeek(n) {
    return `Week ${n}`;
  }

  function labelFromWeekCode(weekCode) {
    const m = weekCode.match(/^([a-z]{2})_([a-z]{3})_w([1-4])$/i);
    if (!m) return weekCode;
    const monthShort = m[2].toLowerCase();
    const weekNum = Number(m[3]);
    const monthFolder = MONTH_FOLDER[monthShort];
    const monthLabel = monthFolder ? monthFolder.charAt(0).toUpperCase() + monthFolder.slice(1) : monthShort;
    return `${monthLabel} Week ${weekNum}`;
  }

  function buildWeekCode(curr, monthSlug, weekNumber) {
    return `${curr}_${MONTH_SHORT[monthSlug]}_w${weekNumber}`;
  }

  function getRelativeWeek(offset) {
    const now = new Date();
    const shifted = new Date(now.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
    const cw = window.CALENDAR.getCurrentCurriculumWeek(shifted);
    return {
      monthSlug: cw.monthSlug,
      monthLabel: cw.monthLabel,
      weekNumber: cw.weekNumber,
      label: `${cw.monthLabel} Week ${cw.weekNumber}`
    };
  }

  function getKnownKey(week, curr, type) {
    return `booha_hw_known_${week}_${curr}_${type}`;
  }

  function getKnownSet(week, curr, type) {
    try {
      return new Set(JSON.parse(localStorage.getItem(getKnownKey(week, curr, type)) || '[]'));
    } catch {
      return new Set();
    }
  }

  function saveKnownSet(week, curr, type, set) {
    localStorage.setItem(getKnownKey(week, curr, type), JSON.stringify([...set]));
  }

  function getMonthAndWeekFromCode(weekCode) {
    const m = weekCode.match(/^([a-z]{2})_([a-z]{3})_w([1-4])$/i);
    if (!m) return null;
    return {
      curr: m[1].toLowerCase(),
      monthShort: m[2].toLowerCase(),
      weekNumber: Number(m[3]),
      monthFolder: MONTH_FOLDER[m[2].toLowerCase()]
    };
  }

  async function loadCards(curr, weekCode, type) {
    const parsed = getMonthAndWeekFromCode(weekCode);
    if (!parsed) throw new Error('Bad week code');

    const jsonPath = `/the-booha-adventure/content/${curr}/${parsed.monthFolder}/${type}.json`;
    const res = await fetch(jsonPath, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not load ${jsonPath}`);

    const data = await res.json();
    const cards = Array.isArray(data.cards) ? data.cards : [];

    const start = (parsed.weekNumber - 1) * 15;
    return cards.slice(start, start + 15);
  }

  function renderWeekPicker() {
    const lastW = getRelativeWeek(-1);
    const thisW = getRelativeWeek(0);
    const nextW = getRelativeWeek(1);

    root.innerHTML = `
      <div class="panel">
        <h2 class="section-title">Choose a Week</h2>
        <div class="section-sub">Pick the homework week first.</div>

        <div class="grid">
          <button class="choice-btn week-last" data-week-choice="${thisW.monthSlug}|${lastW.weekNumber}|last">
            LAST WEEK
            <span class="small-label">${lastW.label}</span>
          </button>

          <button class="choice-btn week-this" data-week-choice="${thisW.monthSlug}|${thisW.weekNumber}|this">
            THIS WEEK
            <span class="small-label">${thisW.label}</span>
          </button>

          <button class="choice-btn week-next" data-week-choice="${nextW.monthSlug}|${nextW.weekNumber}|next">
            NEXT WEEK
            <span class="small-label">${nextW.label}</span>
          </button>
        </div>
      </div>
    `;

    root.querySelectorAll('[data-week-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [monthSlug, weekNumber] = btn.dataset.weekChoice.split('|');
        renderCurriculumPicker(monthSlug, Number(weekNumber));
      });
    });
  }

  function renderCurriculumPicker(monthSlug, weekNumber) {
    root.innerHTML = `
      <div class="panel">
        <div class="crumbs">
          <div class="crumb">${monthSlug.charAt(0).toUpperCase() + monthSlug.slice(1)} Week ${weekNumber}</div>
        </div>

        <h2 class="section-title">Choose a Curriculum</h2>
        <div class="section-sub">Select the curriculum for this homework.</div>

        <div class="grid">
          <button class="choice-btn pb" data-curr="pb">PRE-BOO</button>
          <button class="choice-btn br" data-curr="br">BOO-RICULUM</button>
          <button class="choice-btn bc" data-curr="bc">BOO-CONTINUUM</button>
        </div>

        <div class="actions" style="margin-top:16px;">
          <button class="action-btn alt" id="back-weeks">Back</button>
        </div>
      </div>
    `;

    document.getElementById('back-weeks').addEventListener('click', renderWeekPicker);

    root.querySelectorAll('[data-curr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const curr = btn.dataset.curr;
        const weekCode = buildWeekCode(curr, monthSlug, weekNumber);
        renderTypePicker(weekCode, curr);
      });
    });
  }

  function renderTypePicker(weekCode, curr) {
    root.innerHTML = `
      <div class="panel">
        <div class="crumbs">
          <div class="crumb">${labelFromWeekCode(weekCode)}</div>
          <div class="crumb">${CURR_LABEL[curr]}</div>
        </div>

        <h2 class="section-title">Choose Homework Type</h2>
        <div class="section-sub">Open vocabulary, sentences, or questions.</div>

        <div class="grid">
          <button class="choice-btn vocab" data-type="vocab">VOCABULARY</button>
          <button class="choice-btn sentences" data-type="sentences">SENTENCES</button>
          <button class="choice-btn questions" data-type="questions">QUESTIONS</button>
        </div>

        <div class="actions" style="margin-top:16px;">
          <button class="action-btn alt" id="back-curr">Back</button>
        </div>
      </div>
    `;

    document.getElementById('back-curr').addEventListener('click', () => {
      const parsed = getMonthAndWeekFromCode(weekCode);
      renderCurriculumPicker(parsed.monthFolder, parsed.weekNumber);
    });

    root.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        renderHomeworkSheet(weekCode, curr, btn.dataset.type, false);
      });
    });
  }

  async function renderHomeworkSheet(weekCode, curr, type, hideKnown) {
    setUrlState({ week: weekCode, curr, type, hideKnown: hideKnown ? 1 : '' });

    root.innerHTML = `
      <div class="panel">
        <div class="crumbs">
          <div class="crumb">${labelFromWeekCode(weekCode)}</div>
          <div class="crumb">${CURR_LABEL[curr]}</div>
          <div class="crumb">${TYPE_LABEL[type]}</div>
        </div>

        <div class="actions">
          <button class="action-btn alt" id="back-types">Back</button>
          <button class="action-btn" id="toggle-hide">${hideKnown ? 'Show All' : 'Hide Known'}</button>
        </div>

        <div class="sheet" id="sheet">
          <div class="sheet-head">
            <h2 class="sheet-title">${CURR_LABEL[curr]} ${TYPE_LABEL[type]}</h2>
            <div class="sheet-meta">${labelFromWeekCode(weekCode)} · Copy in your notebook</div>
          </div>

          <div class="empty">Loading…</div>
        </div>
      </div>
    `;

    document.getElementById('back-types').addEventListener('click', () => {
      renderTypePicker(weekCode, curr);
    });

    document.getElementById('toggle-hide').addEventListener('click', () => {
      renderHomeworkSheet(weekCode, curr, type, !hideKnown);
    });

    const sheet = document.getElementById('sheet');

    try {
      const cards = await loadCards(curr, weekCode, type);
      const known = getKnownSet(weekCode, curr, type);

      if (!cards.length) {
        sheet.innerHTML += `<div class="empty">No homework items found.</div>`;
        return;
      }

      const html = cards.map((card, i) => {
        const n = i + 1;
        const hiddenClass = hideKnown && known.has(n) ? 'hidden-known' : '';
        return `
          <article class="hw-item ${hiddenClass}" data-n="${n}">
            <div class="hw-top">
              <div class="hw-num">${n}.</div>
              <button class="hw-toggle" data-toggle="${n}">
                ${known.has(n) ? 'Known ✓' : 'Hide'}
              </button>
            </div>
            <div class="hw-en">${escapeHtml(card.en || '')}</div>
            <div class="hw-hira">${escapeHtml(card.hira || '')}</div>
            <div class="hw-jp">${escapeHtml(card.jp || '')}</div>
          </article>
        `;
      }).join('');

      sheet.innerHTML = `
        <div class="sheet-head">
          <h2 class="sheet-title">${CURR_LABEL[curr]} ${TYPE_LABEL[type]}</h2>
          <div class="sheet-meta">${labelFromWeekCode(weekCode)} · Copy in your notebook</div>
        </div>
        ${html}
      `;

      sheet.querySelectorAll('[data-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
          const n = Number(btn.dataset.toggle);
          const set = getKnownSet(weekCode, curr, type);

          if (set.has(n)) set.delete(n);
          else set.add(n);

          saveKnownSet(weekCode, curr, type, set);
          renderHomeworkSheet(weekCode, curr, type, hideKnown);
        });
      });

    } catch (err) {
      sheet.innerHTML = `
        <div class="sheet-head">
          <h2 class="sheet-title">${CURR_LABEL[curr]} ${TYPE_LABEL[type]}</h2>
          <div class="sheet-meta">${labelFromWeekCode(weekCode)}</div>
        </div>
        <div class="empty">Could not load this homework file.</div>
      `;
      console.error(err);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function boot() {
    const state = getStateFromUrl();
    if (state.week && state.curr && state.type) {
      renderHomeworkSheet(state.week, state.curr, state.type, state.hideKnown);
      return;
    }
    renderWeekPicker();
  }

  boot();
})();
