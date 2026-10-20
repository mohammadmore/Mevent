import { db, createPool } from './src/db/index';
import pg from 'pg';

async function run() {
  const adminUser = process.env.SQL_ADMIN_USER;
  const adminPassword = process.env.SQL_ADMIN_PASSWORD;
  
  if (!adminUser) {
    console.log("No admin user, using standard connection.");
  }
  
  const pool = new pg.Pool({
    host: process.env.SQL_HOST,
    user: adminUser || process.env.SQL_USER,
    password: adminPassword || process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
  });

  const queries = [
    `CREATE TABLE IF NOT EXISTS places (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'CAFE' NOT NULL,
      working_hours TEXT,
      holidays TEXT,
      address TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      amenities JSONB DEFAULT '[]',
      image_url TEXT,
      gallery_urls JSONB DEFAULT '[]',
      status TEXT DEFAULT 'PUBLISHED' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS chains (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      organizer_id INTEGER NOT NULL REFERENCES users(id),
      tags JSONB DEFAULT '[]',
      status TEXT DEFAULT 'PUBLISHED' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS flows (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      active_from TIMESTAMP,
      active_to TIMESTAMP,
      tags JSONB DEFAULT '[]' NOT NULL,
      status TEXT DEFAULT 'PUBLISHED' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS movies (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      trailer_url TEXT,
      cover_image TEXT,
      duration_minutes INTEGER,
      tags JSONB DEFAULT '[]',
      status TEXT DEFAULT 'PUBLISHED' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS showtimes (
      id SERIAL PRIMARY KEY,
      movie_id INTEGER NOT NULL REFERENCES movies(id),
      place_id INTEGER NOT NULL REFERENCES places(id),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      price INTEGER DEFAULT 0 NOT NULL,
      capacity INTEGER,
      tickets_sold INTEGER DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS vibes (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      area_name TEXT,
      polygon JSONB,
      center_lat DOUBLE PRECISION,
      center_lng DOUBLE PRECISION,
      best_time TEXT,
      image_urls JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      status TEXT DEFAULT 'PUBLISHED' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`,
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS place_id INTEGER REFERENCES places(id);`,
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS chain_id INTEGER REFERENCES chains(id);`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log("Executed query successfully.");
    } catch (e) {
      console.log("Error executing query:", e.message);
    }
  }

  await pool.end();
}

run();
