import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  driver: 'sqlite',
  dbCredentials: {
    url: './slack_clone.db'
  },
  dialect: 'sqlite'
});
