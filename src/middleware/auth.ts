import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { userFromSession } from '../server/session.ts';

// Google sign-in (Firebase) can be turned off, e.g. when the server is hosted in Iran and
// Google's token-signing keys are not reachable. Phone login does not depend on it.
export const googleLoginEnabled = process.env.AUTH_GOOGLE_ENABLED !== 'false';

export type DbUser = typeof users.$inferSelect;

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: DbUser;
  /** Set when the request was authenticated with a phone-login session cookie. */
  sessionId?: number;
}

function extractBearer(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Identifies the caller from (1) a phone-login session cookie, or (2) a Firebase ID token in
 * the Authorization header when Google login is enabled, and attaches the DB user.
 * Requests without credentials pass through anonymously; invalid tokens are rejected.
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await userFromSession(req, res);
    if (session) {
      req.dbUser = session.user;
      req.sessionId = session.sessionId;
      return next();
    }
  } catch (error) {
    return next(error);
  }

  const token = extractBearer(req);
  if (!token || !googleLoginEnabled) return next();

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (error) {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی شده است. لطفا دوباره وارد شوید.' });
  }

  req.firebaseUser = decoded;
  try {
    const rows = await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1);
    if (rows[0]) req.dbUser = rows[0];
  } catch (error) {
    return next(error);
  }
  next();
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser) {
    return res.status(401).json({ error: 'برای این کار باید وارد حساب کاربری شوید.' });
  }
  next();
};

export const requireRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser) {
    return res.status(401).json({ error: 'برای این کار باید وارد حساب کاربری شوید.' });
  }
  if (!roles.includes(req.dbUser.role)) {
    return res.status(403).json({ error: 'شما دسترسی لازم برای این کار را ندارید.' });
  }
  next();
};

export const requireAdmin = requireRole('ADMIN');

export const isAdmin = (req: AuthRequest) => req.dbUser?.role === 'ADMIN';

/** Allows the request only when `:paramName` is the caller's own DB id, or the caller is an admin. */
export const requireSelfOrAdmin = (paramName = 'id') => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser) {
    return res.status(401).json({ error: 'برای این کار باید وارد حساب کاربری شوید.' });
  }
  const targetId = parseInt(req.params[paramName], 10);
  if (req.dbUser.id !== targetId && !isAdmin(req)) {
    return res.status(403).json({ error: 'شما دسترسی لازم برای این کار را ندارید.' });
  }
  next();
};
