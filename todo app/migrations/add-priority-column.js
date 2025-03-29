import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export async function up(db) {
  await db.run(sql`ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`);
}

export async function down(db) {
  // SQLite doesn't support dropping columns directly
  // A proper implementation would involve creating a new table, copying data, and renaming
  console.log("Down migration for removing priority column is not implemented");
}
