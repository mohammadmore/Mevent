import fs from 'fs';

const dbIndexContent = `import { drizzle } from 'drizzle-orm/node-postgres';
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

    // Auto-create database indexes on startup for query optimization
    initDatabaseIndexes(global._postgresPool).catch(err => {
      console.warn('Database index initialization warning:', err.message);
    });
  }
  return global._postgresPool;
};

async function initDatabaseIndexes(pool: pg.Pool) {
  const indexQueries = [
    'CREATE INDEX IF NOT EXISTS idx_events_start_status ON events (start_time, status);',
    'CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON events (lat, lng);',
    'CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON interactions (user_id, type);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets (event_id);',
    'CREATE INDEX IF NOT EXISTS idx_users_uid ON users (uid);',
  ];

  for (const query of indexQueries) {
    try {
      await pool.query(query);
    } catch (e) {
      // Ignore index creation errors if permissions are restricted or table doesn't exist yet
    }
  }
}

const pool = createPool();
export const db = drizzle(pool, { schema });
`;

fs.writeFileSync('src/db/index.ts', dbIndexContent);
console.log('src/db/index.ts updated with pool optimization and indexes');
