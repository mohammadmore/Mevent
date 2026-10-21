import { and, asc, eq, inArray, lt, sql } from 'drizzle-orm';
import { db, DbTransaction } from '../db/index.ts';
import { events, waitlistEntries } from '../db/schema.ts';
import { seatsTaken } from './seats.ts';
import { notify } from '../lib/notifications.ts';

// Waiting list: when seats free up, the next people in line (first come, first served) get an
// offer and the seats are held for them for WAITLIST_HOLD_MINUTES. Offers that run out pass on.

export const WAITLIST_HOLD_MINUTES = 30;

/**
 * Re-evaluates one event: expires stale offers, closes the list when the event is over or
 * cancelled, and makes new offers for any free seats. Safe to call any time, from any instance:
 * the event row is locked like a checkout does.
 */
export async function processWaitlist(eventId: number) {
  const offers: { userId: number; quantity: number }[] = [];
  let title = '';
  await db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for('update');
    if (!event) return;
    title = event.title;
    await tx.update(waitlistEntries).set({ status: 'EXPIRED' })
      .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.status, 'OFFERED'), lt(waitlistEntries.offerExpiresAt, new Date())));

    const started = event.startTime && event.startTime.getTime() < Date.now();
    if (event.status !== 'PUBLISHED' || started || event.ticketUrl) {
      await tx.update(waitlistEntries).set({ status: event.status === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED' })
        .where(and(eq(waitlistEntries.eventId, eventId), inArray(waitlistEntries.status, ['WAITING', 'OFFERED'])));
      return;
    }

    let free = event.capacity - await seatsTaken(tx, event);
    if (free <= 0) return;
    const waiting = await tx.select().from(waitlistEntries)
      .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.status, 'WAITING')))
      .orderBy(asc(waitlistEntries.id)).limit(50);
    const expires = new Date(Date.now() + WAITLIST_HOLD_MINUTES * 60_000);
    for (const entry of waiting) {
      if (entry.quantity > free) break; // strictly first come, first served
      await tx.update(waitlistEntries).set({ status: 'OFFERED', offeredAt: new Date(), offerExpiresAt: expires }).where(eq(waitlistEntries.id, entry.id));
      offers.push({ userId: entry.userId, quantity: entry.quantity });
      free -= entry.quantity;
    }
  });
  for (const o of offers) {
    await notify(o.userId, {
      type: 'WAITLIST',
      title: `جا برای «${title}» آزاد شد`,
      body: `${o.quantity > 1 ? 'دو جا' : 'یک جا'} تا ${WAITLIST_HOLD_MINUTES.toLocaleString('fa-IR')} دقیقه برایتان نگه داشته شده است؛ همین حالا ثبت‌نام کنید.`,
      url: `/events/${eventId}`,
      dedupeKey: `waitlist-offer:${eventId}:${o.userId}:${Math.floor(Date.now() / 60_000)}`,
      sms: { kind: 'WAITLIST', params: { title, minutes: String(WAITLIST_HOLD_MINUTES) } },
    }).catch(() => {});
  }
}

/** Fire-and-forget version for request handlers (after their transaction committed). */
export function nudgeWaitlist(eventId: number) {
  processWaitlist(eventId).catch(err => console.warn('waitlist processing failed:', err?.message));
}

/** Background job: events with people waiting or offers that ran out. */
export async function processAllWaitlists() {
  const rows: any = await db.execute(sql`
    SELECT DISTINCT event_id FROM waitlist_entries
    WHERE status = 'WAITING' OR (status = 'OFFERED' AND offer_expires_at < now())
    LIMIT 200
  `);
  for (const r of rows.rows || []) await processWaitlist(Number(r.event_id));
}

/** The user got their seat (bought or RSVPed): their waiting-list entry is done. */
export async function convertWaitlist(tx: DbTransaction, eventId: number, userId: number) {
  await tx.update(waitlistEntries).set({ status: 'CONVERTED' })
    .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.userId, userId), inArray(waitlistEntries.status, ['WAITING', 'OFFERED'])));
}

export async function waitlistStatus(eventId: number, userId: number) {
  const [entry] = await db.select().from(waitlistEntries)
    .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.userId, userId), inArray(waitlistEntries.status, ['WAITING', 'OFFERED'])));
  if (!entry) return null;
  if (entry.status === 'OFFERED' && entry.offerExpiresAt && entry.offerExpiresAt.getTime() < Date.now()) return null;
  const [{ ahead }] = await db.select({ ahead: sql<number>`count(*)::int` }).from(waitlistEntries)
    .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.status, 'WAITING'), lt(waitlistEntries.id, entry.id)));
  return { status: entry.status, quantity: entry.quantity, position: entry.status === 'WAITING' ? Number(ahead) + 1 : 0, offerExpiresAt: entry.offerExpiresAt };
}
