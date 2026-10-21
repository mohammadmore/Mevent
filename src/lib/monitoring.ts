import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { errorGroups, users } from '../db/schema.ts';
import { notify } from './notifications.ts';
import { setDependencyAlertHandler } from './dependencies.ts';

// In-house error tracking (foreign services like Sentry are not reliably reachable from Iran):
// errors are grouped by fingerprint and counted; admins get an in-app/push alert the first time
// a group appears (or comes back after being marked resolved), at most once an hour per group.

const ALERT_EVERY_MS = 60 * 60_000;

/** Same kind of error -> same fingerprint (ids, numbers and quoted values are ignored). */
function fingerprint(source: string, message: string, stack?: string) {
  const firstFrame = (stack || '').split('\n').find(l => /^\s*at /.test(l))?.replace(/:\d+:\d+\)?$/, '').trim() || '';
  const normalized = message.replace(/\d+/g, '#').replace(/"[^"]*"|'[^']*'/g, '"…"').slice(0, 300);
  return crypto.createHash('sha1').update(`${source}|${normalized}|${firstFrame}`).digest('hex');
}

async function alertAdmins(title: string, body: string, key: string) {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN'));
  for (const a of admins) notify(a.id, { type: 'SYSTEM', title, body, url: '/admin', dedupeKey: `${key}:${a.id}` }).catch(() => {});
}

export async function captureError(err: unknown, ctx: { source?: 'server' | 'client' | 'job'; path?: string; userId?: number | null } = {}) {
  try {
    const e = err as any;
    const source = ctx.source || 'server';
    const message = String(e?.message || e || 'Unknown error').slice(0, 1000);
    const stack = typeof e?.stack === 'string' ? e.stack.slice(0, 4000) : null;
    const fp = fingerprint(source, message, stack || undefined);
    const [row] = await db.insert(errorGroups).values({ fingerprint: fp, source, message, stack, path: ctx.path?.slice(0, 300) || null, lastUserId: ctx.userId ?? null })
      .onConflictDoUpdate({
        target: errorGroups.fingerprint,
        set: { count: sql`${errorGroups.count} + 1`, lastSeen: new Date(), path: ctx.path?.slice(0, 300) || null, lastUserId: ctx.userId ?? null, resolved: false },
      }).returning();
    // Alert when new, reopened, or not alerted for an hour.
    if (!row.lastAlertAt || row.lastAlertAt.getTime() < Date.now() - ALERT_EVERY_MS) {
      const claimed = await db.update(errorGroups).set({ lastAlertAt: new Date() })
        .where(sql`${errorGroups.id} = ${row.id} AND (${errorGroups.lastAlertAt} IS NULL OR ${errorGroups.lastAlertAt} < now() - interval '1 hour')`).returning({ id: errorGroups.id });
      if (claimed.length) {
        await alertAdmins(row.count === 1 ? 'خطای جدید در سامانه' : 'تکرار خطا در سامانه', `${source === 'client' ? 'مرورگر' : 'سرور'}: ${message.slice(0, 140)} (${row.count.toLocaleString('fa-IR')} بار)`, `error:${row.id}:${Math.floor(Date.now() / ALERT_EVERY_MS)}`);
      }
    }
  } catch (inner) {
    console.error('captureError failed:', (inner as Error)?.message);
  }
}

/** Process-level hooks: anything that escapes request handlers ends up in the error list. */
export function installMonitoring() {
  process.on('unhandledRejection', (reason) => { console.error('Unhandled rejection:', reason); captureError(reason, { source: 'server', path: 'unhandledRejection' }); });
  process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); captureError(err, { source: 'server', path: 'uncaughtException' }); });
  // An external service going down is worth knowing about (its plan B is already active).
  setDependencyAlertHandler((name, label, error) => {
    alertAdmins('سرویس بیرونی قطع شد', `${label} در دسترس نیست (${error}). پلن B فعال است.`, `dep-down:${name}:${Math.floor(Date.now() / ALERT_EVERY_MS)}`).catch(() => {});
  });
}
