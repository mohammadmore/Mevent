import { db } from './index.ts';
import { events, interactions, places } from './schema.ts';
import { eq, gte, lte, and, sql, or, isNull, isNotNull, gt, ne, inArray, type SQL } from 'drizzle-orm';
import { startOfTehranDay } from '../lib/time.ts';

// ------------------------------------------------------------------
// Persian-aware text matching done in SQL, so search runs over all rows,
// not only the ones the client happened to load.
// ------------------------------------------------------------------
export function normalizeSearchText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9').replace(/[\u0623\u0625\u0622]/g, '\u0627').replace(/\u0626/g, '\u06CC')
    .replace(/[\u064B-\u065F\u200c]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// Arabic yeh/kaf/alef variants -> Persian forms; diacritics and ZWNJ are dropped (same as normalizeSearchText).
const TRANSLATE_FROM = '\u064A\u0643\u0623\u0625\u0622\u0626';
const TRANSLATE_TO = '\u06CC\u06A9\u0627\u0627\u0627\u06CC';
const STRIP_PATTERN = '[\u064B-\u065F\u200c]';

export function normalizedColumn(column: SQL | any): SQL {
  return sql`regexp_replace(translate(lower(coalesce(${column}::text, '')), ${TRANSLATE_FROM}, ${TRANSLATE_TO}), ${STRIP_PATTERN}, '', 'g')`;
}

// Drizzle expands JS arrays into a parameter list, so build a typed ARRAY[...] explicitly.
function textArray(values: string[]): SQL {
  return sql`ARRAY[${sql.join(values.map(v => sql`${v}`), sql`, `)}]::text[]`;
}

function likePattern(term: string) {
  return '%' + term.replace(/[\\%_]/g, m => '\\' + m) + '%';
}

/** Every word of the query must appear in one of the given columns. */
export function textSearchCondition(q: string | undefined, columns: any[]): SQL | undefined {
  const terms = normalizeSearchText(q).split(' ').filter(Boolean).slice(0, 6);
  if (terms.length === 0) return undefined;
  return and(...terms.map(term => or(...columns.map(c => sql`${normalizedColumn(c)} LIKE ${likePattern(term)}`))));
}

// Published events that have not finished yet (or have no fixed date).
export function upcomingCondition() {
  const now = new Date();
  return and(
    eq(events.status, 'PUBLISHED'),
    or(
      isNull(events.startTime),
      gte(events.endTime, now),
      and(isNull(events.endTime), gte(events.startTime, startOfTehranDay(now)))
    )
  )!;
}

function tagCondition(tag?: string): SQL | undefined {
  if (!tag) return undefined;
  const bare = tag.replace(/^#/, '');
  return sql`(${events.tags} @> ${JSON.stringify([bare])}::jsonb OR ${events.tags} @> ${JSON.stringify(['#' + bare])}::jsonb)`;
}

export function distanceSql(lat: number, lng: number, latCol: any = events.lat, lngCol: any = events.lng) {
  return sql<number>`(6371 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(${latCol} - ${lat}) / 2), 2) +
    COS(RADIANS(${lat})) * COS(RADIANS(${latCol})) * POWER(SIN(RADIANS(${lngCol} - ${lng}) / 2), 2)
  )))`;
}

export interface EventQuery {
  q?: string;
  city?: string;
  tag?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  /** Events overlapping [from, to); undated "flexible" events are kept and listed last. */
  from?: Date;
  to?: Date;
  price?: 'all' | 'free' | 'paid';
  preferences?: string[];
  hubId?: number;
  limit: number;
  offset: number;
}

/** One query for discovery, search, nearby and hub listings, with paging. */
export async function queryEvents(opts: EventQuery) {
  const hasLocation = opts.lat !== undefined && opts.lng !== undefined && !isNaN(opts.lat) && !isNaN(opts.lng);
  const distance = hasLocation ? distanceSql(opts.lat!, opts.lng!) : null;

  const conditions: (SQL | undefined)[] = [
    upcomingCondition(),
    tagCondition(opts.tag),
    textSearchCondition(opts.q, [events.title, events.description, events.tags, events.address]),
  ];
  if (opts.city) conditions.push(sql`${normalizedColumn(events.city)} = ${normalizeSearchText(opts.city)}`);
  if (opts.price === 'free') conditions.push(eq(events.cost, 0));
  if (opts.price === 'paid') conditions.push(gt(events.cost, 0));
  if (opts.hubId) {
    conditions.push(or(eq(events.hubId, opts.hubId), sql`${events.hubIds} @> ${JSON.stringify([opts.hubId])}::jsonb`));
  }
  if (opts.from && opts.to) {
    conditions.push(or(
      and(isNull(events.startTime), isNotNull(events.fuzzyTime)),
      and(lte(events.startTime, opts.to), gte(sql`coalesce(${events.endTime}, ${events.startTime})`, opts.from))
    ));
  }
  if (distance && opts.radiusKm) {
    // Events without coordinates stay visible (they cannot be ruled out), but sort last.
    conditions.push(sql`(${events.lat} IS NULL OR ${events.lng} IS NULL OR ${distance} <= ${opts.radiusKm})`);
  }

  const prefs = (opts.preferences || []).filter(p => typeof p === 'string').slice(0, 30);
  const orderBy: SQL[] = [];
  if (prefs.length) {
    // Events matching more of the user's interests come first.
    orderBy.push(sql`(SELECT count(*) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(${events.tags}) = 'array' THEN ${events.tags} ELSE '[]'::jsonb END) AS t(tag) WHERE t.tag = ANY(${textArray(prefs)})) DESC`);
  }
  if (distance) orderBy.push(sql`CASE WHEN ${events.lat} IS NOT NULL AND ${events.lng} IS NOT NULL THEN ${distance} ELSE 999999 END`);
  orderBy.push(sql`${events.startTime} ASC NULLS LAST`, sql`${events.id} DESC`);

  const rows = await db
    .select({ event: events, distance: distance ?? sql<number | null>`NULL::float` })
    .from(events)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(opts.limit + 1)
    .offset(opts.offset);

  return {
    items: rows.slice(0, opts.limit).map(r => ({ ...r.event, distance: r.distance === null ? null : Number(r.distance) })),
    hasMore: rows.length > opts.limit,
  };
}

export async function getSimilarEvents(eventId: number, limit = 4) {
  const [current] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!current) return [];
  const tags = Array.isArray(current.tags) ? (current.tags as string[]) : [];
  const tagOverlap = tags.length
    ? sql<number>`(SELECT count(*) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(${events.tags}) = 'array' THEN ${events.tags} ELSE '[]'::jsonb END) AS t(tag) WHERE t.tag = ANY(${textArray(tags)}))`
    : sql<number>`0`;
  const score = sql<number>`(${tagOverlap} * 2
    + CASE WHEN ${events.organizerId} = ${current.organizerId} THEN 3 ELSE 0 END
    + CASE WHEN ${current.hubId}::int IS NOT NULL AND ${events.hubId} = ${current.hubId}::int THEN 2 ELSE 0 END)`;
  return db.select().from(events)
    .where(and(upcomingCondition(), ne(events.id, eventId), eq(events.city, current.city)))
    .orderBy(sql`${score} DESC`, sql`${events.startTime} ASC NULLS LAST`)
    .limit(limit);
}

/** Published places near a point (or in the same city when the point is unknown). */
export async function getPlacesNear(opts: { city?: string; lat?: number | null; lng?: number | null; radiusKm: number; excludeId?: number; limit: number }) {
  const hasPoint = opts.lat != null && opts.lng != null;
  const distance = hasPoint ? distanceSql(opts.lat!, opts.lng!, places.lat, places.lng) : null;
  const conditions: (SQL | undefined)[] = [eq(places.status, 'PUBLISHED')];
  if (opts.city) conditions.push(eq(places.city, opts.city));
  if (opts.excludeId) conditions.push(ne(places.id, opts.excludeId));
  if (distance) conditions.push(isNotNull(places.lat), isNotNull(places.lng), sql`${distance} <= ${opts.radiusKm}`);
  const rows = await db.select({ place: places, distance: distance ?? sql<number | null>`NULL::float` })
    .from(places).where(and(...conditions))
    .orderBy(distance ? sql`${distance} ASC` : sql`${places.id} DESC`)
    .limit(opts.limit);
  return rows.map(r => ({ ...r.place, distance: r.distance === null ? null : Number(r.distance) }));
}

/** Upcoming events at a place first, then the closest ones around it. */
export async function getEventsNearPlace(place: { id: number; lat: number | null; lng: number | null }, radiusKm: number, limit: number) {
  const hasPoint = place.lat != null && place.lng != null;
  const distance = hasPoint ? distanceSql(place.lat!, place.lng!) : null;
  const atPlace = eq(events.placeId, place.id);
  const near = distance ? and(isNotNull(events.lat), isNotNull(events.lng), sql`${distance} <= ${radiusKm}`) : undefined;
  const rows = await db.select({ event: events, distance: distance ?? sql<number | null>`NULL::float` })
    .from(events)
    .where(and(upcomingCondition(), near ? or(atPlace, near) : atPlace))
    .orderBy(sql`CASE WHEN ${events.placeId} = ${place.id} THEN 0 ELSE 1 END`, distance ? sql`${distance} ASC` : sql`${events.startTime} ASC NULLS LAST`)
    .limit(limit);
  return rows.map(r => ({ ...r.event, distance: r.distance === null ? null : Number(r.distance) }));
}

export async function searchPlaces(opts: { q?: string; city?: string; limit: number; offset: number }) {
  const conditions: (SQL | undefined)[] = [
    eq(places.status, 'PUBLISHED'),
    textSearchCondition(opts.q, [places.name, places.description, places.address, places.type, places.amenities]),
  ];
  if (opts.city) conditions.push(sql`${normalizedColumn(places.city)} = ${normalizeSearchText(opts.city)}`);
  const rows = await db.select().from(places).where(and(...conditions)).orderBy(sql`${places.id} DESC`).limit(opts.limit + 1).offset(opts.offset);
  return { items: rows.slice(0, opts.limit), hasMore: rows.length > opts.limit };
}

export async function getSavedEvents(userId: number) {
  return getInteractedEvents(userId, 'SAVE');
}

export async function getRsvpEvents(userId: number) {
  return getInteractedEvents(userId, 'RSVP');
}

async function getInteractedEvents(userId: number, type: string) {
  const result = await db.select({ event: events })
    .from(interactions)
    .innerJoin(events, eq(interactions.eventId, events.id))
    .where(and(eq(interactions.userId, userId), eq(interactions.type, type)));
  const uniqueEvents = new Map<number, typeof events.$inferSelect>();
  result.forEach(r => uniqueEvents.set(r.event.id, r.event));
  return Array.from(uniqueEvents.values());
}

export async function createEvent(data: typeof events.$inferInsert) {
  const result = await db.insert(events).values(data).returning();
  return result[0];
}

export async function getOrganizerEvents(organizerId: number, publishedOnly = false) {
  const condition = publishedOnly
    ? and(eq(events.organizerId, organizerId), eq(events.status, 'PUBLISHED'))
    : eq(events.organizerId, organizerId);
  return await db.select().from(events).where(condition);
}

export async function getEventsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db.select().from(events).where(inArray(events.id, ids));
}
