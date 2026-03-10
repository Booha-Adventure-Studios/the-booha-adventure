
// js/calendar.js
// Booha Adventure calendar logic
// Tokyo-based curriculum week resolver
// Rule:
// - Weeks start on Sunday
// - Each month has only 4 curriculum weeks
// - If a month has a 5th week, it stays on Week 4
// - New month begins on the first Sunday that starts a week fully inside that month

// js/calendar.js

const TOKYO_TZ = "Asia/Tokyo";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getTokyoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day)
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
  const day = copy.getUTCDay(); // 0 = Sunday
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
  const targetDate = makeUtcDate(year, month, day);
  const weekStart = getSundayStart(targetDate);
  const weekEnd = getSaturdayEnd(weekStart);

  const anchorYear = weekStart.getUTCFullYear();
  const anchorMonth = weekStart.getUTCMonth() + 1;

  const firstSunday = getFirstSundayOfMonth(anchorYear, anchorMonth);
  const diffMs = weekStart.getTime() - firstSunday.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const rawWeek = diffWeeks + 1;

  return {
    anchorYear,
    anchorMonth,
    weekNumber: Math.max(1, Math.min(rawWeek, 4)),
    weekStart,
    weekEnd
  };
}

export function getCurrentCurriculumWeek(now = new Date()) {
  const tokyo = getTokyoDateParts(now);

  const result = resolveCurriculumWeek(tokyo.year, tokyo.month, tokyo.day);

  const monthIndex = result.anchorMonth - 1;
  const monthSlug = MONTHS[monthIndex];
  const monthLabel = MONTH_LABELS[monthIndex];

  return {
    year: result.anchorYear,
    month: result.anchorMonth,
    monthSlug,
    monthLabel,
    weekNumber: result.weekNumber,
    weekId: `${monthSlug}-w${result.weekNumber}`,
    weekStart: formatDateUTC(result.weekStart),
    weekEnd: formatDateUTC(result.weekEnd)
  };
}

export function getAcademicWeekNumber(curriculumWeek) {
  const cw = curriculumWeek || getCurrentCurriculumWeek();
  return ((cw.month - 1) * 4) + cw.weekNumber;
}

export function getAcademicWeekKey(curriculumWeek) {
  const cw = curriculumWeek || getCurrentCurriculumWeek();
  const n = getAcademicWeekNumber(cw);
  return `w${String(n).padStart(2, "0")}`;
}
