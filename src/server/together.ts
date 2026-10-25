import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { friendships, interactions, tickets, userBlocks, users } from '../db/schema.ts';

// Friends, blocks and attendance shared by the "don't go alone" routes and the "for you" feed.

export async function friendIds(userId: number): Promise<number[]> {
  const rows = await db.select({ a: friendships.requesterId, b: friendships.addresseeId }).from(friendships)
    .where(and(eq(friendships.status, 'ACCEPTED'), or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))));
  return rows.map(r => (r.a === userId ? r.b : r.a));
}

export async function friendshipBetween(a: number, b: number) {
  const [row] = await db.select().from(friendships).where(or(
    and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
    and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
  ));
  return row || null;
}

/** People this user blocked or was blocked by: they never see each other in these features. */
export async function blockedWith(userId: number): Promise<Set<number>> {
  const rows = await db.select().from(userBlocks).where(or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId)));
  return new Set(rows.map(r => (r.blockerId === userId ? r.blockedId : r.blockerId)));
}

export async function isBlocked(a: number, b: number) {
  return (await blockedWith(a)).has(b);
}

/**
 * Which of `people` are going to (RSVP or ticket) or saved each of `eventIds`, for people who let
 * friends see their plans. Map: eventId -> { going, saved } user ids.
 */
export async function plansOf(people: number[], eventIds: number[]) {
  const result = new Map<number, { going: Set<number>; saved: Set<number> }>();
  if (!people.length || !eventIds.length) return result;
  const sharing = (await db.select({ id: users.id }).from(users).where(and(inArray(users.id, people), eq(users.shareAttendance, true)))).map(r => r.id);
  if (!sharing.length) return result;
  const entry = (id: number) => {
    if (!result.has(id)) result.set(id, { going: new Set(), saved: new Set() });
    return result.get(id)!;
  };
  const acts = await db.select({ eventId: interactions.eventId, userId: interactions.userId, type: interactions.type }).from(interactions)
    .where(and(inArray(interactions.userId, sharing), inArray(interactions.eventId, eventIds), inArray(interactions.type, ['RSVP', 'SAVE'])));
  for (const a of acts) entry(a.eventId)[a.type === 'RSVP' ? 'going' : 'saved'].add(a.userId);
  const owned = await db.selectDistinct({ eventId: tickets.eventId, userId: tickets.userId }).from(tickets)
    .where(and(inArray(tickets.userId, sharing), inArray(tickets.eventId, eventIds), inArray(tickets.status, ['ACTIVE', 'USED'])));
  for (const t of owned) entry(t.eventId).going.add(t.userId);
  for (const e of result.values()) for (const id of e.going) e.saved.delete(id);
  return result;
}

export async function namesOf(ids: number[]) {
  if (!ids.length) return new Map<number, string>();
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids));
  return new Map(rows.map(r => [r.id, r.name]));
}

/** "سارا", "سارا و علی", "سارا و ۲ دوست دیگه". */
export function namesPhrase(names: string[]) {
  const first = (n: string) => n.trim().split(/\s+/)[0] || n;
  if (names.length === 0) return '';
  if (names.length === 1) return `«${first(names[0])}»`;
  if (names.length === 2) return `«${first(names[0])}» و «${first(names[1])}»`;
  return `«${first(names[0])}» و ${(names.length - 1).toLocaleString('fa-IR')} دوست دیگه`;
}

/** Number of friends two people have in common. */
export async function mutualFriendCounts(userId: number, others: number[]) {
  const map = new Map<number, number>();
  if (!others.length) return map;
  const mine = new Set(await friendIds(userId));
  if (!mine.size) return map;
  const rows = await db.select({ a: friendships.requesterId, b: friendships.addresseeId }).from(friendships)
    .where(and(eq(friendships.status, 'ACCEPTED'), or(inArray(friendships.requesterId, others), inArray(friendships.addresseeId, others))));
  for (const r of rows) {
    for (const [person, friend] of [[r.a, r.b], [r.b, r.a]]) {
      if (others.includes(person) && mine.has(friend)) map.set(person, (map.get(person) || 0) + 1);
    }
  }
  return map;
}

export const countSql = sql<number>`count(*)::int`;
