import { Express } from 'express';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { events, interactions, tickets, ticketTransfers, users, waitlistEntries } from '../../db/schema.ts';
import { AuthRequest, requireAuth } from '../../middleware/auth.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { seatsTaken } from '../seats.ts';
import { waitlistStatus, nudgeWaitlist } from '../waitlist.ts';
import { notify } from '../../lib/notifications.ts';
import { queueSms } from '../../lib/smsOutbox.ts';
import { normalizeIranMobile, maskMobile } from '../../lib/phone.ts';
import { changePoints } from '../../lib/points.ts';
import { ticketCode, RSVP_POINTS } from './commerce.ts';

// Waiting list (join / leave) and ticket transfers between people.

export function registerWaitlistRoutes(app: Express) {
  app.post('/api/events/:id/waitlist', limiters.tickets, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const eventId = parseInt(req.params.id, 10);
    const userId = req.dbUser!.id;
    const quantity = req.body?.plusOne ? 2 : 1;
    const outcome = await db.transaction(async (tx) => {
      const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for('update');
      if (!event || event.status !== 'PUBLISHED') return { status: 404, body: { error: 'رویداد یافت نشد.' } };
      if (event.ticketUrl) return { status: 400, body: { error: 'بلیت این رویداد از سایت برگزارکننده فروخته می‌شود.' } };
      if (event.startTime && event.startTime.getTime() < Date.now()) return { status: 400, body: { error: 'رویداد شروع شده است.' } };
      if (event.cost <= 0 && quantity > 1) return { status: 400, body: { error: 'برای رویداد رایگان هر نفر جداگانه ثبت‌نام می‌کند.' } };
      const free = event.capacity - await seatsTaken(tx, event, userId);
      if (free >= quantity) return { status: 409, body: { error: 'جای خالی هست؛ همین حالا ثبت‌نام کنید.', code: 'SEATS_AVAILABLE' } };
      const already = event.cost > 0
        ? (await tx.select({ n: sql<number>`count(*)::int` }).from(tickets).where(and(eq(tickets.eventId, eventId), eq(tickets.userId, userId), eq(tickets.status, 'ACTIVE'))))[0].n
        : (await tx.select({ n: sql<number>`count(*)::int` }).from(interactions).where(and(eq(interactions.eventId, eventId), eq(interactions.userId, userId), eq(interactions.type, 'RSVP'))))[0].n;
      if (event.cost <= 0 && Number(already) > 0) return { status: 400, body: { error: 'شما در این رویداد ثبت‌نام کرده‌اید.' } };
      const [entry] = await tx.insert(waitlistEntries).values({ eventId, userId, quantity }).onConflictDoNothing().returning();
      if (!entry) return { status: 409, body: { error: 'شما در لیست انتظار این رویداد هستید.' } };
      return { status: 201, body: { success: true } };
    });
    if (outcome.status !== 201) return res.status(outcome.status).json(outcome.body);
    res.status(201).json({ data: await waitlistStatus(eventId, userId), message: 'به لیست انتظار اضافه شدید. اگر جایی آزاد شود با پیامک خبرتان می‌کنیم.' });
  }));

  app.delete('/api/events/:id/waitlist', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const eventId = parseInt(req.params.id, 10);
    const left = await db.update(waitlistEntries).set({ status: 'CANCELLED' })
      .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.userId, req.dbUser!.id), inArray(waitlistEntries.status, ['WAITING', 'OFFERED'])))
      .returning();
    if (left.length) nudgeWaitlist(eventId); // a held offer goes to the next person
    res.json({ success: true });
  }));

  // ---------------- ticket transfers ----------------

  app.post('/api/tickets/:id/transfer', limiters.tickets, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const ticketId = parseInt(req.params.id, 10);
    const phone = normalizeIranMobile(String(req.body?.phone || ''));
    if (!phone) return res.status(400).json({ error: 'شماره موبایل گیرنده را درست وارد کنید.' });
    if (phone === me.phone) return res.status(400).json({ error: 'نمی‌توانید بلیت را به خودتان منتقل کنید.' });
    const [row] = await db.select({ ticket: tickets, event: events }).from(tickets).innerJoin(events, eq(tickets.eventId, events.id)).where(eq(tickets.id, ticketId));
    if (!row || row.ticket.userId !== me.id) return res.status(404).json({ error: 'بلیت یافت نشد' });
    if (row.ticket.status !== 'ACTIVE') return res.status(400).json({ error: 'فقط بلیت معتبر و استفاده‌نشده قابل انتقال است.' });
    if (row.event.status !== 'PUBLISHED' || (row.event.startTime && row.event.startTime.getTime() < Date.now())) {
      return res.status(400).json({ error: 'انتقال بلیت فقط پیش از شروع رویداد ممکن است.' });
    }
    const [transfer] = await db.insert(ticketTransfers).values({ ticketId, fromUserId: me.id, toPhone: phone }).onConflictDoNothing().returning();
    if (!transfer) return res.status(409).json({ error: 'برای این بلیت یک انتقال در انتظار پاسخ وجود دارد.' });

    const [recipient] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (recipient) {
      notify(recipient.id, {
        type: 'TRANSFER', title: 'یک بلیت برایتان فرستاده شد',
        body: `${me.name} بلیت «${row.event.title}» را برایتان فرستاده است. در بخش بلیت‌های من آن را بپذیرید.`,
        url: '/tickets', dedupeKey: `transfer:${transfer.id}`,
        sms: { kind: 'TRANSFER', params: { title: row.event.title, from: me.name } },
      }).catch(() => {});
    } else {
      // No account yet: the SMS invites them to sign in with this number, where the ticket waits.
      queueSms({ phone, kind: 'TRANSFER', params: { title: row.event.title, from: me.name }, dedupeKey: `transfer:${transfer.id}` }).catch(() => {});
    }
    res.status(201).json({ data: { id: transfer.id, toPhone: maskMobile(phone) }, message: 'بلیت برای گیرنده فرستاده شد؛ پس از پذیرش او منتقل می‌شود.' });
  }));

  app.get('/api/transfers', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const rows = await db.select({ transfer: ticketTransfers, eventId: events.id, eventTitle: events.title, startTime: events.startTime, fromName: users.name })
      .from(ticketTransfers)
      .innerJoin(tickets, eq(ticketTransfers.ticketId, tickets.id))
      .innerJoin(events, eq(tickets.eventId, events.id))
      .innerJoin(users, eq(ticketTransfers.fromUserId, users.id))
      .where(and(eq(ticketTransfers.status, 'PENDING'), or(eq(ticketTransfers.fromUserId, me.id), me.phone ? eq(ticketTransfers.toPhone, me.phone) : sql`false`)))
      .orderBy(desc(ticketTransfers.id));
    res.json({
      data: {
        incoming: rows.filter(r => r.transfer.toPhone === me.phone && r.transfer.fromUserId !== me.id)
          .map(r => ({ id: r.transfer.id, eventId: r.eventId, eventTitle: r.eventTitle, startTime: r.startTime, fromName: r.fromName })),
        outgoing: rows.filter(r => r.transfer.fromUserId === me.id)
          .map(r => ({ id: r.transfer.id, ticketId: r.transfer.ticketId, eventTitle: r.eventTitle, toPhone: maskMobile(r.transfer.toPhone) })),
      },
    });
  }));

  app.post('/api/transfers/:id/:action', limiters.tickets, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const action = req.params.action;
    if (!['accept', 'decline', 'cancel'].includes(action)) return res.status(404).json({ error: 'مسیر API یافت نشد' });
    const id = parseInt(req.params.id, 10);

    const outcome = await db.transaction(async (tx) => {
      const [transfer] = await tx.select().from(ticketTransfers).where(eq(ticketTransfers.id, id)).for('update');
      if (!transfer || transfer.status !== 'PENDING') return { status: 404, body: { error: 'این انتقال دیگر در انتظار نیست.' } };
      const isRecipient = !!me.phone && transfer.toPhone === me.phone;
      if (action === 'cancel' ? transfer.fromUserId !== me.id : !isRecipient) return { status: 404, body: { error: 'این انتقال دیگر در انتظار نیست.' } };
      if (action !== 'accept') {
        await tx.update(ticketTransfers).set({ status: action === 'cancel' ? 'CANCELLED' : 'DECLINED', respondedAt: new Date() }).where(eq(ticketTransfers.id, id));
        return { status: 200, body: { success: true }, notifySender: action === 'decline' ? transfer.fromUserId : null };
      }

      const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, transfer.ticketId)).for('update');
      const [event] = ticket ? await tx.select().from(events).where(eq(events.id, ticket.eventId)) : [];
      if (!ticket || ticket.status !== 'ACTIVE' || ticket.userId !== transfer.fromUserId || !event || event.status !== 'PUBLISHED'
        || (event.startTime && event.startTime.getTime() < Date.now())) {
        await tx.update(ticketTransfers).set({ status: 'EXPIRED', respondedAt: new Date() }).where(eq(ticketTransfers.id, id));
        return { status: 400, body: { error: 'این بلیت دیگر قابل انتقال نیست (استفاده یا لغو شده، یا رویداد شروع شده).' } };
      }
      // New holder, new entry code: the code the sender may have saved stops working.
      await tx.update(tickets).set({ userId: me.id, code: ticketCode(), transferredFromId: transfer.fromUserId, transferredAt: new Date(), holderLabel: 'انتقالی' }).where(eq(tickets.id, ticket.id));
      await tx.update(ticketTransfers).set({ status: 'ACCEPTED', toUserId: me.id, respondedAt: new Date() }).where(eq(ticketTransfers.id, id));
      // Attendance follows the ticket (no points for a received ticket).
      const has = await tx.select({ id: interactions.id }).from(interactions)
        .where(and(eq(interactions.userId, me.id), eq(interactions.eventId, event.id), eq(interactions.type, 'RSVP'))).limit(1);
      if (!has.length) await tx.insert(interactions).values({ userId: me.id, eventId: event.id, type: 'RSVP' });
      const [{ left }] = await tx.select({ left: sql<number>`count(*)::int` }).from(tickets)
        .where(and(eq(tickets.userId, transfer.fromUserId), eq(tickets.eventId, event.id), eq(tickets.status, 'ACTIVE')));
      if (Number(left) === 0) {
        const removed = await tx.delete(interactions).where(and(eq(interactions.userId, transfer.fromUserId), eq(interactions.eventId, event.id), eq(interactions.type, 'RSVP'))).returning({ id: interactions.id });
        if (removed.length) await changePoints(tx, transfer.fromUserId, -RSVP_POINTS, 'RSVP_CANCELLED', { type: 'EVENT', id: event.id });
      }
      return { status: 200, body: { success: true, message: 'بلیت به حساب شما منتقل شد.' }, notifySender: transfer.fromUserId, eventTitle: event.title };
    });

    if ((outcome as any).notifySender) {
      const accepted = action === 'accept';
      notify((outcome as any).notifySender, {
        type: 'TRANSFER', title: accepted ? 'بلیت شما منتقل شد' : 'گیرنده بلیت را نپذیرفت',
        body: accepted ? `${me.name} بلیت «${(outcome as any).eventTitle}» را پذیرفت.` : 'بلیت همچنان در حساب شماست.', url: '/tickets',
      }).catch(() => {});
    }
    res.status(outcome.status).json(outcome.body);
  }));
}

/** Background job: pending transfers of events that already started can no longer be accepted. */
export async function expireTransfers() {
  await db.execute(sql`
    UPDATE ticket_transfers tt SET status = 'EXPIRED', responded_at = now()
    FROM tickets t JOIN events e ON e.id = t.event_id
    WHERE tt.ticket_id = t.id AND tt.status = 'PENDING' AND (e.start_time < now() OR e.status <> 'PUBLISHED' OR t.status <> 'ACTIVE')
  `);
}
