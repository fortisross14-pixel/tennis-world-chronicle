export function universeStartYear(universe) {
  if (Number.isFinite(universe?.startYear)) return universe.startYear;
  const years = [
    universe?.year,
    ...(universe?.rankingHistory || []).map(row => row?.year),
    ...(universe?.yearSummaries || []).map(row => row?.year),
    ...(universe?.calendar || []).map(row => row?.year),
  ].filter(Number.isFinite);
  return years.length ? Math.min(...years) : 1;
}

export function universeYearNumber(universe, year = universe?.year) {
  if (!Number.isFinite(year)) return 1;
  return Math.max(1, year - universeStartYear(universe) + 1);
}

export function universeYearLabel(universe, year = universe?.year) {
  return `Year ${universeYearNumber(universe, year)}`;
}

export function universeWeekLabel(universe, year, week) {
  return `${universeYearLabel(universe, year)} · Week ${week}`;
}

export function replaceCalendarYears(universe, value) {
  if (value == null) return value;
  const start = universeStartYear(universe);
  return String(value).replace(/\b(\d{4})\b/g, (match, raw) => {
    const year = Number(raw);
    if (year < start || year > (universe?.year || start) + 2) return match;
    return universeYearLabel(universe, year);
  });
}
