import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision, jsonb } from 'drizzle-orm/pg-core';

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

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  paymentStatus: text('payment_status').default('PENDING').notNull(),
  paymentId: text('payment_id'),
  amount: integer('amount').notNull(),
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
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
