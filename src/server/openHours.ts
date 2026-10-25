import { tehranParts } from '../lib/time.ts';
import { parseJsonArray } from './helpers.ts';

// Whether a place is open at a given moment (Tehran time), from the schedule the place form
// stores in advancedDetails, falling back to the "09:00 تا 23:00" text of older rows.

type Slot = { openTime: string; closeTime: string };
const latin = (s: string) => s.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function minutes(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(latin(String(hhmm || '')).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function slotsFor(place: { advancedDetails?: any; workingHours?: string | null }, weekday: number): Slot[] | null {
  const adv = place.advancedDetails && typeof place.advancedDetails === 'object' ? place.advancedDetails : null;
  if (adv?.scheduleType === 'variable') {
    const day = parseJsonArray(adv.variableSchedule).find((d: any) => Number(d?.dayOfWeek) === weekday);
    if (!day) return null;
    return day.isClosed ? [] : parseJsonArray(day.timeSlots);
  }
  if (adv && Array.isArray(adv.regularTimeSlots) && adv.regularTimeSlots.length) {
    if (parseJsonArray(adv.regularHolidays).map(Number).includes(weekday)) return [];
    return adv.regularTimeSlots;
  }
  if (place.workingHours) {
    const found = [...latin(place.workingHours).matchAll(/(\d{1,2}:\d{2})\s*(?:تا|-|–)\s*(\d{1,2}:\d{2})/g)].map(m => ({ openTime: m[1], closeTime: m[2] }));
    return found.length ? found : null;
  }
  return null;
}

/**
 * `known` is false when the place has no usable schedule. A slot that closes after midnight
 * ("18:00 تا 02:00") also covers the early hours of the next day.
 */
export function openState(place: { advancedDetails?: any; workingHours?: string | null }, at: Date = new Date()) {
  const p = tehranParts(at);
  const now = p.hour * 60 + p.minute;
  const today = slotsFor(place, p.weekday);
  const yesterday = slotsFor(place, (p.weekday + 6) % 7);
  if (today === null && yesterday === null) return { known: false, open: false, closesAt: null as string | null };
  for (const s of today || []) {
    const o = minutes(s.openTime), c = minutes(s.closeTime);
    if (o === null || c === null) continue;
    if (c > o ? now >= o && now < c : now >= o) return { known: true, open: true, closesAt: s.closeTime };
  }
  for (const s of yesterday || []) {
    const o = minutes(s.openTime), c = minutes(s.closeTime);
    if (o !== null && c !== null && c < o && now < c) return { known: true, open: true, closesAt: s.closeTime };
  }
  return { known: true, open: false, closesAt: null };
}
