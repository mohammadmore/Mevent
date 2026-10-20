import { sql, lt, like } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { cacheEntries, rateLimits } from '../db/schema.ts';

// Cache and rate-limit state live in Postgres (UNLOGGED tables) so every server
// instance sees the same values: an invalidation on one instance is visible to all,
// and a client cannot multiply its rate limit by hitting different instances.

export const cacheStats = { hits: 0, misses: 0, evictions: 0 };

export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const rows = await db.select({ value: cacheEntries.value, expiresAt: cacheEntries.expiresAt })
      .from(cacheEntries).where(sql`${cacheEntries.key} = ${key}`).limit(1);
    const row = rows[0];
    if (!row || row.expiresAt.getTime() < Date.now()) {
      cacheStats.misses++;
      return null;
    }
    cacheStats.hits++;
    return row.value as T;
  } catch (err) {
    cacheStats.misses++;
    return null; // the cache is an optimisation; never fail a request because of it
  }
}

export async function setToCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    await db.insert(cacheEntries).values({ key, value: value as any, expiresAt })
      .onConflictDoUpdate({ target: cacheEntries.key, set: { value: value as any, expiresAt } });
  } catch (err) {
    console.warn('cache write failed:', (err as Error).message);
  }
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const deleted = await db.delete(cacheEntries).where(like(cacheEntries.key, `%${pattern}%`)).returning({ key: cacheEntries.key });
    cacheStats.evictions += deleted.length;
  } catch (err) {
    console.warn('cache invalidation failed:', (err as Error).message);
  }
}

export async function clearCache(): Promise<number> {
  const deleted = await db.delete(cacheEntries).returning({ key: cacheEntries.key });
  cacheStats.evictions += deleted.length;
  return deleted.length;
}

export async function listCacheKeys() {
  const rows = await db.select({ key: cacheEntries.key, expiresAt: cacheEntries.expiresAt }).from(cacheEntries).limit(500);
  return rows.map(r => ({ key: r.key, expiresInSec: Math.max(0, Math.floor((r.expiresAt.getTime() - Date.now()) / 1000)) }));
}

export async function countCacheKeys(): Promise<number> {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(cacheEntries);
    return Number(count);
  } catch {
    return 0;
  }
}

/** Atomically counts a hit in a fixed window. Returns null if the store is unavailable (fail open). */
export async function hitRateLimit(key: string, windowMs: number): Promise<{ count: number; resetAt: Date } | null> {
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + (${windowMs} || ' milliseconds')::interval)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + (${windowMs} || ' milliseconds')::interval ELSE rate_limits.reset_at END
      RETURNING count, reset_at
    `);
    const row: any = (result as any).rows?.[0];
    if (!row) return null;
    return { count: Number(row.count), resetAt: new Date(row.reset_at) };
  } catch (err) {
    return null;
  }
}

/** Removes expired cache entries and rate-limit windows. */
export async function pruneSharedStore(): Promise<void> {
  try {
    await db.delete(cacheEntries).where(lt(cacheEntries.expiresAt, new Date()));
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date()));
  } catch (err) {
    // ignore: pruning is best-effort
  }
}
