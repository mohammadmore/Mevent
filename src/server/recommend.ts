import { and, desc, eq, gte, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { events, interactions, places, tickets, users, vibes } from '../db/schema.ts';
import { distanceSql, normalizedColumn, normalizeSearchText, upcomingCondition } from '../db/events.ts';
import { addDays, startOfTehranDay, tehranDayRange, tehranParts, tehranWeekendRange } from '../lib/time.ts';
import {
  BudgetKey, CHEAP_LIMIT, COMPANY, CompanyKey, FREE_PLACE_TYPES, MOODS, MoodKey, PLACE_TYPE_LABELS, VibeTag, WhenKey,
  effectiveVibes, inferPlaceVibes,
} from '../lib/moods.ts';
import { eventVibes, formatEvents, parseJsonArray, placeVibes } from './helpers.ts';
import { MAJOR_CITIES } from './queryParser.ts';
import { openState } from './openHours.ts';
import { seatsTaken } from './seats.ts';
import { friendIds, namesOf, namesPhrase, plansOf } from './together.ts';

// In-system recommendations, no external AI: a taste profile built from what someone viewed,
// saved, attended or dismissed, the "I'm bored" picker (three picks for a mood, time, company
// and budget) and the no-cost section. Every pick carries a one-line, human reason.

const fa = (n: number) => n.toLocaleString('fa-IR');
const faTime = (d: Date) => {
  const p = tehranParts(d);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`.replace(/\d/g, x => fa(Number(x)));
};
const WEEKDAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

/** "#موسیقی_و_کنسرت" → "موسیقی و کنسرت"; also the key tags are compared by. */
const tagKey = (t: unknown) => normalizeSearchText(String(t).replace(/^#/, '').replace(/_/g, ' '));
const IGNORED_TAGS = new Set([...MAJOR_CITIES.map(tagKey), 'خزشگر', 'رویداد', 'event']);

// ---------------------------------------------------------------- taste profile

/** How much each signal says about someone's taste (negative: "not for me"). */
const SIGNAL_WEIGHT: Record<string, number> = { VIEW: 1, SAVE: 3, SHARE: 3, RSVP: 5, TICKET: 5, ATTENDED: 6, NOT_INTERESTED: -6 };
const SIGNAL_VERB: Record<string, string> = { VIEW: 'دیدی', SAVE: 'ذخیره کردی', SHARE: 'به اشتراک گذاشتی', RSVP: 'ثبت‌نام کردی', TICKET: 'بلیتش رو گرفتی', ATTENDED: 'رفتی' };

type Source = { title: string; verb: string; w: number };
export type Taste = {
  tags: Map<string, { w: number; label: string; source?: Source }>;
  vibes: Map<VibeTag, number>;
  organizers: Map<number, { w: number; source?: Source }>;
  preferences: Map<string, string>;
  /** Events to leave out of "for you": already going, saved or dismissed. */
  known: Set<number>;
  viewed: Set<number>;
  dismissed: Set<number>;
  /** Events the person liked (for "people like you also went to"). */
  liked: { id: number; title: string; w: number }[];
  signals: number;
};

export async function tasteProfile(userId: number | null): Promise<Taste> {
  const taste: Taste = { tags: new Map(), vibes: new Map(), organizers: new Map(), preferences: new Map(), known: new Set(), viewed: new Set(), dismissed: new Set(), liked: [], signals: 0 };
  if (!userId) return taste;
  const since = addDays(new Date(), -365);
  const [user] = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, userId));
  for (const p of parseJsonArray(user?.preferences)) taste.preferences.set(tagKey(p), String(p).replace(/^#/, '').replace(/_/g, ' '));

  const acts = await db.select({ type: interactions.type, event: events }).from(interactions)
    .innerJoin(events, eq(interactions.eventId, events.id))
    .where(and(eq(interactions.userId, userId), gte(interactions.createdAt, since)))
    .orderBy(desc(interactions.createdAt)).limit(2000);
  const owned = await db.select({ status: tickets.status, event: events }).from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(and(eq(tickets.userId, userId), inArray(tickets.status, ['ACTIVE', 'USED'])));
  const signals = [
    ...acts.map(a => ({ kind: a.type, event: a.event })),
    ...owned.map(t => ({ kind: t.status === 'USED' ? 'ATTENDED' : 'TICKET', event: t.event })),
  ].filter(s => s.kind in SIGNAL_WEIGHT);

  const perEvent = new Map<number, { title: string; w: number }>();
  for (const { kind, event } of signals) {
    const w = SIGNAL_WEIGHT[kind];
    taste.signals++;
    if (kind === 'VIEW') taste.viewed.add(event.id);
    else taste.known.add(event.id);
    if (kind === 'NOT_INTERESTED') taste.dismissed.add(event.id);
    const source = w > 0 ? { title: event.title, verb: SIGNAL_VERB[kind], w } : undefined;
    const better = (cur?: Source) => (source && (!cur || source.w > cur.w) ? source : cur);
    for (const t of parseJsonArray(event.tags)) {
      const key = tagKey(t);
      if (!key || IGNORED_TAGS.has(key)) continue;
      const cur = taste.tags.get(key);
      taste.tags.set(key, { w: (cur?.w || 0) + w, label: String(t).replace(/^#/, '').replace(/_/g, ' '), source: better(cur?.source) });
    }
    for (const v of eventVibes(event)) taste.vibes.set(v, (taste.vibes.get(v) || 0) + w / 2);
    const org = taste.organizers.get(event.organizerId);
    taste.organizers.set(event.organizerId, { w: (org?.w || 0) + w, source: better(org?.source) });
    const e = perEvent.get(event.id) || { title: event.title, w: 0 };
    e.w += w;
    perEvent.set(event.id, e);
  }
  // A dismissal outweighs having glanced at the same event.
  for (const id of taste.dismissed) perEvent.delete(id);
  taste.liked = [...perEvent.entries()].filter(([, e]) => e.w >= 3).map(([id, e]) => ({ id, ...e })).sort((a, b) => b.w - a.w).slice(0, 30);
  return taste;
}

type EventRow = typeof events.$inferSelect;

/** Taste match of one event, with the reason that contributed most. */
function affinity(taste: Taste, event: EventRow, vibeTags: VibeTag[]) {
  const reasons: { score: number; text: string }[] = [];
  let score = 0;
  for (const t of parseJsonArray(event.tags)) {
    const key = tagKey(t);
    const pref = taste.preferences.get(key);
    if (pref) {
      score += 3;
      reasons.push({ score: 3, text: `چون به «${pref}» علاقه داری` });
    }
    const tag = taste.tags.get(key);
    if (!tag) continue;
    const s = Math.max(-6, Math.min(6, tag.w));
    score += s;
    if (s > 0 && tag.source) reasons.push({ score: s, text: `چون «${tag.source.title}» رو ${tag.source.verb}` });
  }
  const org = taste.organizers.get(event.organizerId);
  if (org) {
    const s = Math.max(-8, Math.min(8, org.w * 1.5));
    score += s;
    if (s > 0 && org.source) reasons.push({ score: s + 0.5, text: `از همون برگزارکننده‌ی «${org.source.title}»` });
  }
  let vibeScore = 0, bestVibe: VibeTag | null = null;
  for (const v of vibeTags) {
    const w = taste.vibes.get(v) || 0;
    vibeScore += w;
    if (w > 0 && (!bestVibe || w > (taste.vibes.get(bestVibe) || 0))) bestVibe = v;
  }
  vibeScore = Math.max(-4, Math.min(4, vibeScore * 0.3));
  score += vibeScore;
  if (bestVibe && vibeScore > 1) {
    const label = bestVibe in MOODS ? MOODS[bestVibe as MoodKey].label : COMPANY[bestVibe as CompanyKey].label;
    reasons.push({ score: vibeScore, text: `چون از برنامه‌های «${label}» خوشت میاد` });
  }
  reasons.sort((a, b) => b.score - a.score);
  return { score, reason: reasons[0]?.text || null };
}

function cityCondition(column: any, city?: string): SQL | undefined {
  return city ? sql`${normalizedColumn(column)} = ${normalizeSearchText(city)}` : undefined;
}

/** How many people are going to (or saved) each event. */
async function popularity(ids: number[]) {
  const map = new Map<number, number>();
  if (!ids.length) return map;
  // Buying a ticket also records an RSVP, so each person counts once per event.
  const list = sql.join(ids.map(i => sql`${i}`), sql`, `);
  const result: any = await db.execute(sql`
    SELECT event_id, count(DISTINCT user_id)::int AS n FROM (
      SELECT event_id, user_id FROM interactions WHERE event_id IN (${list}) AND type IN ('RSVP', 'SAVE')
      UNION ALL SELECT event_id, user_id FROM tickets WHERE event_id IN (${list}) AND status IN ('ACTIVE', 'USED')
    ) people GROUP BY event_id`);
  for (const r of result.rows || []) map.set(Number(r.event_id), Number(r.n));
  return map;
}

/** People who liked the same events as this person: what else they are going to. */
async function peerPicks(userId: number, liked: Taste['liked']) {
  const result = new Map<number, { n: number; via: string }>();
  if (!liked.length) return result;
  const peers = await db.selectDistinct({ userId: interactions.userId, eventId: interactions.eventId }).from(interactions)
    .where(and(inArray(interactions.eventId, liked.map(l => l.id)), ne(interactions.userId, userId), inArray(interactions.type, ['RSVP', 'SAVE'])))
    .limit(500);
  if (!peers.length) return result;
  const titleOf = new Map(liked.map(l => [l.id, l.title]));
  const viaOf = new Map<number, string>();
  for (const p of peers) if (!viaOf.has(p.userId)) viaOf.set(p.userId, titleOf.get(p.eventId)!);
  const theirs = await db.selectDistinct({ userId: interactions.userId, eventId: interactions.eventId }).from(interactions)
    .where(and(inArray(interactions.userId, [...viaOf.keys()]), inArray(interactions.type, ['RSVP', 'SAVE'])));
  for (const t of theirs) {
    const cur = result.get(t.eventId) || { n: 0, via: viaOf.get(t.userId)! };
    cur.n++;
    result.set(t.eventId, cur);
  }
  return result;
}

const hoursUntil = (d: Date | null) => (d ? (d.getTime() - Date.now()) / 3_600_000 : null);

function distanceKm(lat?: number, lng?: number, toLat?: number | null, toLng?: number | null) {
  if (lat == null || lng == null || toLat == null || toLng == null) return null;
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((toLat - lat) * p) / 2 + Math.cos(lat * p) * Math.cos(toLat * p) * (1 - Math.cos((toLng - lng) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

const distanceText = (d: number | null) => (d === null ? null : d < 1 ? 'همین نزدیکی' : `${fa(Math.round(d))} کیلومتر از تو`);

/** "when" phrase for an event start, relative to today. */
function startText(start: Date | null, end: Date | null) {
  if (!start) return null;
  const now = Date.now();
  const finish = end?.getTime() ?? start.getTime() + 2 * 3_600_000;
  if (start.getTime() <= now && finish > now) return 'همین الان در جریانه';
  const [todayStart, todayEnd] = tehranDayRange();
  if (start < todayEnd && start >= todayStart) return `امروز ساعت ${faTime(start)}`;
  if (start < addDays(todayEnd, 1) && start >= todayEnd) return `فردا ساعت ${faTime(start)}`;
  return `${WEEKDAY_NAMES[tehranParts(start).weekday]} ساعت ${faTime(start)}`;
}

// ---------------------------------------------------------------- "for you"

export async function forYou(opts: { userId: number | null; city?: string; lat?: number; lng?: number; limit: number }) {
  const taste = await tasteProfile(opts.userId);
  const personalized = taste.signals > 0 || taste.preferences.size > 0;
  let rows = await db.select().from(events)
    .where(and(upcomingCondition(), cityCondition(events.city, opts.city)))
    .orderBy(sql`${events.startTime} ASC NULLS LAST`).limit(400);
  rows = rows.filter(e => !taste.known.has(e.id) && e.organizerId !== opts.userId);
  const [pop, peers] = await Promise.all([
    popularity(rows.map(e => e.id)),
    opts.userId ? peerPicks(opts.userId, taste.liked) : Promise.resolve(new Map()),
  ]);
  const friends = opts.userId ? await friendIds(opts.userId) : [];
  const plans = await plansOf(friends, rows.map(e => e.id));
  const friendNames = await namesOf([...new Set([...plans.values()].flatMap(p => [...p.going, ...p.saved]))]);
  const phrase = (ids: Set<number>) => namesPhrase([...ids].map(i => friendNames.get(i) || '').filter(Boolean));

  const scored = rows.map(event => {
    const vibeTags = eventVibes(event);
    const a = affinity(taste, event, vibeTags);
    const reasons: { score: number; text: string }[] = [];
    if (a.reason) reasons.push({ score: a.score, text: a.reason });
    let score = a.score;
    const peer = peers.get(event.id);
    if (peer) {
      const s = 2 * Math.log2(1 + peer.n);
      score += s;
      reasons.push({ score: s + 0.5, text: `کسایی که «${peer.via}» رو دوست داشتن، این رو هم انتخاب کردن` });
    }
    const plan = plans.get(event.id);
    if (plan?.going.size) {
      // Friends going is the strongest reason there is: you would not be going alone.
      const s = 4 + 1.5 * Math.log2(plan.going.size);
      score += s;
      reasons.push({ score: s + 10, text: `${phrase(plan.going)} ${plan.going.size > 1 ? 'میان' : 'میاد'}` });
    } else if (plan?.saved.size) {
      const s = 1.5 + Math.log2(plan.saved.size);
      score += s;
      reasons.push({ score: s + 2, text: `${phrase(plan.saved)} هم ذخیره‌ش ${plan.saved.size > 1 ? 'کردن' : 'کرده'}` });
    }
    const n = pop.get(event.id) || 0;
    const popScore = 0.6 * Math.log2(1 + n);
    score += popScore;
    if (n >= 3) reasons.push({ score: popScore, text: `${fa(n)} نفر تا الان پایه‌ن` });
    const h = hoursUntil(event.startTime);
    if (h !== null && h >= 0 && h < 168) {
      const s = Math.max(0, 1 - Math.max(0, h) / 168);
      score += s;
      if (h < 48) reasons.push({ score: s * 0.8, text: `${startText(event.startTime, event.endTime)}، از دستش نده` });
    }
    const d = distanceKm(opts.lat, opts.lng, event.lat, event.lng);
    if (d !== null) {
      const s = 1.5 * Math.max(0, 1 - d / 20);
      score += s;
      if (d < 3) reasons.push({ score: s, text: `${distanceText(d)}ه` });
    }
    if (taste.viewed.has(event.id)) score -= 0.5;
    if (event.cost === 0) score += 0.2;
    reasons.sort((x, y) => y.score - x.score);
    return { event, score, reason: reasons[0]?.text || 'شاید غافلگیرت کنه' };
  }).sort((x, y) => y.score - x.score);

  // No organizer fills the feed: at most two picks each.
  const perOrganizer = new Map<number, number>();
  const picked = [];
  for (const s of scored) {
    const c = perOrganizer.get(s.event.organizerId) || 0;
    if (c >= 2) continue;
    perOrganizer.set(s.event.organizerId, c + 1);
    picked.push(s);
    if (picked.length >= opts.limit) break;
  }
  const formatted = await formatEvents(picked.map(p => p.event));
  return { personalized, data: formatted.map((e, i) => ({ ...e, reason: picked[i].reason })) };
}

// ---------------------------------------------------------------- "I'm bored" picker

export type Pick = {
  kind: 'event' | 'place' | 'vibe';
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  url: string;
  reason: string;
  vibes: VibeTag[];
  cost: number | null;
  free: boolean;
  startTime: Date | null;
  distanceKm: number | null;
};

export type SuggestOptions = {
  userId: number | null;
  mood?: MoodKey;
  company?: CompanyKey;
  when: WhenKey;
  budget: BudgetKey;
  city?: string;
  lat?: number;
  lng?: number;
  exclude: Set<string>;
  count: number;
};

/** The window events must overlap and the moment places must be open at. */
function timeFrame(when: WhenKey) {
  const now = new Date();
  const today = startOfTehranDay(now);
  const at = (day: Date, hour: number) => new Date(day.getTime() + hour * 3_600_000);
  switch (when) {
    case 'now': return { from: now, to: new Date(now.getTime() + 3 * 3_600_000), openAt: now };
    case 'tonight': {
      const from = new Date(Math.max(now.getTime(), at(today, 16).getTime()));
      return { from, to: at(today, 27), openAt: new Date(Math.max(now.getTime(), at(today, 20).getTime())) };
    }
    case 'tomorrow': {
      const [start, end] = tehranDayRange(addDays(today, 1.5));
      return { from: start, to: end, openAt: at(start, 18) };
    }
    case 'weekend': {
      const [start, end] = tehranWeekendRange(now);
      const from = new Date(Math.max(now.getTime(), start.getTime()));
      return { from, to: end, openAt: new Date(Math.max(now.getTime(), at(start, 18).getTime())) };
    }
  }
}

type Candidate = Pick & { score: number; group: string; fragments: string[] };

function moodFit(opts: SuggestOptions, tags: VibeTag[], fragments: string[]) {
  let s = 0;
  if (opts.mood) {
    if (tags.includes(opts.mood)) { s += 4; fragments.push(MOODS[opts.mood].label); } else s -= 1.5;
  }
  if (opts.company) {
    if (tags.includes(opts.company)) { s += 3; fragments.push(COMPANY[opts.company].label); } else s -= opts.company === 'family' ? 3 : 0.5;
  }
  return s;
}

function distanceFit(opts: SuggestOptions, d: number | null, fragments: string[]) {
  if (d === null) return 0;
  if (d < 5) fragments.push(distanceText(d)!);
  let s = 3 * Math.max(0, 1 - Math.min(d, 20) / 20);
  if (opts.when === 'now' && d > 25) s -= 3;
  return s;
}

async function eventCandidates(opts: SuggestOptions, frame: ReturnType<typeof timeFrame>, taste: Taste, all = false): Promise<Candidate[]> {
  const conditions: (SQL | undefined)[] = [
    upcomingCondition(),
    cityCondition(events.city, opts.city),
    sql`${events.startTime} IS NOT NULL`,
    sql`${events.startTime} < ${frame.to}`,
    sql`coalesce(${events.endTime}, ${events.startTime} + interval '2 hours') > ${frame.from}`,
  ];
  if (opts.budget === 'free') conditions.push(eq(events.cost, 0));
  if (opts.budget === 'cheap') conditions.push(sql`${events.cost} <= ${CHEAP_LIMIT}`);
  const rows = await db.select().from(events).where(and(...conditions)).orderBy(events.startTime).limit(300);
  const pop = await popularity(rows.map(r => r.id));
  return rows.filter(e => all || (!taste.dismissed.has(e.id) && !opts.exclude.has(`event:${e.id}`))).map(e => {
    const tags = eventVibes(e);
    const fragments: string[] = [];
    let score = moodFit(opts, tags, fragments);
    const when = startText(e.startTime, e.endTime);
    if (when) fragments.push(when);
    if (e.cost === 0) { fragments.push('مجانیه'); score += opts.budget === 'any' ? 0.3 : 1; }
    const d = distanceKm(opts.lat, opts.lng, e.lat, e.lng);
    score += distanceFit(opts, d, fragments);
    const a = affinity(taste, e, tags);
    score += Math.max(-4, Math.min(3, a.score * 0.4));
    if (a.reason && a.score > 2) fragments.unshift(a.reason);
    score += 0.5 * Math.log2(1 + (pop.get(e.id) || 0));
    const h = hoursUntil(e.startTime) ?? 0;
    if (opts.when === 'now') score += Math.max(0, 1.5 - Math.max(0, h) / 2);
    score += 1; // a real plan beats a generic place, all else being equal
    return {
      kind: 'event', id: e.id, title: e.title, subtitle: e.address || e.city, imageUrl: e.imageUrl, url: `/events/${e.id}`,
      reason: '', vibes: tags, cost: e.cost, free: e.cost === 0, startTime: e.startTime, distanceKm: d,
      score, group: `org:${e.organizerId}`, fragments,
    } satisfies Candidate;
  });
}

async function placeCandidates(opts: SuggestOptions, frame: ReturnType<typeof timeFrame>, all = false): Promise<Candidate[]> {
  const conditions: (SQL | undefined)[] = [eq(places.status, 'PUBLISHED'), cityCondition(places.city, opts.city)];
  if (opts.budget === 'free') conditions.push(inArray(places.type, FREE_PLACE_TYPES));
  const near = opts.lat != null && opts.lng != null ? distanceSql(opts.lat, opts.lng, places.lat, places.lng) : null;
  const rows = await db.select().from(places).where(and(...conditions))
    .orderBy(near ? sql`CASE WHEN ${places.lat} IS NULL THEN 1e9 ELSE ${near} END` : sql`${places.id} DESC`).limit(300);
  const out: Candidate[] = [];
  for (const p of rows) {
    if (!all && opts.exclude.has(`place:${p.id}`)) continue;
    const open = openState(p, frame.openAt);
    if (open.known && !open.open) continue;
    const tags = placeVibes(p);
    const fragments: string[] = [];
    let score = moodFit(opts, tags, fragments);
    if (open.known) {
      fragments.push(opts.when === 'now' ? (open.closesAt ? `تا ${open.closesAt.replace(/\d/g, x => fa(Number(x)))} بازه` : 'الان بازه') : 'اون موقع بازه');
    } else score -= 1;
    const free = FREE_PLACE_TYPES.includes(p.type);
    if (free) { fragments.push('ورودی نداره'); if (opts.budget !== 'any') score += 1; }
    const d = distanceKm(opts.lat, opts.lng, p.lat, p.lng);
    score += distanceFit(opts, d, fragments);
    out.push({
      kind: 'place', id: p.id, title: p.name, subtitle: PLACE_TYPE_LABELS[p.type] || null, imageUrl: p.imageUrl || null, url: `/places/${p.id}`,
      reason: '', vibes: tags, cost: null, free, startTime: null, distanceKm: d, score, group: `place:${p.id}`, fragments,
    });
  }
  return out;
}

async function vibeCandidates(opts: SuggestOptions, frame: ReturnType<typeof timeFrame>, all = false): Promise<Candidate[]> {
  const rows = await db.select().from(vibes).where(and(eq(vibes.status, 'PUBLISHED'), cityCondition(vibes.city, opts.city))).limit(150);
  const hour = tehranParts(frame.openAt).hour;
  return rows.filter(v => all || !opts.exclude.has(`vibe:${v.id}`)).map(v => {
    const text = `${parseJsonArray(v.tags).join(' ')} ${v.title}`;
    const tags = effectiveVibes([], [...new Set<VibeTag>(['outdoor', 'chill', 'solo', 'date', 'friends', ...inferPlaceVibes({ name: text, description: v.description })])]);
    const fragments: string[] = [];
    let score = moodFit(opts, tags, fragments);
    fragments.push(v.areaName ? `یه قدم زدن تو ${v.areaName}` : 'یه قدم زدن بی‌دغدغه', 'هزینه‌ای نداره');
    if (opts.budget !== 'any') score += 1;
    if (hour >= 23 || hour < 6) score -= 3;
    const imageUrls = parseJsonArray(v.imageUrls);
    const d = distanceKm(opts.lat, opts.lng, v.centerLat, v.centerLng);
    score += distanceFit(opts, d, fragments) - 0.5;
    return {
      kind: 'vibe', id: v.id, title: v.title, subtitle: v.areaName || v.city, imageUrl: imageUrls[0] || null, url: `/vibes/${v.id}`,
      reason: '', vibes: tags, cost: 0, free: true, startTime: null, distanceKm: d, score, group: `vibe:${v.id}`, fragments,
    } satisfies Candidate;
  });
}

const reasonOf = (c: Candidate) => [...new Set(c.fragments)].slice(0, 3).join(' · ');

/** Full events and seats held for others are not worth suggesting. */
async function hasRoom(c: Candidate, userId: number | null) {
  if (c.kind !== 'event') return true;
  const [event] = await db.select().from(events).where(eq(events.id, c.id));
  return !!event && (!!event.ticketUrl || (await seatsTaken(db, event, userId ?? undefined)) < event.capacity);
}

/** A varied handful: one place or organizer at most once, no more than two of one kind. */
async function pickVaried(candidates: Candidate[], count: number, userId: number | null) {
  candidates.sort((a, b) => b.score - a.score);
  const picked: Candidate[] = [];
  const groups = new Set<string>();
  const kinds = new Map<string, number>();
  for (const pass of [2, count]) {
    for (const c of candidates) {
      if (picked.length >= count) break;
      if (picked.includes(c) || groups.has(c.group) || (kinds.get(c.kind) || 0) >= pass) continue;
      if (!(await hasRoom(c, userId))) continue;
      picked.push(c);
      groups.add(c.group);
      kinds.set(c.kind, (kinds.get(c.kind) || 0) + 1);
    }
  }
  return picked.sort((a, b) => b.score - a.score);
}

const strip = ({ score, group, fragments, ...pick }: Candidate): Pick => ({ ...pick, reason: reasonOf({ score, group, fragments, ...pick }) });

export async function suggest(opts: SuggestOptions) {
  const frame = timeFrame(opts.when);
  const taste = await tasteProfile(opts.userId);
  const [ev, pl, vb] = await Promise.all([eventCandidates(opts, frame, taste), placeCandidates(opts, frame), vibeCandidates(opts, frame)]);
  const all = [...ev, ...pl, ...vb];
  const picked = await pickVaried(all, opts.count, opts.userId);
  return { picks: picked.map(strip), remaining: Math.max(0, all.length - picked.length) };
}

// ---------------------------------------------------------------- no-cost mode

export async function freeNow(opts: { userId: number | null; city?: string; lat?: number; lng?: number }) {
  const base: SuggestOptions = { ...opts, when: 'now', budget: 'free', exclude: new Set(), count: 0 };
  const taste = await tasteProfile(opts.userId);
  const now = timeFrame('now');
  const [, todayEnd] = tehranDayRange();
  const weekFrame = { from: todayEnd, to: addDays(todayEnd, 7), openAt: now.openAt };
  const [openPlaces, walks, today, week] = await Promise.all([
    placeCandidates(base, now, true),
    vibeCandidates(base, now, true),
    eventCandidates({ ...base, when: 'tonight' }, { from: new Date(), to: todayEnd, openAt: now.openAt }, taste, true),
    eventCandidates({ ...base, when: 'weekend' }, weekFrame, taste, true),
  ]);
  const sorted = (list: Candidate[], n: number) => list.sort((a, b) => b.score - a.score).slice(0, n).map(strip);
  const byTime = (list: Candidate[], n: number) => list.sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0)).slice(0, n).map(strip);
  return {
    today: byTime(today, 12),
    openNow: sorted(openPlaces.filter(p => p.free), 10),
    walks: sorted(walks, 8),
    week: byTime(week, 20),
  };
}
