import { Express } from 'express';
import crypto from 'crypto';
import { eq, and, inArray, sql, desc, lt } from 'drizzle-orm';
import { db, DbTransaction } from '../../db/index.ts';
import { events, interactions, tickets, orders, users, refunds } from '../../db/schema.ts';
import { AuthRequest, requireAuth, requireAdmin, requireSelfOrAdmin, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters, publicBaseUrl } from '../infra.ts';
import { invalidateCachePattern } from '../../lib/sharedStore.ts';
import { changePoints, POINT_VALUE_TOMAN, MAX_POINTS_SHARE } from '../../lib/points.ts';
import { notify } from '../../lib/notifications.ts';
import { gatewayMode, gatewayAvailable, requestPayment, verifyPayment, toRial } from '../../lib/payments.ts';
import { seatsTaken } from '../seats.ts';
import { eventUrl } from '../helpers.ts';
import { checkCoupon, redeemCoupon, releaseCoupon } from '../coupons.ts';
import { invalidateEventCaches } from './content.ts';
import { convertWaitlist, nudgeWaitlist } from '../waitlist.ts';

export const FRIEND_TICKET_DISCOUNT = 0.1; // second ticket bought for a friend gets 10% off
export const FRIEND_TICKET_POINTS = 20;
export const RSVP_POINTS = 50;
export const PAYMENT_HOLD_MINUTES = 15;
// Tickets can be cancelled until this long before the event starts.
export const CANCEL_DEADLINE_HOURS = 2;

export function ticketCode() {
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
async function failOrder(tx: DbTransaction, orderId: number, status: 'FAILED' | 'EXPIRED' | 'CANCELLED') {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
  if (!order || order.status !== 'PENDING') return;
  await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
  await tx.update(tickets).set({ status: 'CANCELLED', cancelledAt: new Date() }).where(eq(tickets.orderId, orderId));
  if (order.pointsUsed > 0) await changePoints(tx, order.userId, order.pointsUsed, 'POINTS_REFUND', { type: 'ORDER', id: order.id });
  await releaseCoupon(tx, orderId);
}

/** Ticket holders may cancel until the deadline, or until the new start of a rescheduled event. */
export function canCancelTicket(event: { startTime: Date | null; postponedFrom: Date | null; status: string } | undefined) {
  if (!event || event.status === 'CANCELLED') return false;
  if (!event.startTime) return true;
  const msLeft = event.startTime.getTime() - Date.now();
  return event.postponedFrom ? msLeft > 0 : msLeft > CANCEL_DEADLINE_HOURS * 3600_000;
}

/**
 * Cancels the given active tickets of one order, records the money owed back (real payments only)
 * and, when nothing is left on the order, settles it: points and discount code come back.
 * Returns the amount queued for refund.
 */
export async function cancelOrderTickets(tx: DbTransaction, order: typeof orders.$inferSelect, rows: { id: number; amount: number }[], reason: string) {
  if (!rows.length) return 0;
  await tx.update(tickets).set({ status: 'CANCELLED', cancelledAt: new Date() }).where(inArray(tickets.id, rows.map(r => r.id)));
  const paid = rows.reduce((sum, r) => sum + r.amount, 0);
  let owed = 0;
  if (order.gateway === 'ZARINPAL' && paid > 0) {
    await tx.insert(refunds).values({ orderId: order.id, userId: order.userId, eventId: order.eventId, ticketIds: rows.map(r => r.id), amount: paid, reason });
    owed = paid;
  }
  const [{ remaining }] = await tx.select({ remaining: sql<number>`count(*)::int` }).from(tickets)
    .where(and(eq(tickets.orderId, order.id), inArray(tickets.status, ['ACTIVE', 'USED'])));
  if (Number(remaining) === 0) {
    const [{ open }] = await tx.select({ open: sql<number>`count(*)::int` }).from(refunds)
      .where(and(eq(refunds.orderId, order.id), eq(refunds.status, 'REQUESTED')));
    await tx.update(orders).set({ status: Number(open) > 0 ? 'REFUND_REQUESTED' : 'CANCELLED' }).where(eq(orders.id, order.id));
    if (order.pointsUsed > 0) await changePoints(tx, order.userId, order.pointsUsed, 'POINTS_REFUND', { type: 'ORDER', id: order.id });
    await releaseCoupon(tx, order.id);
  }
  return owed;
}

/** An order whose refunds are all paid and that has no valid ticket left becomes REFUNDED. */
async function settleRefundedOrder(orderId: number) {
  const [{ open }] = await db.select({ open: sql<number>`count(*)::int` }).from(refunds).where(and(eq(refunds.orderId, orderId), eq(refunds.status, 'REQUESTED')));
  const [{ valid }] = await db.select({ valid: sql<number>`count(*)::int` }).from(tickets).where(and(eq(tickets.orderId, orderId), inArray(tickets.status, ['ACTIVE', 'USED'])));
  if (Number(open) === 0 && Number(valid) === 0) await db.update(orders).set({ status: 'REFUNDED' }).where(eq(orders.id, orderId));
}

export async function expireStaleOrders() {
  const stale = await db.select({ id: orders.id, eventId: orders.eventId }).from(orders)
    .where(and(eq(orders.status, 'PENDING'), lt(orders.expiresAt, new Date()))).limit(200);
  for (const o of stale) await db.transaction(tx => failOrder(tx, o.id, 'EXPIRED'));
  for (const eventId of new Set(stale.map(o => o.eventId))) nudgeWaitlist(eventId);
}

/** In-app + push + SMS (with the entry codes) once an order's tickets are issued. */
async function notifyOrderPaid(order: { id: number; userId: number }, eventTitle: string) {
  const codes = await db.select({ code: tickets.code }).from(tickets)
    .where(and(eq(tickets.orderId, order.id), eq(tickets.status, 'ACTIVE')));
  await notify(order.userId, {
    type: 'TICKET',
    title: 'بلیت شما صادر شد',
    body: `بلیت «${eventTitle}» آماده است. کد ورود را در بخش بلیت‌های من ببینید.`,
    url: '/tickets',
    dedupeKey: `order-paid:${order.id}`,
    sms: { kind: 'TICKET', params: { title: eventTitle, code: codes.map(c => c.code).join('-') } },
  });
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

      const taken = await seatsTaken(tx, event, userId);
      if (taken + quantity > event.capacity) {
        return { status: 400, body: { error: `ظرفیت این رویداد تکمیل است. ظرفیت باقی‌مانده: ${Math.max(0, event.capacity - taken)} بلیت.` } };
      }

      const ownPrice = event.cost;
      const friendPrice = Math.round(event.cost * (1 - FRIEND_TICKET_DISCOUNT));
      const subtotal = ownPrice + (quantity > 1 ? friendPrice : 0);

      // Discount code first, then points on what is left.
      let couponId: number | null = null;
      let couponDisc = 0;
      if (req.body.couponCode) {
        const c = await checkCoupon(tx, req.body.couponCode, { userId, event, subtotal }, true);
        if (c.ok === false) return { status: 400, body: { error: c.error, code: 'COUPON_INVALID' } };
        couponId = c.coupon.id;
        couponDisc = c.discount;
      }
      let pointsUsed = 0;
      if (usePoints) {
        const [me] = await tx.select({ points: users.points }).from(users).where(eq(users.id, userId));
        const maxByShare = Math.floor(((subtotal - couponDisc) * MAX_POINTS_SHARE) / POINT_VALUE_TOMAN);
        pointsUsed = Math.max(0, Math.min(me.points, maxByShare));
      }
      const discount = couponDisc + pointsUsed * POINT_VALUE_TOMAN;
      const amount = subtotal - discount;
      // Gateway known to be unreachable: say so now instead of holding seats for a payment that cannot start.
      if (amount > 0 && !gatewayAvailable()) {
        return { status: 503, body: { error: 'درگاه پرداخت موقتاً در دسترس نیست. چند دقیقه دیگر دوباره تلاش کنید.', retryAfter: 60 } };
      }

      const [order] = await tx.insert(orders).values({
        userId, eventId, quantity, subtotal, discount, pointsUsed, amount, status: 'PENDING',
        gateway: amount === 0 ? 'POINTS' : gatewayMode === 'zarinpal' ? 'ZARINPAL' : 'SIMULATED',
        expiresAt: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000),
        couponId, couponDiscount: couponDisc,
      }).returning();
      if (couponId) await redeemCoupon(tx, couponId, order.id, userId, couponDisc);
      await convertWaitlist(tx, eventId, userId);

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
        return { status: 201, body: { data: { orderId: order.id, status: 'PAID', amount, discount, pointsUsed, couponDiscount: couponDisc }, paid: true, eventTitle: event.title } };
      }
      return { status: 201, body: { data: { orderId: order.id, status: 'PENDING', amount, discount, pointsUsed, couponDiscount: couponDisc }, needsPayment: true, eventTitle: event.title, currency: event.currency } };
    });

    if (result.status !== 201) return res.status(result.status).json(result.body);
    const body: any = result.body;
    invalidateCachePattern('admin_stats');
    invalidateCachePattern('leaderboard');

    if (body.paid) {
      notifyOrderPaid({ id: body.data.orderId, userId }, body.eventTitle).catch(() => {});
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
      nudgeWaitlist(eventId);
      res.status(502).json({ error: err?.message || 'اتصال به درگاه پرداخت ناموفق بود.' });
    }
  }));

  // Shows what a discount code would take off, before paying (the order re-checks it).
  app.post('/api/coupons/preview', limiters.tickets, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const eventId = parseInt(req.body?.eventId, 10);
    const [event] = Number.isInteger(eventId) ? await db.select().from(events).where(eq(events.id, eventId)) : [];
    if (!event || event.cost <= 0) return res.status(404).json({ error: 'رویداد مورد نظر یافت نشد.' });
    const subtotal = event.cost + (req.body?.plusOne ? Math.round(event.cost * (1 - FRIEND_TICKET_DISCOUNT)) : 0);
    const c = await checkCoupon(db, req.body?.code, { userId: req.dbUser!.id, event, subtotal });
    if (c.ok === false) return res.status(400).json({ error: c.error });
    res.json({ data: { code: c.coupon.code, discount: c.discount, type: c.coupon.type, value: c.coupon.value } });
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
      nudgeWaitlist(order.eventId);
      return res.redirect(`/tickets?payment=failed&order=${order.id}`);
    }
    const [event] = await db.select().from(events).where(eq(events.id, order.eventId));
    const verification = await verifyPayment({ amountRial: toRial(order.amount, event?.currency), authority });
    if (!verification.ok) {
      await db.transaction(tx => failOrder(tx, order.id, 'FAILED'));
      nudgeWaitlist(order.eventId);
      return res.redirect(`/tickets?payment=failed&order=${order.id}`);
    }
    await db.transaction(tx => completeOrder(tx, order.id, verification.refId));
    notifyOrderPaid(order, event?.title || 'رویداد').catch(() => {});
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
    // Refund state of cancelled tickets ("requested" / "paid").
    const myRefunds = await db.select({ status: refunds.status, ticketIds: refunds.ticketIds, amount: refunds.amount, paidAt: refunds.paidAt })
      .from(refunds).where(eq(refunds.userId, userId));
    const refundByTicket = new Map<number, { status: string; paidAt: Date | null }>();
    for (const r of myRefunds) for (const id of (r.ticketIds as number[]) || []) refundByTicket.set(id, { status: r.status, paidAt: r.paidAt });
    res.json({
      data: visible.map(r => ({
        ...r,
        canCancel: r.tickets.status === 'ACTIVE' && !r.tickets.transferredFromId && canCancelTicket(r.events),
        canTransfer: r.tickets.status === 'ACTIVE' && r.events.status === 'PUBLISHED' && (!r.events.startTime || r.events.startTime.getTime() > Date.now()),
        refund: refundByTicket.get(r.tickets.id) || null,
      }))
    });
  }));

  // Cancels one ticket. Free tickets are simply released; paid ones go to the refund queue.
  // After the organizer reschedules an event, holders may cancel right up to the new start time.
  app.post('/api/tickets/:id/cancel', limiters.tickets, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const ticketId = parseInt(req.params.id, 10);
    const outcome = await db.transaction(async (tx) => {
      const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).for('update');
      if (!ticket || (ticket.userId !== req.dbUser!.id && !isAdmin(req))) return { status: 404, body: { error: 'بلیت یافت نشد' } };
      if (ticket.status !== 'ACTIVE') return { status: 400, body: { error: 'این بلیت قابل لغو نیست.' } };
      // The refund of a ticket belongs to whoever paid for it, not to the person it was given to.
      if (ticket.transferredFromId && !isAdmin(req)) return { status: 400, body: { error: 'بلیتی که به شما منتقل شده قابل لغو نیست؛ می‌توانید آن را به شخص دیگری منتقل کنید.' } };
      const [event] = await tx.select().from(events).where(eq(events.id, ticket.eventId));
      if (!canCancelTicket(event) && !isAdmin(req)) {
        return { status: 400, body: { error: `لغو بلیت فقط تا ${CANCEL_DEADLINE_HOURS.toLocaleString('fa-IR')} ساعت پیش از شروع رویداد ممکن است.` } };
      }

      let refund = 'NONE';
      if (ticket.orderId) {
        const [order] = await tx.select().from(orders).where(eq(orders.id, ticket.orderId)).for('update');
        if (order) {
          const owed = await cancelOrderTickets(tx, order, [ticket], event?.postponedFrom ? 'EVENT_POSTPONED' : 'USER_CANCEL');
          refund = owed > 0 ? 'REQUESTED' : ticket.amount > 0 ? 'AUTOMATIC' : 'NONE';
        }
      } else {
        await tx.update(tickets).set({ status: 'CANCELLED', cancelledAt: new Date() }).where(eq(tickets.id, ticketId));
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
      return { status: 200, body: { success: true, refund, eventId: ticket.eventId, message: refund === 'REQUESTED' ? 'بلیت لغو شد و درخواست بازپرداخت ثبت شد.' : 'بلیت لغو شد.' } };
    });
    if ((outcome.body as any).eventId) nudgeWaitlist((outcome.body as any).eventId);
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
    const eventId = parseInt(String(req.query.eventId || ''), 10);
    const rows = await db.select({ refund: refunds, eventTitle: events.title, userName: users.name, userPhone: users.phone, refId: orders.refId })
      .from(refunds).innerJoin(events, eq(refunds.eventId, events.id)).innerJoin(users, eq(refunds.userId, users.id))
      .innerJoin(orders, eq(refunds.orderId, orders.id))
      .where(and(eq(refunds.status, 'REQUESTED'), Number.isInteger(eventId) ? eq(refunds.eventId, eventId) : undefined))
      .orderBy(desc(refunds.createdAt)).limit(500);
    res.json({ data: rows });
  }));

  // Marks refunds paid: one (by id) or every open refund of an event ({ eventId }).
  app.post('/api/admin/refunds/mark-paid', requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter(Number.isInteger);
    const eventId = parseInt(req.body?.eventId, 10);
    if (!ids.length && !Number.isInteger(eventId)) return res.status(400).json({ error: 'بازپرداختی انتخاب نشده است.' });
    const paid = await db.update(refunds).set({ status: 'PAID', paidAt: new Date(), paidById: req.dbUser!.id })
      .where(and(eq(refunds.status, 'REQUESTED'), ids.length ? inArray(refunds.id, ids) : eq(refunds.eventId, eventId))).returning();
    for (const r of paid) await settleRefundedOrder(r.orderId);
    const titles = new Map((await db.select({ id: events.id, title: events.title }).from(events)
      .where(inArray(events.id, [...new Set(paid.map(r => r.eventId)), 0]))).map(e => [e.id, e.title]));
    for (const r of paid) {
      const title = titles.get(r.eventId) || 'رویداد';
      notify(r.userId, {
        type: 'TICKET', title: 'مبلغ بلیت بازپرداخت شد',
        body: `مبلغ ${r.amount.toLocaleString('fa-IR')} تومان بابت «${title}» به حساب شما بازگردانده شد.`, url: '/tickets',
        dedupeKey: `refund-paid:${r.id}`,
        sms: { kind: 'REFUND', params: { amount: r.amount.toLocaleString('en-US'), title } },
      }).catch(() => {});
    }
    res.json({ success: true, data: { paid: paid.length } });
  }));

  // ---------------- organizer: cancel / reschedule an event ----------------
  async function ownedEvent(req: AuthRequest) {
    const [event] = await db.select().from(events).where(eq(events.id, parseInt(req.params.id, 10)));
    if (!event) return { error: 404 as const };
    if (event.organizerId !== req.dbUser!.id && !isAdmin(req)) return { error: 403 as const };
    return { event };
  }

  /** Everyone affected by a change: ticket holders (incl. unpaid holds) and free RSVPs. */
  async function attendeeIds(eventId: number) {
    const holders = await db.selectDistinct({ id: tickets.userId }).from(tickets)
      .where(and(eq(tickets.eventId, eventId), inArray(tickets.status, ['ACTIVE', 'PENDING_PAYMENT'])));
    const rsvps = await db.selectDistinct({ id: interactions.userId }).from(interactions)
      .where(and(eq(interactions.eventId, eventId), eq(interactions.type, 'RSVP')));
    return [...new Set([...holders, ...rsvps].map(r => r.id))];
  }

  app.post('/api/organizer/events/:id/cancel', limiters.contentWrite, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const found = await ownedEvent(req);
    if ('error' in found) return res.status(found.error).json({ error: found.error === 404 ? 'رویداد یافت نشد' : 'شما دسترسی لازم برای این کار را ندارید.' });
    const { event } = found;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (reason.length < 5) return res.status(400).json({ error: 'دلیل لغو را بنویسید؛ برای شرکت‌کنندگان ارسال می‌شود.' });
    if (event.status === 'CANCELLED') return res.status(400).json({ error: 'این رویداد قبلاً لغو شده است.' });
    const endsAt = event.endTime || event.startTime;
    if (endsAt && endsAt.getTime() < Date.now()) return res.status(400).json({ error: 'رویداد برگزار شده و قابل لغو نیست.' });

    const notifyIds = await attendeeIds(event.id);
    let refundTotal = 0, ticketCount = 0;
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(events).where(eq(events.id, event.id)).for('update');
      if (locked.status === 'CANCELLED') return;
      await tx.update(events).set({ status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason }).where(eq(events.id, event.id));
      const eventOrders = await tx.select().from(orders).where(and(eq(orders.eventId, event.id), inArray(orders.status, ['PENDING', 'PAID']))).for('update');
      for (const order of eventOrders) {
        if (order.status === 'PENDING') { await failOrder(tx, order.id, 'CANCELLED'); continue; }
        const active = await tx.select({ id: tickets.id, amount: tickets.amount }).from(tickets)
          .where(and(eq(tickets.orderId, order.id), eq(tickets.status, 'ACTIVE')));
        ticketCount += active.length;
        refundTotal += await cancelOrderTickets(tx, order, active, 'EVENT_CANCELLED');
      }
    });
    for (const userId of notifyIds) {
      notify(userId, {
        type: 'EVENT_CHANGE', title: `رویداد «${event.title}» لغو شد`,
        body: `دلیل: ${reason}${event.cost > 0 ? ' — مبلغ بلیت‌ها بدون نیاز به درخواست بازگردانده می‌شود.' : ''}`,
        url: `/events/${event.id}`, dedupeKey: `event-cancelled:${event.id}:${userId}`,
        sms: { kind: 'EVENT_CANCELLED', params: { title: event.title } },
      }).catch(() => {});
    }
    invalidateCachePattern('admin_stats');
    invalidateEventCaches();
    nudgeWaitlist(event.id); // closes the waiting list
    res.json({ success: true, data: { notified: notifyIds.length, ticketsCancelled: ticketCount, refundTotal } });
  }));

  app.post('/api/organizer/events/:id/postpone', limiters.contentWrite, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const found = await ownedEvent(req);
    if ('error' in found) return res.status(found.error).json({ error: found.error === 404 ? 'رویداد یافت نشد' : 'شما دسترسی لازم برای این کار را ندارید.' });
    const { event } = found;
    if (event.status === 'CANCELLED') return res.status(400).json({ error: 'رویداد لغو شده است.' });
    if (!event.startTime) return res.status(400).json({ error: 'این رویداد زمان مشخصی ندارد؛ از ویرایش رویداد استفاده کنید.' });
    const start = new Date(req.body?.startTime);
    const end = req.body?.endTime ? new Date(req.body.endTime) : null;
    if (isNaN(start.getTime()) || start.getTime() < Date.now() + 3600_000) return res.status(400).json({ error: 'زمان جدید باید دست‌کم یک ساعت بعد از اکنون باشد.' });
    if (end && (isNaN(end.getTime()) || end <= start)) return res.status(400).json({ error: 'زمان پایان باید بعد از زمان شروع باشد.' });
    if (start.getTime() === event.startTime.getTime()) return res.status(400).json({ error: 'زمان جدید با زمان فعلی یکی است.' });
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';

    await db.update(events).set({
      startTime: start, endTime: end ?? (event.endTime ? new Date(start.getTime() + (event.endTime.getTime() - event.startTime.getTime())) : null),
      postponedFrom: event.postponedFrom ?? event.startTime, cancelReason: reason || null,
    }).where(eq(events.id, event.id));

    const when = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', calendar: 'persian', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(start);
    const notifyIds = await attendeeIds(event.id);
    for (const userId of notifyIds) {
      notify(userId, {
        type: 'EVENT_CHANGE', title: `زمان «${event.title}» تغییر کرد`,
        body: `زمان جدید: ${when}.${reason ? ` ${reason}.` : ''}${event.cost > 0 ? ' اگر نمی‌توانید بیایید، تا پیش از زمان جدید بلیت را لغو کنید تا مبلغ کامل بازگردانده شود.' : ''}`,
        url: `/events/${event.id}`, dedupeKey: `event-postponed:${event.id}:${start.getTime()}:${userId}`,
        sms: { kind: 'EVENT_POSTPONED', params: { title: event.title, when } },
      }).catch(() => {});
    }
    invalidateEventCaches();
    res.json({ success: true, data: { notified: notifyIds.length, startTime: start.toISOString() } });
  }));
}
