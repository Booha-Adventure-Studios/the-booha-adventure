
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

export function getWeekParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('week') || '';
}

export function parseWeekSlug(weekSlug = '') {
  const match = weekSlug.match(/^(pb|br|bc)_([a-z]{3})_w([1-4])$/i);

  if (!match) {
    return null;
  }

  const curriculum = match[1].toLowerCase();
  const monthShort = match[2].toLowerCase();
  const weekNumber = Number(match[3]);
  const monthSlug = MONTH_MAP[monthShort];

  if (!monthSlug) {
    return null;
  }

  return {
    curriculum,
    monthShort,
    monthSlug,
    weekNumber,
    weekSlug: `${curriculum}_${monthShort}_w${weekNumber}`
  };
}

export function getPageContext() {
  const week = getWeekParam();
  return parseWeekSlug(week);
}
