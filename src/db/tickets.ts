import { db } from './index.ts';
import { tickets, events } from './schema.ts';
import { eq, and } from 'drizzle-orm';

export async function createTicket(data: typeof tickets.$inferInsert) {
  const result = await db.insert(tickets).values(data).returning();
  return result[0];
}

export async function getUserTickets(userId: number) {
  const result = await db
    .select()
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(eq(tickets.userId, userId));
  return result;
}

export async function getTicket(id: number) {
  const result = await db.select().from(tickets).where(eq(tickets.id, id));
  return result[0];
}

export async function updateTicketPayment(id: number, status: string, paymentId: string) {
  const result = await db.update(tickets).set({ paymentStatus: status, paymentId }).where(eq(tickets.id, id)).returning();
  return result[0];
}
