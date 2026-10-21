import { Express } from 'express';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { orders, supportMessages, supportTickets, users } from '../../db/schema.ts';
import { AuthRequest, requireAuth, requireAdmin, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { notify } from '../../lib/notifications.ts';
import { maskMobile } from '../../lib/phone.ts';

// Support requests: the user opens a request (optionally about an order), staff answer, the
// thread goes back and forth until it is closed. Each side is notified of the other's reply.

export const SUPPORT_CATEGORIES: Record<string, string> = {
  PAYMENT: 'پرداخت و بازپرداخت', TICKET: 'بلیت و ورود', ACCOUNT: 'حساب کاربری', ORGANIZER: 'برگزارکنندگان', OTHER: 'سایر',
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function notifyStaff(title: string, body: string, ticketId: number) {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
  for (const a of admins) notify(a.id, { type: 'SUPPORT', title, body, url: `/support/${ticketId}` }).catch(() => {});
}

export function registerSupportRoutes(app: Express) {
  app.post('/api/support', limiters.account, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const subject = text(req.body?.subject, 150);
    const body = text(req.body?.body, 5000);
    const category = SUPPORT_CATEGORIES[req.body?.category] ? req.body.category : 'OTHER';
    if (subject.length < 3) return res.status(400).json({ error: 'موضوع درخواست را بنویسید.' });
    if (body.length < 10) return res.status(400).json({ error: 'مشکل را کمی بیشتر توضیح دهید.' });
    let orderId: number | null = null;
    if (req.body?.orderId) {
      const [order] = await db.select().from(orders).where(eq(orders.id, Number(req.body.orderId)));
      if (order && order.userId === me.id) orderId = order.id;
    }
    // A user may have a handful of open requests at a time (keeps the queue usable).
    const open = await db.select({ id: supportTickets.id }).from(supportTickets)
      .where(and(eq(supportTickets.userId, me.id), inArray(supportTickets.status, ['OPEN', 'ANSWERED'])));
    if (open.length >= 5) return res.status(429).json({ error: 'چند درخواست باز دارید؛ لطفاً در همان‌ها پیگیری کنید.' });

    const ticket = await db.transaction(async (tx) => {
      const [t] = await tx.insert(supportTickets).values({ userId: me.id, subject, category, orderId }).returning();
      await tx.insert(supportMessages).values({ ticketId: t.id, authorId: me.id, isStaff: false, body });
      return t;
    });
    notifyStaff('درخواست پشتیبانی جدید', `${me.name}: ${subject}`, ticket.id).catch(() => {});
    res.status(201).json({ data: ticket, message: 'درخواست شما ثبت شد؛ پاسخ را در همین بخش و با اعلان دریافت می‌کنید.' });
  }));

  app.get('/api/support', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const rows = await db.select().from(supportTickets).where(eq(supportTickets.userId, req.dbUser!.id)).orderBy(desc(supportTickets.lastMessageAt)).limit(50);
    res.json({ data: rows });
  }));

  app.get('/api/support/:id', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, parseInt(req.params.id, 10)));
    if (!ticket || (ticket.userId !== req.dbUser!.id && !isAdmin(req))) return res.status(404).json({ error: 'درخواست یافت نشد' });
    const messages = await db.select({ id: supportMessages.id, body: supportMessages.body, isStaff: supportMessages.isStaff, createdAt: supportMessages.createdAt, authorName: users.name })
      .from(supportMessages).innerJoin(users, eq(supportMessages.authorId, users.id))
      .where(eq(supportMessages.ticketId, ticket.id)).orderBy(asc(supportMessages.id));
    let requester: any = null;
    if (isAdmin(req)) {
      const [u] = await db.select({ id: users.id, name: users.name, phone: users.phone, email: users.email }).from(users).where(eq(users.id, ticket.userId));
      requester = u ? { ...u, phone: u.phone ? maskMobile(u.phone) : null, fullPhone: u.phone } : null;
    }
    // Staff names stay private: the user sees "پشتیبانی".
    res.json({ data: { ticket, requester, messages: messages.map(m => ({ ...m, authorName: m.isStaff && !isAdmin(req) ? 'پشتیبانی' : m.authorName })) } });
  }));

  app.post('/api/support/:id/messages', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const body = text(req.body?.body, 5000);
    if (body.length < 2) return res.status(400).json({ error: 'متن پیام را بنویسید.' });
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    const staff = isAdmin(req);
    if (!ticket || (ticket.userId !== req.dbUser!.id && !staff)) return res.status(404).json({ error: 'درخواست یافت نشد' });
    if (ticket.status === 'CLOSED' && !staff) return res.status(400).json({ error: 'این درخواست بسته شده است؛ درخواست تازه‌ای ثبت کنید.' });
    const asStaff = staff && ticket.userId !== req.dbUser!.id;
    await db.transaction(async (tx) => {
      await tx.insert(supportMessages).values({ ticketId: id, authorId: req.dbUser!.id, isStaff: asStaff, body });
      await tx.update(supportTickets).set({ status: asStaff ? 'ANSWERED' : 'OPEN', lastMessageAt: new Date() }).where(eq(supportTickets.id, id));
    });
    if (asStaff) {
      notify(ticket.userId, { type: 'SUPPORT', title: 'پاسخ پشتیبانی', body: `به درخواست «${ticket.subject}» پاسخ داده شد.`, url: `/support/${id}` }).catch(() => {});
    } else {
      notifyStaff('پیام تازه در پشتیبانی', `${req.dbUser!.name}: ${ticket.subject}`, id).catch(() => {});
    }
    res.status(201).json({ success: true });
  }));

  app.post('/api/support/:id/close', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    if (!ticket || (ticket.userId !== req.dbUser!.id && !isAdmin(req))) return res.status(404).json({ error: 'درخواست یافت نشد' });
    await db.update(supportTickets).set({ status: 'CLOSED' }).where(eq(supportTickets.id, id));
    res.json({ success: true });
  }));

  app.get('/api/admin/support', requireAdmin, asyncRoute(async (req, res) => {
    const status = ['OPEN', 'ANSWERED', 'CLOSED'].includes(String(req.query.status)) ? String(req.query.status) : 'OPEN';
    const rows = await db.select({ ticket: supportTickets, userName: users.name }).from(supportTickets)
      .innerJoin(users, eq(supportTickets.userId, users.id))
      .where(eq(supportTickets.status, status)).orderBy(status === 'OPEN' ? asc(supportTickets.lastMessageAt) : desc(supportTickets.lastMessageAt)).limit(100);
    res.json({ data: rows.map(r => ({ ...r.ticket, userName: r.userName })) });
  }));
}
