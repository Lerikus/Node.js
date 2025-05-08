import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderFile } from "ejs";
import { createNodeWebSocket } from "@hono/node-ws";
import { WSContext } from "hono/ws";
import { 
  db, 
  getTodoById, 
  getAllTodos, 
  updateTodo, 
  deleteTodo, 
  createTodo 
} from "./db.js";

export { db, getTodoById, getAllTodos, updateTodo, deleteTodo, createTodo };

export const app = new Hono();

export const { injectWebSocket, upgradeWebSocket } =
  createNodeWebSocket({ app });

app.use(logger());
app.use(serveStatic({ root: "public" }));

//new route for home page
app.get("/", async (c) => {
  const todos = await getAllTodos();

  const index = await renderFile("views/index.html", {
    title: "Todo App",
    todos,
  });
  return c.html(index);
});

//route for single todo detail view
app.get("/todo/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const todo = await getTodoById(id);
  
  if (!todo) return c.notFound();
  
  const rendered = await renderFile("views/detail.html", { 
    todo,
    priorities: ["low", "normal", "high"]
  });
  return c.html(rendered);
});

//route for creating new todo
app.post("/todos", async (c) => {
  const formData = await c.req.formData();
  
  const todoData = {
    title: formData.get("title"),
    completed: false,
    priority: formData.get("priority") || "normal",
  };
  
  await createTodo(todoData);
  sendTodosToAllConnections();

  return c.redirect("/");
});

//route for updating todo
app.post("/todos/:id/update", async (c) => {
  const id = Number(c.req.param("id"));
  const formData = await c.req.formData();
  
  const updateData = {
    title: formData.get("title"),
    priority: formData.get("priority")
  };
  
  const updatedTodo = await updateTodo(id, updateData);
  
  if (!updatedTodo) {
    return c.notFound();
  }
  
  sendTodosToAllConnections();
  sendTodoDetailToAllConnections(id);
  
  return c.redirect(`/todo/${id}`);
});

//route for toggling todos completed status
app.get("/todos/:id/toggle", async (c) => {
  const id = Number(c.req.param("id"));
  
  const todo = await getTodoById(id);
  
  if (!todo) return c.notFound();
  
  await updateTodo(id, { completed: !todo.completed });
  
  sendTodosToAllConnections();
  sendTodoDetailToAllConnections(id);
  
  return c.redirect("/");
});

//route for removing todo
app.get("/todos/:id/remove", async (c) => {
  const id = Number(c.req.param("id"));
  
  const success = await deleteTodo(id);
  
  if (!success) return c.notFound();
  
  sendTodosToAllConnections();
  sendTodoDeletedToAllConnections(id);
  
  const referer = c.req.header("Referer") || "/";
  if (referer.includes("/todo/")) {
    return c.redirect("/");
  }
  return c.redirect(referer);
});

/** @type{Set<WSContext<WebSocket>>} */
const connections = new Set();

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    console.log(c.req.path);

    return {
      onOpen: (ev, ws) => {
        connections.add(ws);
        console.log("onOpen");
      },
      onClose: (evt, ws) => {
        connections.delete(ws);
        console.log("onClose");
      },
      onMessage: (evt, ws) => {
        console.log("onMessage", evt.data);
      },
    };
  })
);

const sendTodosToAllConnections = async () => {
  const todos = await getAllTodos();

  const rendered = await renderFile("views/_todos.html", {
    todos,
  });

  for (const connection of connections.values()) {
    const data = JSON.stringify({
      type: "todos",
      html: rendered,
    });

    connection.send(data);
  }
};

const sendTodoDetailToAllConnections = async (id) => {
  const todo = await getTodoById(id);

  const rendered = await renderFile("views/_todo.html", {
    todo,
    priorities: ["low", "normal", "high"]
  });

  for (const connection of connections.values()) {
    const data = JSON.stringify({
      type: "todo",
      id,
      html: rendered,
    });

    connection.send(data);
  }
};

const sendTodoDeletedToAllConnections = async (id) => {
  for (const connection of connections.values()) {
    const data = JSON.stringify({
      type: "todoDeleted",
      id,
    });

    connection.send(data);
  }
};
