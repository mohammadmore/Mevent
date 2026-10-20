import { db } from './index.ts';
import { interactions } from './schema.ts';

export async function createInteraction(data: typeof interactions.$inferInsert) {
  const result = await db.insert(interactions).values(data).returning();
  return result[0];
}
