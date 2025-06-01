import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './slack_clone.db'
  }
});
