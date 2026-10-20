// Calendar helpers pinned to Iran's time zone, used by both the server and the client,
// so "today" and "the weekend" mean the same thing regardless of where code runs.

export const APP_TIME_ZONE = 'Asia/Tehran';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  weekday: 'short', hourCycle: 'h23',
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function tehranParts(date: Date) {
  const p: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) p[part.type] = part.value;
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour, minute: +p.minute, second: +p.second,
    weekday: WEEKDAYS[p.weekday],
  };
}

/** Milliseconds to add to UTC to get Tehran wall-clock time at `date`. */
function tehranOffsetMs(date: Date) {
  const p = tehranParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000) * 60000;
}

/** The instant at which the Tehran calendar day containing `date` starts. */
export function startOfTehranDay(date: Date = new Date()): Date {
  const p = tehranParts(date);
  const midnightAsUtc = Date.UTC(p.year, p.month - 1, p.day);
  return new Date(midnightAsUtc - tehranOffsetMs(date));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

/** [start, end) of the Tehran day containing `date`. */
export function tehranDayRange(date: Date = new Date()): [Date, Date] {
  const start = startOfTehranDay(date);
  return [start, startOfTehranDay(addDays(start, 1.5))];
}

/** [start, end) of the coming Iranian weekend (Thursday + Friday); the current one if it is under way. */
export function tehranWeekendRange(date: Date = new Date()): [Date, Date] {
  const today = startOfTehranDay(date);
  const weekday = tehranParts(date).weekday; // 0 = Sunday ... 4 = Thursday, 5 = Friday
  // Days from today to the weekend's Thursday (-1 on Friday: the weekend began yesterday).
  const offset = weekday === 5 ? -1 : (4 - weekday + 7) % 7;
  // +0.5 day keeps the arithmetic safe around any offset change before snapping to midnight.
  const start = startOfTehranDay(addDays(today, offset + 0.5));
  const end = startOfTehranDay(addDays(start, 2.5));
  return [start, end];
}
