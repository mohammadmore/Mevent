import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _dbReady: Promise<void> | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 20, // Connection pool optimization
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });

    // Auto-create columns, tables and indexes on startup. The server awaits `dbReady`
    // before accepting traffic so no request hits a half-migrated schema.
    global._dbReady = initDatabaseSchemaAndIndexes().catch(err => {
      console.warn('Database schema/index initialization warning:', err.message);
    });
  }
  return global._postgresPool;
};

async function initDatabaseSchemaAndIndexes() {
  // Use admin user for DDL migrations if available
  const adminUser = process.env.SQL_ADMIN_USER;
  const adminPassword = process.env.SQL_ADMIN_PASSWORD;

  const adminPool = adminUser ? new Pool({
    host: process.env.SQL_HOST,
    user: adminUser,
    password: adminPassword,
    database: process.env.SQL_DB_NAME,
    max: 2,
    connectionTimeoutMillis: 5000,
  }) : global._postgresPool;

  if (!adminPool) return;

  const alterQueries = [
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 100;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'UGC';",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PUBLISHED';",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_url TEXT;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS address TEXT;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;",
    "ALTER TABLE hubs ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS advanced_details JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE places ADD COLUMN IF NOT EXISTS advanced_details JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE vibes ADD COLUMN IF NOT EXISTS advanced_details JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE places ADD COLUMN IF NOT EXISTS created_by_id INTEGER;",
    "ALTER TABLE vibes ADD COLUMN IF NOT EXISTS created_by_id INTEGER;",
    "ALTER TABLE flows ADD COLUMN IF NOT EXISTS created_by_id INTEGER;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_id INTEGER;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_status TEXT NOT NULL DEFAULT 'NONE';",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS organizer_request_note TEXT;",
    "UPDATE users SET organizer_status = 'APPROVED' WHERE role IN ('ORGANIZER', 'ADMIN') AND organizer_status = 'NONE';",
    "UPDATE users SET invite_code = upper(substr(md5(random()::text || id::text), 1, 8)) WHERE invite_code IS NULL;",
    `CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      event_id INTEGER NOT NULL REFERENCES events(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      points_used INTEGER NOT NULL DEFAULT 0,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      gateway TEXT,
      authority TEXT,
      ref_id TEXT,
      expires_at TIMESTAMP,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    );`,
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS order_id INTEGER;",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS holder_label TEXT;",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS used_at TIMESTAMP;",
    "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;",
    "UPDATE tickets SET code = upper(substr(md5(random()::text || id::text), 1, 10)) WHERE code IS NULL;",
    `CREATE TABLE IF NOT EXISTS hub_members (
      hub_id INTEGER NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT now(),
      PRIMARY KEY (hub_id, user_id)
    );`,
    `CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      city TEXT NOT NULL,
      data JSONB NOT NULL,
      is_public BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      url TEXT,
      dedupe_key TEXT UNIQUE,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      keys JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      resolved_by_id INTEGER,
      created_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS point_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      ref_type TEXT,
      ref_id INTEGER,
      created_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE UNLOGGED TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      expires_at TIMESTAMP NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'LOGIN',
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      consumed_at TIMESTAMP,
      ip TEXT,
      created_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_agent TEXT,
      ip TEXT,
      expires_at TIMESTAMP NOT NULL,
      last_seen_at TIMESTAMP DEFAULT now(),
      created_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE UNLOGGED TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at TIMESTAMP NOT NULL
    );`
  ];

  for (const q of alterQueries) {
    try {
      await adminPool.query(q);
    } catch (e: any) {
      // Ignore if column exists or permission restricted, but make real problems visible.
      if (!/already exists|duplicate/i.test(e?.message || '')) {
        console.warn('Schema migration step failed:', e?.message, '\n', q.slice(0, 120));
      }
    }
  }

  const indexQueries = [
    'CREATE INDEX IF NOT EXISTS idx_events_start_status ON events (start_time, status);',
    'CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events (lat, lng);',
    'CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON interactions (user_id, type);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets (event_id);',
    'CREATE INDEX IF NOT EXISTS idx_users_uid ON users (uid);',
    'CREATE INDEX IF NOT EXISTS idx_events_city_status ON events (city, status);',
    'CREATE INDEX IF NOT EXISTS idx_places_city_status ON places (city, status);',
    'CREATE INDEX IF NOT EXISTS idx_orders_authority ON orders (authority);',
    'CREATE INDEX IF NOT EXISTS idx_orders_status_expires ON orders (status, expires_at);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets (user_id);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_point_tx_user ON point_transactions (user_id, created_at);',
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_reporter_target ON reports (reporter_id, target_type, target_id);',
    'CREATE INDEX IF NOT EXISTS idx_trips_user ON trips (user_id);',
    'CREATE INDEX IF NOT EXISTS idx_otp_phone_created ON otp_codes (phone, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);',
    // One account per phone number.
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users (phone) WHERE phone IS NOT NULL;',
  ];

  for (const query of indexQueries) {
    try {
      await adminPool.query(query);
    } catch (e) {
      // Ignore index creation errors if permissions are restricted or table doesn't exist yet
    }
  }

  if (adminUser) {
    try {
      await adminPool.end();
    } catch (e) {}
  }
}

const pool = createPool();
export const db = drizzle(pool, { schema });
export const dbReady: Promise<void> = global._dbReady || Promise.resolve();
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
