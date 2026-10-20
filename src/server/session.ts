import crypto from 'crypto';
import { Request, Response } from 'express';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { sessions, users } from '../db/schema.ts';

// Server-side sessions for phone login. The cookie carries a random 256-bit token; the
// database stores only its SHA-256, so neither a DB leak nor log access exposes live sessions.

export const SESSION_COOKIE = 'mevent_session';
const SESSION_DAYS = 30;
// Sessions used within the last half of their life are extended (sliding expiry).
const RENEW_WHEN_LEFT_MS = (SESSION_DAYS / 2) * 86400_000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function cookieOptions(req: Request, maxAgeMs: number) {
  // SameSite=Lax: the cookie is not sent on cross-site POST/PUT/DELETE, which blocks CSRF
  // against the JSON API while still allowing normal navigation from other sites.
  return {
    httpOnly: true,
    secure: req.secure || process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export async function createSession(req: Request, res: Response, userId: number) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    ip: req.ip || null,
    expiresAt,
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions(req, SESSION_DAYS * 86400_000));
}

/** Returns the user for a valid session cookie (and extends it when due), or null. */
export async function userFromSession(req: Request, res: Response) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length > 100) return null;
  const [row] = await db.select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return null;
  }
  const now = Date.now();
  if (row.session.expiresAt.getTime() - now < RENEW_WHEN_LEFT_MS) {
    const expiresAt = new Date(now + SESSION_DAYS * 86400_000);
    await db.update(sessions).set({ expiresAt, lastSeenAt: new Date() }).where(eq(sessions.id, row.session.id));
    res.cookie(SESSION_COOKIE, token, cookieOptions(req, SESSION_DAYS * 86400_000));
  } else if (!row.session.lastSeenAt || now - row.session.lastSeenAt.getTime() > 3600_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.session.id));
  }
  return { user: row.user, sessionId: row.session.id };
}

export async function destroySession(req: Request, res: Response) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export async function destroyAllSessions(userId: number, exceptSessionId?: number) {
  await db.delete(sessions).where(and(
    eq(sessions.userId, userId),
    exceptSessionId ? sql`${sessions.id} <> ${exceptSessionId}` : undefined
  ));
}

export async function pruneExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
