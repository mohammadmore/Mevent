import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { smsMessages, users } from '../db/schema.ts';
import { sendTemplateSms, smsKindEnabled, SmsKind, SmsError } from './sms.ts';

// Outbox for notification SMS. A message is written first (deduplicated by key), then sent; failed
// sends are retried with growing delays by a background job, and rows are claimed with
// SKIP LOCKED so several server instances never send the same message twice.

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MIN = [1, 5, 15, 60, 180];
const STALE_SENDING_MIN = 10;

export interface QueueSmsInput {
  kind: SmsKind;
  params: Record<string, string>;
  /** The message is sent at most once per key. */
  dedupeKey: string;
  userId?: number;
  /** Used when the recipient has no account (e.g. a ticket transfer to a new number). */
  phone?: string;
}

/** Queues a message and tries to send it right away (without making the caller wait). */
export async function queueSms(input: QueueSmsInput) {
  if (!smsKindEnabled(input.kind)) return null;
  let phone = input.phone || null;
  if (!phone && input.userId) {
    const [u] = await db.select({ phone: users.phone, smsReminders: users.smsReminders }).from(users).where(eq(users.id, input.userId));
    if (!u?.phone) return null;
    if (input.kind === 'REMINDER' && !u.smsReminders) return null;
    phone = u.phone;
  }
  if (!phone) return null;
  const [row] = await db.insert(smsMessages).values({
    userId: input.userId ?? null, phone, kind: input.kind, params: input.params, dedupeKey: input.dedupeKey,
  }).onConflictDoNothing().returning();
  if (row) deliver([row.id]).catch(err => console.warn('sms send failed:', err?.message));
  return row || null;
}

/** Claims the given (or all due) messages and sends them. */
async function deliver(ids?: number[]) {
  const due = ids
    ? sql`id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) AND status = 'PENDING'`
    : sql`status = 'PENDING' AND next_attempt_at <= now()`;
  const claimed: any = await db.execute(sql`
    UPDATE sms_messages SET status = 'SENDING', attempts = attempts + 1, next_attempt_at = now()
    WHERE id IN (SELECT id FROM sms_messages WHERE ${due} ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED)
    RETURNING id, phone, kind, params, attempts
  `);
  for (const m of claimed.rows || []) {
    try {
      const provider = await sendTemplateSms(m.phone, m.kind, m.params || {});
      await db.update(smsMessages).set(provider
        ? { status: 'SENT', provider, sentAt: new Date(), lastError: null }
        : { status: 'SKIPPED', lastError: 'no template for this kind' }).where(eq(smsMessages.id, m.id));
    } catch (err: any) {
      const final = m.attempts >= MAX_ATTEMPTS;
      const delay = RETRY_DELAYS_MIN[Math.min(m.attempts - 1, RETRY_DELAYS_MIN.length - 1)];
      await db.update(smsMessages).set({
        status: final ? 'FAILED' : 'PENDING',
        lastError: String(err?.message || err).slice(0, 300) + (err instanceof SmsError ? '' : ' (network)'),
        nextAttemptAt: new Date(Date.now() + delay * 60_000),
      }).where(eq(smsMessages.id, m.id));
    }
  }
}

/** Background job: retries due messages and recovers ones left SENDING by a crashed instance. */
export async function flushSmsOutbox() {
  await db.update(smsMessages).set({ status: 'PENDING' })
    .where(and(eq(smsMessages.status, 'SENDING'), lt(smsMessages.nextAttemptAt, new Date(Date.now() - STALE_SENDING_MIN * 60_000))));
  await deliver();
}

/** Admin: puts failed messages back in the queue. */
export async function retrySms(ids: number[]) {
  if (!ids.length) return 0;
  const rows = await db.update(smsMessages).set({ status: 'PENDING', attempts: 0, nextAttemptAt: new Date() })
    .where(and(inArray(smsMessages.id, ids), inArray(smsMessages.status, ['FAILED', 'SKIPPED']))).returning({ id: smsMessages.id });
  if (rows.length) deliver(rows.map(r => r.id)).catch(() => {});
  return rows.length;
}
