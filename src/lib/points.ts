import { eq, sql, desc } from 'drizzle-orm';
import { db, DbTransaction } from '../db/index.ts';
import { users, pointTransactions } from '../db/schema.ts';

type Executor = typeof db | DbTransaction;

// How points can be spent: each point is worth this many Toman off a ticket,
// and points may cover at most this share of an order.
export const POINT_VALUE_TOMAN = 10;
export const MAX_POINTS_SHARE = 0.5;

export const LEVELS = [
  { key: 'BRONZE', name: 'برنزی', minPoints: 0 },
  { key: 'SILVER', name: 'نقره‌ای', minPoints: 200 },
  { key: 'GOLD', name: 'طلایی', minPoints: 1000 },
  { key: 'PLATINUM', name: 'پلاتینیوم', minPoints: 5000 },
];

export function levelFor(points: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (points >= LEVELS[i].minPoints) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  return {
    ...current,
    next: next ? { ...next, pointsNeeded: next.minPoints - points } : null,
    progress: next ? Math.min(1, (points - current.minPoints) / (next.minPoints - current.minPoints)) : 1,
  };
}

/**
 * Changes a user's balance and records why. Negative deltas never push the balance below zero;
 * the ledger stores the change that was actually applied.
 */
export async function changePoints(
  exec: Executor,
  userId: number,
  delta: number,
  reason: string,
  ref?: { type: string; id: number }
): Promise<number> {
  if (!delta) return 0;
  const [row] = await exec.select({ points: users.points }).from(users).where(eq(users.id, userId)).for('update');
  if (!row) return 0;
  const applied = delta < 0 ? -Math.min(row.points, -delta) : delta;
  if (applied === 0) return 0;
  await exec.update(users).set({ points: sql`${users.points} + ${applied}` }).where(eq(users.id, userId));
  await exec.insert(pointTransactions).values({ userId, delta: applied, reason, refType: ref?.type, refId: ref?.id });
  return applied;
}

export async function getPointHistory(userId: number, limit = 30) {
  return db.select().from(pointTransactions).where(eq(pointTransactions.userId, userId))
    .orderBy(desc(pointTransactions.createdAt)).limit(limit);
}
