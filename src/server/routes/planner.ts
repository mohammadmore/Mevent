import { Express } from 'express';
import { isNotNull } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { events } from '../../db/schema.ts';
import { queryEvents } from '../../db/events.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { formatEvents } from '../helpers.ts';
import { getFromCache, setToCache } from '../../lib/sharedStore.ts';
import { addDays, startOfTehranDay } from '../../lib/time.ts';
import { parseQuery } from '../queryParser.ts';

// Trip planner and quick search. Both run entirely on our own data: no AI service, no prose —
// the answer is the list of matching events.

const MAX_TRIP_DAYS = 31;

/** Cities that have at least one event, so local names (e.g. «لواسان») are recognised too. */
async function knownCities(): Promise<string[]> {
  const cached = await getFromCache<string[]>('known_cities');
  if (cached) return cached;
  const rows = await db.selectDistinct({ city: events.city }).from(events).where(isNotNull(events.city)).limit(500);
  const list = rows.map(r => (r.city || '').trim()).filter(c => c.length > 1);
  await setToCache('known_cities', list, 10 * 60_000);
  return list;
}

/** "YYYY-MM-DD" (or any date) as the start of that Tehran calendar day. */
function tehranDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return isNaN(d.getTime()) ? null : startOfTehranDay(d);
}

export function registerPlannerRoutes(app: Express) {
  // Destination + dates -> the events in that city during the trip.
  app.post('/api/trip-planner', limiters.tripPlanner, asyncRoute(async (req, res) => {
    const city = String(req.body?.city || '').trim().slice(0, 50);
    if (!city) return res.status(400).json({ error: 'شهر مقصد را انتخاب کنید.' });
    const from = tehranDay(req.body?.startDate) || startOfTehranDay();
    const lastDay = tehranDay(req.body?.endDate) || from;
    if (lastDay < from) return res.status(400).json({ error: 'تاریخ پایان سفر قبل از تاریخ شروع است.' });
    if (lastDay.getTime() - from.getTime() > MAX_TRIP_DAYS * 86400_000) return res.status(400).json({ error: `بازه سفر حداکثر ${MAX_TRIP_DAYS} روز است.` });
    const to = startOfTehranDay(addDays(lastDay, 1.5));

    const { items } = await queryEvents({ city, from, to, limit: 200, offset: 0 });
    res.json({
      data: {
        city,
        startDate: from.toISOString(),
        endDate: lastDay.toISOString(),
        events: await formatEvents(items),
      },
    });
  }));

  // Free text such as «کنسرت آخر هفته در شیراز» -> filters -> events.
  app.get('/api/quick-search', limiters.tripPlanner, asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 200);
    if (!q) return res.status(400).json({ error: 'عبارتی برای جستجو بنویسید.' });
    const parsed = parseQuery(q, await knownCities());
    const base = { city: parsed.city, from: parsed.from, to: parsed.to, price: parsed.price, limit: 30, offset: 0 };
    let { items } = await queryEvents({ ...base, q: parsed.keywords.join(' ') || undefined });
    // Nothing matches the keywords: show what else is on in the same city/time instead of nothing.
    let keywordsDropped = false;
    if (!items.length && parsed.keywords.length && (parsed.city || parsed.from || parsed.price)) {
      items = (await queryEvents(base)).items;
      keywordsDropped = items.length > 0;
    }
    res.json({
      data: await formatEvents(items),
      filters: {
        city: parsed.city || null,
        from: parsed.from?.toISOString() || null,
        to: parsed.to?.toISOString() || null,
        when: parsed.when || null,
        price: parsed.price || null,
        keywords: parsed.keywords,
        keywordsDropped,
      },
    });
  }));
}
