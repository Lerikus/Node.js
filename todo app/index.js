import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderFile } from "ejs";
import { drizzle } from "drizzle-orm/libsql";
import { todosTable } from "./src/schema.js";
import { eq } from "drizzle-orm";

// Array of todos
const db = drizzle({
    connection: "file:db.sqlite",
    logger: true,
});

const app = new Hono();

app.use(logger());
app.use(serveStatic({ root: "public" }));

// New route for home page
app.get("/", async(c) => {
    const todos = await db.select().from(todosTable).all();

    const index = await renderFile("views/index.html", { 
        title: "Todo App", 
        todos,
    });
    return c.html(index);
});

// New route for single todo detail view
app.get("/todo/:id", async(c) => {
    const id = Number(c.req.param("id"));
    const todo = await getTodoById(id);
    
    if (!todo) return c.notFound();
    
    const rendered = await renderFile("views/detail.html", { todo });
    return c.html(rendered);
});

// New route for creating a new todo
app.post("/todos", async(c) => {
    const data = await c.req.formData();

    await db.insert(todosTable).values({
        title: data.get("title"),
        completed: false,
    });

    data.get("title");
    return c.redirect("/");
});

// New route for updating a todo's title
app.post("/todos/:id/update", async(c) => {
    const id = Number(c.req.param("id"));
    const data = await c.req.formData();
    const newTitle = data.get("title");
    
    const todo = await getTodoById(id);
    
    if (!todo) return c.notFound();
    
    await db
    .update(todosTable)
    .set({ title: newTitle })
    .where(eq(todosTable.id, id));
    
    return c.redirect(c.req.header("Referer"));
});

// New route for toggling a todo's completed status
app.get("/todos/:id/toggle", async (c) => {
    const id = Number(c.req.param("id"));
    
    const todo = await getTodoById(id);
    
    if (!todo) return c.notFound();
    
    await db
        .update(todosTable)
        .set({ completed: !todo.completed })
        .where(eq(todosTable.id, id));
    
    return c.redirect(c.req.header("Referer"));
});

// New route for removing a todo
app.get("/todos/:id/remove", async (c) => {
    const id = Number(c.req.param("id"));
    
    const todo = await getTodoById(id);
    
    if (!todo) return c.notFound();
    
    await db
        .delete(todosTable)
        .where(eq(todosTable.id, id));
    
    return c.redirect(c.req.header("Referer"));
});

// Start the server
serve(app, (info) => {
  console.log("App is running on http://localhost:" + info.port);
});

const getTodoById = async (id) => {
    const todo = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .get();
    
    return todo;
}