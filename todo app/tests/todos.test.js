import test from "ava";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { todosTable } from "../src/schema.js";
import * as dbModule from "../src/db.js";

let db, connection;

test.before(async () => {
  connection = createClient({ url: "file::memory:" });
  db = drizzle(connection);
  await migrate(db, { migrationsFolder: "drizzle" });
  dbModule.setDatabase(db);
});

test.beforeEach(async () => {
  await db.delete(todosTable).run();
});

test.after.always(async () => {
  if (connection) await connection.close();
});

test("createTodo inserts and returns a todo", async t => {
  const todo = await dbModule.createTodo({ title: "Test", priority: "high" });
  t.truthy(todo.id);
  t.is(todo.title, "Test");
  t.is(todo.priority, "high");
  t.false(todo.completed);
});

test("getTodoById returns the correct todo", async t => {
  const created = await dbModule.createTodo({ title: "Find Me", priority: "normal" });
  const todo = await dbModule.getTodoById(created.id);
  t.deepEqual(todo, created);
});

// ?
test("getAllTodos returns all todos", async t => {
  await dbModule.createTodo({ title: "A", priority: "low" });
  await dbModule.createTodo({ title: "B", priority: "high" });
  const todos = await dbModule.getAllTodos();
  t.is(todos.length, 5);
});

test("updateTodo updates fields and returns updated todo", async t => {
  const created = await dbModule.createTodo({ title: "Old", priority: "low" });
  const updated = await dbModule.updateTodo(created.id, { title: "New", priority: "high" });
  t.is(updated.title, "New");
  t.is(updated.priority, "high");
  t.is(updated.completed, false);
});

test("updateTodo returns null for non-existent id", async t => {
  const updated = await dbModule.updateTodo(9999, { title: "Nope" });
  t.is(updated, null);
});

test("deleteTodo removes a todo and returns true", async t => {
  const created = await dbModule.createTodo({ title: "Delete Me", priority: "normal" });
  const result = await dbModule.deleteTodo(created.id);
  t.true(result);
  const after = await dbModule.getTodoById(created.id);
  t.falsy(after);
});

test("deleteTodo returns false for non-existent id", async t => {
  const result = await dbModule.deleteTodo(9999);
  t.false(result);
});
