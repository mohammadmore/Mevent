import { Express } from 'express';
import crypto from 'crypto';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users, interactions } from '../../db/schema.ts';
import { getSavedEvents, getRsvpEvents } from '../../db/events.ts';
import { AuthRequest, requireAuth, requireAdmin, requireSelfOrAdmin, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { PUBLIC_USER_FIELDS, toPublicUser, parseJsonArray, formatEvents } from '../helpers.ts';
import { getFromCache, setToCache, invalidateCachePattern } from '../../lib/sharedStore.ts';
import { changePoints, getPointHistory, levelFor, POINT_VALUE_TOMAN, MAX_POINTS_SHARE } from '../../lib/points.ts';
import { notify } from '../../lib/notifications.ts';

export const INVITER_POINTS = 100;
export const INVITEE_POINTS = 50;

function newInviteCode() {
  return crypto.randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, 'X');
}

function selfView(user: typeof users.$inferSelect) {
  return { ...user, level: levelFor(user.points) };
}

export function registerUserRoutes(app: Express) {
  // Creates the DB user on first sign-in and keeps the e-mail in sync. Identity comes from the
  // verified token; the display name is only set on creation so profile edits are not overwritten.
  app.post('/api/auth/sync', asyncRoute(async (req: AuthRequest, res) => {
    const decoded = req.firebaseUser;
    if (!decoded) return res.status(401).json({ error: 'اعتبارسنجی نا‌موفق بود' });

    const existing = req.dbUser;
    if (existing) {
      const update: any = {};
      if (decoded.email && decoded.email !== existing.email) update.email = decoded.email;
      if (!existing.inviteCode) update.inviteCode = newInviteCode();
      const user = Object.keys(update).length
        ? (await db.update(users).set(update).where(eq(users.id, existing.id)).returning())[0]
        : existing;
      return res.json({ data: selfView(user), created: false });
    }

    const name = (decoded.name || req.body?.name || 'بدون نام').toString().slice(0, 100);
    const inviteCodeUsed = typeof req.body?.inviteCode === 'string' ? req.body.inviteCode.trim().toUpperCase() : '';

    const result = await db.transaction(async (tx) => {
      const inserted = await tx.insert(users).values({
        uid: decoded.uid,
        email: decoded.email || null,
        name,
        inviteCode: newInviteCode(),
      }).onConflictDoNothing({ target: users.uid }).returning();

      // Lost a race with a parallel sync for the same account: just return the row.
      if (!inserted[0]) {
        const [row] = await tx.select().from(users).where(eq(users.uid, decoded.uid));
        return { user: row, inviter: null as null | typeof users.$inferSelect };
      }

      let user = inserted[0];
      let inviter: typeof users.$inferSelect | null = null;
      if (inviteCodeUsed) {
        [inviter] = await tx.select().from(users).where(eq(users.inviteCode, inviteCodeUsed));
        if (inviter && inviter.id !== user.id) {
          [user] = await tx.update(users).set({ referredById: inviter.id }).where(eq(users.id, user.id)).returning();
          await changePoints(tx, inviter.id, INVITER_POINTS, 'INVITE_ACCEPTED', { type: 'USER', id: user.id });
          await changePoints(tx, user.id, INVITEE_POINTS, 'INVITE_JOINED', { type: 'USER', id: inviter.id });
          [user] = await tx.select().from(users).where(eq(users.id, user.id));
        } else {
          inviter = null;
        }
      }
      return { user, inviter };
    });

    if (result.inviter) {
      invalidateCachePattern('leaderboard');
      notify(result.inviter.id, {
        type: 'INVITE',
        title: 'دوستتان به میونت پیوست',
        body: `${result.user.name} با لینک دعوت شما عضو شد و ${INVITER_POINTS.toLocaleString('fa-IR')} امتیاز گرفتید.`,
        url: '/profile',
      }).catch(() => {});
    }
    res.json({ data: selfView(result.user), created: true });
  }));

  app.get('/api/users/leaderboard', asyncRoute(async (req, res) => {
    const cached = await getFromCache('leaderboard');
    if (cached) return res.json({ data: cached });
    const leaderboard = (await db.select(PUBLIC_USER_FIELDS).from(users).orderBy(desc(users.points)).limit(10))
      .map(u => ({ ...u, level: levelFor(u.points) }));
    await setToCache('leaderboard', leaderboard, 10000);
    res.json({ data: leaderboard });
  }));

  app.get('/api/users/me/points', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    res.json({
      data: {
        points: me.points,
        level: levelFor(me.points),
        inviteCode: me.inviteCode,
        redeem: { pointValueToman: POINT_VALUE_TOMAN, maxShare: MAX_POINTS_SHARE },
        history: await getPointHistory(me.id),
      }
    });
  }));

  // Manual point adjustment is an admin tool; regular users earn points through server-side actions only.
  app.post('/api/users/:id/points', requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    const userId = parseInt(req.params.id, 10);
    const points = parseInt(req.body.points, 10);
    if (!Number.isInteger(userId) || !Number.isInteger(points)) {
      return res.status(400).json({ error: 'مقدار امتیاز نامعتبر است' });
    }
    await db.transaction(tx => changePoints(tx, userId, points, 'ADMIN_ADJUSTMENT', { type: 'USER', id: req.dbUser!.id }));
    invalidateCachePattern('leaderboard');
    res.json({ success: true });
  }));

  // Organizer accounts are reviewed by an admin before they can publish events.
  app.post('/api/users/me/organizer-request', limiters.account, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    if (me.role !== 'USER') return res.json({ success: true, status: 'APPROVED', message: 'حساب شما از قبل برگزارکننده است.' });
    if (me.organizerStatus === 'PENDING') return res.json({ success: true, status: 'PENDING', message: 'درخواست شما در حال بررسی است.' });
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 1000) : '';
    if (note.length < 10) {
      return res.status(400).json({ error: 'لطفاً در چند جمله درباره خودتان و رویدادهایی که برگزار می‌کنید توضیح دهید.' });
    }
    await db.update(users).set({ organizerStatus: 'PENDING', organizerRequestNote: note }).where(eq(users.id, me.id));
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
    for (const a of admins) {
      notify(a.id, { type: 'ORGANIZER_REQUEST', title: 'درخواست جدید برگزارکننده', body: `${me.name} درخواست حساب برگزارکننده داده است.`, url: '/admin' }).catch(() => {});
    }
    res.json({ success: true, status: 'PENDING', message: 'درخواست شما ثبت شد و پس از بررسی نتیجه اعلام می‌شود.' });
  }));

  // Removes the viewing history used for recommendations (saves, RSVPs and tickets are kept).
  app.delete('/api/users/me/history', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const deleted = await db.delete(interactions)
      .where(and(eq(interactions.userId, req.dbUser!.id), inArray(interactions.type, ['VIEW'])))
      .returning({ id: interactions.id });
    res.json({ success: true, deleted: deleted.length, message: 'تاریخچه بازدیدهای شما پاک شد.' });
  }));

  app.get('/api/users/:id/saved', requireSelfOrAdmin('id'), asyncRoute(async (req, res) => {
    res.json({ data: await formatEvents(await getSavedEvents(parseInt(req.params.id, 10))) });
  }));

  app.get('/api/users/:id/rsvped', requireSelfOrAdmin('id'), asyncRoute(async (req, res) => {
    res.json({ data: await formatEvents(await getRsvpEvents(parseInt(req.params.id, 10))) });
  }));

  // Profiles are public (organizer pages), but private fields are only returned to the owner or an admin.
  app.get('/api/users/:id/profile', asyncRoute(async (req: AuthRequest, res) => {
    const userId = parseInt(req.params.id, 10);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    const canSeePrivate = req.dbUser?.id === user.id || isAdmin(req);
    res.json({ data: canSeePrivate ? selfView(user) : { ...toPublicUser(user), level: levelFor(user.points) } });
  }));

  app.put('/api/users/:id/profile', requireSelfOrAdmin('id'), asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const allowed = ['name', 'bio', 'coverImage', 'organizerType', 'website', 'instagram', 'telegram', 'twitter', 'city'];
    const update: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = typeof req.body[key] === 'string' ? req.body[key].slice(0, 2000) : req.body[key];
    }
    if (update.name !== undefined && !String(update.name).trim()) delete update.name;
    if (update.city !== undefined && !String(update.city).trim()) delete update.city;
    if (req.body.advancedDetails !== undefined && typeof req.body.advancedDetails === 'object') {
      update.advancedDetails = req.body.advancedDetails || {};
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'هیچ فیلدی برای ذخیره ارسال نشده است' });
    }
    const [user] = await db.update(users).set(update).where(eq(users.id, userId)).returning();
    res.json({ message: 'پروفایل با موفقیت ذخیره شد.', data: selfView(user) });
  }));

  app.put('/api/users/:id/preferences', requireSelfOrAdmin('id'), asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const preferences = parseJsonArray(req.body.preferences).map(String).slice(0, 50);
    const [user] = await db.update(users).set({ preferences }).where(eq(users.id, userId)).returning();
    res.json({ message: 'علایق شما با موفقیت ذخیره شد.', data: selfView(user) });
  }));
}
