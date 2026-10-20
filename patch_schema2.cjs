const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

if (code.includes('export const places =')) {
  console.log('Already patched');
  process.exit(0);
}

const newTables = `
export const places = pgTable('places', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
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
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chains = pgTable('chains', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
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
  description: text('description'),
  areaName: text('area_name'),
  polygon: jsonb('polygon'), // Array of {lat, lng}
  centerLat: doublePrecision('center_lat'),
  centerLng: doublePrecision('center_lng'),
  bestTimeToExperience: text('best_time'),
  imageUrls: jsonb('image_urls').default('[]'),
  tags: jsonb('tags').default('[]'),
  status: text('status').default('PUBLISHED').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
`;

code = code.replace(/export const events = pgTable\('events', \{/, `export const events = pgTable('events', {
  placeId: integer('place_id').references(() => places.id),
  chainId: integer('chain_id').references(() => chains.id),`);
  
code = code + '\n' + newTables;

fs.writeFileSync('src/db/schema.ts', code);
console.log('Schema patched');
