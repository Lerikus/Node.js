import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderFile } from "ejs";

// Array of todos
const todos = [
  { id: 1, title: "Learn JavaScript", completed: true },
  { id: 2, title: "Learn Node.js", completed: false },
  { id: 3, title: "Learn React", completed: false },
];

const app = new Hono();

app.use(logger());
app.use(serveStatic({ root: "public" }));

// New route for home page
app.get("/", async(c) => {
    const rendered = await renderFile("views/index.html", { 
        title: "Todo App", 
        todos,
    });
    return c.html(rendered);
});

// New route for single todo detail view
app.get("/todo/:id", async(c) => {
    const id = Number(c.req.param("id"));
    const todo = todos.find((todo) => todo.id === id);
    
    if (!todo) return c.notFound();
    
    const rendered = await renderFile("views/detail.html", { todo });
    return c.html(rendered);
});

// New route for creating a new todo
app.post("/todos", async(c) => {
    const data = await c.req.formData();

    todos.push({
        id: todos.length + 1,
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
    
    const todo = todos.find((todo) => todo.id === id);
    
    if (!todo) return c.notFound();
    
    todo.title = newTitle;
    
    return c.redirect(`/todo/${id}`);
});

// New route for toggling a todo's completed status
app.get("/todos/:id/toggle", async (c) => {
    const id = Number(c.req.param("id"));
    const returnTo = c.req.query("return_to");
    
    const todo = todos.find((todo) => todo.id === id);
    if(todo){
        todo.completed = !todo.completed;
    } else return c.notFound();
    
    // Redirect based on the return_to parameter
    if (returnTo === 'detail') {
        return c.redirect(`/todo/${id}`);
    } else {
        return c.redirect("/");
    }
});

// New route for removing a todo
app.get("/todos/:id/remove", async (c) => {
    const id = Number(c.req.param("id"))
  
    const index = todos.findIndex((todo) => todo.id === id)
  
    if (index === -1) return c.notFound()
  
    todos.splice(index, 1)
  
    return c.redirect("/")
  })


// Start the server
serve(app, (info) => {
  console.log("App is running on http://localhost:" + info.port);
});