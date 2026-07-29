/**
 * juku-report-log.js
 * Student-owned Juku report viewer for profile.html.
 *
 * Only PIN-finalized records are shown. The teacher receives no duplicate
 * record: approval/denial and reading evidence live inside the student's
 * existing cloud-synced Juku blob.
 */
(function () {
  'use strict';

  const CURRICULUM = {
    pb: 'Pre-Boo', br: 'Boo-riculum', bc: 'Boo-continuum'
  };
  const SECTIONS = {
    dictation: 'Listening', order: 'Sentence order',
    vocab: 'Vocabulary', mixed: 'Mixed check'
  };
  const SKILLS = {
    listeningWords: 'Listening: words',
    listeningSentences: 'Listening: sentences',
    sentenceOrder: 'Sentence order',
    vocabMeaning: 'Vocabulary meaning',
    vocabDefinition: 'Definition → word',
    readingComprehension: 'Reading comprehension',
    translationBuild: 'Translation',
    spellingBuild: 'Spelling',
    openWriting: 'Original writing'
  };
  const READING = {
    accuracy: 'Word accuracy',
    selfCorrection: 'Self-correction',
    phrasing: 'Phrasing',
    pace: 'Pace'
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function curriculumOf(week) {
    return week.curriculum ||
      (week.finalReport && week.finalReport.curriculum) ||
      (week.contentStatus && week.contentStatus.curriculum) ||
      (week.slot === 'slot-a' ? 'pb' : week.slot === 'slot-b' ? 'br' : null);
  }

  function displayDate(week) {
    const key = week.weekStart || week.occurrenceKey || week.weekId || '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
    return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : key;
  }

  function metric(label, value) {
    const box = el('div', 'juku-log-metric');
    box.appendChild(el('b', '', value));
    box.appendChild(el('span', '', label));
    return box;
  }

  function autoSkillEvidence(report) {
    return Object.entries((report && report.skills) || {})
      .filter(([, skill]) =>
        skill && !skill.missing && !skill.reviewOnly &&
        typeof skill.percent === 'number' && skill.total > 0)
      .map(([id, skill]) => ({
        id, label: SKILLS[id] || id, percent: skill.percent
      }));
  }

  function readingEvidence(week) {
    const reading = week.teacherReview && week.teacherReview.reading;
    if (!(reading && reading.complete && reading.scores)) return null;
    const values = Object.values(READING)
      .map((label, index) => {
        const id = Object.keys(READING)[index];
        return { id, label, score: reading.scores[id] };
      })
      .filter(item => typeof item.score === 'number');
    const average = values.length
      ? Math.round(values.reduce((sum, item) => sum + item.score, 0)
                   / values.length * 10) / 10
      : null;
    return { values, average };
  }

  function appendReportStory(body, week) {
    const report = week.report || {};
    const skills = autoSkillEvidence(report);
    const reading = readingEvidence(week);
    const ranked = skills.slice();
    if (reading && reading.average !== null) {
      ranked.push({
        id: 'oralReading', label: 'Oral reading',
        percent: Math.round(reading.average / 3 * 100)
      });
    }
    ranked.sort((a, b) => b.percent - a.percent);

    if (ranked.length) {
      body.appendChild(el('div', 'juku-log-subhead', '今週のストーリー / Weekly story'));
      body.appendChild(el('p', 'juku-log-line juku-log-strength',
        `つよみ: ${ranked[0].label}（${ranked[0].percent}%）`));
      const focus = ranked[ranked.length - 1];
      body.appendChild(el('p', 'juku-log-line juku-log-focus',
        `つぎの一歩: ${focus.label}を ゆっくり、せいかくに れんしゅうしよう。`));
    }

    if (report.proveIt) {
      body.appendChild(el('p', 'juku-log-line',
        `やりなおしチャレンジ: ${report.proveIt.correct}/${report.proveIt.total}`));
    }
    const calibration = report.calibration || {};
    if (calibration.after && calibration.actual != null) {
      body.appendChild(el('p', 'juku-log-line',
        `じぶんの予想 ${calibration.after} ／ じどうチェック ${calibration.actual}%`));
    }
  }

  function appendStudentEnglish(body, week) {
    const mixed = week.sections && week.sections.mixed;
    const items = (mixed && mixed.items || []).filter(item =>
      item && item.reviewOnly && item.ans);
    if (!items.length) return;
    body.appendChild(el('div', 'juku-log-subhead', 'じぶんの English / Student work'));
    items.forEach(item => {
      const label = item.kind === 'translate' ? 'Translation'
        : item.kind === 'openWriting' ? 'Writing' : 'Response';
      body.appendChild(el('p', 'juku-log-line', `${label}: ${item.ans}`));
      if (item.kind === 'openWriting' && Array.isArray(item.targetsRequired)) {
        body.appendChild(el('p', 'juku-log-line',
          `Targets: ${(item.targetsUsed || []).length}/${item.targetsRequired.length} used`));
      }
    });
  }

  function approvedBody(week) {
    const body = el('div', 'juku-log-body');
    const report = week.report || {};
    const grid = el('div', 'juku-log-grid');
    Object.entries(report.sections || {}).forEach(([id, section]) => {
      if (!section || section.missing) return;
      grid.appendChild(metric(SECTIONS[id] || id,
        `${section.correct}/${section.total} · ${section.percent}%`));
    });
    const reading = readingEvidence(week);
    if (reading && reading.average !== null) {
      grid.appendChild(metric('Oral reading', `${reading.average}/3`));
    }
    body.appendChild(grid);

    if (reading) {
      body.appendChild(el('div', 'juku-log-subhead', 'おんどく / Reading'));
      reading.values.forEach(item => {
        body.appendChild(el('p', 'juku-log-line',
          `${item.label}: ${item.score}/3`));
      });
    }
    appendReportStory(body, week);
    appendStudentEnglish(body, week);
    return body;
  }

  function deniedBody() {
    const body = el('div', 'juku-log-body');
    body.appendChild(el('p', 'juku-log-line',
      '先生がこのクラスの点数をみとめなかったため、スコアは発行されませんでした。'));
    body.appendChild(el('p', 'juku-log-line',
      'No scored report was issued. The lesson evidence remains safely saved.'));
    return body;
  }

  function reportCard(week) {
    const finalReport = week.finalReport;
    const approved = finalReport.status === 'approved';
    const curr = curriculumOf(week);
    const card = el('article', 'juku-log-card');
    const head = el('button', 'juku-log-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    head.appendChild(el('span', '', CURRICULUM[curr] || curr || 'Juku'));
    head.appendChild(el('span', 'juku-log-date', displayDate(week)));
    if (approved) {
      head.appendChild(el('span', 'juku-log-score',
        week.report && week.report.total != null ? `${week.report.total}%` : '✓'));
    } else {
      head.appendChild(el('span', 'juku-log-status', 'NO SCORE'));
    }
    const body = approved ? approvedBody(week) : deniedBody();
    head.addEventListener('click', () => {
      const open = !body.classList.contains('open');
      body.classList.toggle('open', open);
      head.setAttribute('aria-expanded', String(open));
    });
    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function render() {
    const mount = document.getElementById('juku-report-log');
    if (!mount || !(window.JUKU && JUKU.loadSave)) return;
    const section = document.getElementById('juku-report-section');
    const isJuku = localStorage.getItem('booha_is_juku') === '1';
    if (!isJuku) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    mount.textContent = '';
    const save = JUKU.loadSave();
    const reports = Object.values(save.weeks || {})
      .filter(week => week && week.finalReport &&
        ['approved', 'denied'].includes(week.finalReport.status))
      .sort((a, b) =>
        Number((b.finalReport && (b.finalReport.approvedAt || b.finalReport.deniedAt)) || 0) -
        Number((a.finalReport && (a.finalReport.approvedAt || a.finalReport.deniedAt)) || 0));
    if (!reports.length) {
      mount.appendChild(el('div', 'juku-log-empty',
        '先生が かくにんしたレポートは、ここに ほぞんされます。'));
      return;
    }
    const list = el('div', 'juku-log-list');
    reports.forEach(week => list.appendChild(reportCard(week)));
    mount.appendChild(list);
  }

  if (window.BOOHA_READY) render();
  else document.addEventListener('booha:ready', render, { once: true });
  document.addEventListener('juku:saved', render);
})();
