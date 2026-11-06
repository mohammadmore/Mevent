import { Request, Response, NextFunction } from 'express';
import { users } from '../db/schema.ts';
import { userFromSession } from '../server/session.ts';

// Everyone signs in with a phone number and an SMS code; the server keeps the session (an
// httpOnly cookie, see session.ts). Nothing here depends on an outside identity service.

export type DbUser = typeof users.$inferSelect;

export interface AuthRequest extends Request {
  dbUser?: DbUser;
  /** The id of the session the request was authenticated with. */
  sessionId?: number;
}

export function notSignedIn(_req: AuthRequest, res: Response) {
  return res.status(401).json({ error: 'برای این کار باید وارد حساب کاربری شوید.' });
}

/** Attaches the signed-in user (from the session cookie); requests without one pass through anonymously. */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await userFromSession(req, res);
    if (session) {
      req.dbUser = session.user;
      req.sessionId = session.sessionId;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser) return notSignedIn(req, res);
  next();
};

export const requireRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser) return notSignedIn(req, res);
  if (!roles.includes(req.dbUser.role)) {
    return res.status(403).json({ error: 'شما دسترسی لازم برای این کار را ندارید.' });
  }
  next();
};

export const requireAdmin = requireRole('ADMIN');

export const isAdmin = (req: AuthRequest) => req.dbUser?.role === 'ADMIN';

/** Allows the request only when `:paramName` is the caller's own DB id, or the caller is an admin. */
export const requireSelfOrAdmin = (paramName = 'id') => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser) return notSignedIn(req, res);
  const targetId = parseInt(req.params[paramName], 10);
  if (req.dbUser.id !== targetId && !isAdmin(req)) {
    return res.status(403).json({ error: 'شما دسترسی لازم برای این کار را ندارید.' });
  }
  next();
};
