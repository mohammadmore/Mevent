import { Express, Response } from 'express';
import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  companionMessages, companionPosts, companionRequests, events, friendships, reports, userBlocks, users,
} from '../../db/schema.ts';
import { AuthRequest, requireAuth } from '../../middleware/auth.ts';
import { asyncRoute, limiters } from '../infra.ts';
import { notify } from '../../lib/notifications.ts';
import { normalizeIranMobile } from '../../lib/phone.ts';
import {
  blockedWith, countSql, friendIds, friendshipBetween, isBlocked, mutualFriendCounts, namesOf, plansOf,
} from '../together.ts';

// "تنها نرو": friends, which friends are going, inviting friends to an event, and finding company
// for an event (a post, "let's go together" requests and a small chat once both agree).

const MAX_NOTE = 200;
const MAX_MESSAGE = 1000;
const DAILY_REQUESTS = 15;
const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const id = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n <= 2_147_483_647 ? n : null; };
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const PERSON = { id: users.id, name: users.name, city: users.city };
type Person = { id: number; name: string; city: string };
const person = (p: Person) => ({ id: p.id, name: p.name, city: p.city });

/** Events people can still plan for: published and not started yet. */
const upcoming = (e: typeof events.$inferSelect) => e.status === 'PUBLISHED' && (!e.startTime || e.startTime.getTime() > Date.now());

/** Company features need a verified mobile number on the account (accountability, fewer fake profiles). */
function needsPhone(req: AuthRequest, res: Response) {
  if (req.dbUser!.phone) return false;
  res.status(403).json({ error: 'برای پیدا کردن همراه، اول شماره موبایلت رو در پروفایل ثبت و تأیید کن.', code: 'PHONE_REQUIRED' });
  return true;
}

async function befriend(a: number, b: number) {
  const existing = await friendshipBetween(a, b);
  if (existing) {
    if (existing.status !== 'ACCEPTED') await db.update(friendships).set({ status: 'ACCEPTED', respondedAt: new Date() }).where(eq(friendships.id, existing.id));
    return existing.status !== 'ACCEPTED';
  }
  const inserted = await db.insert(friendships).values({ requesterId: a, addresseeId: b, status: 'ACCEPTED', respondedAt: new Date() }).onConflictDoNothing().returning();
  return inserted.length > 0;
}

/** The two people in an accepted (or pending) request, and the event, if `me` is one of them. */
async function loadMatch(requestId: number, me: number) {
  const [row] = await db.select({ request: companionRequests, post: companionPosts, event: events }).from(companionRequests)
    .innerJoin(companionPosts, eq(companionRequests.postId, companionPosts.id))
    .innerJoin(events, eq(companionPosts.eventId, events.id))
    .where(eq(companionRequests.id, requestId));
  if (!row || (row.request.fromUserId !== me && row.post.userId !== me)) return null;
  const otherId = row.request.fromUserId === me ? row.post.userId : row.request.fromUserId;
  return { ...row, otherId };
}

export function registerTogetherRoutes(app: Express) {
  // ---------------------------------------------------------------- friends
  app.get('/api/friends', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!.id;
    const rows = await db.select().from(friendships).where(or(eq(friendships.requesterId, me), eq(friendships.addresseeId, me)));
    const others = rows.map(r => (r.requesterId === me ? r.addresseeId : r.requesterId));
    const people = others.length ? await db.select(PERSON).from(users).where(inArray(users.id, others)) : [];
    const byId = new Map(people.map(p => [p.id, p]));
    const out = { friends: [] as any[], incoming: [] as any[], outgoing: [] as any[] };
    for (const r of rows) {
      const other = byId.get(r.requesterId === me ? r.addresseeId : r.requesterId);
      if (!other) continue;
      if (r.status === 'ACCEPTED') out.friends.push({ ...person(other), since: r.respondedAt || r.createdAt });
      else if (r.addresseeId === me) out.incoming.push({ requestId: r.id, user: person(other), createdAt: r.createdAt });
      else out.outgoing.push({ requestId: r.id, user: person(other), createdAt: r.createdAt });
    }
    out.friends.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
    res.json({ data: { ...out, inviteCode: req.dbUser!.inviteCode, shareAttendance: req.dbUser!.shareAttendance } });
  }));

  // By mobile number. The answer is the same whether or not the number has an account, so the
  // endpoint cannot be used to find out who uses Mevent.
  app.post('/api/friends/request', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const phone = normalizeIranMobile(req.body?.phone);
    if (!phone) return res.status(400).json({ error: 'شماره موبایل معتبر نیست.' });
    if (phone === me.phone) return res.status(400).json({ error: 'این شماره خودته!' });
    const done = { message: 'اگه این شماره توی میونت حساب داشته باشه، درخواست دوستی براش فرستاده شد.' };
    const [target] = await db.select().from(users).where(eq(users.phone, phone));
    if (!target || target.id === me.id || await isBlocked(me.id, target.id)) return res.json(done);
    const existing = await friendshipBetween(me.id, target.id);
    if (existing?.status === 'ACCEPTED') return res.json({ message: `«${first(target.name)}» از قبل دوستته.` });
    if (existing && existing.addresseeId === me.id) {
      // They already asked: asking back means yes.
      await befriend(me.id, target.id);
      notify(target.id, { type: 'FRIEND', title: `«${first(me.name)}» درخواست دوستیت رو قبول کرد`, url: '/friends' }).catch(() => {});
      return res.json({ message: `حالا با «${first(target.name)}» دوستید.` });
    }
    if (!existing) {
      await db.insert(friendships).values({ requesterId: me.id, addresseeId: target.id }).onConflictDoNothing();
      notify(target.id, { type: 'FRIEND', title: `«${first(me.name)}» می‌خواد دوستت باشه`, body: 'دوست‌ها می‌بینن کدوم برنامه‌ها می‌رید و می‌تونن دعوتت کنن.', url: '/friends', dedupeKey: `friend-req:${me.id}:${target.id}` }).catch(() => {});
    }
    res.json(done);
  }));

  // Opening someone's invite link while signed in: they shared it to become friends.
  app.post('/api/friends/by-code', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const code = text(req.body?.code, 32).toUpperCase();
    const [owner] = code ? await db.select().from(users).where(eq(users.inviteCode, code)) : [];
    if (!owner) return res.status(404).json({ error: 'این لینک دعوت معتبر نیست.' });
    if (owner.id === me.id) return res.status(400).json({ error: 'این لینک دعوت خودته؛ برای دوستات بفرستش.', code: 'OWN_CODE' });
    if (await isBlocked(me.id, owner.id)) return res.status(404).json({ error: 'این لینک دعوت معتبر نیست.' });
    if (await befriend(owner.id, me.id)) {
      notify(owner.id, { type: 'FRIEND', title: `«${first(me.name)}» با لینک دعوتت دوستت شد`, url: '/friends', dedupeKey: `friend-code:${owner.id}:${me.id}` }).catch(() => {});
    }
    res.json({ data: { friend: { id: owner.id, name: owner.name } }, message: `حالا با «${first(owner.name)}» دوستید.` });
  }));

  app.post('/api/friends/requests/:id/:action', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const requestId = id(req.params.id);
    const action = req.params.action;
    if (!requestId || !['accept', 'decline'].includes(action)) return res.status(404).json({ error: 'درخواست یافت نشد.' });
    const [row] = await db.select().from(friendships).where(and(eq(friendships.id, requestId), eq(friendships.addresseeId, me.id), eq(friendships.status, 'PENDING')));
    if (!row) return res.status(404).json({ error: 'درخواست یافت نشد.' });
    if (action === 'decline') {
      await db.delete(friendships).where(eq(friendships.id, row.id));
      return res.json({ success: true });
    }
    await db.update(friendships).set({ status: 'ACCEPTED', respondedAt: new Date() }).where(eq(friendships.id, row.id));
    notify(row.requesterId, { type: 'FRIEND', title: `«${first(me.name)}» درخواست دوستیت رو قبول کرد`, url: '/friends' }).catch(() => {});
    res.json({ success: true });
  }));

  app.delete('/api/friends/:userId', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const other = id(req.params.userId);
    const row = other ? await friendshipBetween(req.dbUser!.id, other) : null;
    if (row) await db.delete(friendships).where(eq(friendships.id, row.id));
    res.json({ success: true });
  }));

  app.put('/api/friends/settings', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const share = req.body?.shareAttendance !== false;
    await db.update(users).set({ shareAttendance: share }).where(eq(users.id, req.dbUser!.id));
    res.json({ data: { shareAttendance: share } });
  }));

  // ---------------------------------------------------------------- block / report
  app.post('/api/users/:userId/block', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!.id;
    const other = id(req.params.userId);
    if (!other || other === me) return res.status(400).json({ error: 'کاربر نامعتبر است.' });
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.id, other));
    if (!exists) return res.status(404).json({ error: 'کاربر یافت نشد.' });
    await db.transaction(async (tx) => {
      await tx.insert(userBlocks).values({ blockerId: me, blockedId: other }).onConflictDoNothing();
      await tx.delete(friendships).where(or(
        and(eq(friendships.requesterId, me), eq(friendships.addresseeId, other)),
        and(eq(friendships.requesterId, other), eq(friendships.addresseeId, me)),
      ));
      // Open requests between the two are cancelled; their chats stop accepting messages.
      await tx.execute(sql`
        UPDATE companion_requests r SET status = 'CANCELLED'
        FROM companion_posts p
        WHERE r.post_id = p.id AND r.status IN ('PENDING', 'ACCEPTED')
          AND ((r.from_user_id = ${me} AND p.user_id = ${other}) OR (r.from_user_id = ${other} AND p.user_id = ${me}))`);
    });
    res.json({ success: true, message: 'مسدود شد. دیگه همدیگه رو توی میونت نمی‌بینید.' });
  }));

  app.delete('/api/users/:userId/block', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const other = id(req.params.userId);
    if (other) await db.delete(userBlocks).where(and(eq(userBlocks.blockerId, req.dbUser!.id), eq(userBlocks.blockedId, other)));
    res.json({ success: true });
  }));

  app.post('/api/users/:userId/report', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!.id;
    const other = id(req.params.userId);
    const reason = text(req.body?.reason, 100);
    if (!other || other === me || !reason) return res.status(400).json({ error: 'دلیل گزارش رو بنویس.' });
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.id, other));
    if (!exists) return res.status(404).json({ error: 'کاربر یافت نشد.' });
    await db.insert(reports).values({ reporterId: me, targetType: 'USER', targetId: other, reason, details: text(req.body?.details, 1000) || null })
      .onConflictDoUpdate({ target: [reports.reporterId, reports.targetType, reports.targetId], set: { reason, status: 'OPEN', createdAt: new Date() } });
    res.json({ success: true, message: 'گزارشت رسید. تیم میونت بررسیش می‌کنه.' });
  }));

  // ---------------------------------------------------------------- an event, together
  app.get('/api/events/:id/together', asyncRoute(async (req: AuthRequest, res) => {
    const eventId = id(req.params.id);
    const [event] = eventId ? await db.select().from(events).where(eq(events.id, eventId)) : [];
    if (!event || (event.status !== 'PUBLISHED' && event.status !== 'CANCELLED')) return res.status(404).json({ error: 'رویداد مورد نظر یافت نشد.' });
    const me = req.dbUser?.id ?? null;
    const blocked = me ? await blockedWith(me) : new Set<number>();

    // A paid purchase records an RSVP too, so people are counted once across both.
    const going: any = await db.execute(sql`
      SELECT count(*)::int AS n FROM (
        SELECT user_id FROM interactions WHERE event_id = ${event.id} AND type = 'RSVP'
        UNION SELECT user_id FROM tickets WHERE event_id = ${event.id} AND status IN ('ACTIVE', 'USED')
      ) people`);

    const posts = (await db.select({ post: companionPosts, user: PERSON }).from(companionPosts)
      .innerJoin(users, eq(companionPosts.userId, users.id))
      .where(and(eq(companionPosts.eventId, event.id), eq(companionPosts.status, 'OPEN')))
      .orderBy(desc(companionPosts.createdAt)).limit(100))
      .filter(p => !blocked.has(p.user.id));
    const open = upcoming(event);
    const body: any = { goingCount: Number(going.rows?.[0]?.n || 0), canPlan: open, companionCount: open ? posts.filter(p => p.user.id !== me).length : 0, friendsGoing: [], friendsSaved: [], posts: [], myPost: null };
    if (!me) return res.json({ data: body });

    const friends = await friendIds(me);
    const plans = (await plansOf(friends, [event.id])).get(event.id);
    const names = await namesOf([...(plans?.going || []), ...(plans?.saved || [])]);
    body.friendsGoing = [...(plans?.going || [])].map(u => ({ id: u, name: names.get(u) }));
    body.friendsSaved = [...(plans?.saved || [])].map(u => ({ id: u, name: names.get(u) }));
    if (!open) return res.json({ data: body });

    const others = posts.filter(p => p.user.id !== me);
    const mine = posts.find(p => p.user.id === me) || null;
    const mutual = await mutualFriendCounts(me, others.map(p => p.user.id));
    const friendSet = new Set(friends);
    const myRequests = others.length ? await db.select().from(companionRequests)
      .where(and(eq(companionRequests.fromUserId, me), inArray(companionRequests.postId, others.map(p => p.post.id)))) : [];
    body.posts = others.map(p => {
      const r = myRequests.find(x => x.postId === p.post.id);
      return {
        id: p.post.id, note: p.post.note, createdAt: p.post.createdAt, user: { id: p.user.id, name: first(p.user.name), city: p.user.city },
        isFriend: friendSet.has(p.user.id), mutualFriends: mutual.get(p.user.id) || 0,
        myRequest: r ? { id: r.id, status: r.status } : null,
      };
    }).sort((a, b) => Number(b.isFriend) - Number(a.isFriend) || b.mutualFriends - a.mutualFriends);
    if (mine) {
      const requests = await db.select({ request: companionRequests, user: PERSON }).from(companionRequests)
        .innerJoin(users, eq(companionRequests.fromUserId, users.id))
        .where(and(eq(companionRequests.postId, mine.post.id), inArray(companionRequests.status, ['PENDING', 'ACCEPTED'])))
        .orderBy(desc(companionRequests.createdAt));
      const visible = requests.filter(r => !blocked.has(r.user.id));
      const m = await mutualFriendCounts(me, visible.map(r => r.user.id));
      body.myPost = {
        id: mine.post.id, note: mine.post.note,
        requests: visible.map(r => ({ id: r.request.id, status: r.request.status, message: r.request.message, createdAt: r.request.createdAt, user: { id: r.user.id, name: first(r.user.name), city: r.user.city }, isFriend: friendSet.has(r.user.id), mutualFriends: m.get(r.user.id) || 0 })),
      };
    }
    res.json({ data: body });
  }));

  app.post('/api/events/:id/invite', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const eventId = id(req.params.id);
    const [event] = eventId ? await db.select().from(events).where(eq(events.id, eventId)) : [];
    if (!event || !upcoming(event)) return res.status(404).json({ error: 'این رویداد برای دعوت در دسترس نیست.' });
    const wanted = [...new Set((Array.isArray(req.body?.friendIds) ? req.body.friendIds : []).map(id).filter(Boolean))].slice(0, 30) as number[];
    const friends = new Set(await friendIds(me.id));
    const targets = wanted.filter(u => friends.has(u));
    if (!targets.length) return res.status(400).json({ error: 'حداقل یکی از دوستات رو انتخاب کن.' });
    let sent = 0;
    for (const to of targets) {
      const n = await notify(to, {
        type: 'INVITE', title: `«${first(me.name)}» دعوتت کرد`, body: `بریم «${event.title}»؟`, url: `/events/${event.id}`,
        dedupeKey: `invite:${event.id}:${me.id}:${to}`,
      }).catch(() => null);
      if (n) sent++;
    }
    res.json({ data: { sent }, message: sent ? `دعوت برای ${sent.toLocaleString('fa-IR')} نفر فرستاده شد.` : 'قبلاً این دوستات رو دعوت کرده بودی.' });
  }));

  // ---------------------------------------------------------------- looking for company
  app.post('/api/events/:id/companions', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    if (needsPhone(req, res)) return;
    const me = req.dbUser!.id;
    const eventId = id(req.params.id);
    const [event] = eventId ? await db.select().from(events).where(eq(events.id, eventId)) : [];
    if (!event || !upcoming(event)) return res.status(400).json({ error: 'برای این رویداد دیگه نمی‌شه دنبال همراه گشت.' });
    const note = text(req.body?.note, MAX_NOTE) || null;
    const [post] = await db.insert(companionPosts).values({ eventId: event.id, userId: me, note })
      .onConflictDoUpdate({ target: [companionPosts.eventId, companionPosts.userId], set: { note, status: 'OPEN', createdAt: new Date() } }).returning();
    // Friends who are going hear about it: they may simply take them along.
    const friends = await friendIds(me);
    const going = (await plansOf(friends, [event.id])).get(event.id)?.going || new Set<number>();
    for (const f of going) {
      notify(f, { type: 'COMPANION', title: `«${first(req.dbUser!.name)}» برای «${event.title}» دنبال همراهه`, body: 'تو هم میری؛ با هم برید؟', url: `/events/${event.id}`, dedupeKey: `companion-friend:${post.id}:${f}` }).catch(() => {});
    }
    res.status(201).json({ data: { id: post.id, note: post.note }, message: 'ثبت شد. هر کی پایه باشه بهت خبر می‌دیم.' });
  }));

  app.delete('/api/events/:id/companions', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const eventId = id(req.params.id);
    if (!eventId) return res.json({ success: true });
    const [post] = await db.update(companionPosts).set({ status: 'CLOSED' })
      .where(and(eq(companionPosts.eventId, eventId), eq(companionPosts.userId, req.dbUser!.id))).returning();
    if (post) await db.update(companionRequests).set({ status: 'CANCELLED' }).where(and(eq(companionRequests.postId, post.id), eq(companionRequests.status, 'PENDING')));
    res.json({ success: true });
  }));

  app.post('/api/companions/:postId/requests', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    if (needsPhone(req, res)) return;
    const me = req.dbUser!;
    const postId = id(req.params.postId);
    const [row] = postId ? await db.select({ post: companionPosts, event: events }).from(companionPosts)
      .innerJoin(events, eq(companionPosts.eventId, events.id)).where(eq(companionPosts.id, postId)) : [];
    if (!row || row.post.status !== 'OPEN' || !upcoming(row.event) || await isBlocked(me.id, row.post.userId)) {
      return res.status(404).json({ error: 'این درخواست همراهی دیگه باز نیست.' });
    }
    if (row.post.userId === me.id) return res.status(400).json({ error: 'این درخواست خودته.' });
    const [{ n: today }] = await db.select({ n: countSql }).from(companionRequests)
      .where(and(eq(companionRequests.fromUserId, me.id), gte(companionRequests.createdAt, new Date(Date.now() - 86400_000))));
    if (Number(today) >= DAILY_REQUESTS) return res.status(429).json({ error: 'امروز به اندازه‌ی کافی درخواست فرستادی؛ فردا دوباره امتحان کن.' });
    const message = text(req.body?.message, MAX_NOTE) || null;
    const [existing] = await db.select().from(companionRequests).where(and(eq(companionRequests.postId, row.post.id), eq(companionRequests.fromUserId, me.id)));
    if (existing && ['PENDING', 'ACCEPTED'].includes(existing.status)) return res.status(409).json({ error: 'قبلاً درخواست دادی.', data: existing });
    if (existing?.status === 'DECLINED') return res.status(409).json({ error: 'این بار نشد؛ همراه‌های دیگه رو ببین.' });
    const [request] = existing
      ? await db.update(companionRequests).set({ status: 'PENDING', message, createdAt: new Date(), respondedAt: null }).where(eq(companionRequests.id, existing.id)).returning()
      : await db.insert(companionRequests).values({ postId: row.post.id, fromUserId: me.id, message }).returning();
    notify(row.post.userId, {
      type: 'COMPANION', title: `«${first(me.name)}» می‌خواد باهات بیاد «${row.event.title}»`, body: message || 'ببین پایه‌ای؟', url: `/events/${row.event.id}`,
      dedupeKey: `companion-req:${request.id}:${request.createdAt?.getTime()}`,
    }).catch(() => {});
    res.status(201).json({ data: { id: request.id, status: request.status }, message: 'درخواستت رفت. اگه قبول کنه خبرت می‌کنیم.' });
  }));

  app.delete('/api/companion-requests/:id', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const requestId = id(req.params.id);
    if (requestId) await db.update(companionRequests).set({ status: 'CANCELLED' })
      .where(and(eq(companionRequests.id, requestId), eq(companionRequests.fromUserId, req.dbUser!.id), eq(companionRequests.status, 'PENDING')));
    res.json({ success: true });
  }));

  app.post('/api/companion-requests/:id/:action', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const requestId = id(req.params.id);
    const action = req.params.action;
    const match = requestId && ['accept', 'decline'].includes(action) ? await loadMatch(requestId, me.id) : null;
    if (!match || match.post.userId !== me.id || match.request.status !== 'PENDING') return res.status(404).json({ error: 'درخواست یافت نشد.' });
    if (action === 'accept' && (!upcoming(match.event) || await isBlocked(me.id, match.otherId))) return res.status(400).json({ error: 'دیگه نمی‌شه این درخواست رو قبول کرد.' });
    const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    await db.update(companionRequests).set({ status, respondedAt: new Date(), lastMessageAt: status === 'ACCEPTED' ? new Date() : null }).where(eq(companionRequests.id, match.request.id));
    if (status === 'ACCEPTED') {
      notify(match.otherId, {
        type: 'COMPANION', title: `«${first(me.name)}» پایه‌ست!`, body: `با هم برید «${match.event.title}». قرارتون رو هماهنگ کنید.`,
        url: `/together/${match.request.id}`, dedupeKey: `companion-ok:${match.request.id}`,
      }).catch(() => {});
    }
    res.json({ data: { id: match.request.id, status } });
  }));

  // ---------------------------------------------------------------- my companions and chat
  app.get('/api/together', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!.id;
    const rows = await db.select({ request: companionRequests, post: companionPosts, event: events }).from(companionRequests)
      .innerJoin(companionPosts, eq(companionRequests.postId, companionPosts.id))
      .innerJoin(events, eq(companionPosts.eventId, events.id))
      .where(and(eq(companionRequests.status, 'ACCEPTED'), or(eq(companionRequests.fromUserId, me), eq(companionPosts.userId, me))))
      .orderBy(desc(companionRequests.lastMessageAt)).limit(100);
    const others = rows.map(r => (r.request.fromUserId === me ? r.post.userId : r.request.fromUserId));
    const names = await namesOf(others);
    const last = rows.length ? await db.execute(sql`
      SELECT DISTINCT ON (request_id) request_id, body, author_id FROM companion_messages
      WHERE request_id IN (${sql.join(rows.map(r => sql`${r.request.id}`), sql`, `)}) ORDER BY request_id, id DESC`) : { rows: [] };
    const lastBy = new Map((last as any).rows.map((m: any) => [Number(m.request_id), m]));
    const [{ n: pending }] = await db.select({ n: countSql }).from(companionRequests)
      .innerJoin(companionPosts, eq(companionRequests.postId, companionPosts.id))
      .where(and(eq(companionPosts.userId, me), eq(companionRequests.status, 'PENDING')));
    res.json({
      data: rows.map((r, i) => {
        const m: any = lastBy.get(r.request.id);
        return {
          id: r.request.id, event: { id: r.event.id, title: r.event.title, startTime: r.event.startTime },
          other: { id: others[i], name: first(names.get(others[i]) || '') }, lastMessageAt: r.request.lastMessageAt,
          lastMessage: m ? { body: String(m.body).slice(0, 80), mine: Number(m.author_id) === me } : null,
        };
      }),
      pendingRequests: Number(pending),
    });
  }));

  app.get('/api/together/:id', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!.id;
    const requestId = id(req.params.id);
    const match = requestId ? await loadMatch(requestId, me) : null;
    if (!match || !['ACCEPTED', 'CANCELLED'].includes(match.request.status)) return res.status(404).json({ error: 'گفتگو یافت نشد.' });
    const [other] = await db.select(PERSON).from(users).where(eq(users.id, match.otherId));
    const after = id(req.query.after) || 0;
    const messages = await db.select().from(companionMessages)
      .where(and(eq(companionMessages.requestId, match.request.id), sql`${companionMessages.id} > ${after}`))
      .orderBy(companionMessages.id).limit(300);
    const friend = await friendshipBetween(me, match.otherId);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      data: {
        id: match.request.id, open: match.request.status === 'ACCEPTED' && !(await isBlocked(me, match.otherId)),
        event: { id: match.event.id, title: match.event.title, startTime: match.event.startTime, address: match.event.address, city: match.event.city },
        other: { id: other.id, name: first(other.name), city: other.city }, isFriend: friend?.status === 'ACCEPTED',
        messages: messages.map(m => ({ id: m.id, body: m.body, mine: m.authorId === me, createdAt: m.createdAt })),
      },
    });
  }));

  app.post('/api/together/:id/messages', limiters.social, requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const requestId = id(req.params.id);
    const match = requestId ? await loadMatch(requestId, me.id) : null;
    if (!match || match.request.status !== 'ACCEPTED' || await isBlocked(me.id, match.otherId)) return res.status(404).json({ error: 'این گفتگو بسته شده است.' });
    const body = text(req.body?.body, MAX_MESSAGE);
    if (!body) return res.status(400).json({ error: 'پیام خالیه.' });
    const [message] = await db.insert(companionMessages).values({ requestId: match.request.id, authorId: me.id, body }).returning();
    await db.update(companionRequests).set({ lastMessageAt: new Date() }).where(eq(companionRequests.id, match.request.id));
    notify(match.otherId, {
      type: 'COMPANION', title: `پیام از «${first(me.name)}»`, body: body.slice(0, 120), url: `/together/${match.request.id}`,
      dedupeKey: `companion-msg:${match.request.id}:${match.otherId}:${Math.floor(Date.now() / 300_000)}`,
    }).catch(() => {});
    res.status(201).json({ data: { id: message.id, body: message.body, mine: true, createdAt: message.createdAt } });
  }));

  // After going together, becoming friends is one tap.
  app.post('/api/together/:id/befriend', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
    const me = req.dbUser!;
    const requestId = id(req.params.id);
    const match = requestId ? await loadMatch(requestId, me.id) : null;
    if (!match || match.request.status !== 'ACCEPTED' || await isBlocked(me.id, match.otherId)) return res.status(404).json({ error: 'گفتگو یافت نشد.' });
    const existing = await friendshipBetween(me.id, match.otherId);
    if (existing?.status === 'ACCEPTED') return res.json({ message: 'از قبل دوستید.' });
    if (existing && existing.addresseeId === me.id) {
      await befriend(me.id, match.otherId);
      return res.json({ message: 'حالا با هم دوستید.' });
    }
    if (!existing) {
      await db.insert(friendships).values({ requesterId: me.id, addresseeId: match.otherId }).onConflictDoNothing();
      notify(match.otherId, { type: 'FRIEND', title: `«${first(me.name)}» می‌خواد دوستت باشه`, url: '/friends', dedupeKey: `friend-req:${me.id}:${match.otherId}` }).catch(() => {});
    }
    res.json({ message: 'درخواست دوستی فرستاده شد.' });
  }));
}

