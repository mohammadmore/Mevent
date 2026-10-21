import webpush from 'web-push';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { notifications, pushSubscriptions, interactions, events } from '../db/schema.ts';
import { registerDependency, isUp, reportFailure, reportSuccess } from './dependencies.ts';

// In-app notifications (always) + Web Push (when VAPID keys are configured).

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
export const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@mevent.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return pushEnabled ? VAPID_PUBLIC_KEY : null;
}

export interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  url?: string;
  /** When set, the notification is created at most once for this key (safe across instances). */
  dedupeKey?: string;
}

export async function notify(userId: number, input: NotificationInput) {
  const inserted = await db.insert(notifications).values({
    userId,
    type: input.type,
    title: input.title,
    body: input.body || null,
    url: input.url || null,
    dedupeKey: input.dedupeKey || null,
  }).onConflictDoNothing().returning();

  // Only the instance that actually created the row sends the push, so it is never duplicated.
  if (inserted[0] && pushEnabled) {
    sendPush(userId, { title: input.title, body: input.body, url: input.url }).catch(err =>
      console.warn('push send failed:', err?.message)
    );
  }
  return inserted[0] || null;
}

async function sendPush(userId: number, payload: { title: string; body?: string; url?: string }) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const body = JSON.stringify(payload);
  await Promise.all(subs.map(async (sub) => {
    // Push services are run by browser vendors (Google, Mozilla, Apple) and are often unreachable
    // from servers in Iran. A host that is down is skipped for a while; the in-app notification
    // already exists either way.
    let host = 'unknown';
    try { host = new URL(sub.endpoint).host; } catch { /* malformed endpoint */ }
    const dep = `push:${host}`;
    registerDependency(dep, `اعلان مرورگر (${host})`);
    if (!isUp(dep)) return;
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys as any }, body, { TTL: 60 * 60 * 12, timeout: 5000 });
      reportSuccess(dep);
    } catch (err: any) {
      if (err?.statusCode) reportSuccess(dep); // the service answered
      else reportFailure(dep, err);
      // The browser revoked the subscription: forget it.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }));
}

const tehranTime = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });

/** Sends "starts tomorrow" and "starts in an hour" reminders to everyone who RSVPed. */
async function sendEventReminders() {
  const now = Date.now();
  const windows = [
    { kind: 'day', from: now + 23 * 3600_000, to: now + 24 * 3600_000, title: 'یادآوری: رویداد فردا', when: 'فردا' },
    { kind: 'hour', from: now + 45 * 60_000, to: now + 60 * 60_000, title: 'یادآوری: رویداد تا یک ساعت دیگر', when: 'تا یک ساعت دیگر' },
  ];
  for (const w of windows) {
    const upcoming = await db.select({ id: events.id, title: events.title, startTime: events.startTime })
      .from(events)
      .where(and(eq(events.status, 'PUBLISHED'), gte(events.startTime, new Date(w.from)), lte(events.startTime, new Date(w.to))));
    if (upcoming.length === 0) continue;
    const attendees = await db.select({ userId: interactions.userId, eventId: interactions.eventId })
      .from(interactions)
      .where(and(eq(interactions.type, 'RSVP'), inArray(interactions.eventId, upcoming.map(e => e.id))));
    for (const a of attendees) {
      const ev = upcoming.find(e => e.id === a.eventId)!;
      await notify(a.userId, {
        type: 'REMINDER',
        title: w.title,
        body: `«${ev.title}» ${w.when} ساعت ${tehranTime.format(ev.startTime!)} شروع می‌شود.`,
        url: `/events/${ev.id}`,
        dedupeKey: `reminder:${w.kind}:${a.userId}:${ev.id}`,
      });
    }
  }
}

export function startBackgroundJobs(extraJobs: Array<() => Promise<void>> = []) {
  const run = async () => {
    for (const job of [sendEventReminders, ...extraJobs]) {
      try {
        await job();
      } catch (err: any) {
        console.warn('background job failed:', err?.message);
      }
    }
  };
  setTimeout(run, 10_000).unref();
  setInterval(run, 5 * 60_000).unref();
}
