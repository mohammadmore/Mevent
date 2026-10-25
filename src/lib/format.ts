import { APP_TIME_ZONE } from './time';

// Display helpers. Dates are always shown in Iran time (Asia/Tehran), regardless of the
// device's time zone, so an event's time reads the same for every visitor.

export const pNum = (n: unknown) => (n === null || n === undefined ? '' : String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]));

const dateParts = new Intl.DateTimeFormat('fa-IR', { timeZone: APP_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', calendar: 'persian' });
const timeFormat = new Intl.DateTimeFormat('fa-IR', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', calendar: 'persian' });
const shortDate = new Intl.DateTimeFormat('fa-IR', { timeZone: APP_TIME_ZONE, day: 'numeric', month: 'long', calendar: 'persian' });
const relativeFormat = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateParts(value: string | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return { datePart: '', timePart: '' };
  const dict = Object.fromEntries(dateParts.formatToParts(d).map(p => [p.type, p.value]));
  return { datePart: `${dict.weekday} ${dict.day} ${dict.month} ${dict.year}`, timePart: timeFormat.format(d) };
}

export function formatEventDate(value: string | Date | null | undefined) {
  const { datePart, timePart } = formatDateParts(value);
  return datePart ? `${datePart} • ${timePart}` : 'زمان نامشخص';
}

export function formatShortDate(value: string | Date | null | undefined) {
  const d = toDate(value);
  return d ? shortDate.format(d) : '';
}

/** "Every Friday" style events store a label instead of a fixed start time. */
export function fuzzyTimeLabel(fuzzyTime: string | null | undefined): string | null {
  if (!fuzzyTime) return null;
  if (fuzzyTime.startsWith('{')) {
    try { return JSON.parse(fuzzyTime).label || null; } catch { return fuzzyTime; }
  }
  return fuzzyTime;
}

export function eventTimeLabel(event: { startTime?: string | Date | null; fuzzyTime?: string | null }) {
  return fuzzyTimeLabel(event.fuzzyTime) || (event.startTime ? formatEventDate(event.startTime) : 'زمان نامشخص');
}

export function formatDistance(km: number | null | undefined) {
  if (km === null || km === undefined || !isFinite(km)) return null;
  return km < 1 ? `${pNum(Math.round(km * 1000))} متر` : `${pNum(km.toFixed(1))} کیلومتر`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export function timeAgo(value: string | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return '';
  const seconds = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relativeFormat.format(Math.round(seconds), 'second');
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relativeFormat.format(Math.round(seconds / 3600), 'hour');
  return relativeFormat.format(Math.round(seconds / 86400), 'day');
}

export function formatToman(amount: number) {
  return `${pNum(amount.toLocaleString('en-US'))} تومان`;
}

/** Price as a quiet aside ("مجانی", "۶۰ هزار تومان"), for cards where the plan matters more than the cost. */
export function softPrice(cost: number) {
  if (!cost) return 'مجانی';
  if (cost < 1_000_000) return `${pNum(Math.round(cost / 1000))} هزار تومان`;
  return `${pNum(parseFloat((cost / 1_000_000).toFixed(1)))} میلیون تومان`;
}
