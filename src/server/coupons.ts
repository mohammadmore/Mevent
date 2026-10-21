import { and, eq, sql } from 'drizzle-orm';
import { db, DbTransaction } from '../db/index.ts';
import { coupons, couponRedemptions, events } from '../db/schema.ts';
import { normalizeDigits } from '../lib/iranIds.ts';

// Discount codes: validation, discount arithmetic, and redeeming/releasing a code for an order.

type Exec = typeof db | DbTransaction;
type Coupon = typeof coupons.$inferSelect;
type EventRow = Pick<typeof events.$inferSelect, 'id' | 'organizerId'>;

export const COUPON_CODE = /^[A-Z0-9_-]{3,20}$/;
export const normalizeCode = (code: unknown) => normalizeDigits(String(code ?? '')).trim().toUpperCase();

/** Discount in toman for a subtotal (never more than the subtotal). */
export function couponDiscount(coupon: Pick<Coupon, 'type' | 'value' | 'maxDiscount'>, subtotal: number) {
  let d = coupon.type === 'PERCENT' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.type === 'PERCENT' && coupon.maxDiscount) d = Math.min(d, coupon.maxDiscount);
  return Math.max(0, Math.min(d, subtotal));
}

/**
 * Checks a code for a user, event and subtotal. With `lock`, the coupon row is locked for the rest
 * of the transaction so concurrent checkouts cannot exceed its usage limit.
 */
export async function checkCoupon(exec: Exec, rawCode: unknown, ctx: { userId: number; event: EventRow; subtotal: number }, lock = false):
  Promise<{ ok: true; coupon: Coupon; discount: number } | { ok: false; error: string }> {
  const code = normalizeCode(rawCode);
  if (!COUPON_CODE.test(code)) return { ok: false, error: 'کد تخفیف معتبر نیست.' };
  const q = exec.select().from(coupons).where(eq(coupons.code, code));
  const [coupon] = lock ? await q.for('update') : await q;
  if (!coupon || !coupon.active) return { ok: false, error: 'کد تخفیف معتبر نیست.' };
  const now = Date.now();
  if (coupon.startsAt && coupon.startsAt.getTime() > now) return { ok: false, error: 'زمان استفاده از این کد هنوز نرسیده است.' };
  if (coupon.endsAt && coupon.endsAt.getTime() < now) return { ok: false, error: 'مهلت استفاده از این کد تمام شده است.' };
  if (coupon.eventId && coupon.eventId !== ctx.event.id) return { ok: false, error: 'این کد برای این رویداد نیست.' };
  if (coupon.organizerId && coupon.organizerId !== ctx.event.organizerId) return { ok: false, error: 'این کد برای این رویداد نیست.' };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return { ok: false, error: 'ظرفیت استفاده از این کد تمام شده است.' };
  if (ctx.subtotal < coupon.minAmount) return { ok: false, error: `این کد برای خرید بالای ${coupon.minAmount.toLocaleString('fa-IR')} تومان است.` };
  const [{ mine }] = await exec.select({ mine: sql<number>`count(*)::int` }).from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, ctx.userId)));
  if (Number(mine) >= coupon.perUserLimit) return { ok: false, error: 'شما قبلاً از این کد استفاده کرده‌اید.' };
  const discount = couponDiscount(coupon, ctx.subtotal);
  if (discount <= 0) return { ok: false, error: 'این کد تخفیفی برای این خرید ندارد.' };
  return { ok: true, coupon, discount };
}

export async function redeemCoupon(tx: DbTransaction, couponId: number, orderId: number, userId: number, discount: number) {
  await tx.insert(couponRedemptions).values({ couponId, orderId, userId, discount });
  await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, couponId));
}

/** Gives a code back when its order fails, expires or is cancelled entirely. */
export async function releaseCoupon(tx: DbTransaction, orderId: number) {
  const removed = await tx.delete(couponRedemptions).where(eq(couponRedemptions.orderId, orderId)).returning();
  for (const r of removed) {
    await tx.update(coupons).set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` }).where(eq(coupons.id, r.couponId));
  }
}
