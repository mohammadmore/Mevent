import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string | undefined, name: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email: email || null,
      name,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: email || null,
        name,
      },
    })
    .returning();

  return result[0];
}

export async function getUserProfile(userId: number) {
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0];
}

export async function updateUserPreferences(userId: number, preferences: string[]) {
  const result = await db.update(users)
    .set({ preferences: JSON.stringify(preferences) })
    .where(eq(users.id, userId))
    .returning();
  return result[0];
}
