import { Express } from 'express';
import { eq, desc, sql, and, gte, lt } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users, events, tickets, orders, settings, places, chains, vibes, flows } from '../../db/schema.ts';
import { createEvent } from '../../db/events.ts';
import { AuthRequest, requireAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters, metrics, createJob, saveJob, getJob } from '../infra.ts';
import { extractEvents } from '../eventExtractor.ts';
import { cleanSiteInfo, saveSiteInfo } from '../siteInfo.ts';
import { dependencySnapshot, probeAll } from '../../lib/dependencies.ts';
import { normalizePlace, normalizeTaggedItem, normalizeVibe, normalizeFlow, crawledEventToRow } from '../helpers.ts';
import { getFromCache, setToCache, invalidateCachePattern, clearCache, listCacheKeys, countCacheKeys, cacheStats } from '../../lib/sharedStore.ts';
import { safeFetchText } from '../../lib/safeFetch.ts';
import { notify } from '../../lib/notifications.ts';
import { storageMode } from '../../lib/storage.ts';
import { gatewayMode } from '../../lib/payments.ts';
import { invalidateEventCaches } from './content.ts';

/**
 * Fetches a page or calendar feed (through the SSRF guard), extracts its events in-process and
 * stores the new ones. An event with the same title on the same day is not added twice.
 */
async function crawl(targetUrl: string, organizerId: number, onProgress?: (p: number) => Promise<void>) {
  const body = await safeFetchText(targetUrl);
  await onProgress?.(50);
  const found = extractEvents(body);
  await onProgress?.(70);
  const created = [];
  for (const item of found) {
    const row = crawledEventToRow(item, targetUrl, organizerId);
    const dayStart = new Date(row.startTime.getTime() - 12 * 3600_000), dayEnd = new Date(row.startTime.getTime() + 12 * 3600_000);
    const [dup] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.title, row.title), gte(events.startTime, dayStart), lt(events.startTime, dayEnd))).limit(1);
    if (dup) continue;
    created.push(await createEvent(row));
  }
  if (created.length) invalidateEventCaches();
  return { created, found: found.length };
}

function crawlMessage(found: number, added: number) {
  if (!found) return 'در این صفحه رویدادی با تاریخ مشخص پیدا نشد.';
  return `${found} رویداد پیدا شد؛ ${added} رویداد جدید ثبت شد${found > added ? ` و ${found - added} مورد تکراری بود` : ''}.`;
}

export function registerAdminRoutes(app: Express) {
  // Reachability of external services and whether each one is currently on its fallback.
  app.get('/api/admin/dependencies', requireAdmin, asyncRoute(async (req, res) => {
    if (req.query.refresh === '1') await probeAll();
    res.json({ data: dependencySnapshot() });
  }));

  app.get('/api/health/metrics', requireAdmin, asyncRoute(async (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
      metrics: {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        averageLatencyMs: metrics.totalRequests > 0 ? Math.round(metrics.totalLatencyMs / metrics.totalRequests) : 0,
      },
      cache: {
        activeKeys: await countCacheKeys(),
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRateRatio: cacheStats.hits + cacheStats.misses > 0 ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)).toFixed(2) : 0,
      },
      dependencies: dependencySnapshot(),
      infrastructure: { uploads: storageMode, payments: gatewayMode },
      memoryUsage: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
    });
  }));

  app.get('/api/admin/cache', requireAdmin, asyncRoute(async (req, res) => {
    res.json({ data: { stats: cacheStats, activeKeys: await listCacheKeys() } });
  }));

  app.delete('/api/admin/cache', requireAdmin, asyncRoute(async (req, res) => {
    await clearCache();
    res.json({ success: true, message: 'کش سیستم با موفقیت پاکسازی شد.' });
  }));

  app.get('/api/admin/stats', requireAdmin, asyncRoute(async (req, res) => {
    const cached = await getFromCache('admin_stats');
    if (cached) return res.json({ data: cached });
    const [u] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [e] = await db.select({ count: sql<number>`count(*)::int` }).from(events);
    const [t] = await db.select({ count: sql<number>`count(*)::int` }).from(tickets).where(sql`${tickets.status} IN ('ACTIVE', 'USED')`);
    // Revenue from tickets that are still valid (cancelled/refunded ones are excluded).
    const [r] = await db.select({ revenue: sql<number>`coalesce(sum(${tickets.amount}), 0)::int` }).from(tickets).where(sql`${tickets.status} IN ('ACTIVE', 'USED')`);
    const [pendingOrganizers] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.organizerStatus, 'PENDING'));
    const statsData = {
      totalUsers: Number(u.count),
      totalEvents: Number(e.count),
      totalTickets: Number(t.count),
      totalRevenue: Number(r.revenue),
      pendingOrganizerRequests: Number(pendingOrganizers.count),
    };
    await setToCache('admin_stats', statsData, 10000);
    res.json({ data: statsData });
  }));

  // Read is public: forms use it for categories, icons and field labels.
  app.get('/api/admin/settings', asyncRoute(async (req, res) => {
    const all = await db.select().from(settings);
    const settingsObj: Record<string, any> = Object.fromEntries(all.map(s => [s.key, s.value]));
    if (!settingsObj.event_categories) settingsObj.event_categories = ['#ورزشی', '#فرهنگی', '#آموزشی', '#تفریحی'];
    res.json({ data: settingsObj });
  }));

  app.put('/api/admin/settings', requireAdmin, asyncRoute(async (req, res) => {
    const { key, value } = req.body;
    if (typeof key !== 'string' || !/^[a-z0-9_]{1,64}$/i.test(key) || value === undefined || key === 'site_info') {
      return res.status(400).json({ error: 'کلید یا مقدار تنظیمات نامعتبر است' });
    }
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    res.json({ success: true, message: 'تنظیمات با موفقیت به روز شد.' });
  }));

  app.put('/api/admin/site-info', requireAdmin, asyncRoute(async (req, res) => {
    const result = cleanSiteInfo(req.body);
    if ('error' in result) return res.status(400).json({ error: result.error });
    await saveSiteInfo(result.value);
    res.json({ data: result.value, message: 'اطلاعات سایت ذخیره شد.' });
  }));

  app.get('/api/admin/places', requireAdmin, asyncRoute(async (req, res) => res.json((await db.select().from(places)).map(normalizePlace))));
  app.get('/api/admin/chains', requireAdmin, asyncRoute(async (req, res) => res.json((await db.select().from(chains)).map(normalizeTaggedItem))));
  app.get('/api/admin/vibes', requireAdmin, asyncRoute(async (req, res) => res.json((await db.select().from(vibes)).map(normalizeVibe))));
  app.get('/api/admin/flows', requireAdmin, asyncRoute(async (req, res) => res.json((await db.select().from(flows)).map(normalizeFlow))));

  app.get('/api/admin/events', requireAdmin, asyncRoute(async (req, res) => {
    const rows = await db.select({ event: events, organizerName: users.name }).from(events)
      .leftJoin(users, eq(events.organizerId, users.id)).orderBy(desc(events.createdAt)).limit(200);
    res.json({ data: rows.map(r => ({ ...r.event, organizerName: r.organizerName })) });
  }));

  app.get('/api/admin/users', requireAdmin, asyncRoute(async (req, res) => {
    res.json({ data: await db.select().from(users).orderBy(desc(users.createdAt)).limit(200) });
  }));

  app.put('/api/admin/users/:id/role', requireAdmin, asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;
    if (!['USER', 'ORGANIZER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'نقش وارد شده نامعتبر است' });
    await db.update(users).set({ role, organizerStatus: role === 'USER' ? 'NONE' : 'APPROVED' }).where(eq(users.id, userId));
    res.json({ success: true, message: 'نقش کاربر با موفقیت تغییر کرد.' });
  }));

  app.get('/api/admin/organizer-requests', requireAdmin, asyncRoute(async (req, res) => {
    const rows = await db.select({
      id: users.id, name: users.name, email: users.email, city: users.city, note: users.organizerRequestNote,
      website: users.website, instagram: users.instagram, createdAt: users.createdAt,
    }).from(users).where(eq(users.organizerStatus, 'PENDING')).orderBy(desc(users.createdAt));
    res.json({ data: rows });
  }));

  app.post('/api/admin/organizer-requests/:id', requireAdmin, asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const approve = req.body?.action === 'approve';
    if (!['approve', 'reject'].includes(req.body?.action)) return res.status(400).json({ error: 'اقدام نامعتبر است' });
    const [user] = await db.update(users)
      .set(approve ? { role: 'ORGANIZER', organizerStatus: 'APPROVED' } : { organizerStatus: 'REJECTED' })
      .where(eq(users.id, userId)).returning();
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    notify(userId, {
      type: 'ORGANIZER_REQUEST',
      title: approve ? 'حساب برگزارکننده شما فعال شد' : 'درخواست برگزارکننده تأیید نشد',
      body: approve
        ? 'اکنون می‌توانید رویداد ثبت کنید و بلیت بفروشید.'
        : `درخواست شما پس از بررسی تأیید نشد.${req.body.reason ? ' دلیل: ' + String(req.body.reason).slice(0, 300) : ''} می‌توانید دوباره درخواست دهید.`,
      url: '/profile',
    }).catch(() => {});
    res.json({ success: true });
  }));

  // ---------------- Crawler (admin only, SSRF-guarded) ----------------
  app.post('/api/jobs/crawler', limiters.crawler, requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    const job = await createJob('CRAWLER');
    const targetUrl = req.body?.url || 'https://calendar.iranfair.com/fa';
    const organizerId = req.dbUser!.id;
    res.status(202).json({ message: 'فرآیند خزشگر در پس‌زمینه شروع شد.', jobId: job.id, statusUrl: `/api/jobs/${job.id}` });

    (async () => {
      try {
        job.status = 'RUNNING';
        job.progress = 20;
        await saveJob(job);
        const { created, found } = await crawl(targetUrl, organizerId, async (p) => { job.progress = p; await saveJob(job); });
        job.status = 'COMPLETED';
        job.progress = 100;
        job.result = { message: crawlMessage(found, created.length), eventsCount: created.length, found };
      } catch (err: any) {
        console.error('Job error:', err?.message);
        job.status = 'FAILED';
        job.error = err?.message || 'خطا در خزش صفحات';
      }
      await saveJob(job);
    })();
  }));

  app.get('/api/jobs/:id', requireAdmin, asyncRoute(async (req, res) => {
    const job = await getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'کار یافت نشد' });
    res.json({ data: job });
  }));

  app.post('/api/crawler/run', limiters.crawler, requireAdmin, asyncRoute(async (req: AuthRequest, res) => {
    try {
      const { created, found } = await crawl(req.body?.url || 'https://calendar.iranfair.com/fa', req.dbUser!.id);
      res.json({ message: crawlMessage(found, created.length), data: created, found });
    } catch (err: any) {
      res.status(500).json({ error: err?.message ? `خزشگر با خطا مواجه شد: ${err.message}` : 'خزشگر با خطا مواجه شد' });
    }
  }));
}

