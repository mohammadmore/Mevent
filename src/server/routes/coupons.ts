import { Express } from 'express';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { coupons, events } from '../../db/schema.ts';
import { AuthRequest, requireRole, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { COUPON_CODE, normalizeCode } from '../coupons.ts';

// Discount code management. Organizers manage codes for their own events; admins can also create
// site-wide codes (scope "SITE").

const int = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number.isInteger(Number(v)) ? Number(v) : NaN);
const date = (v: unknown) => (v ? new Date(String(v)) : null);

export function registerCouponRoutes(app: Express) {
  const organizer = requireRole('ORGANIZER', 'ADMIN');

  app.get('/api/organizer/coupons', organizer, asyncRoute(async (req: AuthRequest, res) => {
    // Organizers see their own codes; admins also see site-wide ones (or everything with ?all=1).
    const me = req.dbUser!.id;
    const where = !isAdmin(req) ? eq(coupons.organizerId, me) : req.query.all === '1' ? undefined : or(eq(coupons.organizerId, me), isNull(coupons.organizerId));
    const rows = await db.select({
      coupon: coupons, eventTitle: events.title,
      totalDiscount: sql<number>`coalesce((select sum(discount) from coupon_redemptions r where r.coupon_id = ${coupons.id}), 0)::int`,
    }).from(coupons).leftJoin(events, eq(coupons.eventId, events.id))
      .where(where)
      .orderBy(desc(coupons.id)).limit(200);
    res.json({ data: rows.map(r => ({ ...r.coupon, eventTitle: r.eventTitle, totalDiscount: Number(r.totalDiscount), scope: r.coupon.organizerId === null ? 'SITE' : r.coupon.eventId ? 'EVENT' : 'ORGANIZER' })) });
  }));

  app.post('/api/organizer/coupons', limiters.contentWrite, organizer, asyncRoute(async (req: AuthRequest, res) => {
    const b = req.body || {};
    const code = normalizeCode(b.code);
    if (!COUPON_CODE.test(code)) return res.status(400).json({ error: 'کد باید ۳ تا ۲۰ حرف لاتین، عدد، - یا _ باشد.' });
    const type = b.type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
    const value = int(b.value);
    if (!value || value < 1 || (type === 'PERCENT' && value > 100)) return res.status(400).json({ error: type === 'PERCENT' ? 'درصد تخفیف باید بین ۱ تا ۱۰۰ باشد.' : 'مبلغ تخفیف را وارد کنید.' });
    const maxDiscount = int(b.maxDiscount), minAmount = int(b.minAmount) ?? 0, maxUses = int(b.maxUses), perUserLimit = int(b.perUserLimit) ?? 1;
    if ([maxDiscount, minAmount, maxUses, perUserLimit].some(n => Number.isNaN(n) || (n !== null && n < 0)) || perUserLimit! < 1) return res.status(400).json({ error: 'عددهای واردشده معتبر نیستند.' });
    const startsAt = date(b.startsAt), endsAt = date(b.endsAt);
    if ((startsAt && isNaN(startsAt.getTime())) || (endsAt && isNaN(endsAt.getTime())) || (startsAt && endsAt && endsAt <= startsAt)) return res.status(400).json({ error: 'بازه زمانی معتبر نیست.' });

    // Scope: one event, all my events, or (admins) the whole site.
    let organizerId: number | null = req.dbUser!.id;
    let eventId: number | null = null;
    if (b.scope === 'SITE') {
      if (!isAdmin(req)) return res.status(403).json({ error: 'کد تخفیف سراسری فقط توسط مدیر ساخته می‌شود.' });
      organizerId = null;
    } else if (b.eventId) {
      const [event] = await db.select().from(events).where(eq(events.id, Number(b.eventId)));
      if (!event || (event.organizerId !== req.dbUser!.id && !isAdmin(req))) return res.status(404).json({ error: 'رویداد یافت نشد.' });
      eventId = event.id;
      organizerId = event.organizerId;
    }
    const [created] = await db.insert(coupons).values({
      code, organizerId, eventId, type, value, maxDiscount: type === 'PERCENT' ? maxDiscount : null, minAmount: minAmount!,
      maxUses, perUserLimit: perUserLimit!, startsAt, endsAt, createdById: req.dbUser!.id,
    }).onConflictDoNothing().returning();
    if (!created) return res.status(409).json({ error: 'این کد قبلاً ساخته شده است؛ کد دیگری انتخاب کنید.' });
    res.status(201).json({ data: created });
  }));

  // Codes are switched off rather than deleted, so past orders keep their record.
  app.patch('/api/organizer/coupons/:id', organizer, asyncRoute(async (req: AuthRequest, res) => {
    if (typeof req.body?.active !== 'boolean') return res.status(400).json({ error: 'مقدار نامعتبر است' });
    const id = parseInt(req.params.id, 10);
    const owned = isAdmin(req) ? eq(coupons.id, id) : and(eq(coupons.id, id), eq(coupons.organizerId, req.dbUser!.id));
    const [updated] = await db.update(coupons).set({ active: req.body.active }).where(owned).returning();
    if (!updated) return res.status(404).json({ error: 'کد تخفیف یافت نشد' });
    res.json({ data: updated });
  }));
}
