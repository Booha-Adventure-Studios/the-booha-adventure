
// js/nav.js

const MONTH_MAP = {
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

const MONTHS_EN = {
  jan: 'January',
  feb: 'February',
  mar: 'March',
  apr: 'April',
  may: 'May',
  jun: 'June',
  jul: 'July',
  aug: 'August',
  sep: 'September',
  oct: 'October',
  nov: 'November',
  dec: 'December'
};

const MONTHS_JP = {
  jan: '1月',
  feb: '2月',
  mar: '3月',
  apr: '4月',
  may: '5月',
  jun: '6月',
  jul: '7月',
  aug: '8月',
  sep: '9月',
  oct: '10月',
  nov: '11月',
  dec: '12月'
};

export function getWeekParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('week') || '';
}

export function parseWeekSlug(week) {
  const m = week.match(/^(pb|br|bc)_([a-z]{3})_w([1-5])$/i);
  if (!m) return null;

  const curriculum = m[1].toLowerCase();
  const monthShort = m[2].toLowerCase();
  const weekNumber = Number(m[3]);

 return {
  rawWeek: week,
  curriculum,
  monthShort,
  monthDir: MONTH_MAP[monthShort] || monthShort,
  monthLabel: MONTHS_EN[monthShort] || monthShort,
  monthLabelJp: MONTHS_JP[monthShort] || monthShort,
  weekNumber,
  contentWeek: weekNumber === 5 ? 4 : weekNumber
 };
}

export function getPageContext() {
  const week = getWeekParam();
  return parseWeekSlug(week);
}

export function prettyWeekLabel(week) {
  const parsed = parseWeekSlug(week);
  if (!parsed) return week;
  return `${parsed.monthLabel} Week ${parsed.weekNumber} &middot; ${parsed.monthLabelJp}第${parsed.weekNumber}週`;
}

export function buildContentPath(week, type) {
  const parsed = parseWeekSlug(week);
  if (!parsed) return '';
  return `/content/${parsed.curriculum}/${parsed.monthDir}/${type}.json`;
}

export function getGameParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('game') || '';
}




