
// js/juku-results.js  (Stage 5)
// English Juku — scoring + report card. Load AFTER juku-tests.js,
// BEFORE juku-phases.js.
//
// Contract: the report is computed ONCE and locked. Results phase
// computes if null; closed state computes if null AND the session has
// attendance evidence (never mint all-zero reports for a student who
// opens the app after class). Raw section items are never modified —
// the report is a summary layered on top.
//
// Scoring: mean of included sections' EXACT percentages, rounded once.
// demo sections are excluded (partial basis, marked). Missing sections
// count as 0% (enrolled, didn't happen on this device) — missing ≠ demo.

(function () {
  'use strict';

  const CFG = window.JUKU_CONFIG;
  const J = window.JUKU;

  const SECTION_IDS = ['dictation', 'order', 'vocab', 'mixed'];

  const BAND_ORDER = ['<60', '60-69', '70-79', '80-89', '90+'];
  const BAND_JP = {
    '90+': '90〜100', '80-89': '80〜89', '70-79': '70〜79',
    '60-69': '60〜69', '<60': '〜59'
  };
  const HARD_JP = {
    dictation: 'きいてかく', reading: 'おんどく', order: 'じゅんばん',
    vocab: 'たんご', mixed: 'ミックス'
  };

  const SKILL_JP = {
    listeningWords: 'きいて たんごを つくる',
    listeningSentences: 'きいて ぶんを ならべる',
    sentenceOrder: 'ぶんの じゅんばん',
    vocabMeaning: 'たんごの いみ',
    vocabDefinition: 'せつめいから たんご',
    readingComprehension: 'よんで りかいする',
    translationBuild: 'じぶんの ことばで やくす',
    spellingBuild: 'つづりを かく',
    openWriting: 'じぶんの ぶんを かく'
  };

  function sectionLabel(id) {
    const p = CFG.phases.find(x => x.id === id);
    return p ? p.jp : id;
  }

  function bandOf(pct) {
    if (pct >= 90) return '90+';
    if (pct >= 80) return '80-89';
    if (pct >= 70) return '70-79';
    if (pct >= 60) return '60-69';
    return '<60';
  }

  // ── Section summary ──────────────────────────────────────

 // Behavioral aggregates with sample counts — a record from before a
  // field existed stays distinguishable from a measured zero.
  function aggregateSignals(items) {
    let firstSum = 0, firstN = 0, chg = 0, plays = 0, playsN = 0,
        forced = 0, forcedN = 0;
    items.forEach(it => {
      if (typeof it.firstMs === 'number') { firstSum += it.firstMs; firstN++; }
      if (typeof it.chg === 'number') chg += it.chg;
      if ('plays' in it) { playsN++; plays += (it.plays || 0); }
      if ('forced' in it) { forcedN++; if (it.forced) forced++; }
    });
    return {
      forced, forcedCount: forcedN,
      meanFirstMs: firstN ? Math.round(firstSum / firstN) : null,
      firstMsCount: firstN,
      changes: chg,
      plays, playsCount: playsN
    };
  }

  function summarizeSection(rec, excludeProve) {
    if (!rec) {
      // Never started on this device: counts as 0% against the total,
      // but displays うけてない — no invented denominator.
      return { missing: true, demo: false, included: true,
               correct: 0, total: null, percent: 0, percentRaw: 0,
               signals: null };
    }
    // Prove-it is remediation, outside the section score — filter it out
    // of both the ratio and the behavioral aggregates.
    const allItems = (rec.items || []).filter(it =>
      it && !(excludeProve && it.proveIt));
    const items = allItems.filter(it => !it.reviewOnly);
    const reviewItems = allItems.filter(it => it.reviewOnly);
    const correct = items.filter(it => it.ok).length;
    const total = rec.total || items.length || 1;
    const raw = correct / total * 100;

    return {
      missing: false, demo: !!rec.demo, included: !rec.demo,
      correct, total,
      percent: Math.round(raw), percentRaw: raw,
      signals: aggregateSignals(items),
      reviewTotal: reviewItems.length,
      pendingReview: reviewItems.filter(it => it.reviewStatus === 'pending').length
    };
  }

  function summarizeSkill(rec, predicate, expected) {
    if (!rec) return { missing: true, correct: 0, total: null, percent: null };
    const items = (rec.items || []).filter(it =>
      it && !it.proveIt && !it.reviewOnly && predicate(it));
    const total = typeof expected === 'number' ? expected : items.length;
    const correct = items.filter(it => it.ok).length;
    const accuracyItems = items.filter(it => typeof it.accuracy === 'number');
    return {
      missing: false, correct, total,
      percent: total ? Math.round(correct / total * 100) : null,
      meanAccuracy: accuracyItems.length
        ? Math.round(accuracyItems.reduce((sum, it) => sum + it.accuracy, 0)
                     / accuracyItems.length * 100)
        : null
    };
  }

  function summarizeReviewSkill(rec, predicate, expected) {
    if (!rec) {
      return { missing: true, reviewOnly: true, submitted: 0,
               total: null, pending: 0, autoApproved: 0 };
    }
    const items = (rec.items || []).filter(it =>
      it && !it.proveIt && it.reviewOnly && predicate(it));
    const total = typeof expected === 'number' ? expected : items.length;
    return {
      missing: false, reviewOnly: true,
      submitted: items.filter(it => it.reviewStatus !== 'blank').length,
      total,
      pending: items.filter(it => it.reviewStatus === 'pending').length,
      autoApproved: items.filter(it => it.reviewStatus === 'auto-approved').length
    };
  }

  function computeSkills(week) {
    const sec = week.sections || {};
    const dt = sec.dictation && sec.dictation.subTotals || {};
    const vt = sec.vocab && sec.vocab.subTotals || {};
    const mt = sec.mixed && sec.mixed.subTotals || {};
    const readingExpected = ('comp' in mt || 'read' in mt)
      ? (mt.comp || 0) + (mt.read || 0) : undefined;
    return {
      listeningWords: summarizeSkill(sec.dictation, it => it.tier === 'word', dt.word),
      listeningSentences: summarizeSkill(sec.dictation, it => it.tier === 'sent', dt.sent),
      sentenceOrder: summarizeSkill(sec.order, () => true,
        sec.order && sec.order.total),
      vocabMeaning: summarizeSkill(sec.vocab, it => it.kind === 'mean', vt.mean),
      vocabDefinition: summarizeSkill(sec.vocab, it => it.kind === 'def', vt.def),
      readingComprehension: summarizeSkill(sec.mixed,
        it => it.kind === 'comp' || it.kind === 'read',
        readingExpected),
      translationBuild: mt.translate && ((sec.mixed && sec.mixed.items) || [])
        .some(it => it.kind === 'translate' && it.reviewOnly)
        ? summarizeReviewSkill(sec.mixed, it => it.kind === 'translate', mt.translate)
        : summarizeSkill(sec.mixed, it => it.kind === 'translate', mt.translate),
      spellingBuild: summarizeSkill(sec.mixed, it => it.kind === 'write', mt.write),
      openWriting: summarizeReviewSkill(sec.mixed,
        it => it.kind === 'openWriting', mt.openWriting)
    };
  }

  // ── Report computation ───────────────────────────────────

  function computeReport(week) {
    
    const sections = {};
    SECTION_IDS.forEach(id => {
      sections[id] = summarizeSection(week.sections && week.sections[id],
                                      id === 'mixed');
    });
    const included = SECTION_IDS.filter(id => sections[id].included);
    const excluded = SECTION_IDS.filter(id => !sections[id].included);

    // Round ONCE: exact ratios in, one Math.round out.
    const total = included.length
      ? Math.round(included.reduce((s, id) => s + sections[id].percentRaw, 0)
                   / included.length)
      : null;

   // Prove-it: remediation re-asks, scored nowhere, displayed on their
    // own line. Denominator is the frozen presented count (proveTotal);
    // records predating the field fall back to committed count. Zero
    // presented → null, never 0/0.
    const mixedRec = (week.sections && week.sections.mixed) || null;
    const pv = ((mixedRec && mixedRec.items) || []).filter(it => it && it.proveIt);
    const pvTotal = (mixedRec && typeof mixedRec.proveTotal === 'number')
      ? mixedRec.proveTotal : pv.length;
    const proveIt = pvTotal
      ? { correct: pv.filter(it => it.ok).length, total: pvTotal,
          signals: aggregateSignals(pv) }
      : null;

    // Actual-lowest: among included, non-missing sections only — a
    // section never taken has no "hardest" story. Ties kept as array.
    const scored = included.filter(id => !sections[id].missing);
    let actualLowest = null;
    if (scored.length) {
      const min = Math.min(...scored.map(id => sections[id].percentRaw));
      actualLowest = scored.filter(id => sections[id].percentRaw === min);
    }

    const survey = week.survey || {};
    const predict = week.prediction || {};
    const invalidSession = !!(week.contentStatus && week.contentStatus.ready === false);
    const effectiveTotal = invalidSession ? null : total;
    const reviewItems = Object.values(week.sections || {}).flatMap(rec =>
      ((rec && rec.items) || []).filter(it => it && it.reviewOnly));
    const reviewExpected = Object.values(week.sections || {}).reduce(
      (sum, rec) => sum + (rec && typeof rec.reviewTotal === 'number'
        ? rec.reviewTotal : 0), 0);
    const missingReview = Math.max(0, reviewExpected - reviewItems.length);
    const pendingReview = reviewItems.filter(it =>
      it.reviewStatus === 'pending').length;
    const readingReview = week.teacherReview && week.teacherReview.reading || null;
    const readingComplete = !!(readingReview && readingReview.complete);

    return {
      schema: 3,
      computedAt: Date.now(),
      locked: true,
      reportType: 'automatic-class-summary',
      scoringMethod: 'equal-section-mean',
      total: effectiveTotal,
      invalidSession,
      contentManifest: week.contentStatus && week.contentStatus.manifest || null,
      partial: excluded.length > 0,
      includedSections: included,
      includedSectionCount: included.length,
      expectedSectionCount: SECTION_IDS.length,
      excludedSections: excluded,
      
      sections,
      skills: computeSkills(week),
      readingRound: {
        mode: 'teacher-observed-reading-only',
        autoScored: false,
        complete: readingComplete,
        observation: readingReview,
        note: 'Oral reading is intentionally kept separate from the automatic score.'
      },
      reviewSummary: {
        submitted: reviewItems.filter(it => it.reviewStatus !== 'blank').length,
        pending: pendingReview,
        missing: missingReview,
        autoApproved: reviewItems.filter(it =>
          it.reviewStatus === 'auto-approved').length,
        total: Math.max(reviewExpected, reviewItems.length)
      },
      provisional: pendingReview > 0 || missingReview > 0 || !readingComplete,
      proveIt,
      calibration: {
        before: survey.expect || null,
        after: predict.expect || null,
        actual: effectiveTotal,
        actualBand: effectiveTotal === null ? null : bandOf(effectiveTotal),
        expectedHardest: survey.hardest || null,
        perceivedHardest: predict.worst || null,
        actualLowest
      }
    };
  }

  // ── Attendance evidence ──────────────────────────────────
  // weekRecord() creates a record on ANY access — including from the
  // closed screen — so the record's existence proves nothing. Evidence:
  // the live-state attendance stamp, any section record (only created
  // during live phases), or a submitted survey (lobby).

  function attended(week) {
    if (week.sections && Object.keys(week.sections).length) return true;
    if (week.survey && week.survey.submitted) return true;
    // A content preflight proves the student opened the real class flow.
    // Attendance alone is deliberately insufficient: renderPhase stamps it,
    // so a student opening the page during results must not mint a zero report.
    if (week.contentStatus) return true;
    return false;
  }

  // ── Compute-if-null entry points ─────────────────────────

  function ensureReport(requireAttendance) {
    const { week } = J.weekRecord();
    if (week.report) return week.report;
    if (requireAttendance && !attended(week)) return null;
    const report = computeReport(week);
    const saved = J.patchWeek(w => { if (!w.report) w.report = report; });
    if (saved === null) return null;
    if (window.BoohaSync) BoohaSync.checkpoint('juku');
    return J.weekRecord().week.report;
  }

  // ── Rendering ────────────────────────────────────────────

  function sectionRowHTML(id, s) {
    const label = sectionLabel(id);
    if (s.missing) {
      return `
      
        <div class="juku-res-row missing">
          <span class="juku-res-label">${label}</span>
          <span class="juku-res-frac">0% — うけてない</span>
        </div>`;
      
    }
    const demoBadge = s.demo ? ' <span class="juku-res-demo">DEMO</span>' : '';
    return `
      <div class="juku-res-row ${s.demo ? 'demo' : ''}">
        <span class="juku-res-label">${label}${demoBadge}</span>
        <span class="juku-res-frac">${s.correct}/${s.total} — ${s.percent}%</span>
        <div class="juku-res-bar"><div class="juku-res-fill"
             style="width:${Math.max(0, Math.min(100, s.percent))}%"></div></div>
      </div>`;
  }

  function calibrationHTML(cal, partial) {
    const lines = [];
    if (cal.before) lines.push(
      `<p class="juku-res-cal">テストまえの よそう: ${BAND_JP[cal.before] || cal.before}</p>`);
    if (cal.after) lines.push(
      `<p class="juku-res-cal">テストのあと: ${BAND_JP[cal.after] || cal.after}</p>`);
    if (cal.actual !== null) lines.push(
      `<p class="juku-res-cal">ほんとうは: ${cal.actual}%</p>`);

    if (cal.expectedHardest || cal.perceivedHardest || cal.actualLowest) {
      const h = [];
      if (cal.expectedHardest) h.push(`よそう: ${HARD_JP[cal.expectedHardest] || cal.expectedHardest}`);
      if (cal.perceivedHardest) h.push(`テストのあと: ${HARD_JP[cal.perceivedHardest] || cal.perceivedHardest}`);
      if (cal.actualLowest && cal.actualLowest.length) {
        h.push(`ほんとうは: ${cal.actualLowest.map(id => HARD_JP[id] || id).join('・')}`);
      }
      if (h.length) lines.push(
        `<p class="juku-res-cal hard">むずかしかったのは？ ${h.join(' ／ ')}</p>`);
    }

    // Flourish: symmetric, factual, and ONLY on a complete basis —
    // comparing a partial total against a full-lesson prediction is a
    // judgment the data can't support.
    if (!partial && cal.actual !== null && cal.after) {
      const a = BAND_ORDER.indexOf(cal.actualBand);
      const p = BAND_ORDER.indexOf(cal.after);
      let line;
      if (a === p)      line = 'よそう どおり！';
      else if (a > p)   line = 'ほんとうの ほうが たかかった';
      else              line = 'よそうの ほうが たかかった';
      lines.push(`<p class="juku-res-flourish">${line} つぎは どうかな？</p>`);
    }

    return lines.length
      ? `<div class="juku-res-calbox">${lines.join('')}</div>` : '';
  }

  function skillValueHTML(skill) {
    if (skill.reviewOnly) {
      const bits = [];
      if (skill.autoApproved) bits.push(`${skill.autoApproved} みほんと一致`);
      if (skill.pending) bits.push(`${skill.pending} 先生チェック`);
      if (!bits.length) bits.push(`${skill.submitted}/${skill.total} ていしゅつ`);
      return bits.join(' ／ ');
    }
    const exact = `${skill.correct}/${skill.total}` +
      (skill.percent === null ? '' : ` — ${skill.percent}%`);
    return skill.meanAccuracy === null || typeof skill.meanAccuracy !== 'number'
      ? exact : `${exact}（もじ・語 ${skill.meanAccuracy}%）`;
  }

  function readingResultHTML(reading) {
    const observation = reading && reading.observation;
    if (!(reading && reading.complete && observation && observation.scores)) {
      return `<p class="juku-res-reading">📖 おんどく: 先生チェック まち</p>`;
    }
    const scores = observation.scores;
    const labels = [
      ['accuracy', 'せいかくさ'], ['selfCorrection', 'なおす'],
      ['phrasing', 'まとまり'], ['pace', 'はやさ']
    ];
    const values = labels.map(([id]) => scores[id])
      .filter(value => typeof value === 'number');
    const average = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0)
                   / values.length * 10) / 10
      : null;
    return `<p class="juku-res-reading">📖 おんどく（先生チェック）:
      ${labels.map(([id, label]) => `${label} ${scores[id]}/3`).join(' ／ ')}
      ${average === null ? '' : `<br>へいきん ${average}/3`}
    </p>`;
  }

  function render(taskEl, res, slot) {
    const report = ensureReport(true);
    if (!report) {
      taskEl.textContent =
        'けっかを つくる きろくが ありません。先生に かくにんしてください。 / No assessment evidence.';
      return;
    }

    if (report.invalidSession) {
      taskEl.innerHTML = `
        <div class="juku-res-invalid">
          <strong>今回は てんすうが ありません。</strong><br>
          教材の よみこみに もんだいが ありました。先生が かくにんします。<br>
          <span class="en">No score was issued because the lesson content was unavailable.</span>
        </div>`;
      return;
    }

    const totalHTML = report.total === null
      ? `<p class="juku-res-total none">DEMO のため、てんすうは ありません</p>`
      
      : `<p class="juku-res-total">じどうチェック　<span class="pct">${report.total}%</span></p>`;

    const provisionalHTML = report.provisional
      ? `<p class="juku-res-provisional">これは じどうチェックの けっかです。<br>
          おんどく・やく・じぶんの文は、先生チェック後の週レポートに入ります。</p>`
      : '';

    const partialNote = report.partial
      ? `<p class="juku-res-note">※ ${report.excludedSections
            .map(sectionLabel).join('・')}は DEMO のため、けいさんに はいっていません</p>`
      : '';

    const rows = SECTION_IDS
      .map(id => sectionRowHTML(id, report.sections[id])).join('');

    const pvHTML = report.proveIt
      ? `<p class="juku-res-prove">まちがえた もんだい、もういちど: ${report.proveIt.correct}/${report.proveIt.total}${
           report.proveIt.correct === report.proveIt.total ? ' ✓' : ''}</p>`
      : '';

    const skillsHTML = report.skills
      ? `<div class="juku-res-skills">
          <h2>くわしい けっか / Skill evidence</h2>
          ${Object.keys(SKILL_JP).map(id => {
            const s = report.skills[id];
            if (!s || s.missing || s.total === null || s.total === 0) return '';
            return `<div class="juku-res-skill"><span>${SKILL_JP[id]}</span>
              <span>${skillValueHTML(s)}</span></div>`;
          }).join('')}
        </div>` : '';

    taskEl.innerHTML = `
      <div class="juku-results">
        ${totalHTML}
        ${provisionalHTML}
        ${partialNote}
        <div class="juku-res-rows">${rows}</div>
        ${skillsHTML}
        ${readingResultHTML(report.readingRound)}
        ${pvHTML}
        ${calibrationHTML(report.calibration, report.partial)}
      </div>`;
  }

  // Closed screen: compute only with attendance evidence, display nothing.
  function finalize() {
    ensureReport(true);
  }

  window.JUKU_RESULTS = { render, finalize };

})();
