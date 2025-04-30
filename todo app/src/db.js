import { drizzle } from "drizzle-orm/libsql";
import { todosTable } from "./schema.js";
import { eq } from "drizzle-orm";

let db = drizzle({
  connection:
    process.env.NODE_ENV === "test"
      ? "file::memory:"
      : "file:db.sqlite",
  logger: process.env.NODE_ENV !== "test",
});

//export the db instance
export function setDatabase(newDb) {
  db = newDb;
}

//function to get a todo by ID
export const getTodoById = async (id) => {
  return await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .get();
};

//function to get all todos
export const getAllTodos = async () => {
  return await db.select().from(todosTable).all();
};

//function to update a todo
export const updateTodo = async (id, data) => {
  const result = await db
    .update(todosTable)
    .set(data)
    .where(eq(todosTable.id, id))
    .returning();
  return result[0] || null;
};

//function to delete a todo
export const deleteTodo = async (id) => {
  const result = await db
    .delete(todosTable)
    .where(eq(todosTable.id, id))
    .returning();
  return result.length > 0;
};

//function to create a new todo
export const createTodo = async (data) => {
  const result = await db.insert(todosTable).values({
    title: data.title,
    completed: data.completed !== undefined ? data.completed : false,
    priority: data.priority || "normal",
  }).returning();
  return result[0];
};
