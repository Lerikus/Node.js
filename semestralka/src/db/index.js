import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, '../../drizzle');

// Initialize the SQLite database
const sqlite = new Database('slack_clone.db');
export const db = drizzle(sqlite, { schema });

// Run migrations
try {
  console.log('Running database migrations...');
  migrate(db, { migrationsFolder });
  console.log('Migrations completed successfully');
} catch (error) {
  console.error('Error running migrations:', error);
}
