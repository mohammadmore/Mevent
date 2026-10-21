import { Express } from 'express';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { backups, errorGroups } from '../../db/schema.ts';
import { AuthRequest, requireAdmin } from '../../middleware/auth.ts';
import { asyncRoute, createRateLimiter } from '../infra.ts';
import { captureError } from '../../lib/monitoring.ts';
import { runBackup, sendBackup, backupsEnabled } from '../../lib/backups.ts';

// Operations: health check for uptime monitors, browser error reports, error list, backups.

const clientErrorLimiter = createRateLimiter('client-errors', 10);

export function registerOpsRoutes(app: Express) {
  // For uptime monitors: 200 when the server and its database answer, 503 otherwise.
  app.get('/api/health', asyncRoute(async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      res.json({ status: 'ok', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'db_unavailable' });
    }
  }));

  app.post('/api/client-errors', clientErrorLimiter, asyncRoute(async (req: AuthRequest, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.slice(0, 1000) : '';
    if (!message) return res.status(400).json({ error: 'پیام خطا خالی است' });
    const stack = typeof req.body?.stack === 'string' ? req.body.stack.slice(0, 4000) : undefined;
    const page = typeof req.body?.url === 'string' ? req.body.url.slice(0, 300) : undefined;
    await captureError(Object.assign(new Error(message), { stack }), { source: 'client', path: page, userId: req.dbUser?.id });
    res.status(202).json({ success: true });
  }));

  app.get('/api/admin/errors', requireAdmin, asyncRoute(async (req, res) => {
    const showResolved = req.query.resolved === '1';
    const rows = await db.select().from(errorGroups).where(eq(errorGroups.resolved, showResolved)).orderBy(desc(errorGroups.lastSeen)).limit(100);
    res.json({ data: rows });
  }));

  app.post('/api/admin/errors/:id/resolve', requireAdmin, asyncRoute(async (req, res) => {
    await db.update(errorGroups).set({ resolved: true }).where(eq(errorGroups.id, parseInt(req.params.id, 10)));
    res.json({ success: true });
  }));

  app.get('/api/admin/backups', requireAdmin, asyncRoute(async (_req, res) => {
    const rows = await db.select().from(backups).orderBy(desc(backups.id)).limit(30);
    res.json({ data: { enabled: backupsEnabled, backups: rows } });
  }));

  app.post('/api/admin/backups', requireAdmin, asyncRoute(async (_req, res) => {
    try {
      const b = await runBackup('MANUAL');
      res.status(201).json({ data: b, message: 'نسخه پشتیبان گرفته شد.' });
    } catch (err: any) {
      res.status(500).json({ error: err?.backup?.error || 'گرفتن نسخه پشتیبان انجام نشد.' });
    }
  }));

  app.get('/api/admin/backups/:id/download', requireAdmin, asyncRoute(async (req, res) => {
    await sendBackup(parseInt(req.params.id, 10), res);
  }));
}
