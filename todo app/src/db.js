import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { todosTable } from "./schema.js";

const isTest = process.env.NODE_ENV === "test";

export const db = drizzle({
  connection: isTest ? "file::memory:" : "file:db.sqlite",
  logger: !isTest,
});

await migrate(db, { migrationsFolder: "drizzle" });

export const getAllTodos = async () => {
  const todos = await db.select().from(todosTable).all();
  return todos;
};

export const getTodoById = async (id) => {
  const todo = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .get();
  return todo;
};

export const createTodo = async (values) => {
  return await db
    .insert(todosTable)
    .values(values)
    .returning(todosTable)
    .get();
};

export const updateTodo = async (id, values) => {
  await db
    .update(todosTable)
    .set(values)
    .where(eq(todosTable.id, id));
  return getTodoById(id);
};

export const deleteTodo = async (id) => {
  const result = await db.delete(todosTable).where(eq(todosTable.id, id));
  return true;
};
