import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { friendships, users } from '../db/schema.ts';
import { changePoints, levelFor } from '../lib/points.ts';
import { invalidateCachePattern } from '../lib/sharedStore.ts';
import { notify } from '../lib/notifications.ts';

// Account creation shared by every sign-in method (phone OTP, Google), including the
// referral reward when the new user arrived through an invite link.

export const INVITER_POINTS = 100;
export const INVITEE_POINTS = 50;

type User = typeof users.$inferSelect;

export function newInviteCode() {
  return crypto.randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, 'X');
}

export function selfView(user: User) {
  return { ...user, level: levelFor(user.points) };
}

/**
 * Inserts the user unless an account with the same unique key (uid/phone) already exists, in
 * which case that account is returned (`created: false`). Invite rewards apply only on creation.
 */
export async function createUserWithInvite(
  values: { uid: string; name: string; email?: string | null; phone?: string | null },
  inviteCode?: string | null,
  conflictTarget: 'uid' | 'phone' = 'uid'
): Promise<{ user: User; created: boolean }> {
  const code = (inviteCode || '').trim().toUpperCase();
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(users).values({
      uid: values.uid,
      name: values.name.slice(0, 100),
      email: values.email || null,
      phone: values.phone || null,
      inviteCode: newInviteCode(),
    }).onConflictDoNothing().returning();

    // Lost a race with a parallel sign-in for the same account: return the existing row.
    if (!inserted[0]) {
      const [row] = await tx.select().from(users).where(conflictTarget === 'phone' && values.phone ? eq(users.phone, values.phone) : eq(users.uid, values.uid));
      return { user: row, created: false, inviter: null as User | null };
    }

    let user = inserted[0];
    let inviter: User | null = null;
    if (code) {
      [inviter] = await tx.select().from(users).where(eq(users.inviteCode, code));
      if (inviter && inviter.id !== user.id) {
        await tx.update(users).set({ referredById: inviter.id }).where(eq(users.id, user.id));
        await changePoints(tx, inviter.id, INVITER_POINTS, 'INVITE_ACCEPTED', { type: 'USER', id: user.id });
        await changePoints(tx, user.id, INVITEE_POINTS, 'INVITE_JOINED', { type: 'USER', id: inviter.id });
        // Joining through a friend's link makes you friends.
        await tx.insert(friendships).values({ requesterId: inviter.id, addresseeId: user.id, status: 'ACCEPTED', respondedAt: new Date() }).onConflictDoNothing();
        [user] = await tx.select().from(users).where(eq(users.id, user.id));
      } else {
        inviter = null;
      }
    }
    return { user, created: true, inviter };
  });

  if (result.inviter) {
    invalidateCachePattern('leaderboard');
    notify(result.inviter.id, {
      type: 'INVITE',
      title: 'دوستتان به میونت پیوست',
      body: `${result.user.name} با لینک دعوت شما عضو شد و ${INVITER_POINTS.toLocaleString('fa-IR')} امتیاز گرفتید.`,
      url: '/profile',
    }).catch(() => {});
  }
  return { user: result.user, created: result.created };
}
