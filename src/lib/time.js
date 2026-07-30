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

// Returns midnight (start-of-day) in office time as a UTC Date.
// We compute it by formatting in the office tz, then reconstructing.
export function startOfDayInOffice(date) {
  const d = new Date(date);
  const parts = YMD_PARTS.formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const y = Number(get("year"));
  const m = Number(get("month"));
  const day = Number(get("day"));
  // Use the trick: format an ISO string with the office offset (+05:30).
  // We assemble it and let Date parse it. This gives the correct UTC instant.
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`;
  return new Date(iso);
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

// All calendar days in the month, in office time. Each item: { ymd, date, isWeekend }.
export function daysInMonth(year, month) {
  // month: 1-12
  const days = [];
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const total = last.getUTCDate();
  for (let i = 1; i <= total; i += 1) {
    const d = new Date(Date.UTC(year, month - 1, i));
    const ymd = YMD_PARTS.format(d);
    const dow = new Intl.DateTimeFormat("en-US", {
      timeZone: OFFICE_TZ,
      weekday: "short",
    }).format(d);
    days.push({
      ymd,
      date: d,
      dayOfMonth: i,
      isWeekend: dow === "Sat" || dow === "Sun",
    });
  }
  return days;
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
