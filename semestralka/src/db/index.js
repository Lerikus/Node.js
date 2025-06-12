import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, '../../drizzle');

// Export for test usage
export const createTestDb = async () => {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  await migrate(db, { migrationsFolder });
  return db;
};

const DB_PATH = process.env.NODE_ENV === 'test'
  ? path.join(__dirname, '../../test.db')
  : path.join(__dirname, '../../slack_clone.db');

export const db = drizzle(new Database(DB_PATH), { schema });

// Run migrations
try {
  migrate(db, { migrationsFolder });
} catch (error) {
}
