
// js/calendar.js
// Booha Adventure calendar logic
// Tokyo-based curriculum week resolver
// Rule:
// - Weeks start on Sunday
// - Each month has only 4 curriculum weeks
// - If a month has a 5th week, it stays on Week 4
// - New month begins on the first Sunday that starts a week fully inside that month

const TOKYO_TZ = "Asia/Tokyo";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function getTokyoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  });

  const parts = formatter.formatToParts(date);
  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: map.weekday
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

function getFirstFullWeekStart(year, month) {
  // month = 1-12
  // Find the first Sunday whose Saturday is still inside the same month
  for (let day = 1; day <= 7; day++) {
    const date = makeUtcDate(year, month, day);
    if (date.getUTCDay() === 0) {
      const weekEnd = getSaturdayEnd(date);
      const endMonth = weekEnd.getUTCMonth() + 1;
      if (endMonth === month) return date;
    }
  }

  // Fallback, should never happen
  return makeUtcDate(year, month, 1);
}

function getCurriculumMonthAnchor(year, month, day) {
  const targetDate = makeUtcDate(year, month, day);
  const currentWeekStart = getSundayStart(targetDate);

  const firstFullWeekThisMonth = getFirstFullWeekStart(year, month);

  if (currentWeekStart >= firstFullWeekThisMonth) {
    return { year, month };
  }

  // Belongs to previous curriculum month
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
}

function getWeekNumberInCurriculumMonth(realYear, realMonth, realDay) {
  const anchor = getCurriculumMonthAnchor(realYear, realMonth, realDay);
  const targetDate = makeUtcDate(realYear, realMonth, realDay);
  const currentWeekStart = getSundayStart(targetDate);
  const firstFullWeekStart = getFirstFullWeekStart(anchor.year, anchor.month);

  const diffMs = currentWeekStart.getTime() - firstFullWeekStart.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const rawWeek = diffWeeks + 1;

  return {
    anchorYear: anchor.year,
    anchorMonth: anchor.month,
    weekNumber: Math.max(1, Math.min(rawWeek, 4)),
    weekStart: currentWeekStart,
    weekEnd: getSaturdayEnd(currentWeekStart)
  };
}

export function getCurrentCurriculumWeek(now = new Date()) {
  const tokyo = getTokyoDateParts(now);

  const result = getWeekNumberInCurriculumMonth(
    tokyo.year,
    tokyo.month,
    tokyo.day
  );

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
