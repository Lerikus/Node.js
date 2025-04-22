import test from "ava";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { todosTable } from "../src/schema.js";
import { eq } from "drizzle-orm";
import { 
  getTodoById as appGetTodoById,
  getAllTodos as appGetAllTodos,
  updateTodo as appUpdateTodo,
  deleteTodo as appDeleteTodo, 
  createTodo as appCreateTodo
} from "../src/db.js";

//create a fresh database for each test
const createTestDb = async () => {
  const connection = createClient({ url: "file::memory:" });
  const db = drizzle(connection);
  
  //run migrations
  await migrate(db, { migrationsFolder: "drizzle" });
  
  return db;
};

//create a helper function to interact with the database
const createTodoHelpers = (db) => ({
  getTodoById: async (id) => {
    return await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .get();
  },

  getAllTodos: async () => {
    return await db.select().from(todosTable).all();
  },

  updateTodo: async (id, data) => {
    await db
      .update(todosTable)
      .set(data)
      .where(eq(todosTable.id, id));
    
    return await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .get();
  },

  deleteTodo: async (id) => {
    const todo = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, id))
      .get();
    
    if (!todo) return false;
    
    await db
      .delete(todosTable)
      .where(eq(todosTable.id, id));
      
    return true;
  },

  createTodo: async (data) => {
    await db.insert(todosTable).values({
      title: data.title,
      completed: data.completed !== undefined ? data.completed : false,
      priority: data.priority || "normal",
      ...(data.id ? { id: data.id } : {})
    });
    
    if (data.id) {
      return await db.select()
        .from(todosTable)
        .where(eq(todosTable.id, data.id))
        .get();
    }
    
    const todos = await db.select().from(todosTable).all();
    return todos[todos.length - 1];
  }
});

//fresh db after each test
test.beforeEach(async t => {
  const db = await createTestDb();
  t.context.db = db;
  t.context.helpers = createTodoHelpers(db);
});

test("getTodoById returns todo", async t => {
  const { helpers } = t.context;
  
  await helpers.createTodo({ 
    id: 1, 
    title: "testovaci todo", 
    completed: false, 
    priority: "normal" 
  });

  const todo = await helpers.getTodoById(1);
  t.is(todo.title, "testovaci todo");
});

test("getAllTodos returns all todos", async t => {
  const { helpers } = t.context;
  
  await helpers.createTodo({
    title: "Todo 1",
    priority: "low"
  });
  
  await helpers.createTodo({
    title: "Todo 2",
    priority: "high"
  });
  
  const todos = await helpers.getAllTodos();
  t.is(todos.length, 2);
  t.is(todos[0].title, "Todo 1");
  t.is(todos[1].title, "Todo 2");
});

test("createTodo adds a new todo", async t => {
  const { helpers } = t.context;
  
  const newTodo = await helpers.createTodo({
    title: "New Task",
    priority: "high"
  });
  
  t.truthy(newTodo.id);
  t.is(newTodo.title, "New Task");
  t.is(newTodo.priority, "high");
  t.false(newTodo.completed);
});

test("updateTodo changes todo properties", async t => {
  const { helpers } = t.context;
  
  const todo = await helpers.createTodo({
    id: 100,
    title: "Update test",
    completed: false,
    priority: "low"
  });
  
  const updatedTodo = await helpers.updateTodo(100, { 
    title: "Updated todo", 
    priority: "high" 
  });
  
  t.truthy(updatedTodo, "Updated todo should exist");
  t.is(updatedTodo.title, "Updated todo");
  t.is(updatedTodo.priority, "high");
  t.is(updatedTodo.completed, false);
});

test("updateTodo can toggle completion status", async t => {
  const { helpers } = t.context;
  

  await helpers.createTodo({
    id: 200,
    title: "Toggle test",
    completed: false,
    priority: "normal"
  });
  
  const toggledTodo = await helpers.updateTodo(200, { completed: true });
  t.truthy(toggledTodo, "Todo should exist after toggle");
  t.true(toggledTodo.completed);
  
  const untoggledTodo = await helpers.updateTodo(200, { completed: false });
  t.truthy(untoggledTodo, "Todo should exist after second toggle");
  t.false(untoggledTodo.completed);
});

test("deleteTodo removes todo", async t => {
  const { helpers } = t.context;
  
  await helpers.createTodo({
    id: 300,
    title: "Delete test",
    completed: false,
    priority: "normal"
  });
  
  let todo = await helpers.getTodoById(300);
  t.truthy(todo, "Todo should exist before deletion");
  
  const success = await helpers.deleteTodo(300);
  t.true(success, "Deletion should be successful");
  
  todo = await helpers.getTodoById(300);
  t.is(todo, undefined, "Todo should be deleted");
});

test("deleteTodo returns false when todo doesn't exist", async t => {
  const { helpers } = t.context;
  
  const success = await helpers.deleteTodo(999);
  t.false(success, "Deletion should fail for non-existent todo");
});

test("todos with different priorities can be created", async t => {
  const { helpers } = t.context;
  
  await helpers.createTodo({ title: "Low priority", priority: "low" });
  await helpers.createTodo({ title: "Normal priority", priority: "normal" });
  await helpers.createTodo({ title: "High priority", priority: "high" });
  
  const todos = await helpers.getAllTodos();
  
  t.is(todos.length, 3, "Should have 3 todos with different priorities");
  
  const lowCount = todos.filter(t => t.priority === "low").length;
  const normalCount = todos.filter(t => t.priority === "normal").length;
  const highCount = todos.filter(t => t.priority === "high").length;
  
  t.is(lowCount, 1, "Should have one low priority todo");
  t.is(normalCount, 1, "Should have one normal priority todo");
  t.is(highCount, 1, "Should have one high priority todo");
});
