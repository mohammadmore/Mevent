import React from 'react';
import { ChevronLeft, MapPin, Clock, Ticket } from 'lucide-react';
import { Event } from '../types';
import { PriceWidget } from './PriceWidget';
import { eventTimeLabel } from '../lib/format';
import { startOfTehranDay } from '../lib/time';

/** Compact, clickable event row used by the trip planner and quick search. */
export function EventRow({ event, onSelect }: { event: Event; onSelect?: (e: Event) => void }) {
  const address = (event as any).address || event.location?.address;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className="w-full text-right bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 hover:border-teal-500 dark:hover:border-[#d9ff00] p-3 rounded-2xl transition-colors flex items-center gap-3 group"
    >
      {event.imageUrl ? (
        <img src={event.imageUrl} alt="" loading="lazy" className="w-16 h-16 rounded-xl object-cover shrink-0" />
      ) : (
        <span className="w-16 h-16 rounded-xl bg-teal-50 dark:bg-white/5 flex items-center justify-center text-teal-600 dark:text-[#d9ff00] shrink-0">
          <Ticket className="w-7 h-7" />
        </span>
      )}
      <span className="flex-1 min-w-0 space-y-1">
        <span className="block font-bold text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-teal-600 dark:group-hover:text-[#d9ff00]">{event.title}</span>
        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate"><Clock className="w-3 h-3 shrink-0" />{eventTimeLabel(event as any)}</span>
        {address && <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate"><MapPin className="w-3 h-3 shrink-0" />{address}</span>}
        <PriceWidget cost={event.cost} className="text-teal-600 dark:text-[#d9ff00] text-xs" />
      </span>
      <ChevronLeft className="w-5 h-5 text-gray-400 shrink-0" />
    </button>
  );
}

const dayTitle = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Groups events by the Tehran calendar day they happen on within [rangeStart, ...). Events that
 * started earlier and are still running go under the first day; undated ones under «زمان منعطف».
 */
export function groupEventsByDay(list: Event[], rangeStart?: string | Date) {
  const start = rangeStart ? startOfTehranDay(new Date(rangeStart)).getTime() : -Infinity;
  const groups = new Map<string, { key: string; title: string; sort: number; events: Event[] }>();
  for (const e of list) {
    let key = 'flex', title = 'زمان منعطف', sort = Number.MAX_SAFE_INTEGER;
    if (e.startTime) {
      const day = Math.max(startOfTehranDay(new Date(e.startTime)).getTime(), start);
      key = String(day);
      title = dayTitle.format(new Date(day));
      sort = day;
    }
    if (!groups.has(key)) groups.set(key, { key, title, sort, events: [] });
    groups.get(key)!.events.push(e);
  }
  return [...groups.values()].sort((a, b) => a.sort - b.sort);
}
