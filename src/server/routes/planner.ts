import { Express } from 'express';
import { correctQuery } from '../spelling.ts';
import { isNotNull, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { events, places } from '../../db/schema.ts';
import { queryEvents, upcomingCondition, normalizedColumn } from '../../db/events.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { formatEvents } from '../helpers.ts';
import { getFromCache, setToCache } from '../../lib/sharedStore.ts';
import { addDays, startOfTehranDay } from '../../lib/time.ts';
import { parseQuery } from '../queryParser.ts';
import { captureError } from '../../lib/monitoring.ts';

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

/**
 * Cities that have something to offer: upcoming events and published places, counted per city
 * (spelling variants such as «ي»/«ی» count as one city), most first. Empty cities are left out.
 */
export async function citiesWithContent(): Promise<{ city: string; events: number; places: number }[]> {
  const cached = await getFromCache<{ city: string; events: number; places: number }[]>('trip_cities');
  if (cached) return cached;
  const key = normalizedColumn(events.city);
  const placeKey = normalizedColumn(places.city);
  const [ev, pl] = await Promise.all([
    db.select({ key: sql<string>`${key}`, city: sql<string>`min(${events.city})`, n: sql<number>`count(*)::int` })
      .from(events).where(upcomingCondition()).groupBy(sql`1`), // by the first column (the normalised city)
    db.select({ key: sql<string>`${placeKey}`, city: sql<string>`min(${places.city})`, n: sql<number>`count(*)::int` })
      .from(places).where(eq(places.status, 'PUBLISHED')).groupBy(sql`1`),
  ]);
  const byKey = new Map<string, { city: string; events: number; places: number }>();
  // Shown with Persian letters whatever spelling the rows use (ي/ك -> ی/ک).
  const display = (c: string) => c.trim().replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9');
  for (const r of ev) if (r.key) byKey.set(r.key, { city: display(r.city), events: r.n, places: 0 });
  for (const r of pl) {
    if (!r.key) continue;
    const row = byKey.get(r.key);
    if (row) row.places = r.n; else byKey.set(r.key, { city: display(r.city), events: 0, places: r.n });
  }
  const list = [...byKey.values()]
    .filter(c => c.city && c.events + c.places > 0)
    .sort((a, b) => (b.events + b.places) - (a.events + a.places) || b.events - a.events || a.city.localeCompare(b.city, 'fa'));
  await setToCache('trip_cities', list, 60_000); // also cleared whenever events or places change
  return list;
}

export function registerPlannerRoutes(app: Express) {
  // Destinations worth suggesting in the trip planner (only cities with events or places).
  app.get('/api/trip-cities', asyncRoute(async (_req, res) => {
    res.json({ data: (await citiesWithContent()).slice(0, 20) });
  }));

  // Destination + dates -> the events in that city during the trip.
  app.post('/api/trip-planner', limiters.tripPlanner, asyncRoute(async (req, res) => {
    const city = String(req.body?.city || '').trim().slice(0, 50);
    if (!city) return res.status(400).json({ error: 'شهر مقصد را انتخاب کنید.' });
    const from = tehranDay(req.body?.startDate) || startOfTehranDay();
    const lastDay = tehranDay(req.body?.endDate) || from;
    if (lastDay < from) return res.status(400).json({ error: 'تاریخ پایان سفر قبل از تاریخ شروع است.' });
    if (lastDay.getTime() - from.getTime() > MAX_TRIP_DAYS * 86400_000) return res.status(400).json({ error: `بازه سفر حداکثر ${MAX_TRIP_DAYS} روز است.` });
    const to = startOfTehranDay(addDays(lastDay, 1.5));

    // A failure here should not break the page: the visitor sees an empty trip ("nothing for now")
    // and the error is recorded for the admin (System and monitoring > errors).
    let found: any[] = [];
    try {
      const { items } = await queryEvents({ city, from, to, limit: 200, offset: 0 });
      found = await formatEvents(items);
    } catch (err) {
      captureError(err, { source: 'server', path: req.path }).catch(() => {});
      console.error('trip planner failed:', err);
    }
    res.json({
      data: {
        city,
        startDate: from.toISOString(),
        endDate: lastDay.toISOString(),
        events: found,
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
    // A typo in the keywords ("کنسرتت"): try the closest real words before giving up on them.
    let correctedQuery: string | null = null;
    if (!items.length && parsed.keywords.length) {
      const fixed = await correctQuery(parsed.keywords.join(' '));
      if (fixed) {
        const retry = (await queryEvents({ ...base, q: fixed })).items;
        if (retry.length) { items = retry; correctedQuery = fixed; }
      }
    }
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
        correctedQuery,
      },
    });
  }));
}
