import { Express } from 'express';
import crypto from 'crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { otpCodes, users } from '../../db/schema.ts';
import { AuthRequest, requireAuth, googleLoginAvailable, notSignedIn } from '../../middleware/auth.ts';
import { asyncRoute, createRateLimiter } from '../infra.ts';
import { normalizeIranMobile, maskMobile, toLatinDigits } from '../../lib/phone.ts';
import { sendVerificationCode, smsProvider, SmsError } from '../../lib/sms.ts';
import { createSession, destroySession, destroyAllSessions } from '../session.ts';
import { createUserWithInvite, selfView } from '../accounts.ts';

// Phone number + SMS code sign-in.
//
// Abuse controls: one code per number per minute, at most 5 codes per number per hour,
// a per-IP limit on requests and verifications, 5 wrong guesses per code, codes valid for
// 2 minutes, and only an HMAC of the code is stored.

const CODE_LENGTH = 6;
const CODE_TTL_MS = 2 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

const OTP_SECRET = process.env.OTP_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-otp-secret');
if (!OTP_SECRET) console.warn('OTP_SECRET is not set: phone login is disabled.');

export const phoneLoginEnabled = Boolean(smsProvider && OTP_SECRET);

const otpRequestLimiter = createRateLimiter('otp-request', 10, 10 * 60_000);
const otpVerifyLimiter = createRateLimiter('otp-verify', 30, 10 * 60_000);

type Purpose = 'LOGIN' | 'LINK';

function hashCode(purpose: Purpose, phone: string, code: string) {
  return crypto.createHmac('sha256', OTP_SECRET).update(`${purpose}:${phone}:${code}`).digest('hex');
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checks a submitted code; on success the code is consumed so it can never be reused. */
async function consumeCode(purpose: Purpose, phone: string, code: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const [row] = await db.select().from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt)).limit(1);
  if (!row) return { ok: false, status: 400, error: 'کد منقضی شده است. لطفاً کد جدید دریافت کنید.' };
  if (row.attempts >= MAX_ATTEMPTS) {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
    return { ok: false, status: 429, error: 'تعداد تلاش‌های نادرست زیاد بود. لطفاً کد جدید دریافت کنید.' };
  }
  if (!sameHash(row.codeHash, hashCode(purpose, phone, code))) {
    // Atomic increment: parallel guesses cannot exceed the limit.
    const [updated] = await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, row.id)).returning({ attempts: otpCodes.attempts });
    const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    return { ok: false, status: 400, error: left > 0 ? `کد وارد شده درست نیست. ${left.toLocaleString('fa-IR')} بار دیگر می‌توانید تلاش کنید.` : 'تعداد تلاش‌های نادرست زیاد بود. لطفاً کد جدید دریافت کنید.' };
  }
  // Only one request can consume the code, even if two arrive at the same time.
  const consumed = await db.update(otpCodes).set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt))).returning({ id: otpCodes.id });
  if (consumed.length === 0) return { ok: false, status: 400, error: 'این کد قبلاً استفاده شده است.' };
  return { ok: true };
}

function readCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = toLatinDigits(value).replace(/\s/g, '');
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(digits) ? digits : null;
}

/** Removes codes older than a day (they are kept briefly for the hourly limit). */
export async function pruneOtpCodes() {
  await db.delete(otpCodes).where(sql`${otpCodes.createdAt} < now() - interval '1 day'`);
}

export function registerAuthRoutes(app: Express) {
  app.get('/api/auth/config', (req, res) => {
    res.json({
      data: {
        phone: phoneLoginEnabled,
        google: googleLoginAvailable(),
        codeLength: CODE_LENGTH,
        resendSeconds: RESEND_COOLDOWN_MS / 1000,
      }
    });
  });

  app.get('/api/auth/me', (req: AuthRequest, res) => {
    res.json({ data: req.dbUser ? selfView(req.dbUser) : null, via: req.sessionId ? 'session' : req.firebaseUser ? 'google' : null });
  });

  app.post('/api/auth/otp/request', otpRequestLimiter, asyncRoute(async (req: AuthRequest, res) => {
    if (!phoneLoginEnabled) return res.status(503).json({ error: 'ورود با شماره موبایل در حال حاضر فعال نیست.' });
    const phone = normalizeIranMobile(req.body?.phone);
    if (!phone) return res.status(400).json({ error: 'شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹' });
    const purpose: Purpose = req.body?.purpose === 'LINK' ? 'LINK' : 'LOGIN';

    if (purpose === 'LINK') {
      if (!req.dbUser) return notSignedIn(req, res);
      const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
      if (owner && owner.id !== req.dbUser.id) {
        return res.status(409).json({ error: 'این شماره به حساب دیگری متصل است. برای ادغام حساب‌ها با پشتیبانی تماس بگیرید.' });
      }
    }

    const recent = await db.select({ createdAt: otpCodes.createdAt }).from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, new Date(Date.now() - 3600_000))))
      .orderBy(desc(otpCodes.createdAt));
    const last = recent[0]?.createdAt?.getTime() ?? 0;
    if (Date.now() - last < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last)) / 1000);
      return res.status(429).json({ error: `برای دریافت کد جدید ${retryAfter.toLocaleString('fa-IR')} ثانیه صبر کنید.`, retryAfter });
    }
    if (recent.length >= MAX_CODES_PER_HOUR) {
      return res.status(429).json({ error: 'تعداد درخواست کد برای این شماره زیاد بوده است. یک ساعت دیگر تلاش کنید.', retryAfter: 3600 });
    }

    const code = String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
    // A new code replaces any earlier one for the same number.
    await db.update(otpCodes).set({ consumedAt: new Date() })
      .where(and(eq(otpCodes.phone, phone), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)));
    const [row] = await db.insert(otpCodes).values({
      phone, purpose, codeHash: hashCode(purpose, phone, code), expiresAt: new Date(Date.now() + CODE_TTL_MS), ip: req.ip || null,
    }).returning({ id: otpCodes.id });

    try {
      await sendVerificationCode(phone, code);
    } catch (err) {
      await db.delete(otpCodes).where(eq(otpCodes.id, row.id));
      console.error('SMS send failed:', (err as Error).message);
      return res.status(502).json({ error: err instanceof SmsError ? 'ارسال پیامک انجام نشد. چند دقیقه دیگر دوباره تلاش کنید.' : 'خطا در ارسال کد' });
    }

    res.json({
      success: true,
      phone: maskMobile(phone),
      expiresIn: CODE_TTL_MS / 1000,
      resendIn: RESEND_COOLDOWN_MS / 1000,
      // Development convenience only: never returned by a real SMS provider or in production.
      ...(smsProvider === 'console' && process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    });
  }));

  app.post('/api/auth/otp/verify', otpVerifyLimiter, asyncRoute(async (req: AuthRequest, res) => {
    if (!phoneLoginEnabled) return res.status(503).json({ error: 'ورود با شماره موبایل در حال حاضر فعال نیست.' });
    const phone = normalizeIranMobile(req.body?.phone);
    const code = readCode(req.body?.code);
    if (!phone || !code) return res.status(400).json({ error: 'شماره یا کد وارد شده معتبر نیست.' });

    const check = await consumeCode('LOGIN', phone, code);
    if (check.ok === false) return res.status(check.status).json({ error: check.error });

    let [user] = await db.select().from(users).where(eq(users.phone, phone));
    let created = false;
    if (!user) {
      const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : `کاربر ${maskMobile(phone)}`;
      ({ user, created } = await createUserWithInvite({ uid: `phone:${phone}`, phone, name }, req.body?.inviteCode, 'phone'));
    }

    await createSession(req, res, user.id);
    res.json({ data: selfView(user), created });
  }));

  // Attach a verified phone number to the signed-in account (e.g. an existing Google account),
  // so the user can keep signing in with SMS when Google sign-in is unavailable.
  app.post('/api/auth/phone/link', otpVerifyLimiter, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const phone = normalizeIranMobile(req.body?.phone);
    const code = readCode(req.body?.code);
    if (!phone || !code) return res.status(400).json({ error: 'شماره یا کد وارد شده معتبر نیست.' });
    const check = await consumeCode('LINK', phone, code);
    if (check.ok === false) return res.status(check.status).json({ error: check.error });
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    if (owner && owner.id !== req.dbUser!.id) {
      return res.status(409).json({ error: 'این شماره به حساب دیگری متصل است. برای ادغام حساب‌ها با پشتیبانی تماس بگیرید.' });
    }
    const [user] = await db.update(users).set({ phone }).where(eq(users.id, req.dbUser!.id)).returning();
    res.json({ data: selfView(user), message: 'شماره موبایل به حساب شما متصل شد.' });
  }));

  app.post('/api/auth/logout', asyncRoute(async (req, res) => {
    await destroySession(req, res);
    res.json({ success: true });
  }));

  app.post('/api/auth/logout-all', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    // Signs out every other device; the current one stays signed in.
    await destroyAllSessions(req.dbUser!.id, req.sessionId);
    res.json({ success: true, message: 'از همه دستگاه‌های دیگر خارج شدید.' });
  }));
}
