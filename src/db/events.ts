import { db } from './index.ts';
import { events, interactions } from './schema.ts';
import { eq, gte, and, sql, or, isNull, type SQL } from 'drizzle-orm';

// Published events that have not finished yet (or have no fixed date).
function upcomingCondition() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return and(
    eq(events.status, 'PUBLISHED'),
    or(
      isNull(events.startTime),
      gte(events.endTime, now),
      and(isNull(events.endTime), gte(events.startTime, startOfToday))
    )
  )!;
}

function tagCondition(tag?: string): SQL | undefined {
  if (!tag) return undefined;
  const bare = tag.replace(/^#/, '');
  return sql`(${events.tags} @> ${JSON.stringify([bare])}::jsonb OR ${events.tags} @> ${JSON.stringify(['#' + bare])}::jsonb)`;
}

export async function getNearbyEvents(userLat?: number, userLng?: number, radiusKm: number = 10, tag?: string) {
  const baseCondition = and(upcomingCondition(), tagCondition(tag));

  if (userLat === undefined || userLng === undefined || isNaN(userLat) || isNaN(userLng)) {
    return await db.select().from(events).where(baseCondition).limit(100);
  }

  const distanceSql = sql<number>`(
    6371 * 2 * ASIN(
      SQRT(
        POWER(SIN(RADIANS(${events.lat} - ${userLat}) / 2), 2) +
        COS(RADIANS(${userLat})) * COS(RADIANS(${events.lat})) *
        POWER(SIN(RADIANS(${events.lng} - ${userLng}) / 2), 2)
      )
    )
  )`;

  return await db
    .select({
      id: events.id,
      title: events.title,
      city: events.city,
      description: events.description,
      startTime: events.startTime,
      endTime: events.endTime,
      fuzzyTime: events.fuzzyTime,
      website: events.website,
      instagram: events.instagram,
      telegram: events.telegram,
      twitter: events.twitter,
      currency: events.currency,
      address: events.address,
      lat: events.lat,
      lng: events.lng,
      cost: events.cost,
      capacity: events.capacity,
      tags: events.tags,
      hubId: events.hubId,
      organizerId: events.organizerId,
      source: events.source,
      status: events.status,
      imageUrl: events.imageUrl,
      ticketUrl: events.ticketUrl,
      bgIcon: events.bgIcon,
      createdAt: events.createdAt,
      distance: distanceSql,
    })
    .from(events)
    .where(
      and(
        baseCondition,
        sql`(${events.lat} IS NULL OR ${events.lng} IS NULL OR ${distanceSql} <= ${radiusKm})`
      )
    )
    .orderBy(sql`CASE WHEN ${events.lat} IS NOT NULL AND ${events.lng} IS NOT NULL THEN ${distanceSql} ELSE 999999 END`).limit(100);
}

export async function getRecommendedEvents(lat?: number, lng?: number) {
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    const distanceSql = sql<number>`(
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(${events.lat} - ${lat}) / 2), 2) +
          COS(RADIANS(${lat})) * COS(RADIANS(${events.lat})) *
          POWER(SIN(RADIANS(${events.lng} - ${lng}) / 2), 2)
        )
      )
    )`;

    return await db
      .select({
        id: events.id,
        title: events.title,
      city: events.city,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
      fuzzyTime: events.fuzzyTime,
      website: events.website,
      instagram: events.instagram,
      telegram: events.telegram,
      twitter: events.twitter,
      currency: events.currency,
        address: events.address,
        lat: events.lat,
        lng: events.lng,
        cost: events.cost,
        capacity: events.capacity,
        tags: events.tags,
        hubId: events.hubId,
        organizerId: events.organizerId,
        source: events.source,
        status: events.status,
        imageUrl: events.imageUrl,
        ticketUrl: events.ticketUrl,
      bgIcon: events.bgIcon,
        createdAt: events.createdAt,
        distance: distanceSql,
      })
      .from(events)
      .where(upcomingCondition())
      .orderBy(sql`CASE WHEN ${events.lat} IS NOT NULL AND ${events.lng} IS NOT NULL THEN ${distanceSql} ELSE 999999 END`).limit(100);
  }

  return await db.select().from(events).where(upcomingCondition()).limit(100);
}

export async function getSavedEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'SAVE')));

  const uniqueEvents = new Map();
  result.forEach(r => {
    uniqueEvents.set(r.event.id, r.event);
  });
  return Array.from(uniqueEvents.values());
}

export async function getRsvpEvents(userId: number) {
  const result = await db.select({
    event: events
  })
  .from(interactions)
  .innerJoin(events, eq(interactions.eventId, events.id))
  .where(and(eq(interactions.userId, userId), eq(interactions.type, 'RSVP')));

  const uniqueEvents = new Map();
  result.forEach(r => {
    uniqueEvents.set(r.event.id, r.event);
  });
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
