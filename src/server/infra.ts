import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { hitRateLimit, getFromCache, setToCache } from '../lib/sharedStore.ts';

// ==========================================
// METRICS
// ==========================================
export const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalLatencyMs: 0,
  startTime: Date.now(),
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  metrics.totalRequests++;
  res.on('finish', () => {
    metrics.totalLatencyMs += Date.now() - start;
    if (res.statusCode >= 200 && res.statusCode < 400) metrics.successfulRequests++;
    else metrics.failedRequests++;
  });
  next();
}

// ==========================================
// RATE LIMITING (shared across instances via Postgres, in-memory fallback)
// ==========================================
const localWindows = new Map<string, { count: number; resetTime: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of localWindows) if (now > record.resetTime) localWindows.delete(key);
}, 60000).unref();

function hitLocal(key: string, windowMs: number) {
  const now = Date.now();
  const record = localWindows.get(key) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }
  record.count++;
  localWindows.set(key, record);
  return { count: record.count, resetAt: new Date(record.resetTime) };
}

// Each limiter has its own bucket per client, shared across all paths it guards,
// so changing the URL (e.g. /api/events/1 vs /api/events/2) does not reset the count.
// RATE_LIMIT_MULTIPLIER scales every limit (e.g. for load tests or a trusted internal deployment).
const LIMIT_FACTOR = Math.max(0.01, Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);

export function createRateLimiter(name: string, baseMaxRequests: number, windowMs = 60000): RequestHandler {
  const maxRequests = Math.max(1, Math.round(baseMaxRequests * LIMIT_FACTOR));
  return async (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${name}:${ip}`;
    const hit = (await hitRateLimit(key, windowMs)) || hitLocal(key, windowMs);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - hit.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(hit.resetAt.getTime() / 1000));
    if (hit.count > maxRequests) {
      return res.status(429).json({
        error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفا چند ثانیه صبر کنید.',
        retryAfter: Math.max(1, Math.ceil((hit.resetAt.getTime() - Date.now()) / 1000)),
      });
    }
    next();
  };
}

export const limiters = {
  default: createRateLimiter('default', 120),
  upload: createRateLimiter('upload', 60),
  // Excel batch import creates many events in a row.
  contentWrite: createRateLimiter('content-write', 60),
  tickets: createRateLimiter('tickets', 20),
  account: createRateLimiter('account', 10),
  crawler: createRateLimiter('crawler', 10),
  tripPlanner: createRateLimiter('trip-planner', 30),
  social: createRateLimiter('social', 60),
};

// ==========================================
// BACKGROUND JOBS (state shared across instances)
// ==========================================
export interface BackgroundJob {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
}

const JOB_TTL_MS = 60 * 60 * 1000;

export async function createJob(type: string): Promise<BackgroundJob> {
  const job: BackgroundJob = { id: `job_${crypto.randomUUID()}`, type, status: 'PENDING', progress: 0, createdAt: new Date().toISOString() };
  await setToCache(`job:${job.id}`, job, JOB_TTL_MS);
  return job;
}

export async function saveJob(job: BackgroundJob) {
  await setToCache(`job:${job.id}`, job, JOB_TTL_MS);
}

export async function getJob(id: string) {
  return getFromCache<BackgroundJob>(`job:${id}`);
}

// ==========================================
// MISC
// ==========================================
export function validateInput(req: Request, res: Response, next: NextFunction) {
  for (const [key, max] of [['lat', 90], ['lng', 180]] as const) {
    if (req.query[key]) {
      const v = parseFloat(req.query[key] as string);
      if (isNaN(v) || v < -max || v > max) {
        return res.status(400).json({ error: `مختصات جغرافیایی (${key}) نامعتبر است.` });
      }
    }
  }
  next();
}

/** Wraps an async route so rejected promises reach the error handler (Express 4 does not do this). */
export const asyncRoute = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };

export function parsePaging(query: any, defaultLimit = 20, maxLimit = 50) {
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);
  return { limit, offset };
}

export function publicBaseUrl(req: Request) {
  if (process.env.APP_URL && /^https?:\/\//.test(process.env.APP_URL)) return process.env.APP_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}
