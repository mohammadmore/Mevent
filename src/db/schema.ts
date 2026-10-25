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
  // Identity verification, required to sell paid tickets: NONE | PENDING | VERIFIED | REJECTED
  kycStatus: text('kyc_status').default('NONE').notNull(),
  kycType: text('kyc_type'),
  kycData: jsonb('kyc_data'),
  kycNote: text('kyc_note'),
  kycSubmittedAt: timestamp('kyc_submitted_at'),
  kycReviewedAt: timestamp('kyc_reviewed_at'),
  kycReviewedById: integer('kyc_reviewed_by_id'),
  /** Event reminder SMS (ticket and account SMS are always sent). */
  smsReminders: boolean('sms_reminders').default(true).notNull(),
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
  /** Mood and company tags the organizer chose (keys from src/lib/moods.ts); the rest are inferred. */
  moods: jsonb('moods').default('[]').notNull(),
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
  // Set when the organizer cancels (status CANCELLED) or reschedules the event.
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  /** Original start time of a rescheduled event; while set, ticket holders may cancel with no deadline. */
  postponedFrom: timestamp('postponed_from'),
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
  couponId: integer('coupon_id'),
  couponDiscount: integer('coupon_discount').default(0).notNull(),
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
  /** Set when the ticket was given to this holder by someone else (it then cannot be refunded). */
  transferredFromId: integer('transferred_from_id'),
  transferredAt: timestamp('transferred_at'),
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
  /** Mood and company tags chosen by whoever added the place; the rest are inferred. */
  moods: jsonb('moods').default('[]').notNull(),
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

// One-time SMS login codes. Only a keyed hash of the code is stored.
// purpose: LOGIN | LINK (attach a phone number to an existing account)
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull(),
  purpose: text('purpose').default('LOGIN').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  ip: text('ip'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_otp_phone_created').on(t.phone, t.createdAt)]);

// Server-side login sessions (phone login). The browser holds the random token in an
// httpOnly cookie; only its SHA-256 hash is stored, so a database leak does not leak sessions.
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  userAgent: text('user_agent'),
  ip: text('ip'),
  expiresAt: timestamp('expires_at').notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_sessions_user').on(t.userId)]);

// Outgoing SMS (tickets, reminders, event changes). One row per message; dedupe_key makes sending
// idempotent across instances and retries. status: PENDING | SENDING | SENT | FAILED | SKIPPED
export const smsMessages = pgTable('sms_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  phone: text('phone').notNull(),
  kind: text('kind').notNull(),
  params: jsonb('params').default('{}').notNull(),
  dedupeKey: text('dedupe_key').unique(),
  status: text('status').default('PENDING').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  provider: text('provider'),
  lastError: text('last_error'),
  nextAttemptAt: timestamp('next_attempt_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_sms_status_next').on(t.status, t.nextAttemptAt)]);

// Discount codes. organizerId null = site-wide (created by an admin); eventId null = all events in scope.
// type: PERCENT (value = percent, optional maxDiscount cap) | AMOUNT (value = toman)
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  organizerId: integer('organizer_id').references(() => users.id),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  value: integer('value').notNull(),
  maxDiscount: integer('max_discount'),
  minAmount: integer('min_amount').default(0).notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  perUserLimit: integer('per_user_limit').default(1).notNull(),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  active: boolean('active').default(true).notNull(),
  createdById: integer('created_by_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const couponRedemptions = pgTable('coupon_redemptions', {
  id: serial('id').primaryKey(),
  couponId: integer('coupon_id').references(() => coupons.id, { onDelete: 'cascade' }).notNull(),
  orderId: integer('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull().unique(),
  userId: integer('user_id').references(() => users.id).notNull(),
  discount: integer('discount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_coupon_redemptions_coupon_user').on(t.couponId, t.userId)]);

// Money owed back to a buyer (one row per cancellation). Paid out from the gateway's merchant
// panel, then marked here. reason: USER_CANCEL | EVENT_CANCELLED | EVENT_POSTPONED
// status: REQUESTED | PAID
export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  ticketIds: jsonb('ticket_ids').default('[]').notNull(),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('REQUESTED').notNull(),
  paidAt: timestamp('paid_at'),
  paidById: integer('paid_by_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_refunds_status_event').on(t.status, t.eventId)]);

// Waiting list for full events. When seats free up, the next person gets an offer: the seats are
// held for them until offer_expires_at. status: WAITING | OFFERED | CONVERTED | EXPIRED | CANCELLED
export const waitlistEntries = pgTable('waitlist_entries', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  status: text('status').default('WAITING').notNull(),
  offeredAt: timestamp('offered_at'),
  offerExpiresAt: timestamp('offer_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_waitlist_event_status').on(t.eventId, t.status)]);

// A ticket offered to someone else by mobile number. status: PENDING | ACCEPTED | DECLINED | CANCELLED | EXPIRED
export const ticketTransfers = pgTable('ticket_transfers', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  fromUserId: integer('from_user_id').references(() => users.id).notNull(),
  toPhone: text('to_phone').notNull(),
  toUserId: integer('to_user_id').references(() => users.id),
  status: text('status').default('PENDING').notNull(),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_transfers_phone_status').on(t.toPhone, t.status)]);

// Errors seen by the server or reported by browsers, grouped by fingerprint (one row per kind of error).
export const errorGroups = pgTable('error_groups', {
  id: serial('id').primaryKey(),
  fingerprint: text('fingerprint').notNull().unique(),
  source: text('source').notNull(),
  message: text('message').notNull(),
  stack: text('stack'),
  path: text('path'),
  count: integer('count').default(1).notNull(),
  lastUserId: integer('last_user_id'),
  resolved: boolean('resolved').default(false).notNull(),
  firstSeen: timestamp('first_seen').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  lastAlertAt: timestamp('last_alert_at'),
});

// Support requests. status: OPEN (waiting for staff) | ANSWERED (waiting for the user) | CLOSED
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: text('subject').notNull(),
  category: text('category').notNull(),
  status: text('status').default('OPEN').notNull(),
  orderId: integer('order_id'),
  eventId: integer('event_id'),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_support_status').on(t.status, t.lastMessageAt)]);

export const supportMessages = pgTable('support_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  authorId: integer('author_id').references(() => users.id).notNull(),
  isStaff: boolean('is_staff').default(false).notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Database backups. kind: SCHEDULED (at most one per day, see day) | MANUAL
// status: RUNNING | DONE | FAILED; location: s3 | local
export const backups = pgTable('backups', {
  id: serial('id').primaryKey(),
  kind: text('kind').notNull(),
  day: text('day').unique(),
  status: text('status').default('RUNNING').notNull(),
  location: text('location'),
  fileName: text('file_name'),
  sizeBytes: integer('size_bytes'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
});
