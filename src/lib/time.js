// Time helpers for the Fenix Cars office staff time tracking feature.
// All timestamps are stored as UTC in the DB; we render in Asia/Colombo.

export const OFFICE_TZ = "Asia/Colombo";
export const AUTO_CLOSE_HOURS = 9;

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: OFFICE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: OFFICE_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TZ,
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function formatTime(date) {
  if (!date) return "—";
  return TIME_FMT.format(new Date(date));
}

export function formatDate(date) {
  if (!date) return "—";
  return DATE_FMT.format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return "—";
  return DATETIME_FMT.format(new Date(date));
}

export function formatDay(date) {
  if (!date) return "—";
  return DAY_FMT.format(new Date(date));
}

export function formatDuration(ms) {
  if (ms == null || ms < 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function durationMs(clockIn, clockOut) {
  if (!clockIn || !clockOut) return null;
  return new Date(clockOut).getTime() - new Date(clockIn).getTime();
}

const YMD_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: OFFICE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Returns the YYYY-MM-DD representation of a date in office time.
export function ymdInOffice(date) {
  return YMD_PARTS.format(new Date(date));
}

// Wall-clock parts of an instant as seen in the office timezone.
const OFFICE_PARTS_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: OFFICE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// The office's UTC offset in ms at a given instant. Derived from Intl rather
// than hardcoded, so this stays correct if the office timezone ever changes or
// starts observing DST.
function officeOffsetMs(date) {
  const parts = OFFICE_PARTS_FMT.formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  // The same wall-clock reading interpreted as UTC, minus the real instant,
  // is exactly the offset.
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  // Ignore sub-second drift; offsets are whole minutes. Math.floor is correct
  // here for both signs: asUtc is built from truncated whole-second parts, so
  // the subtrahend must round the same direction (down) on either side of the
  // epoch. Math.trunc would round up for negative times and skew by 1000ms.
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Returns midnight (start-of-day) in office time as a UTC Date.
export function startOfDayInOffice(date) {
  const d = new Date(date);
  const parts = YMD_PARTS.formatToParts(d);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const midnightAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"));
  // Convert that wall-clock midnight to a real instant by removing the offset.
  // Compute the offset near the target day so a DST boundary elsewhere in the
  // month can't skew it.
  const offset = officeOffsetMs(new Date(midnightAsUtc));
  return new Date(midnightAsUtc - offset);
}

export function endOfDayInOffice(date) {
  const start = startOfDayInOffice(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * 24 * 60 * 60 * 1000);
}

export function addHours(date, hours) {
  return new Date(new Date(date).getTime() + hours * 60 * 60 * 1000);
}

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: OFFICE_TZ,
  weekday: "short",
});

// All calendar days in the month, in office time. Each item: { ymd, date, isWeekend }.
export function daysInMonth(year, month) {
  // month: 1-12
  const days = [];
  const last = new Date(Date.UTC(year, month, 0));
  const total = last.getUTCDate();
  for (let i = 1; i <= total; i += 1) {
    // Noon UTC keeps the calendar date stable in the office timezone regardless
    // of the UTC offset, so the ymd/weekday can't slip to an adjacent day.
    const d = new Date(Date.UTC(year, month - 1, i, 12));
    const ymd = YMD_PARTS.format(d);
    const dow = WEEKDAY_FMT.format(d);
    days.push({
      ymd,
      date: d,
      dayOfMonth: i,
      isWeekend: dow === "Sat" || dow === "Sun",
    });
  }
  return days;
}

// Half-open [start, end) bounds for a month in office time, as UTC instants.
// Use these for month-scoped queries so entries near midnight on the 1st/last
// day fall in the same month the UI groups them into.
export function officeMonthRange(year, month) {
  const start = startOfDayInOffice(new Date(Date.UTC(year, month - 1, 1, 12)));
  const end = startOfDayInOffice(new Date(Date.UTC(year, month, 1, 12)));
  return { start, end };
}

export const MONTH_NAMES = [
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
  "December",
];

// Group a list of time entries (with clockIn/clockOut) by their ymd in office tz.
// Each value: { totalMs, entries: [...] }
export function groupEntriesByDay(entries) {
  const byDay = new Map();
  for (const e of entries) {
    if (!e.clockIn) continue;
    const ymd = ymdInOffice(e.clockIn);
    const existing = byDay.get(ymd) ?? { totalMs: 0, entries: [] };
    const dur = durationMs(e.clockIn, e.clockOut);
    if (dur != null) existing.totalMs += dur;
    existing.entries.push(e);
    byDay.set(ymd, existing);
  }
  return byDay;
}
