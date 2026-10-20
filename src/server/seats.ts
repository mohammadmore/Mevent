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

export async function seatsTaken(exec: Executor, event: { id: number; cost: number }) {
  return event.cost > 0 ? ticketSeatsTaken(exec, event.id) : rsvpCount(exec, event.id);
}
