import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export type DbUser = typeof users.$inferSelect;

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: DbUser;
}

function extractBearer(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Verifies the Firebase ID token when one is present and attaches the decoded
 * token and the matching DB user to the request. Requests without a token pass
 * through anonymously; requests with an invalid token are rejected.
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) return next();

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
