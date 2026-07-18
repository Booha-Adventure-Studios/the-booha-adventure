
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
    dictation: 'きいてかく', order: 'じゅんばん',
    vocab: 'たんご', mixed: 'ミックス'
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
    const items = (rec.items || []).filter(it =>
      it && !(excludeProve && it.proveIt));
    const correct = items.filter(it => it.ok).length;
    const total = rec.total || items.length || 1;
    const raw = correct / total * 100;

    return {
      missing: false, demo: !!rec.demo, included: !rec.demo,
      correct, total,
      percent: Math.round(raw), percentRaw: raw,
      signals: aggregateSignals(items)
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

    return {
      schema: 1,
      computedAt: Date.now(),
      locked: true,
      scoringMethod: 'equal-section-mean',
      total,
      partial: excluded.length > 0,
      includedSections: included,
      includedSectionCount: included.length,
      expectedSectionCount: SECTION_IDS.length,
      excludedSections: excluded,
      
      sections,
      proveIt,
      calibration: {
        before: survey.expect || null,
        after: predict.expect || null,
        actual: total,
        actualBand: total === null ? null : bandOf(total),
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
    if (week.attendance) return true;
    if (week.sections && Object.keys(week.sections).length) return true;
    if (week.survey && week.survey.submitted) return true;
    return false;
  }

  // ── Compute-if-null entry points ─────────────────────────

  function ensureReport(requireAttendance) {
    const { week } = J.weekRecord();
    if (week.report) return week.report;
    if (requireAttendance && !attended(week)) return null;
    const report = computeReport(week);
    J.patchWeek(w => { if (!w.report) w.report = report; });
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
      `<p class="juku-res-cal">あさの よそう: ${BAND_JP[cal.before] || cal.before}</p>`);
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

  function render(taskEl, res, slot) {
    const report = ensureReport(false);   // results phase: always compute

    const totalHTML = report.total === null
      ? `<p class="juku-res-total none">DEMO のため、てんすうは ありません</p>`
      
      : `<p class="juku-res-total">ぜんたい　<span class="pct">${report.total}%</span></p>`;

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

    taskEl.innerHTML = `
      <div class="juku-results">
        ${totalHTML}
        ${partialNote}
        <div class="juku-res-rows">${rows}</div>
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
