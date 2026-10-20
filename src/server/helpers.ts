import multer from 'multer';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users, events, chains } from '../db/schema.ts';

// Shared helpers for the API routes: payload whitelisting, normalisation of rows
// for the client, and small geo/text utilities.

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Only raster images are accepted; the stored extension comes from the
// validated MIME type, never from the client-supplied file name.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in ALLOWED_IMAGE_TYPES),
});

export const PUBLIC_USER_FIELDS = {
  id: users.id,
  name: users.name,
  city: users.city,
  role: users.role,
  points: users.points,
  website: users.website,
  instagram: users.instagram,
  telegram: users.telegram,
  twitter: users.twitter,
  coverImage: users.coverImage,
  bio: users.bio,
  organizerType: users.organizerType,
  advancedDetails: users.advancedDetails,
  createdAt: users.createdAt,
};

export type PublicUser = { [K in keyof typeof PUBLIC_USER_FIELDS]: (typeof users.$inferSelect)[K] };

export function toPublicUser(u: typeof users.$inferSelect): PublicUser {
  const out: any = {};
  for (const key of Object.keys(PUBLIC_USER_FIELDS)) out[key] = (u as any)[key];
  return out;
}

export function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Older rows stored arrays as JSON strings inside jsonb columns; always hand arrays to the client.
export function normalizePlace<T extends Record<string, any>>(p: T): T {
  return { ...p, galleryUrls: parseJsonArray(p.galleryUrls), amenities: parseJsonArray(p.amenities) };
}

export function normalizeTaggedItem<T extends Record<string, any>>(item: T): T {
  return { ...item, tags: parseJsonArray(item.tags) };
}

export function normalizeVibe<T extends Record<string, any>>(v: T): T {
  const imageUrls = parseJsonArray(v.imageUrls);
  return { ...v, imageUrls, tags: parseJsonArray(v.tags), imageUrl: imageUrls[0] || null };
}

// The flow UI works with name / tag / imageUrl; the table stores title / tags / coverImage.
export function normalizeFlow<T extends Record<string, any>>(f: T) {
  const tags = parseJsonArray(f.tags);
  return { ...f, tags, name: f.title, tag: tags[0] || '', imageUrl: f.coverImage };
}

export function formatTimeSlots(slots: any): string | null {
  if (!Array.isArray(slots) || slots.length === 0) return null;
  return slots
    .filter(s => s && s.openTime && s.closeTime)
    .map(s => `${s.openTime} تا ${s.closeTime}`)
    .join('، ') || null;
}

export function formatHolidays(holidays: any): string | null {
  if (!Array.isArray(holidays) || holidays.length === 0) return null;
  return holidays.map(h => (typeof h === 'object' && h ? (h.label || h.name || h.value || '') : String(h))).filter(Boolean).join('، ') || null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toIdArray(value: unknown): number[] {
  return parseJsonArray(value).map(v => parseInt(v, 10)).filter(v => Number.isInteger(v));
}

export const EVENT_STATUSES = ['PUBLISHED', 'DRAFT'];
export const CONTENT_STATUSES = ['PUBLISHED', 'DRAFT', 'PENDING', 'REJECTED', 'HIDDEN'];

// Builds a place row from the place form payload; only known columns are copied.
export function buildPlacePayload(data: any, partial: boolean) {
  const payload: any = {};
  const set = (key: string, value: any) => {
    if (!partial || value !== undefined) payload[key] = value;
  };
  set('name', partial ? data.name : (data.name || 'پاتوق جدید'));
  set('city', partial ? data.city : (data.city || 'تهران'));
  set('description', partial ? data.description : (data.description || ''));
  set('type', partial ? data.type : (data.type || 'CAFE'));
  set('address', partial ? data.address : (data.address || ''));
  set('lat', data.lat === undefined && partial ? undefined : toNumberOrNull(data.lat));
  set('lng', data.lng === undefined && partial ? undefined : toNumberOrNull(data.lng));
  set('imageUrl', partial ? data.imageUrl : (data.imageUrl || ''));
  if (data.galleryUrls !== undefined || !partial) payload.galleryUrls = parseJsonArray(data.galleryUrls);
  if (data.status !== undefined || !partial) {
    payload.status = CONTENT_STATUSES.includes(data.status) ? data.status : 'PUBLISHED';
  }
  const adv = data.advancedDetails;
  if (adv && typeof adv === 'object') {
    payload.advancedDetails = adv;
    if (adv.regularTimeSlots) payload.workingHours = formatTimeSlots(adv.regularTimeSlots);
    if (adv.regularHolidays) payload.holidays = formatHolidays(adv.regularHolidays);
    if (adv.features) payload.amenities = parseJsonArray(adv.features);
  }
  return payload;
}

// Whitelists the event columns a client may set. Ownership fields are decided by the caller.
export function buildEventPayload(body: any, partial: boolean) {
  const payload: any = {};
  const textFields = ['title', 'city', 'description', 'fuzzyTime', 'website', 'instagram', 'telegram', 'twitter', 'currency', 'imageUrl', 'ticketUrl', 'bgIcon'];
  for (const key of textFields) {
    if (body[key] !== undefined) payload[key] = body[key] === '' && key !== 'title' ? null : body[key];
  }
  if (body.startTime !== undefined) payload.startTime = body.startTime ? new Date(body.startTime) : null;
  if (body.endTime !== undefined) payload.endTime = body.endTime ? new Date(body.endTime) : null;
  if (body.cost !== undefined) payload.cost = Math.max(0, parseInt(body.cost, 10) || 0);
  if (body.capacity !== undefined) payload.capacity = Math.max(1, parseInt(body.capacity, 10) || 100);
  if (body.tags !== undefined) payload.tags = parseJsonArray(body.tags);
  if (body.galleryUrls !== undefined) payload.galleryUrls = parseJsonArray(body.galleryUrls);
  if (body.hubIds !== undefined) payload.hubIds = toIdArray(body.hubIds);
  if (body.coOrganizerIds !== undefined) payload.coOrganizerIds = toIdArray(body.coOrganizerIds);
  if (body.hubId !== undefined) payload.hubId = toNumberOrNull(body.hubId);
  if (body.placeId !== undefined) payload.placeId = toNumberOrNull(body.placeId);
  if (body.chainId !== undefined) payload.chainId = toNumberOrNull(body.chainId);
  if (body.advancedDetails !== undefined && typeof body.advancedDetails === 'object') payload.advancedDetails = body.advancedDetails || {};
  if (body.status !== undefined && EVENT_STATUSES.includes(body.status)) payload.status = body.status;
  if (body.location && typeof body.location === 'object') {
    payload.address = body.location.address || null;
    payload.lat = toNumberOrNull(body.location.lat);
    payload.lng = toNumberOrNull(body.location.lng);
  }
  if (payload.startTime && isNaN(payload.startTime.getTime())) payload.startTime = null;
  if (payload.endTime && isNaN(payload.endTime.getTime())) payload.endTime = null;
  if (!partial && !payload.status) payload.status = 'PUBLISHED';
  return payload;
}

export function buildVibePayload(body: any, partial: boolean) {
  const payload: any = {};
  const title = body.title || body.name;
  if (title !== undefined || !partial) payload.title = title || 'حال و هوای جدید';
  for (const key of ['description', 'areaName', 'bestTimeToExperience']) {
    if (body[key] !== undefined) payload[key] = body[key] || null;
  }
  if (body.city !== undefined || !partial) payload.city = body.city || 'تهران';
  // The form edits a single cover (imageUrl), which is always the first entry of imageUrls.
  if (typeof body.imageUrl === 'string') {
    const rest = parseJsonArray(body.imageUrls).slice(1);
    payload.imageUrls = body.imageUrl ? [body.imageUrl, ...rest] : rest;
  } else if (body.imageUrls !== undefined) {
    payload.imageUrls = parseJsonArray(body.imageUrls);
  }
  if (body.tags !== undefined) payload.tags = parseJsonArray(body.tags);
  if (body.status !== undefined && CONTENT_STATUSES.includes(body.status)) payload.status = body.status;
  const adv = body.advancedDetails;
  if (adv && typeof adv === 'object') {
    payload.advancedDetails = adv;
    const waypoints = parseJsonArray(adv.waypoints).filter(w => Number.isFinite(w?.lat) && Number.isFinite(w?.lng));
    if (waypoints.length > 0) {
      payload.polygon = waypoints;
      payload.centerLat = waypoints.reduce((sum, w) => sum + w.lat, 0) / waypoints.length;
      payload.centerLng = waypoints.reduce((sum, w) => sum + w.lng, 0) / waypoints.length;
    }
    if (!payload.bestTimeToExperience && adv.scheduleType !== 'variable') {
      const slots = formatTimeSlots(adv.regularTimeSlots);
      if (slots) payload.bestTimeToExperience = slots;
    }
  }
  return payload;
}

export function buildFlowPayload(body: any, partial: boolean) {
  const payload: any = {};
  const title = body.title || body.name;
  if (title !== undefined || !partial) payload.title = title || '';
  if (body.description !== undefined) payload.description = body.description || null;
  if (body.city !== undefined || !partial) payload.city = body.city || 'تهران';
  const cover = body.coverImage ?? body.imageUrl;
  if (cover !== undefined) payload.coverImage = cover || null;
  if (body.tags !== undefined) payload.tags = parseJsonArray(body.tags);
  else if (body.tag !== undefined) payload.tags = body.tag ? [String(body.tag).trim()] : [];
  else if (!partial) payload.tags = [];
  if (body.activeFrom !== undefined) payload.activeFrom = body.activeFrom ? new Date(body.activeFrom) : null;
  if (body.activeTo !== undefined) payload.activeTo = body.activeTo ? new Date(body.activeTo) : null;
  if (body.status !== undefined && CONTENT_STATUSES.includes(body.status)) payload.status = body.status;
  return payload;
}

// Inserts or updates a chain and (re)links the editor's selected events to it.
export async function saveChain(chainId: number | null, body: any, editor: typeof users.$inferSelect) {
  const payload: any = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.city !== undefined) payload.city = body.city || 'تهران';
  if (body.description !== undefined) payload.description = body.description || null;
  if (body.coverImage !== undefined) payload.coverImage = body.coverImage || null;
  if (body.tags !== undefined) payload.tags = parseJsonArray(body.tags);
  if (body.status !== undefined && CONTENT_STATUSES.includes(body.status)) payload.status = body.status;

  let row: typeof chains.$inferSelect | undefined;
  if (chainId === null) {
    row = (await db.insert(chains).values({ ...payload, name: payload.name, organizerId: editor.id }).returning())[0];
  } else {
    row = Object.keys(payload).length > 0
      ? (await db.update(chains).set(payload).where(eq(chains.id, chainId)).returning())[0]
      : (await db.select().from(chains).where(eq(chains.id, chainId)))[0];
  }
  if (!row) return null;

  if (body.eventIds !== undefined) {
    // The form only lists the editor's own events, so only those are (un)linked here.
    const ids = toIdArray(body.eventIds);
    await db.update(events).set({ chainId: null }).where(and(eq(events.chainId, row.id), eq(events.organizerId, editor.id)));
    if (ids.length > 0) {
      await db.update(events).set({ chainId: row.id }).where(and(inArray(events.id, ids), eq(events.organizerId, editor.id)));
    }
  }
  return row;
}

// Maps an AI-extracted event onto known columns only (the model output is untrusted).
export function crawledEventToRow(eventData: any, sourceUrl: string, organizerId: number) {
  const startTime = eventData.startTime ? new Date(eventData.startTime) : new Date();
  return {
    title: String(eventData.title).slice(0, 300),
    description: eventData.description ? String(eventData.description).slice(0, 5000) : null,
    address: eventData.address ? String(eventData.address) : null,
    lat: toNumberOrNull(eventData.lat),
    lng: toNumberOrNull(eventData.lng),
    cost: Math.max(0, parseInt(eventData.cost, 10) || 0),
    capacity: Math.max(1, parseInt(eventData.capacity, 10) || 100),
    ticketUrl: sourceUrl,
    startTime: isNaN(startTime.getTime()) ? new Date() : startTime,
    source: 'CRAWLER',
    tags: ['#نمایشگاه', '#تهران', '#خزشگر'],
    organizerId
  };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export function normalizePersianText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ئ/g, 'ی')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim();
}

/** Adds the public organizer profile and a `location` object, as the client expects. */
export async function formatEvents<T extends { organizerId: number; address: string | null; lat: number | null; lng: number | null }>(rows: T[]) {
  const orgIds = [...new Set(rows.map(e => e.organizerId))];
  const organizers = orgIds.length ? await db.select(PUBLIC_USER_FIELDS).from(users).where(inArray(users.id, orgIds)) : [];
  const orgMap = new Map(organizers.map(o => [o.id, o]));
  return rows.map(e => ({
    ...e,
    tags: parseJsonArray((e as any).tags),
    location: { address: e.address, lat: e.lat, lng: e.lng },
    organizer: orgMap.get(e.organizerId) || null,
  }));
}

export function eventUrl(id: number) {
  return `/events/${id}`;
}
