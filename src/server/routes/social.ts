import { Express } from 'express';
import crypto from 'crypto';
import { eq, and, sql, desc, isNull, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { events, interactions, tickets, hubs, hubMembers, notifications, pushSubscriptions, trips } from '../../db/schema.ts';
import { queryEvents } from '../../db/events.ts';
import { AuthRequest, requireAuth, requireAdmin, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters, parsePaging } from '../infra.ts';
import { formatEvents } from '../helpers.ts';
import { invalidateCachePattern } from '../../lib/sharedStore.ts';
import { changePoints } from '../../lib/points.ts';
import { getVapidPublicKey } from '../../lib/notifications.ts';
import { RSVP_POINTS } from './commerce.ts';
import { seatsTaken } from '../seats.ts';

// SAVE and RSVP toggle; VIEW and SHARE are recorded (and rewarded) once per user and event.
// Points are granted when an interaction is created and taken back when a toggle removes it,
// so repeated clicks cannot farm points.
const INTERACTION_POINTS: Record<string, number> = { RSVP: RSVP_POINTS, SAVE: 10, VIEW: 1, SHARE: 50 };
const TOGGLE_TYPES = ['SAVE', 'RSVP'];

export function registerSocialRoutes(app: Express) {
  app.post('/api/interactions', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const { eventId, type, metadata } = req.body;
    const userId = req.dbUser!.id;
    const parsedEventId = parseInt(eventId, 10);
    if (!Number.isInteger(parsedEventId) || !(type in INTERACTION_POINTS)) {
      return res.status(400).json({ error: 'اطلاعات تعامل نامعتبر است' });
    }

    const outcome = await db.transaction(async (tx) => {
      // Only RSVPs compete for capacity, so only they lock the event row.
      const eventQuery = tx.select().from(events).where(eq(events.id, parsedEventId));
      const [event] = type === 'RSVP' ? await eventQuery.for('update') : await eventQuery;
      if (!event) return { status: 404, body: { error: 'رویداد مورد نظر یافت نشد.' } };

      const match = and(eq(interactions.userId, userId), eq(interactions.eventId, parsedEventId), eq(interactions.type, type));
      const existing = await tx.select({ id: interactions.id }).from(interactions).where(match).limit(1);
      const points = INTERACTION_POINTS[type];

      if (existing.length > 0) {
        if (!TOGGLE_TYPES.includes(type)) return { status: 200, body: { success: true, action: 'exists', pointsAwarded: 0 } };
        if (type === 'RSVP') {
          // Attendance backed by a ticket is cancelled through the ticket (refund rules apply).
          const [{ active }] = await tx.select({ active: sql<number>`count(*)::int` }).from(tickets)
            .where(and(eq(tickets.userId, userId), eq(tickets.eventId, parsedEventId), eq(tickets.status, 'ACTIVE')));
          if (Number(active) > 0) {
            return { status: 409, body: { error: 'برای این رویداد بلیت دارید. برای انصراف، بلیت را از بخش «بلیت‌های من» لغو کنید.', code: 'HAS_TICKETS' } };
          }
        }
        await tx.delete(interactions).where(match);
        await changePoints(tx, userId, -points, `${type}_REMOVED`, { type: 'EVENT', id: parsedEventId });
        return { status: 200, body: { success: true, action: type === 'SAVE' ? 'unsaved' : 'unrsvped', pointsAwarded: 0 } };
      }

      if (type === 'RSVP') {
        if (event.status !== 'PUBLISHED') return { status: 400, body: { error: 'این رویداد در حال حاضر قابل ثبت‌نام نیست.' } };
        if (event.cost > 0) {
          return { status: 400, body: { error: 'برای این رویداد باید بلیت تهیه کنید.', code: 'NEEDS_TICKET' } };
        }
        if (await seatsTaken(tx, event) >= event.capacity) {
          return { status: 400, body: { error: 'ظرفیت این رویداد تکمیل شده است.', code: 'FULL' } };
        }
      }

      const [interaction] = await tx.insert(interactions).values({ userId, eventId: parsedEventId, type, metadata: metadata ?? null }).returning();
      const awarded = await changePoints(tx, userId, points, type, { type: 'EVENT', id: parsedEventId });
      return { status: 201, body: { success: true, action: 'created', data: interaction, pointsAwarded: awarded } };
    });

    if ((outcome.body as any).pointsAwarded !== undefined) invalidateCachePattern('leaderboard');
    res.status(outcome.status).json(outcome.body);
  }));

  // ---------------- Hubs (communities) ----------------
  app.get('/api/hubs', asyncRoute(async (req: AuthRequest, res) => {
    const userId = req.dbUser?.id ?? -1;
    const rows = await db.select({
      hub: hubs,
      members: sql<number>`(SELECT count(*)::int FROM hub_members m WHERE m.hub_id = ${hubs.id})`,
      isMember: sql<boolean>`EXISTS (SELECT 1 FROM hub_members m WHERE m.hub_id = ${hubs.id} AND m.user_id = ${userId})`,
    }).from(hubs).orderBy(desc(hubs.createdAt));
    res.json({ data: rows.map(r => ({ ...r.hub, followersCount: Number(r.members), isMember: r.isMember, isOwner: r.hub.ownerId === userId })) });
  }));

  app.post('/api/hubs', limiters.contentWrite, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'نام جامعه الزامی است' });
    const hub = await db.transaction(async (tx) => {
      const [created] = await tx.insert(hubs).values({
        name: name.slice(0, 200),
        description: req.body.description || null,
        type: req.body.type || 'عمومی',
        city: req.body.city || req.dbUser!.city || 'تهران',
        imageUrl: req.body.imageUrl || null,
        ownerId: req.dbUser!.id,
        followersCount: 1,
      }).returning();
      // The creator is the first member.
      await tx.insert(hubMembers).values({ hubId: created.id, userId: req.dbUser!.id });
      return created;
    });
    res.status(201).json({ data: { ...hub, isMember: true, isOwner: true }, message: 'جامعه با موفقیت ایجاد شد.' });
  }));

  app.post('/api/hubs/:id/join', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const hubId = parseInt(req.params.id, 10);
    const [hub] = await db.select().from(hubs).where(eq(hubs.id, hubId));
    if (!hub) return res.status(404).json({ error: 'جامعه یافت نشد' });
    await db.insert(hubMembers).values({ hubId, userId: req.dbUser!.id }).onConflictDoNothing();
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(hubMembers).where(eq(hubMembers.hubId, hubId));
    await db.update(hubs).set({ followersCount: Number(count) }).where(eq(hubs.id, hubId));
    res.json({ success: true, isMember: true, followersCount: Number(count) });
  }));

  app.delete('/api/hubs/:id/join', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const hubId = parseInt(req.params.id, 10);
    const [hub] = await db.select().from(hubs).where(eq(hubs.id, hubId));
    if (!hub) return res.status(404).json({ error: 'جامعه یافت نشد' });
    if (hub.ownerId === req.dbUser!.id) return res.status(400).json({ error: 'سازنده جامعه نمی‌تواند آن را ترک کند.' });
    await db.delete(hubMembers).where(and(eq(hubMembers.hubId, hubId), eq(hubMembers.userId, req.dbUser!.id)));
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(hubMembers).where(eq(hubMembers.hubId, hubId));
    await db.update(hubs).set({ followersCount: Number(count) }).where(eq(hubs.id, hubId));
    res.json({ success: true, isMember: false, followersCount: Number(count) });
  }));

  app.get('/api/hubs/:id/events', asyncRoute(async (req, res) => {
    const { limit, offset } = parsePaging(req.query, 20, 50);
    const { items, hasMore } = await queryEvents({ hubId: parseInt(req.params.id, 10), limit, offset });
    res.json({ data: await formatEvents(items), hasMore });
  }));

  app.delete('/api/admin/hubs/:id', requireAdmin, asyncRoute(async (req, res) => {
    const hubId = parseInt(req.params.id, 10);
    await db.transaction(async (tx) => {
      await tx.update(events).set({ hubId: null }).where(eq(events.hubId, hubId));
      await tx.delete(hubMembers).where(eq(hubMembers.hubId, hubId));
      await tx.delete(hubs).where(eq(hubs.id, hubId));
    });
    res.json({ success: true });
  }));

  // ---------------- Notifications ----------------
  app.get('/api/notifications', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const { limit, offset } = parsePaging(req.query, 30, 100);
    const rows = await db.select().from(notifications).where(eq(notifications.userId, req.dbUser!.id))
      .orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
    const [{ unread }] = await db.select({ unread: sql<number>`count(*)::int` }).from(notifications)
      .where(and(eq(notifications.userId, req.dbUser!.id), isNull(notifications.readAt)));
    res.json({ data: rows, unread: Number(unread) });
  }));

  app.get('/api/notifications/unread-count', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const [{ unread }] = await db.select({ unread: sql<number>`count(*)::int` }).from(notifications)
      .where(and(eq(notifications.userId, req.dbUser!.id), isNull(notifications.readAt)));
    res.json({ unread: Number(unread) });
  }));

  app.post('/api/notifications/read', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => parseInt(x, 10)).filter(Number.isInteger) : null;
    await db.update(notifications).set({ readAt: new Date() }).where(and(
      eq(notifications.userId, req.dbUser!.id),
      isNull(notifications.readAt),
      ids ? inArray(notifications.id, ids.length ? ids : [-1]) : undefined
    ));
    res.json({ success: true });
  }));

  app.get('/api/push/public-key', (req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.post('/api/push/subscribe', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const sub = req.body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth || !/^https:\/\//.test(sub.endpoint)) {
      return res.status(400).json({ error: 'اشتراک اعلان نامعتبر است' });
    }
    await db.insert(pushSubscriptions).values({ userId: req.dbUser!.id, endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: req.dbUser!.id, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } } });
    res.json({ success: true });
  }));

  app.post('/api/push/unsubscribe', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    if (typeof req.body?.endpoint === 'string') {
      await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, req.body.endpoint), eq(pushSubscriptions.userId, req.dbUser!.id)));
    }
    res.json({ success: true });
  }));

  // ---------------- Saved trip plans ----------------
  app.get('/api/trips', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const rows = await db.select().from(trips).where(eq(trips.userId, req.dbUser!.id)).orderBy(desc(trips.updatedAt)).limit(50);
    res.json({ data: rows.map(t => ({ ...(t.data as any), id: t.id, isPublic: t.isPublic, createdAt: t.createdAt })) });
  }));

  app.post('/api/trips', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const data = req.body?.data;
    if (!data || typeof data !== 'object' || !Array.isArray(data.days)) return res.status(400).json({ error: 'برنامه سفر نامعتبر است' });
    const json = JSON.stringify(data);
    if (json.length > 200_000) return res.status(413).json({ error: 'برنامه سفر بیش از حد بزرگ است' });
    const requestedId = typeof req.body.id === 'string' ? req.body.id : null;
    const isPublic = req.body.isPublic !== false;
    const title = String(data.title || 'برنامه سفر').slice(0, 200);
    const city = String(data.city || '').slice(0, 50);

    if (requestedId) {
      const [existing] = await db.select().from(trips).where(eq(trips.id, requestedId));
      if (existing && existing.userId === req.dbUser!.id) {
        const [updated] = await db.update(trips).set({ data, title, city, isPublic, updatedAt: new Date() }).where(eq(trips.id, requestedId)).returning();
        return res.json({ data: { ...(updated.data as any), id: updated.id, isPublic: updated.isPublic } });
      }
    }
    const [created] = await db.insert(trips).values({ id: crypto.randomUUID(), userId: req.dbUser!.id, title, city, data, isPublic }).returning();
    res.status(201).json({ data: { ...(created.data as any), id: created.id, isPublic: created.isPublic } });
  }));

  // Shared trip links work for anyone when the trip is public.
  app.get('/api/trips/:id', asyncRoute(async (req: AuthRequest, res) => {
    const [trip] = await db.select().from(trips).where(eq(trips.id, req.params.id));
    if (!trip || (!trip.isPublic && trip.userId !== req.dbUser?.id)) return res.status(404).json({ error: 'برنامه سفر یافت نشد' });
    res.json({ data: { ...(trip.data as any), id: trip.id, isPublic: trip.isPublic, isOwner: trip.userId === req.dbUser?.id } });
  }));

  app.delete('/api/trips/:id', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    await db.delete(trips).where(and(eq(trips.id, req.params.id), eq(trips.userId, req.dbUser!.id)));
    res.json({ success: true });
  }));
}
