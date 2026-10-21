import { Express, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';
import { AuthRequest, requireAuth, requireAdmin, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { notify } from '../../lib/notifications.ts';
import { savePrivateFile, sendPrivateFile, PRIVATE_NAME } from '../../lib/storage.ts';
import { isValidNationalId, isValidCompanyId, isValidSheba, normalizeDigits } from '../../lib/iranIds.ts';
import { jalaliToGregorian } from '../eventExtractor.ts';
import { maskMobile } from '../../lib/phone.ts';

// Organizer identity verification (KYC). Selling paid tickets requires a verified organizer.
// Documents are private files: only their owner and admins can open them.
//
// Automatic matching of the mobile number with the national code (Shahkar) needs a contract with
// a provider (Finnotech, Jibit, ...); until then an admin checks the documents by hand.

const DOC_TYPES: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(DOC_TYPES[file.mimetype])),
});

/** Real file signatures, so a renamed file cannot pass as an image/PDF. */
function looksLike(buffer: Buffer, mime: string) {
  const b = buffer.subarray(0, 12);
  if (mime === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === 'image/png') return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/webp') return b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'application/pdf') return b.subarray(0, 5).toString() === '%PDF-';
  return false;
}

const text = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function ageFromJalali(value: string): number | null {
  const m = normalizeDigits(value).replace(/-/g, '/').match(/^(1[34]\d{2})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const [y, mo, d] = jalaliToGregorian(Number(m[1]), Number(m[2]), Number(m[3]));
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (isNaN(born.getTime()) || Number(m[2]) > 12 || Number(m[3]) > 31) return null;
  return (Date.now() - born.getTime()) / (365.2425 * 86400_000);
}

/** Validates a submission; documents must be files this user uploaded. */
function validate(body: any, userId: number): { type: 'INDIVIDUAL' | 'COMPANY'; data: Record<string, string> } | { error: string } {
  const type = body?.type === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';
  const ownDoc = (name: unknown) => typeof name === 'string' && PRIVATE_NAME.test(name) && name.startsWith(`${userId}-`);
  const sheba = normalizeDigits(text(body?.sheba, 40)).toUpperCase();
  if (sheba && !isValidSheba(sheba)) return { error: 'شماره شبا معتبر نیست.' };

  if (type === 'INDIVIDUAL') {
    const fullName = text(body?.fullName);
    const nationalId = normalizeDigits(text(body?.nationalId, 20));
    const birthDate = text(body?.birthDate, 12);
    if (fullName.length < 5) return { error: 'نام و نام خانوادگی را کامل وارد کنید.' };
    if (!isValidNationalId(nationalId)) return { error: 'کد ملی معتبر نیست.' };
    const age = ageFromJalali(birthDate);
    if (age === null) return { error: 'تاریخ تولد را به شکل ۱۳۷۰/۰۱/۳۱ وارد کنید.' };
    if (age < 18) return { error: 'برگزارکننده باید دست‌کم ۱۸ سال داشته باشد.' };
    if (!ownDoc(body?.idCardImage)) return { error: 'تصویر کارت ملی را بارگذاری کنید.' };
    return { type, data: { fullName, nationalId, birthDate: normalizeDigits(birthDate), idCardImage: body.idCardImage, sheba } };
  }

  const companyName = text(body?.companyName);
  const companyId = normalizeDigits(text(body?.companyId, 20));
  const registrationNumber = normalizeDigits(text(body?.registrationNumber, 20));
  const ceoName = text(body?.ceoName);
  const ceoNationalId = normalizeDigits(text(body?.ceoNationalId, 20));
  if (companyName.length < 3) return { error: 'نام شرکت را وارد کنید.' };
  if (!isValidCompanyId(companyId)) return { error: 'شناسه ملی شرکت معتبر نیست.' };
  if (!/^\d{1,10}$/.test(registrationNumber)) return { error: 'شماره ثبت معتبر نیست.' };
  if (ceoName.length < 5) return { error: 'نام مدیرعامل را وارد کنید.' };
  if (!isValidNationalId(ceoNationalId)) return { error: 'کد ملی مدیرعامل معتبر نیست.' };
  if (!ownDoc(body?.gazetteImage)) return { error: 'تصویر آگهی روزنامه رسمی (آخرین تغییرات) را بارگذاری کنید.' };
  return { type, data: { companyName, companyId, registrationNumber, ceoName, ceoNationalId, gazetteImage: body.gazetteImage, sheba } };
}

/** Paid tickets need a verified organizer (admins excepted). Sends the error response itself. */
export function assertCanSellPaid(req: AuthRequest, cost: unknown, res: Response): boolean {
  if (!(Number(cost) > 0) || isAdmin(req) || req.dbUser?.kycStatus === 'VERIFIED') return true;
  res.status(403).json({
    error: 'برای فروش بلیت پولی ابتدا احراز هویت برگزارکننده را از پنل برگزارکننده کامل کنید.',
    code: 'KYC_REQUIRED',
  });
  return false;
}

const kycView = (u: typeof users.$inferSelect) => ({
  status: u.kycStatus, type: u.kycType, data: u.kycData, note: u.kycNote,
  submittedAt: u.kycSubmittedAt, reviewedAt: u.kycReviewedAt, phoneVerified: Boolean(u.phone),
});

export function registerKycRoutes(app: Express) {
  app.get('/api/kyc/me', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    res.json({ data: kycView(req.dbUser!) });
  }));

  // Uploads one identity document (image or PDF) as a private file.
  app.post('/api/kyc/documents', limiters.upload, requireAuth, (req: AuthRequest, res) => {
    upload.single('file')(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'حجم فایل نباید بیشتر از ۵ مگابایت باشد' : 'بارگذاری فایل انجام نشد' });
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file || !looksLike(file.buffer, file.mimetype)) return res.status(400).json({ error: 'فقط تصویر (JPG، PNG، WEBP) یا PDF قابل قبول است.' });
      try {
        const name = `${req.dbUser!.id}-${crypto.randomUUID()}${DOC_TYPES[file.mimetype]}`;
        await savePrivateFile(name, file.buffer, file.mimetype);
        res.status(201).json({ data: { name } });
      } catch (e) {
        console.error('kyc upload failed:', e);
        res.status(500).json({ error: 'ذخیره فایل انجام نشد' });
      }
    });
  });

  app.get('/api/kyc/documents/:name', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const name = String(req.params.name);
    if (!name.startsWith(`${req.dbUser!.id}-`) && !isAdmin(req)) return res.status(404).end();
    await sendPrivateFile(name, res);
  }));

  app.post('/api/kyc', limiters.account, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    if (me.role !== 'ORGANIZER' && me.role !== 'ADMIN') return res.status(403).json({ error: 'احراز هویت برای حساب‌های برگزارکننده است.' });
    if (!me.phone) return res.status(400).json({ error: 'ابتدا شماره موبایل خود را از صفحه پروفایل به حساب وصل کنید.', code: 'PHONE_REQUIRED' });
    if (me.kycStatus === 'VERIFIED') return res.status(400).json({ error: 'حساب شما قبلاً تأیید شده است.' });
    if (me.kycStatus === 'PENDING') return res.status(409).json({ error: 'مدارک شما در حال بررسی است.' });
    const result = validate(req.body, me.id);
    if ('error' in result) return res.status(400).json({ error: result.error });

    // One identity per verified account: the same national/company id cannot verify two accounts.
    const idField = result.type === 'INDIVIDUAL' ? 'nationalId' : 'companyId';
    const [dup] = await db.select({ id: users.id }).from(users).where(and(
      inArray(users.kycStatus, ['PENDING', 'VERIFIED']), ne(users.id, me.id),
      sql`${users.kycData}->>${idField} = ${result.data[idField]}`,
    )).limit(1);
    if (dup) return res.status(409).json({ error: 'این کد ملی/شناسه قبلاً برای حساب دیگری ثبت شده است. با پشتیبانی تماس بگیرید.' });

    const [u] = await db.update(users).set({
      kycStatus: 'PENDING', kycType: result.type, kycData: result.data, kycNote: null, kycSubmittedAt: new Date(),
    }).where(eq(users.id, me.id)).returning();
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
    for (const a of admins) {
      notify(a.id, { type: 'KYC', title: 'مدارک احراز هویت جدید', body: `${me.name} مدارک احراز هویت برگزارکننده را فرستاده است.`, url: '/admin' }).catch(() => {});
    }
    res.json({ data: kycView(u), message: 'مدارک ثبت شد و پس از بررسی نتیجه اعلام می‌شود.' });
  }));

  // ---------------- admin review ----------------
  app.get('/api/admin/kyc', requireAdmin, asyncRoute(async (req, res) => {
    const status = ['PENDING', 'VERIFIED', 'REJECTED'].includes(String(req.query.status)) ? String(req.query.status) : 'PENDING';
    const rows = await db.select().from(users).where(eq(users.kycStatus, status)).orderBy(desc(users.kycSubmittedAt)).limit(100);
    res.json({ data: rows.map(u => ({ id: u.id, name: u.name, phone: u.phone ? maskMobile(u.phone) : null, fullPhone: u.phone, ...kycView(u) })) });
  }));

  app.post('/api/admin/kyc/:userId', requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    const userId = parseInt(req.params.userId, 10);
    const approve = req.body?.action === 'approve';
    const reason = text(req.body?.reason, 500);
    if (!approve && reason.length < 5) return res.status(400).json({ error: 'دلیل رد را بنویسید تا کاربر بتواند اصلاح کند.' });
    const [u] = await db.update(users).set({
      kycStatus: approve ? 'VERIFIED' : 'REJECTED', kycNote: approve ? null : reason,
      kycReviewedAt: new Date(), kycReviewedById: req.dbUser!.id,
    }).where(and(eq(users.id, userId), eq(users.kycStatus, 'PENDING'))).returning();
    if (!u) return res.status(404).json({ error: 'درخواست در انتظاری برای این کاربر نیست.' });
    notify(u.id, approve
      ? { type: 'KYC', title: 'احراز هویت تأیید شد', body: 'اکنون می‌توانید برای رویدادهایتان بلیت پولی بفروشید.', url: '/organizer' }
      : { type: 'KYC', title: 'احراز هویت تأیید نشد', body: `دلیل: ${reason}. مدارک را اصلاح و دوباره ارسال کنید.`, url: '/organizer' }).catch(() => {});
    res.json({ success: true });
  }));
}
