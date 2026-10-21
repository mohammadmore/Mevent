import { Express, Response } from 'express';
import crypto from 'crypto';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users, events, interactions, tickets, orders, places, chains, vibes, flows, hubs, reports } from '../../db/schema.ts';
import { createEvent } from '../../db/events.ts';
import { AuthRequest, requireAuth, requireRole, requireAdmin, isAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters } from '../infra.ts';
import {
  upload, ALLOWED_IMAGE_TYPES, normalizePlace, normalizeTaggedItem, normalizeVibe, normalizeFlow,
  buildPlacePayload, buildEventPayload, buildVibePayload, buildFlowPayload, saveChain, eventUrl
} from '../helpers.ts';
import { saveUpload } from '../../lib/storage.ts';
import { invalidateCachePattern } from '../../lib/sharedStore.ts';
import { notify } from '../../lib/notifications.ts';
import { assertCanSellPaid } from './kyc.ts';
import { nudgeWaitlist } from '../waitlist.ts';

export function invalidateEventCaches() {
  invalidateCachePattern('events_list');
  invalidateCachePattern('admin_stats');
}

/** Content from non-admins waits in the moderation queue unless it is saved as a draft. */
function moderatedStatus(req: AuthRequest, requested: string | undefined) {
  if (isAdmin(req)) return requested || 'PUBLISHED';
  return requested === 'DRAFT' ? 'DRAFT' : 'PENDING';
}

async function notifyAdmins(title: string, body: string, url = '/admin') {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
  for (const a of admins) notify(a.id, { type: 'MODERATION', title, body, url }).catch(() => {});
}

const MODERATED_TABLES = { PLACE: places, VIBE: vibes, FLOW: flows, CHAIN: chains } as const;
type ModeratedType = keyof typeof MODERATED_TABLES;

// Report target -> table holding a `status` column that moderation can change.
const REPORTABLE = { EVENT: events, PLACE: places, VIBE: vibes, FLOW: flows, CHAIN: chains, HUB: hubs } as const;
type ReportableType = keyof typeof REPORTABLE;
const AUTO_HIDE_REPORTS = 5;

async function ownerOf(type: ReportableType, id: number): Promise<number | null> {
  if (type === 'EVENT') return (await db.select({ o: events.organizerId }).from(events).where(eq(events.id, id)))[0]?.o ?? null;
  if (type === 'CHAIN') return (await db.select({ o: chains.organizerId }).from(chains).where(eq(chains.id, id)))[0]?.o ?? null;
  if (type === 'HUB') return (await db.select({ o: hubs.ownerId }).from(hubs).where(eq(hubs.id, id)))[0]?.o ?? null;
  const table: any = REPORTABLE[type];
  return (await db.select({ o: table.createdById }).from(table).where(eq(table.id, id)))[0]?.o ?? null;
}

async function setTargetStatus(type: ReportableType, id: number, status: string) {
  if (type === 'HUB') return; // hubs have no status column; admins delete them instead
  const table: any = REPORTABLE[type];
  await db.update(table).set({ status }).where(eq(table.id, id));
}

export function registerContentRoutes(app: Express) {
  app.post('/api/upload', limiters.upload, requireAuth, (req, res) => {
    upload.single('file')(req, res, async (err: any) => {
      if (err) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'حجم فایل نباید بیشتر از ۵ مگابایت باشد' : 'آپلود فایل با خطا مواجه شد';
        return res.status(400).json({ error: message });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'فایلی آپلود نشده یا فرمت آن مجاز نیست (فقط JPG، PNG، WEBP و GIF)' });
      }
      try {
        const name = crypto.randomUUID() + ALLOWED_IMAGE_TYPES[req.file.mimetype];
        await saveUpload(name, req.file.buffer, req.file.mimetype);
        res.json({ url: `/uploads/${name}` });
      } catch (e) {
        console.error('upload failed:', e);
        res.status(500).json({ error: 'ذخیره فایل با خطا مواجه شد' });
      }
    });
  });

  // ---------------- Events ----------------
  app.post('/api/events', limiters.contentWrite, requireRole('ORGANIZER', 'ADMIN'), asyncRoute(async (req: AuthRequest, res) => {
    const payload = buildEventPayload(req.body, false);
    if (!payload.title || !String(payload.title).trim()) {
      return res.status(400).json({ error: 'عنوان رویداد الزامی است' });
    }
    if (!assertCanSellPaid(req, payload.cost, res)) return;
    // The organizer is the signed-in user; only admins may create events on behalf of someone else.
    let organizerId = req.dbUser!.id;
    if (isAdmin(req) && req.body.organizerId) {
      const requested = parseInt(req.body.organizerId, 10);
      if (Number.isInteger(requested)) organizerId = requested;
    }
    const newEvent = await createEvent({
      city: 'تهران', currency: 'IRT', capacity: 100, cost: 0, tags: [], coOrganizerIds: [], hubIds: [],
      galleryUrls: [], advancedDetails: {}, bgIcon: '',
      ...payload,
      organizerId,
      source: 'UGC',
    });
    invalidateEventCaches();
    res.status(201).json({ data: newEvent, message: 'رویداد با موفقیت ثبت شد.' });
  }));

  // Only the event's organizer (or an admin) may change or delete it.
  async function loadOwnedEvent(req: AuthRequest, res: Response) {
    const eventId = parseInt(req.params.id, 10);
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      res.status(404).json({ error: 'رویداد مورد نظر یافت نشد.' });
      return null;
    }
    if (event.organizerId !== req.dbUser!.id && !isAdmin(req)) {
      res.status(403).json({ error: 'شما اجازه ویرایش این رویداد را ندارید.' });
      return null;
    }
    return event;
  }

  app.put('/api/events/:id', limiters.contentWrite, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const event = await loadOwnedEvent(req, res);
    if (!event) return;
    // An event hidden by moderation stays hidden until an admin restores it.
    if (event.status === 'HIDDEN' && !isAdmin(req) && req.body.status !== undefined) delete req.body.status;
    // A cancelled event has been refunded: it cannot be published again (create a new event instead).
    if (event.status === 'CANCELLED') {
      if (req.body.status !== undefined && req.body.status !== 'CANCELLED') return res.status(400).json({ error: 'رویداد لغوشده دوباره منتشر نمی‌شود؛ رویداد جدیدی بسازید.' });
      delete req.body.status;
    }
    const updatedData = buildEventPayload(req.body, true);
    // Moving an event that people already signed up for goes through "change time", which notifies
    // them and lets ticket holders cancel with a full refund.
    if (updatedData.startTime !== undefined && event.startTime && new Date(updatedData.startTime).getTime() !== event.startTime.getTime()) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(tickets).where(and(eq(tickets.eventId, event.id), inArray(tickets.status, ['ACTIVE', 'PENDING_PAYMENT'])));
      const [{ r }] = await db.select({ r: sql<number>`count(*)::int` }).from(interactions).where(and(eq(interactions.eventId, event.id), eq(interactions.type, 'RSVP')));
      if (Number(n) + Number(r) > 0) {
        return res.status(409).json({ error: 'این رویداد شرکت‌کننده دارد؛ برای تغییر زمان از دکمه «تغییر زمان» در پنل برگزارکننده استفاده کنید تا به همه اطلاع داده شود.', code: 'USE_POSTPONE' });
      }
    }
    // Turning a free event into a paid one (or raising the price) needs a verified organizer too.
    if (updatedData.cost !== undefined && Number(updatedData.cost) > event.cost && !assertCanSellPaid(req, updatedData.cost, res)) return;
    if (isAdmin(req)) {
      if (req.body.organizerId !== undefined) {
        const organizerId = parseInt(req.body.organizerId, 10);
        if (Number.isInteger(organizerId)) updatedData.organizerId = organizerId;
      }
      if (['HIDDEN', 'PUBLISHED', 'DRAFT'].includes(req.body.status)) updatedData.status = req.body.status;
    }
    if (Object.keys(updatedData).length > 0) {
      await db.update(events).set(updatedData).where(eq(events.id, event.id));
      // More seats (or publishing again) may let people from the waiting list in.
      if (updatedData.capacity !== undefined || updatedData.status !== undefined) nudgeWaitlist(event.id);
    }
    invalidateEventCaches();
    res.json({ success: true, message: 'رویداد با موفقیت ویرایش شد.' });
  }));

  app.delete('/api/events/:id', limiters.contentWrite, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const event = await loadOwnedEvent(req, res);
    if (!event) return;
    // Paid tickets must be refunded/cancelled first; deleting would erase the purchase records.
    const [{ active }] = await db.select({ active: sql<number>`count(*)::int` }).from(tickets)
      .where(and(eq(tickets.eventId, event.id), inArray(tickets.status, ['ACTIVE', 'PENDING_PAYMENT']), sql`${tickets.amount} > 0`));
    if (Number(active) > 0) {
      return res.status(409).json({ error: 'این رویداد بلیت فروخته‌شده دارد. ابتدا رویداد را به پیش‌نویس تغییر دهید یا بلیت‌ها را لغو کنید.' });
    }
    await db.transaction(async (tx) => {
      await tx.delete(interactions).where(eq(interactions.eventId, event.id));
      await tx.delete(tickets).where(eq(tickets.eventId, event.id));
      await tx.delete(orders).where(eq(orders.eventId, event.id));
      await tx.delete(events).where(eq(events.id, event.id));
    });
    invalidateEventCaches();
    res.json({ success: true, message: 'رویداد با موفقیت حذف شد.' });
  }));

  // ---------------- Places / chains / vibes / flows ----------------
  app.post('/api/places', limiters.contentWrite, requireRole('ORGANIZER', 'ADMIN'), asyncRoute(async (req: AuthRequest, res) => {
    const payload = buildPlacePayload(req.body, false);
    payload.status = moderatedStatus(req, req.body.status);
    payload.createdById = req.dbUser!.id;
    const [place] = await db.insert(places).values(payload).returning();
    if (place.status === 'PENDING') notifyAdmins('پاتوق جدید در انتظار بررسی', place.name);
    res.json({ ...normalizePlace(place), message: place.status === 'PENDING' ? 'پاتوق ثبت شد و پس از بررسی مدیر منتشر می‌شود.' : undefined });
  }));

  app.post('/api/admin/places', requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    const [place] = await db.insert(places).values({ ...buildPlacePayload(req.body, false), createdById: req.dbUser!.id }).returning();
    res.json(normalizePlace(place));
  }));

  app.put('/api/admin/places/:id', requireAdmin, asyncRoute(async (req, res) => {
    const [place] = await db.update(places).set(buildPlacePayload(req.body, true)).where(eq(places.id, parseInt(req.params.id, 10))).returning();
    if (!place) return res.status(404).json({ error: 'Place not found' });
    res.json(normalizePlace(place));
  }));

  app.post('/api/chains', limiters.contentWrite, requireRole('ORGANIZER', 'ADMIN'), asyncRoute(async (req: AuthRequest, res) => {
    if (!req.body?.name) return res.status(400).json({ error: 'نام زنجیره الزامی است' });
    const created = await saveChain(null, { ...req.body, status: moderatedStatus(req, req.body.status) }, req.dbUser!);
    if (created!.status === 'PENDING') notifyAdmins('زنجیره جدید در انتظار بررسی', created!.name);
    res.status(201).json(normalizeTaggedItem(created!));
  }));

  app.put('/api/admin/chains/:id', requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    const updated = await saveChain(parseInt(req.params.id, 10), req.body, req.dbUser!);
    if (!updated) return res.status(404).json({ error: 'Chain not found' });
    res.json(normalizeTaggedItem(updated));
  }));

  app.post('/api/vibes', limiters.contentWrite, requireRole('ORGANIZER', 'ADMIN'), asyncRoute(async (req: AuthRequest, res) => {
    if (!req.body?.title && !req.body?.name) return res.status(400).json({ error: 'عنوان حال و هوا الزامی است' });
    const payload = { ...buildVibePayload(req.body, false), status: moderatedStatus(req, req.body.status), createdById: req.dbUser!.id };
    const [vibe] = await db.insert(vibes).values(payload).returning();
    if (vibe.status === 'PENDING') notifyAdmins('حال و هوای جدید در انتظار بررسی', vibe.title);
    res.status(201).json(normalizeVibe(vibe));
  }));

  app.put('/api/admin/vibes/:id', requireAdmin, asyncRoute(async (req, res) => {
    const [vibe] = await db.update(vibes).set(buildVibePayload(req.body, true)).where(eq(vibes.id, parseInt(req.params.id, 10))).returning();
    if (!vibe) return res.status(404).json({ error: 'Vibe not found' });
    res.json(normalizeVibe(vibe));
  }));

  app.post('/api/flows', limiters.contentWrite, requireRole('ORGANIZER', 'ADMIN'), asyncRoute(async (req: AuthRequest, res) => {
    const payload = { ...buildFlowPayload(req.body, false), status: moderatedStatus(req, req.body.status), createdById: req.dbUser!.id };
    if (!payload.title || payload.tags.length === 0) return res.status(400).json({ error: 'عنوان و تگ الزامی است' });
    const [flow] = await db.insert(flows).values(payload).returning();
    if (flow.status === 'PENDING') notifyAdmins('جریان جدید در انتظار بررسی', flow.title);
    res.status(201).json(normalizeFlow(flow));
  }));

  app.put('/api/admin/flows/:id', requireAdmin, asyncRoute(async (req, res) => {
    const [flow] = await db.update(flows).set(buildFlowPayload(req.body, true)).where(eq(flows.id, parseInt(req.params.id, 10))).returning();
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(normalizeFlow(flow));
  }));

  // ---------------- Moderation queue ----------------
  app.get('/api/admin/moderation', requireAdmin, asyncRoute(async (req, res) => {
    const [pendingPlaces, pendingVibes, pendingFlows, pendingChains] = await Promise.all([
      db.select().from(places).where(eq(places.status, 'PENDING')),
      db.select().from(vibes).where(eq(vibes.status, 'PENDING')),
      db.select().from(flows).where(eq(flows.status, 'PENDING')),
      db.select().from(chains).where(eq(chains.status, 'PENDING')),
    ]);
    res.json({
      data: [
        ...pendingPlaces.map(p => ({ type: 'PLACE', id: p.id, title: p.name, description: p.description, createdById: p.createdById, createdAt: p.createdAt })),
        ...pendingVibes.map(v => ({ type: 'VIBE', id: v.id, title: v.title, description: v.description, createdById: v.createdById, createdAt: v.createdAt })),
        ...pendingFlows.map(f => ({ type: 'FLOW', id: f.id, title: f.title, description: f.description, createdById: f.createdById, createdAt: f.createdAt })),
        ...pendingChains.map(c => ({ type: 'CHAIN', id: c.id, title: c.name, description: c.description, createdById: c.organizerId, createdAt: c.createdAt })),
      ]
    });
  }));

  app.post('/api/admin/moderation/:type/:id', requireAdmin, asyncRoute(async (req, res) => {
    const type = String(req.params.type).toUpperCase() as ModeratedType;
    const id = parseInt(req.params.id, 10);
    const action = req.body?.action;
    if (!(type in MODERATED_TABLES) || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'درخواست نامعتبر است' });
    }
    const table: any = MODERATED_TABLES[type];
    const status = action === 'approve' ? 'PUBLISHED' : 'REJECTED';
    const [row] = await db.update(table).set({ status }).where(eq(table.id, id)).returning();
    if (!row) return res.status(404).json({ error: 'مورد یافت نشد' });
    const ownerId = type === 'CHAIN' ? row.organizerId : row.createdById;
    const title = row.name || row.title;
    if (ownerId) {
      notify(ownerId, {
        type: 'MODERATION',
        title: action === 'approve' ? 'محتوای شما منتشر شد' : 'محتوای شما تأیید نشد',
        body: action === 'approve' ? `«${title}» اکنون برای همه قابل مشاهده است.` : `«${title}» پس از بررسی منتشر نشد.${req.body.reason ? ' دلیل: ' + String(req.body.reason).slice(0, 300) : ''}`,
      }).catch(() => {});
    }
    res.json({ success: true, status });
  }));

  // ---------------- Reports ----------------
  app.post('/api/reports', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const targetType = String(req.body?.targetType || '').toUpperCase() as ReportableType;
    const targetId = parseInt(req.body?.targetId, 10);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 100) : '';
    if (!(targetType in REPORTABLE) || !Number.isInteger(targetId) || !reason) {
      return res.status(400).json({ error: 'اطلاعات گزارش ناقص است' });
    }
    const table: any = REPORTABLE[targetType];
    const [target] = await db.select({ id: table.id }).from(table).where(eq(table.id, targetId));
    if (!target) return res.status(404).json({ error: 'مورد گزارش‌شده یافت نشد' });

    const inserted = await db.insert(reports).values({
      reporterId: req.dbUser!.id,
      targetType,
      targetId,
      reason,
      details: typeof req.body.details === 'string' ? req.body.details.slice(0, 1000) : null,
    }).onConflictDoNothing().returning();
    if (!inserted[0]) return res.json({ success: true, message: 'گزارش شما قبلاً ثبت شده است.' });

    // Many independent reports take the item down until an admin reviews it.
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(reports)
      .where(and(eq(reports.targetType, targetType), eq(reports.targetId, targetId), eq(reports.status, 'OPEN')));
    if (Number(count) >= AUTO_HIDE_REPORTS) {
      await setTargetStatus(targetType, targetId, 'HIDDEN');
      invalidateEventCaches();
    }
    notifyAdmins('گزارش تخلف جدید', `${reason} (${targetType} #${targetId})`);
    res.status(201).json({ success: true, message: 'گزارش شما ثبت شد. ممنون که به سالم ماندن میونت کمک می‌کنید.' });
  }));

  app.get('/api/admin/reports', requireAdmin, asyncRoute(async (req, res) => {
    const status = ['OPEN', 'RESOLVED', 'DISMISSED'].includes(String(req.query.status)) ? String(req.query.status) : 'OPEN';
    const rows = await db.select({
      id: reports.id, targetType: reports.targetType, targetId: reports.targetId, reason: reports.reason,
      details: reports.details, status: reports.status, createdAt: reports.createdAt, reporterName: users.name,
    }).from(reports).leftJoin(users, eq(reports.reporterId, users.id))
      .where(eq(reports.status, status)).orderBy(desc(reports.createdAt)).limit(200);
    res.json({ data: rows });
  }));

  app.post('/api/admin/reports/:id', requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const action = req.body?.action;
    if (!['dismiss', 'hide', 'restore'].includes(action)) return res.status(400).json({ error: 'اقدام نامعتبر است' });
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    if (!report) return res.status(404).json({ error: 'گزارش یافت نشد' });
    const type = report.targetType as ReportableType;

    if (action === 'hide') await setTargetStatus(type, report.targetId, 'HIDDEN');
    if (action === 'restore') await setTargetStatus(type, report.targetId, 'PUBLISHED');
    // Resolving one report resolves every open report about the same item.
    await db.update(reports)
      .set({ status: action === 'dismiss' || action === 'restore' ? 'DISMISSED' : 'RESOLVED', resolvedById: req.dbUser!.id })
      .where(and(eq(reports.targetType, report.targetType), eq(reports.targetId, report.targetId), eq(reports.status, 'OPEN')));
    invalidateEventCaches();

    if (action === 'hide') {
      const ownerId = await ownerOf(type, report.targetId);
      if (ownerId) {
        notify(ownerId, {
          type: 'MODERATION',
          title: 'محتوای شما به دلیل گزارش تخلف پنهان شد',
          body: `دلیل: ${report.reason}. برای پیگیری با پشتیبانی تماس بگیرید.`,
          url: type === 'EVENT' ? eventUrl(report.targetId) : undefined,
        }).catch(() => {});
      }
    }
    res.json({ success: true });
  }));
}
