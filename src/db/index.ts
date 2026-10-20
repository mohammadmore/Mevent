import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
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

    // Auto-create columns and database indexes on startup
    initDatabaseSchemaAndIndexes().catch(err => {
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
    "ALTER TABLE hubs ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;"
  ];

  for (const q of alterQueries) {
    try {
      await adminPool.query(q);
    } catch (e) {
      // Ignore if column exists or permission restricted
    }
  }

  const indexQueries = [
    'CREATE INDEX IF NOT EXISTS idx_events_start_status ON events (start_time, status);',
    'CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events (lat, lng);',
    'CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON interactions (user_id, type);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets (event_id);',
    'CREATE INDEX IF NOT EXISTS idx_users_uid ON users (uid);',
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
