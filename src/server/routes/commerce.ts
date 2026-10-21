import { Express } from 'express';
import crypto from 'crypto';
import { eq, and, inArray, sql, desc, lt } from 'drizzle-orm';
import { db, DbTransaction } from '../../db/index.ts';
import { events, interactions, tickets, orders, users } from '../../db/schema.ts';
import { AuthRequest, requireAuth, requireAdmin, requireSelfOrAdmin, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters, publicBaseUrl } from '../infra.ts';
import { invalidateCachePattern } from '../../lib/sharedStore.ts';
import { changePoints, POINT_VALUE_TOMAN, MAX_POINTS_SHARE } from '../../lib/points.ts';
import { notify } from '../../lib/notifications.ts';
import { gatewayMode, gatewayAvailable, requestPayment, verifyPayment, toRial } from '../../lib/payments.ts';
import { ticketSeatsTaken } from '../seats.ts';
import { eventUrl } from '../helpers.ts';

export const FRIEND_TICKET_DISCOUNT = 0.1; // second ticket bought for a friend gets 10% off
export const FRIEND_TICKET_POINTS = 20;
export const RSVP_POINTS = 50;
export const PAYMENT_HOLD_MINUTES = 15;
// Tickets can be cancelled until this long before the event starts.
export const CANCEL_DEADLINE_HOURS = 2;

function ticketCode() {
  // Unambiguous characters only (no 0/O, 1/I) so the code can be read out at the door.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

/** Marks an order paid, activates its tickets, registers attendance and grants rewards. */
async function completeOrder(tx: DbTransaction, orderId: number, refId: string | null) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
  if (!order || order.status === 'PAID') return order;
  await tx.update(orders).set({ status: 'PAID', paidAt: new Date(), refId }).where(eq(orders.id, orderId));
  await tx.update(tickets).set({ status: 'ACTIVE', paymentStatus: 'PAID' }).where(eq(tickets.orderId, orderId));

  const existingRsvp = await tx.select({ id: interactions.id }).from(interactions)
    .where(and(eq(interactions.userId, order.userId), eq(interactions.eventId, order.eventId), eq(interactions.type, 'RSVP'))).limit(1);
  if (existingRsvp.length === 0) {
    await tx.insert(interactions).values({ userId: order.userId, eventId: order.eventId, type: 'RSVP' });
    await changePoints(tx, order.userId, RSVP_POINTS, 'RSVP', { type: 'EVENT', id: order.eventId });
  }
  if (order.quantity > 1) {
    await changePoints(tx, order.userId, FRIEND_TICKET_POINTS, 'FRIEND_TICKET', { type: 'ORDER', id: order.id });
  }
  return { ...order, status: 'PAID' };
}

/** Releases the seats of an unpaid order and gives back the points it reserved. */
async function failOrder(tx: DbTransaction, orderId: number, status: 'FAILED' | 'EXPIRED') {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
  if (!order || order.status !== 'PENDING') return;
  await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
  await tx.update(tickets).set({ status: 'CANCELLED', cancelledAt: new Date() }).where(eq(tickets.orderId, orderId));
  if (order.pointsUsed > 0) await changePoints(tx, order.userId, order.pointsUsed, 'POINTS_REFUND', { type: 'ORDER', id: order.id });
}

export async function expireStaleOrders() {
  const stale = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.status, 'PENDING'), lt(orders.expiresAt, new Date()))).limit(200);
  for (const o of stale) await db.transaction(tx => failOrder(tx, o.id, 'EXPIRED'));
}

function orderNotification(order: { id: number; eventId: number }, eventTitle: string) {
  return {
    type: 'TICKET',
    title: 'بلیت شما صادر شد',
    body: `بلیت «${eventTitle}» آماده است. کد ورود را در بخش بلیت‌های من ببینید.`,
    url: '/tickets',
    dedupeKey: `order-paid:${order.id}`,
  };
}

export function registerCommerceRoutes(app: Express) {
  app.get('/api/payments/config', (req, res) => {
    res.json({ data: { mode: gatewayMode, pointValueToman: POINT_VALUE_TOMAN, maxPointsShare: MAX_POINTS_SHARE, friendDiscount: FRIEND_TICKET_DISCOUNT } });
  });

  // Checkout: holds the seats, reserves points and returns where to pay.
  // The price is always computed here; the client only says which event, how many, and whether to use points.
  app.post('/api/orders', limiters.tickets, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const userId = req.dbUser!.id;
    const eventId = parseInt(req.body.eventId, 10);
    const quantity = req.body.plusOne ? 2 : 1;
    const usePoints = !!req.body.usePoints;
    if (!Number.isInteger(eventId)) return res.status(400).json({ error: 'شناسه رویداد نامعتبر است.' });

    await expireStaleOrders();

    const result = await db.transaction(async (tx) => {
      const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for('update');
      if (!event || event.status !== 'PUBLISHED') return { status: 404, body: { error: 'رویداد مورد نظر یافت نشد.' } };
      if (event.cost <= 0) return { status: 400, body: { error: 'این رویداد رایگان است؛ برای حضور از دکمه «منم میام» استفاده کنید.' } };
      if (event.ticketUrl) return { status: 400, body: { error: 'بلیت این رویداد از سایت رسمی برگزارکننده فروخته می‌شود.' } };
      if (event.startTime && event.startTime.getTime() < Date.now() && (!event.endTime || event.endTime.getTime() < Date.now())) {
        return { status: 400, body: { error: 'این رویداد به پایان رسیده است.' } };
      }
      if (gatewayMode === 'none') return { status: 503, body: { error: 'درگاه پرداخت هنوز پیکربندی نشده است. لطفاً بعداً تلاش کنید.' } };

      const taken = await ticketSeatsTaken(tx, eventId);
      if (taken + quantity > event.capacity) {
        return { status: 400, body: { error: `ظرفیت این رویداد تکمیل است. ظرفیت باقی‌مانده: ${Math.max(0, event.capacity - taken)} بلیت.` } };
      }

      const ownPrice = event.cost;
      const friendPrice = Math.round(event.cost * (1 - FRIEND_TICKET_DISCOUNT));
      const subtotal = ownPrice + (quantity > 1 ? friendPrice : 0);

      let pointsUsed = 0;
      if (usePoints) {
        const [me] = await tx.select({ points: users.points }).from(users).where(eq(users.id, userId));
        const maxByShare = Math.floor((subtotal * MAX_POINTS_SHARE) / POINT_VALUE_TOMAN);
        pointsUsed = Math.max(0, Math.min(me.points, maxByShare));
      }
      const discount = pointsUsed * POINT_VALUE_TOMAN;
      const amount = subtotal - discount;
      // Gateway known to be unreachable: say so now instead of holding seats for a payment that cannot start.
      if (amount > 0 && !gatewayAvailable()) {
        return { status: 503, body: { error: 'درگاه پرداخت موقتاً در دسترس نیست. چند دقیقه دیگر دوباره تلاش کنید.', retryAfter: 60 } };
      }

      const [order] = await tx.insert(orders).values({
        userId, eventId, quantity, subtotal, discount, pointsUsed, amount, status: 'PENDING',
        gateway: amount === 0 ? 'POINTS' : gatewayMode === 'zarinpal' ? 'ZARINPAL' : 'SIMULATED',
        expiresAt: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000),
      }).returning();

      // Discount from points is spread over the tickets so each ticket records what it really cost.
      const prices = quantity > 1 ? [ownPrice, friendPrice] : [ownPrice];
      let remainingDiscount = discount;
      for (let i = 0; i < prices.length; i++) {
        const share = i === prices.length - 1 ? remainingDiscount : Math.min(remainingDiscount, Math.round(discount * prices[i] / subtotal));
        remainingDiscount -= share;
        await tx.insert(tickets).values({
          userId, eventId, orderId: order.id,
          amount: prices[i] - share,
          paymentStatus: 'PENDING',
          paymentId: `ord_${order.id}-${i + 1}`,
          status: 'PENDING_PAYMENT',
          code: ticketCode(),
          holderLabel: i === 0 ? 'خودم' : 'همراه',
        });
      }
      if (pointsUsed > 0) await changePoints(tx, userId, -pointsUsed, 'TICKET_DISCOUNT', { type: 'ORDER', id: order.id });

      // Nothing left to charge (points covered it) or simulated gateway: confirm right away.
      if (amount === 0 || gatewayMode === 'simulated') {
        await completeOrder(tx, order.id, amount === 0 ? null : `SIM-${order.id}`);
        return { status: 201, body: { data: { orderId: order.id, status: 'PAID', amount, discount, pointsUsed }, paid: true, eventTitle: event.title } };
      }
      return { status: 201, body: { data: { orderId: order.id, status: 'PENDING', amount, discount, pointsUsed }, needsPayment: true, eventTitle: event.title, currency: event.currency } };
    });

    if (result.status !== 201) return res.status(result.status).json(result.body);
    const body: any = result.body;
    invalidateCachePattern('admin_stats');
    invalidateCachePattern('leaderboard');

    if (body.paid) {
      notify(userId, orderNotification({ id: body.data.orderId, eventId }, body.eventTitle)).catch(() => {});
      return res.status(201).json({ ...body, message: 'بلیت با موفقیت صادر شد.' });
    }

    // Real gateway: ask Zarinpal for a payment session outside the DB transaction.
    try {
      const { authority, paymentUrl } = await requestPayment({
        amountRial: toRial(body.data.amount, body.currency),
        description: `خرید بلیت ${body.eventTitle}`,
        callbackUrl: `${publicBaseUrl(req)}/api/payments/zarinpal/callback`,
        email: req.dbUser!.email || undefined,
      });
      await db.update(orders).set({ authority }).where(eq(orders.id, body.data.orderId));
      res.status(201).json({ ...body, paymentUrl });
    } catch (err: any) {
      await db.transaction(tx => failOrder(tx, body.data.orderId, 'FAILED'));
      res.status(502).json({ error: err?.message || 'اتصال به درگاه پرداخت ناموفق بود.' });
    }
  }));

  // Zarinpal sends the payer back here; the payment is verified server-to-server before tickets are issued.
  app.get('/api/payments/zarinpal/callback', asyncRoute(async (req, res) => {
    const authority = String(req.query.Authority || '');
    const ok = String(req.query.Status || '') === 'OK';
    const [order] = authority ? await db.select().from(orders).where(eq(orders.authority, authority)).limit(1) : [];
    if (!order) return res.redirect('/tickets?payment=unknown');
    if (order.status === 'PAID') return res.redirect(`/tickets?payment=success&order=${order.id}`);
    if (!ok || order.status !== 'PENDING') {
      await db.transaction(tx => failOrder(tx, order.id, 'FAILED'));
      return res.redirect(`/tickets?payment=failed&order=${order.id}`);
    }
    const [event] = await db.select().from(events).where(eq(events.id, order.eventId));
    const verification = await verifyPayment({ amountRial: toRial(order.amount, event?.currency), authority });
    if (!verification.ok) {
      await db.transaction(tx => failOrder(tx, order.id, 'FAILED'));
      return res.redirect(`/tickets?payment=failed&order=${order.id}`);
    }
    await db.transaction(tx => completeOrder(tx, order.id, verification.refId));
    notify(order.userId, orderNotification(order, event?.title || 'رویداد')).catch(() => {});
    invalidateCachePattern('admin_stats');
    res.redirect(`/tickets?payment=success&order=${order.id}`);
  }));

  app.get('/api/orders/:id', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const [order] = await db.select().from(orders).where(eq(orders.id, parseInt(req.params.id, 10)));
    if (!order || (order.userId !== req.dbUser!.id && !isAdmin(req))) return res.status(404).json({ error: 'سفارش یافت نشد' });
    res.json({ data: order });
  }));

  app.get('/api/users/:id/tickets', requireSelfOrAdmin('id'), asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const rows = await db.select({ tickets, events, order: orders })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .where(and(eq(tickets.userId, userId), inArray(tickets.status, ['ACTIVE', 'USED', 'CANCELLED', 'PENDING_PAYMENT'])))
      .orderBy(desc(tickets.createdAt));
    // Unpaid holds that already expired are noise for the user.
    const visible = rows.filter(r => r.tickets.status !== 'PENDING_PAYMENT' || (r.order?.expiresAt && r.order.expiresAt.getTime() > Date.now()));
    res.json({
      data: visible.map(r => ({
        ...r,
        canCancel: r.tickets.status === 'ACTIVE' && (!r.events.startTime || r.events.startTime.getTime() - Date.now() > CANCEL_DEADLINE_HOURS * 3600_000),
      }))
    });
  }));

  // Cancels one ticket. Free tickets are simply released; paid ones go to the refund queue.
  app.post('/api/tickets/:id/cancel', limiters.tickets, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const outcome = await db.transaction(async (tx) => {
      const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).for('update');
      if (!ticket || (ticket.userId !== req.dbUser!.id && !isAdmin(req))) return { status: 404, body: { error: 'بلیت یافت نشد' } };
      if (ticket.status !== 'ACTIVE') return { status: 400, body: { error: 'این بلیت قابل لغو نیست.' } };
      const [event] = await tx.select().from(events).where(eq(events.id, ticket.eventId));
      if (event?.startTime && event.startTime.getTime() - Date.now() < CANCEL_DEADLINE_HOURS * 3600_000 && !isAdmin(req)) {
        return { status: 400, body: { error: `لغو بلیت فقط تا ${CANCEL_DEADLINE_HOURS.toLocaleString('fa-IR')} ساعت پیش از شروع رویداد ممکن است.` } };
      }
      await tx.update(tickets).set({ status: 'CANCELLED', cancelledAt: new Date() }).where(eq(tickets.id, ticketId));

      let refund = 'NONE';
      if (ticket.orderId) {
        const [order] = await tx.select().from(orders).where(eq(orders.id, ticket.orderId)).for('update');
        const [{ remaining }] = await tx.select({ remaining: sql<number>`count(*)::int` }).from(tickets)
          .where(and(eq(tickets.orderId, ticket.orderId), eq(tickets.status, 'ACTIVE')));
        if (order && ticket.amount > 0) refund = order.gateway === 'ZARINPAL' ? 'REQUESTED' : 'AUTOMATIC';
        if (order && Number(remaining) === 0) {
          // Whole order cancelled: points spent on it come back, paid money goes to the refund queue.
          await tx.update(orders).set({ status: order.gateway === 'ZARINPAL' && order.amount > 0 ? 'REFUND_REQUESTED' : 'CANCELLED' }).where(eq(orders.id, order.id));
          if (order.pointsUsed > 0) await changePoints(tx, order.userId, order.pointsUsed, 'POINTS_REFUND', { type: 'ORDER', id: order.id });
        }
      }

      // No ticket left for this event: the user is no longer attending.
      const [{ left }] = await tx.select({ left: sql<number>`count(*)::int` }).from(tickets)
        .where(and(eq(tickets.userId, ticket.userId), eq(tickets.eventId, ticket.eventId), eq(tickets.status, 'ACTIVE')));
      if (Number(left) === 0) {
        const removed = await tx.delete(interactions).where(and(
          eq(interactions.userId, ticket.userId), eq(interactions.eventId, ticket.eventId), eq(interactions.type, 'RSVP')
        )).returning({ id: interactions.id });
        if (removed.length) await changePoints(tx, ticket.userId, -RSVP_POINTS, 'RSVP_CANCELLED', { type: 'EVENT', id: ticket.eventId });
      }
      return { status: 200, body: { success: true, refund, message: refund === 'REQUESTED' ? 'بلیت لغو شد و درخواست بازپرداخت ثبت شد.' : 'بلیت لغو شد.' } };
    });
    invalidateCachePattern('admin_stats');
    res.status(outcome.status).json(outcome.body);
  }));

  // Door check-in by the organizer: validates a ticket code and marks it used (once).
  app.post('/api/organizer/events/:id/checkin', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const eventId = parseInt(req.params.id, 10);
    const code = String(req.body?.code || '').trim().toUpperCase().replace(/^MEVENT:/, '');
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'رویداد یافت نشد' });
    if (event.organizerId !== req.dbUser!.id && !isAdmin(req)) return res.status(403).json({ error: 'شما دسترسی لازم برای این کار را ندارید.' });
    if (!code) return res.status(400).json({ error: 'کد بلیت را وارد کنید' });

    const result = await db.transaction(async (tx) => {
      const [ticket] = await tx.select({ ticket: tickets, holder: users.name }).from(tickets)
        .innerJoin(users, eq(tickets.userId, users.id))
        .where(and(eq(tickets.code, code), eq(tickets.eventId, eventId))).for('update');
      if (!ticket) return { status: 404, body: { error: 'بلیتی با این کد برای این رویداد وجود ندارد.' } };
      if (ticket.ticket.status === 'USED') return { status: 409, body: { error: 'این بلیت قبلاً استفاده شده است.', usedAt: ticket.ticket.usedAt } };
      if (ticket.ticket.status !== 'ACTIVE') return { status: 400, body: { error: 'این بلیت معتبر نیست (لغو شده یا پرداخت نشده).' } };
      await tx.update(tickets).set({ status: 'USED', usedAt: new Date() }).where(eq(tickets.id, ticket.ticket.id));
      return { status: 200, body: { success: true, holder: ticket.holder, label: ticket.ticket.holderLabel, message: 'ورود تأیید شد.' } };
    });
    res.status(result.status).json(result.body);
  }));

  // Attendee list for the organizer: ticket holders (with status) and free RSVPs. Names only.
  app.get('/api/organizer/events/:id/attendees', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const eventId = parseInt(req.params.id, 10);
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: 'رویداد یافت نشد' });
    if (event.organizerId !== req.dbUser!.id && !isAdmin(req)) return res.status(403).json({ error: 'شما دسترسی لازم برای این کار را ندارید.' });
    const ticketHolders = await db.select({ name: users.name, status: tickets.status, label: tickets.holderLabel })
      .from(tickets).innerJoin(users, eq(tickets.userId, users.id))
      .where(and(eq(tickets.eventId, eventId), inArray(tickets.status, ['ACTIVE', 'USED'])));
    const rsvps = event.cost > 0 ? [] : await db.select({ name: users.name }).from(interactions)
      .innerJoin(users, eq(interactions.userId, users.id))
      .where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'RSVP')));
    res.json({ data: [...ticketHolders, ...rsvps.map(r => ({ name: r.name, status: 'RSVP', label: null }))] });
  }));

  // Refund queue (Zarinpal refunds are paid out from the merchant panel, then marked here).
  app.get('/api/admin/refunds', requireAdmin, asyncRoute(async (req, res) => {
    const rows = await db.select({ order: orders, eventTitle: events.title, userName: users.name, userEmail: users.email })
      .from(orders).innerJoin(events, eq(orders.eventId, events.id)).innerJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.status, 'REFUND_REQUESTED')).orderBy(desc(orders.createdAt));
    res.json({ data: rows });
  }));

  app.post('/api/admin/refunds/:orderId', requireAdmin, asyncRoute(async (req, res) => {
    const orderId = parseInt(req.params.orderId, 10);
    const [order] = await db.update(orders).set({ status: 'REFUNDED' })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'REFUND_REQUESTED'))).returning();
    if (!order) return res.status(404).json({ error: 'درخواست بازپرداخت یافت نشد' });
    notify(order.userId, {
      type: 'TICKET', title: 'مبلغ بلیت بازپرداخت شد',
      body: `مبلغ ${order.amount.toLocaleString('fa-IR')} تومان به حساب شما بازگردانده شد.`, url: eventUrl(order.eventId),
    }).catch(() => {});
    res.json({ success: true });
  }));
}
