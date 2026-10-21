import { sql, and, eq } from 'drizzle-orm';
import { db, DbTransaction } from '../db/index.ts';
import { interactions } from '../db/schema.ts';

type Executor = typeof db | DbTransaction;

/**
 * Seats taken for an event: issued tickets, plus tickets held by checkouts that are
 * still waiting for payment (their hold expires with the order).
 */
export async function ticketSeatsTaken(exec: Executor, eventId: number): Promise<number> {
  const result: any = await exec.execute(sql`
    SELECT count(*)::int AS taken
    FROM tickets t
    LEFT JOIN orders o ON o.id = t.order_id
    WHERE t.event_id = ${eventId}
      AND (t.status IN ('ACTIVE', 'USED') OR (t.status = 'PENDING_PAYMENT' AND o.expires_at > now()))
  `);
  return Number(result.rows?.[0]?.taken || 0);
}

/** Free events have no tickets; attendance is the RSVP count. */
export async function rsvpCount(exec: Executor, eventId: number): Promise<number> {
  const [row] = await exec.select({ count: sql<number>`count(*)::int` }).from(interactions)
    .where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'RSVP')));
  return Number(row?.count || 0);
}

/** Seats held for people with a live waiting-list offer (except `exceptUserId`'s own hold). */
export async function offeredSeats(exec: Executor, eventId: number, exceptUserId?: number): Promise<number> {
  const result: any = await exec.execute(sql`
    SELECT coalesce(sum(quantity), 0)::int AS held FROM waitlist_entries
    WHERE event_id = ${eventId} AND status = 'OFFERED' AND offer_expires_at > now()
      AND user_id <> ${exceptUserId ?? 0}
  `);
  return Number(result.rows?.[0]?.held || 0);
}

/**
 * Seats nobody else can take: tickets/RSVPs plus seats held for waiting-list offers. Pass the
 * user who is about to buy so their own offer counts as available to them.
 */
export async function seatsTaken(exec: Executor, event: { id: number; cost: number }, forUserId?: number) {
  const used = event.cost > 0 ? await ticketSeatsTaken(exec, event.id) : await rsvpCount(exec, event.id);
  return used + await offeredSeats(exec, event.id, forUserId);
}
