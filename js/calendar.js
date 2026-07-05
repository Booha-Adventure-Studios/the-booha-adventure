
// js/calendar.js
// Booha Adventure calendar logic — Tokyo-based curriculum week resolver
//
// FIXES applied:
// - Removed ES module `export` keywords (file is loaded as a plain <script>, not a module)
// - Functions exposed on window.CALENDAR so other scripts can call them:
//     window.CALENDAR.getCurrentCurriculumWeek()
//     window.CALENDAR.getAcademicWeekNumber(cw)
//     window.CALENDAR.getAcademicWeekKey(cw)
//
// Rule:
// - Weeks start on Sunday
// - Each month has only 4 curriculum weeks
// - If a month has a 5th week, it stays on Week 4
// - New month begins on the first Sunday in that month

(function () {

const TOKYO_TZ = "Asia/Tokyo";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getTokyoDateParts(date) {
  date = date || new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TZ,
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year:  Number(map.year),
    month: Number(map.month),
    day:   Number(map.day)
  };
}

function makeUtcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateUTC(date) {
  return date.toISOString().slice(0, 10);
}

function getSundayStart(date) {
  const copy = new Date(date);
  const day  = copy.getUTCDay(); // 0 = Sunday
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy;
}

function getSaturdayEnd(sundayDate) {
  const copy = new Date(sundayDate);
  copy.setUTCDate(copy.getUTCDate() + 6);
  return copy;
}

function getFirstSundayOfMonth(year, month) {
  for (let day = 1; day <= 7; day++) {
    const date = makeUtcDate(year, month, day);
    if (date.getUTCDay() === 0) return date;
  }
  return makeUtcDate(year, month, 1);
}

function resolveCurriculumWeek(year, month, day) {
  const targetDate  = makeUtcDate(year, month, day);
  const weekStart   = getSundayStart(targetDate);
  const weekEnd     = getSaturdayEnd(weekStart);
  const anchorYear  = weekStart.getUTCFullYear();
  const anchorMonth = weekStart.getUTCMonth() + 1;
  const firstSunday = getFirstSundayOfMonth(anchorYear, anchorMonth);
  const diffMs      = weekStart.getTime() - firstSunday.getTime();
  const diffWeeks   = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const rawWeek     = diffWeeks + 1;
  return {
    anchorYear,
    anchorMonth,
    weekNumber: Math.max(1, Math.min(rawWeek, 4)),
    weekStart,
    weekEnd
  };
}

function getCurrentCurriculumWeek(now) {
  now = now || new Date();
  const tokyo  = getTokyoDateParts(now);
  const result = resolveCurriculumWeek(tokyo.year, tokyo.month, tokyo.day);
  const monthIndex = result.anchorMonth - 1;
  return {
    year:        result.anchorYear,
    month:       result.anchorMonth,
    monthSlug:   MONTHS[monthIndex],
    monthLabel:  MONTH_LABELS[monthIndex],
    weekNumber:  result.weekNumber,
    weekId:      MONTHS[monthIndex] + '-w' + result.weekNumber,
    weekStart:   formatDateUTC(result.weekStart),
    weekEnd:     formatDateUTC(result.weekEnd)
  };
}

function getAcademicWeekNumber(curriculumWeek) {
  const cw = curriculumWeek || getCurrentCurriculumWeek();
  return ((cw.month - 1) * 4) + cw.weekNumber;
}

function getAcademicWeekKey(curriculumWeek) {
  const cw = curriculumWeek || getCurrentCurriculumWeek();
  const n  = getAcademicWeekNumber(cw);
  return 'w' + String(n).padStart(2, '0');
}

/* ── Expose on window.CALENDAR (plain-script safe, no ES module needed) ── */
  
function getTodayKey(now) {
  const p = getTokyoDateParts(now || new Date());
  return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
}

window.CALENDAR = {
  getCurrentCurriculumWeek: getCurrentCurriculumWeek,
  getAcademicWeekNumber:    getAcademicWeekNumber,
  getAcademicWeekKey:       getAcademicWeekKey,
  getTodayKey:              getTodayKey
};

  

})();
