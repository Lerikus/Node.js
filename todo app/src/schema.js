import {
  sqliteTable,
  int,
  text,
} from "drizzle-orm/sqlite-core"

export const todosTable = sqliteTable("todos", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  completed: int({ mode: "boolean" }).notNull(),
  priority: text().notNull().default("normal"),
})
