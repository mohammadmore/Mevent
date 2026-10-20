import { db } from './index.ts';
import { hubs } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getHubs() {
  const result = await db.select().from(hubs);
  return result;
}

export async function getHub(id: number) {
  const result = await db.select().from(hubs).where(eq(hubs.id, id));
  return result[0];
}

export async function createHub(data: typeof hubs.$inferInsert) {
  const result = await db.insert(hubs).values(data).returning();
  return result[0];
}
