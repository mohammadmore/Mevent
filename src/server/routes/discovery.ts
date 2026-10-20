import { Express } from 'express';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users, events, interactions, tickets, places, vibes, chains, flows } from '../../db/schema.ts';
import {
  queryEvents, getSimilarEvents, getPlacesNear, getEventsNearPlace, searchPlaces, getOrganizerEvents, upcomingCondition
} from '../../db/events.ts';
import { AuthRequest, requireAuth, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, parsePaging } from '../infra.ts';
import {
  PUBLIC_USER_FIELDS, parseJsonArray, normalizePlace, normalizeTaggedItem, normalizeVibe, normalizeFlow, formatEvents, toNumberOrNull
} from '../helpers.ts';
import { getFromCache, setToCache } from '../../lib/sharedStore.ts';
import { seatsTaken } from '../seats.ts';

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

/** Builds the discovery query from the request; personalisation uses the caller's own preferences. */
function eventQueryFromRequest(req: AuthRequest) {
  const q = req.query as Record<string, string | undefined>;
  const { limit, offset } = parsePaging(q, 20, 50);
  const radius = toNumberOrNull(q.radius);
  const personalize = q.personalize !== '0';
  return {
    q: q.q?.slice(0, 100),
    city: q.city?.slice(0, 50) || undefined,
    tag: q.tag?.slice(0, 50) || undefined,
    lat: q.lat ? parseFloat(q.lat) : undefined,
    lng: q.lng ? parseFloat(q.lng) : undefined,
    radiusKm: radius && radius > 0 ? Math.min(radius, 500) : undefined,
    from: parseDate(q.from),
    to: parseDate(q.to),
    price: (['free', 'paid'].includes(q.price || '') ? q.price : 'all') as 'all' | 'free' | 'paid',
    hubId: q.hubId ? parseInt(q.hubId, 10) || undefined : undefined,
    preferences: personalize && req.dbUser ? parseJsonArray(req.dbUser.preferences).map(String) : [],
    limit,
    offset,
  };
}

async function listEvents(req: AuthRequest, res: any) {
  const query = eventQueryFromRequest(req);
  // Anonymous, non-personalised listings are identical for everyone and safe to share via the cache.
  const cacheKey = query.preferences.length === 0 ? `events_list:${JSON.stringify(query)}` : null;
  if (cacheKey) {
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
  }
  const { items, hasMore } = await queryEvents(query);
  const body = { data: await formatEvents(items), hasMore, nextOffset: hasMore ? query.offset + query.limit : null };
  if (cacheKey) await setToCache(cacheKey, body, 15000);
  res.json(body);
}

export function registerDiscoveryRoutes(app: Express) {
  // Discovery, nearby and filtered listings share one paged endpoint.
  app.get('/api/events', asyncRoute(listEvents));
  app.get('/api/events/recommendations', asyncRoute(listEvents));
  app.get('/api/events/nearby', asyncRoute(listEvents));

  // Search across events and places, using Persian-normalised matching in the database.
  app.get('/api/search', asyncRoute(async (req: AuthRequest, res) => {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const type = ['events', 'places'].includes(String(req.query.type)) ? String(req.query.type) : 'all';
    const { limit, offset } = parsePaging(req.query, 20, 50);
    const city = typeof req.query.city === 'string' && req.query.city ? req.query.city : undefined;
    if (!q) return res.json({ events: [], places: [], hasMoreEvents: false, hasMorePlaces: false });

    const [eventResult, placeResult] = await Promise.all([
      type !== 'places' ? queryEvents({ ...eventQueryFromRequest(req), q, limit, offset }) : Promise.resolve({ items: [], hasMore: false }),
      type !== 'events' ? searchPlaces({ q, city, limit, offset }) : Promise.resolve({ items: [], hasMore: false }),
    ]);
    res.json({
      events: await formatEvents(eventResult.items),
      places: placeResult.items.map(normalizePlace),
      hasMoreEvents: eventResult.hasMore,
      hasMorePlaces: placeResult.hasMore,
    });
  }));

  // A single event (deep links / shared links). Drafts are only visible to the organizer and admins.
  app.get('/api/events/:id', asyncRoute(async (req: AuthRequest, res) => {
    const eventId = parseInt(req.params.id, 10);
    if (!Number.isInteger(eventId)) return res.status(404).json({ error: 'رویداد مورد نظر یافت نشد.' });
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    const canSeeHidden = event && (req.dbUser?.id === event.organizerId || isAdmin(req));
    if (!event || (event.status !== 'PUBLISHED' && !canSeeHidden)) {
      return res.status(404).json({ error: 'رویداد مورد نظر یافت نشد.' });
    }
    const [formatted] = await formatEvents([event]);
    const taken = await seatsTaken(db, event);
    res.json({ data: { ...formatted, seatsTaken: taken, seatsLeft: Math.max(0, event.capacity - taken) } });
  }));

  app.get('/api/events/:id/similar', asyncRoute(async (req, res) => {
    const similar = await getSimilarEvents(parseInt(req.params.id, 10), 4);
    res.json({ data: await formatEvents(similar) });
  }));

  app.get('/api/events/:id/nearby-places', asyncRoute(async (req, res) => {
    const eventId = parseInt(req.params.id, 10);
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return res.json({ data: [] });
    // Without event coordinates we can only offer same-city places; distance is then unknown.
    const nearby = await getPlacesNear({ city: event.city, lat: event.lat, lng: event.lng, radiusKm: 10, limit: 6 });
    res.json({ data: nearby.map(normalizePlace) });
  }));

  app.get('/api/places', asyncRoute(async (req, res) => {
    const city = typeof req.query.city === 'string' && req.query.city ? req.query.city : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const { limit, offset } = parsePaging(req.query, 200, 500);
    const { items } = await searchPlaces({ q, city, limit, offset });
    res.json(items.map(normalizePlace));
  }));

  app.get('/api/places/:id/nearby-places', asyncRoute(async (req, res) => {
    const placeId = parseInt(req.params.id, 10);
    const [place] = await db.select().from(places).where(eq(places.id, placeId));
    if (!place) return res.json([]);
    const nearby = place.lat != null && place.lng != null
      ? await getPlacesNear({ lat: place.lat, lng: place.lng, radiusKm: 50, excludeId: placeId, limit: 5 })
      : await getPlacesNear({ city: place.city, radiusKm: 50, excludeId: placeId, limit: 5 });
    res.json(nearby.map(p => ({ ...normalizePlace(p), _dist: p.distance })));
  }));

  app.get('/api/places/:id/nearby-events', asyncRoute(async (req, res) => {
    const placeId = parseInt(req.params.id, 10);
    const [place] = await db.select().from(places).where(eq(places.id, placeId));
    if (!place) return res.json([]);
    const nearby = await getEventsNearPlace(place, 50, 5);
    res.json((await formatEvents(nearby)).map(e => ({ ...e, _dist: e.distance })));
  }));

  app.get('/api/places/:id', asyncRoute(async (req: AuthRequest, res) => {
    const placeId = parseInt(req.params.id, 10);
    const [place] = await db.select().from(places).where(eq(places.id, placeId));
    if (!place || (place.status !== 'PUBLISHED' && !isAdmin(req))) return res.status(404).json({ error: 'Place not found' });
    res.json(normalizePlace(place));
  }));

  app.get('/api/vibes', asyncRoute(async (req, res) => {
    const city = typeof req.query.city === 'string' && req.query.city ? req.query.city : undefined;
    const rows = await db.select().from(vibes).where(and(eq(vibes.status, 'PUBLISHED'), city ? eq(vibes.city, city) : undefined));
    res.json(rows.map(normalizeVibe));
  }));

  app.get('/api/vibes/:id', asyncRoute(async (req: AuthRequest, res) => {
    const [vibe] = await db.select().from(vibes).where(eq(vibes.id, parseInt(req.params.id, 10)));
    if (!vibe || (vibe.status !== 'PUBLISHED' && !isAdmin(req))) return res.status(404).json({ error: 'Vibe not found' });
    res.json(normalizeVibe(vibe));
  }));

  app.get('/api/chains', asyncRoute(async (req, res) => {
    const city = typeof req.query.city === 'string' && req.query.city ? req.query.city : undefined;
    const rows = await db.select().from(chains).where(and(eq(chains.status, 'PUBLISHED'), city ? eq(chains.city, city) : undefined));
    res.json(rows.map(normalizeTaggedItem));
  }));

  app.get('/api/chains/:id', asyncRoute(async (req: AuthRequest, res) => {
    const [chain] = await db.select().from(chains).where(eq(chains.id, parseInt(req.params.id, 10)));
    if (!chain || (chain.status !== 'PUBLISHED' && !isAdmin(req) && req.dbUser?.id !== chain.organizerId)) {
      return res.status(404).json({ error: 'Chain not found' });
    }
    const chainEvents = await db.select().from(events).where(and(eq(events.chainId, chain.id), eq(events.status, 'PUBLISHED')));
    res.json({ ...normalizeTaggedItem(chain), events: await formatEvents(chainEvents) });
  }));

  app.get('/api/flows', asyncRoute(async (req, res) => {
    const city = typeof req.query.city === 'string' && req.query.city ? req.query.city : undefined;
    const rows = await db.select().from(flows).where(and(eq(flows.status, 'PUBLISHED'), city ? eq(flows.city, city) : undefined));
    res.json(rows.map(normalizeFlow));
  }));

  app.get('/api/flows/:id', asyncRoute(async (req: AuthRequest, res) => {
    const [flow] = await db.select().from(flows).where(eq(flows.id, parseInt(req.params.id, 10)));
    if (!flow || (flow.status !== 'PUBLISHED' && !isAdmin(req))) return res.status(404).json({ error: 'Flow not found' });
    res.json(normalizeFlow(flow));
  }));

  app.get('/api/organizers', asyncRoute(async (req, res) => {
    res.json({ data: await db.select(PUBLIC_USER_FIELDS).from(users).where(eq(users.role, 'ORGANIZER')) });
  }));

  app.get('/api/organizer/events', asyncRoute(async (req: AuthRequest, res) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
    if (!userId) return res.status(400).json({ error: 'شناسه برگزارکننده الزامی است' });
    // Drafts and pending items are visible to the organizer and admins only.
    const canSeeDrafts = req.dbUser?.id === userId || isAdmin(req);
    res.json({ data: await formatEvents(await getOrganizerEvents(userId, !canSeeDrafts)) });
  }));

  app.get('/api/organizer/events/:id/stats', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const eventId = parseInt(req.params.id, 10);
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return res.status(404).json({ error: 'رویداد مورد نظر یافت نشد.' });
    if (event.organizerId !== req.dbUser!.id && !isAdmin(req)) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای این کار را ندارید.' });
    }
    const counts = await db.select({ type: interactions.type, count: sql<number>`count(*)::int` })
      .from(interactions).where(eq(interactions.eventId, eventId)).groupBy(interactions.type);
    const countOf = (t: string) => Number(counts.find(c => c.type === t)?.count || 0);
    const ticketRows = await db.select({ status: tickets.status, count: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${tickets.amount}), 0)::int` })
      .from(tickets).where(eq(tickets.eventId, eventId)).groupBy(tickets.status);
    const issued = ticketRows.filter(r => r.status === 'ACTIVE' || r.status === 'USED');
    res.json({
      data: {
        ticketsSold: issued.reduce((s, r) => s + Number(r.count), 0),
        checkedIn: Number(ticketRows.find(r => r.status === 'USED')?.count || 0),
        cancelled: Number(ticketRows.find(r => r.status === 'CANCELLED')?.count || 0),
        revenue: issued.reduce((s, r) => s + Number(r.revenue), 0),
        views: countOf('VIEW'),
        saves: countOf('SAVE'),
        rsvps: countOf('RSVP'),
        shares: countOf('SHARE'),
        capacity: event.capacity,
        seatsLeft: Math.max(0, event.capacity - await seatsTaken(db, event)),
      }
    });
  }));
}
