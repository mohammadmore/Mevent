import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision, jsonb, boolean, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name').notNull(),
  city: text('city').notNull().default('تهران'),
  email: text('email'),
  phone: text('phone'),
  role: text('role').default('USER').notNull(),
  preferences: jsonb('preferences').default('[]').notNull(),
  points: integer('points').default(0).notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  website: text('website'),
  instagram: text('instagram'),
  telegram: text('telegram'),
  twitter: text('twitter'),
  coverImage: text('cover_image'),
  bio: text('bio'),
  organizerType: text('organizer_type').default('INDIVIDUAL'),
  advancedDetails: jsonb('advanced_details').default('{}'),
  // Referral program: every user gets a code; referredById is set once, on first sign-in.
  inviteCode: text('invite_code').unique(),
  referredById: integer('referred_by_id'),
  // Organizer upgrade requests are reviewed by an admin: NONE | PENDING | APPROVED | REJECTED
  organizerStatus: text('organizer_status').default('NONE').notNull(),
  organizerRequestNote: text('organizer_request_note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const hubs = pgTable('hubs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull().default('تهران'),
  description: text('description'),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  type: text('type').notNull(),
  imageUrl: text('image_url'),
  followersCount: integer('followers_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const events = pgTable('events', {
  placeId: integer('place_id').references(() => places.id),
  chainId: integer('chain_id').references(() => chains.id),
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  city: text('city').notNull().default('تهران'),
  description: text('description'),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  address: text('address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  fuzzyTime: text('fuzzy_time'),
  website: text('website'),
  instagram: text('instagram'),
  telegram: text('telegram'),
  twitter: text('twitter'),
  currency: text('currency').default('IRT'),
  cost: integer('cost').default(0).notNull(),
  capacity: integer('capacity').default(100).notNull(),
  tags: jsonb('tags').default('[]').notNull(),
  hubIds: jsonb('hub_ids').default('[]'),
  galleryUrls: jsonb('gallery_urls').default('[]'),
  hubId: integer('hub_id').references(() => hubs.id),
  organizerId: integer('organizer_id').references(() => users.id).notNull(),
  coOrganizerIds: jsonb('co_organizer_ids').default('[]'),
  advancedDetails: jsonb('advanced_details').default('{}'),
  source: text('source').default('UGC').notNull(),
  status: text('status').default('PUBLISHED').notNull(),
  imageUrl: text('image_url'),
  ticketUrl: text('ticket_url'),
  bgIcon: text('bg_icon').default('Ticket'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const interactions = pgTable('interactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  type: text('type').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// One checkout = one order (1 or 2 tickets). Payment state lives on the order.
// status: PENDING | PAID | FAILED | EXPIRED | CANCELLED | REFUND_REQUESTED | REFUNDED
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').default(0).notNull(),
  pointsUsed: integer('points_used').default(0).notNull(),
  amount: integer('amount').notNull(),
  status: text('status').default('PENDING').notNull(),
  gateway: text('gateway'),
  authority: text('authority'),
  refId: text('ref_id'),
  expiresAt: timestamp('expires_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_orders_authority').on(t.authority)]);

// status: PENDING_PAYMENT | ACTIVE | USED | CANCELLED
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  orderId: integer('order_id'),
  paymentStatus: text('payment_status').default('PENDING').notNull(),
  paymentId: text('payment_id'),
  amount: integer('amount').notNull(),
  status: text('status').default('ACTIVE').notNull(),
  code: text('code').unique(),
  holderLabel: text('holder_label'),
  usedAt: timestamp('used_at'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  hubs: many(hubs),
  events: many(events),
  interactions: many(interactions),
  tickets: many(tickets),
}));

export const hubsRelations = relations(hubs, ({ one, many }) => ({
  owner: one(users, {
    fields: [hubs.ownerId],
    references: [users.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  hub: one(hubs, {
    fields: [events.hubId],
    references: [hubs.id],
  }),
  interactions: many(interactions),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  user: one(users, {
    fields: [interactions.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [interactions.eventId],
    references: [events.id],
  }),
}));

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const places = pgTable('places', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull().default('تهران'),
  description: text('description'),
  type: text('type').default('CAFE').notNull(),
  workingHours: text('working_hours'),
  holidays: text('holidays'),
  address: text('address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  amenities: jsonb('amenities').default('[]'),
  imageUrl: text('image_url'),
  galleryUrls: jsonb('gallery_urls').default('[]'),
  advancedDetails: jsonb('advanced_details').default('{}'),
  createdById: integer('created_by_id'),
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chains = pgTable('chains', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull().default('تهران'),
  description: text('description'),
  coverImage: text('cover_image'),
  organizerId: integer('organizer_id').references(() => users.id).notNull(),
  tags: jsonb('tags').default('[]'),
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const flows = pgTable('flows', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  city: text('city').notNull().default('تهران'),
  description: text('description'),
  coverImage: text('cover_image'),
  activeFrom: timestamp('active_from'),
  activeTo: timestamp('active_to'),
  tags: jsonb('tags').default('[]').notNull(),
  createdById: integer('created_by_id'),
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const movies = pgTable('movies', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  city: text('city').notNull().default('تهران'),
  description: text('description'),
  trailerUrl: text('trailer_url'),
  coverImage: text('cover_image'),
  durationMinutes: integer('duration_minutes'),
  tags: jsonb('tags').default('[]'),
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const showtimes = pgTable('showtimes', {
  id: serial('id').primaryKey(),
  movieId: integer('movie_id').references(() => movies.id).notNull(),
  placeId: integer('place_id').references(() => places.id).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  price: integer('price').default(0).notNull(),
  capacity: integer('capacity'),
  ticketsSold: integer('tickets_sold').default(0),
});

export const vibes = pgTable('vibes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  city: text('city').notNull().default('تهران'),
  description: text('description'),
  areaName: text('area_name'),
  polygon: jsonb('polygon'), // Array of {lat, lng}
  centerLat: doublePrecision('center_lat'),
  centerLng: doublePrecision('center_lng'),
  bestTimeToExperience: text('best_time'),
  imageUrls: jsonb('image_urls').default('[]'),
  tags: jsonb('tags').default('[]'),
  advancedDetails: jsonb('advanced_details').default('{}'),
  createdById: integer('created_by_id'),
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});


export const hubMembers = pgTable('hub_members', {
  hubId: integer('hub_id').references(() => hubs.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [primaryKey({ columns: [t.hubId, t.userId] })]);

export const trips = pgTable('trips', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  city: text('city').notNull(),
  data: jsonb('data').notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// In-app notifications; dedupeKey makes scheduled reminders idempotent across server instances.
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  url: text('url'),
  dedupeKey: text('dedupe_key').unique(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_notifications_user').on(t.userId, t.createdAt)]);

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull().unique(),
  keys: jsonb('keys').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// targetType: EVENT | PLACE | HUB | VIBE | CHAIN | FLOW | USER ; status: OPEN | RESOLVED | DISMISSED
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  reporterId: integer('reporter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').default('OPEN').notNull(),
  resolvedById: integer('resolved_by_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [uniqueIndex('uq_reports_reporter_target').on(t.reporterId, t.targetType, t.targetId)]);

// Ledger of every point change, so users can see why their balance moved.
export const pointTransactions = pgTable('point_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  delta: integer('delta').notNull(),
  reason: text('reason').notNull(),
  refType: text('ref_type'),
  refId: integer('ref_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_point_tx_user').on(t.userId, t.createdAt)]);

// Shared state for multi-instance deployments (cache + rate limiting).
export const cacheEntries = pgTable('cache_entries', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: timestamp('reset_at').notNull(),
});
