import { Express } from 'express';
import * as cheerio from 'cheerio';
import { Type } from '@google/genai';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users, events, tickets, orders, settings, places, chains, vibes, flows } from '../../db/schema.ts';
import { createEvent } from '../../db/events.ts';
import { AuthRequest, requireAdmin } from '../../middleware/auth.ts';
import { asyncRoute, limiters, metrics, aiCircuitBreaker, callGemini, createJob, saveJob, getJob } from '../infra.ts';
import { normalizePlace, normalizeTaggedItem, normalizeVibe, normalizeFlow, crawledEventToRow } from '../helpers.ts';
import { getFromCache, setToCache, invalidateCachePattern, clearCache, listCacheKeys, countCacheKeys, cacheStats } from '../../lib/sharedStore.ts';
import { safeFetchText } from '../../lib/safeFetch.ts';
import { notify } from '../../lib/notifications.ts';
import { storageMode } from '../../lib/storage.ts';
import { gatewayMode } from '../../lib/payments.ts';
import { invalidateEventCaches } from './content.ts';

const CRAWL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING }, description: { type: Type.STRING }, startTime: { type: Type.STRING },
          address: { type: Type.STRING }, lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER },
          cost: { type: Type.NUMBER }, capacity: { type: Type.NUMBER }, tags: { type: Type.STRING },
        },
      },
    },
  },
};

/** Fetches a page (through the SSRF guard), asks Gemini to extract events and stores them. */
async function crawl(targetUrl: string, organizerId: number, onProgress?: (p: number) => Promise<void>) {
  const html = await safeFetchText(targetUrl);
  const $ = cheerio.load(html);
  let text = $('.container').text();
  if (!text || text.trim().length < 100) text = $('body').text();
  text = text.replace(/\s+/g, ' ').substring(0, 15000);
  await onProgress?.(60);

  const aiResponse = await callGemini({
    contents: `Extract upcoming events from this page. Year 2026. Translate title and description to Persian if needed. Return JSON { "events": [{ title, description, startTime, address, lat, lng, cost }] }\nText: ${text}`,
    config: { responseMimeType: 'application/json', responseSchema: CRAWL_SCHEMA },
  });
  const data = JSON.parse(aiResponse.text || '{}');
  const created = [];
  for (const eventData of data.events || []) {
    if (!eventData.title) continue;
    created.push(await createEvent(crawledEventToRow(eventData, targetUrl, organizerId)));
  }
  invalidateEventCaches();
  return created;
}

export function registerAdminRoutes(app: Express) {
  app.get('/api/health/metrics', requireAdmin, asyncRoute(async (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
      metrics: {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        aiRequestsCount: metrics.aiRequestsCount,
        averageLatencyMs: metrics.totalRequests > 0 ? Math.round(metrics.totalLatencyMs / metrics.totalRequests) : 0,
      },
      cache: {
        activeKeys: await countCacheKeys(),
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRateRatio: cacheStats.hits + cacheStats.misses > 0 ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)).toFixed(2) : 0,
      },
      circuitBreaker: aiCircuitBreaker.getStats(),
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
    if (typeof key !== 'string' || !/^[a-z0-9_]{1,64}$/i.test(key) || value === undefined) {
      return res.status(400).json({ error: 'کلید یا مقدار تنظیمات نامعتبر است' });
    }
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    res.json({ success: true, message: 'تنظیمات با موفقیت به روز شد.' });
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
        const created = await crawl(targetUrl, organizerId, async (p) => { job.progress = p; await saveJob(job); });
        job.status = 'COMPLETED';
        job.progress = 100;
        job.result = { message: `تعداد ${created.length} رویداد استخراج و ثبت شد.`, eventsCount: created.length };
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
      const created = await crawl(req.body?.url || 'https://calendar.iranfair.com/fa', req.dbUser!.id);
      res.json({ message: `استخراج با موفقیت انجام شد. ${created.length} رویداد افزوده شد.`, data: created });
    } catch (err: any) {
      res.status(500).json({ error: err?.message ? `خزشگر با خطا مواجه شد: ${err.message}` : 'خزشگر با خطا مواجه شد' });
    }
  }));
}

