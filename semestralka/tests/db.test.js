import test from "ava";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { messages, users, channels } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { createTestDb } from "../src/db/index.js";

// Helper functions for the semestralka DB
const createHelpers = (db) => ({
  getUserById: async (id) => {
    return await db.select().from(users).where(eq(users.id, id)).get();
  },
  getChannelById: async (id) => {
    return await db.select().from(channels).where(eq(channels.id, id)).get();
  },
  getAllChannels: async () => {
    return await db.select().from(channels).all();
  },
  createChannel: async (data) => {
    await db.insert(channels).values(data);
    const all = await db.select().from(channels).all();
    return all[all.length - 1];
  },
  getAllMessages: async () => {
    return await db.select().from(messages).all();
  },
  getMessageById: async (id) => {
    return await db.select().from(messages).where(eq(messages.id, id)).get();
  },
  createMessage: async (data) => {
    await db.insert(messages).values(data);
    const all = await db.select().from(messages).all();
    return all[all.length - 1];
  },
  updateMessage: async (id, data) => {
    await db.update(messages).set(data).where(eq(messages.id, id));
    return await db.select().from(messages).where(eq(messages.id, id)).get();
  },
  deleteMessage: async (id) => {
    const msg = await db.select().from(messages).where(eq(messages.id, id)).get();
    if (!msg) return false;
    await db.delete(messages).where(eq(messages.id, id));
    return true;
  }
});

test.beforeEach(async t => {
  const db = await createTestDb();
  // Always create a user with id: 1 for foreign key constraints
  await db.insert(users).values({
    id: 1,
    username: "testuser",
    password: "hashedpassword",
    createdAt: new Date()
  });
  t.context.db = db;
  t.context.helpers = createHelpers(db);
});

test("createChannel and getAllChannels", async t => {
  const { helpers } = t.context;
  await helpers.createChannel({ name: "general", description: "General chat", createdBy: 1 });
  const channels = await helpers.getAllChannels();
  t.is(channels.length, 1);
  t.is(channels[0].name, "general");
});

test("createMessage and getAllMessages", async t => {
  const { helpers } = t.context;
  await helpers.createChannel({ name: "random", description: "Random", createdBy: 1 });
  const channel = await helpers.getAllChannels();
  await helpers.createMessage({ content: "Hello!", channelId: channel[0].id, userId: 1, createdAt: new Date() });
  const messages = await helpers.getAllMessages();
  t.is(messages.length, 1);
  t.is(messages[0].content, "Hello!");
});

test("updateMessage changes message content", async t => {
  const { helpers } = t.context;
  await helpers.createChannel({ name: "edit", description: "Edit", createdBy: 1 });
  const channel = await helpers.getAllChannels();
  const msg = await helpers.createMessage({ content: "Old", channelId: channel[0].id, userId: 1, createdAt: new Date() });
  const updated = await helpers.updateMessage(msg.id, { content: "New" });
  t.is(updated.content, "New");
});

test("deleteMessage removes message", async t => {
  const { helpers } = t.context;
  await helpers.createChannel({ name: "delete", description: "Delete", createdBy: 1 });
  const channel = await helpers.getAllChannels();
  const msg = await helpers.createMessage({ content: "Bye", channelId: channel[0].id, userId: 1, createdAt: new Date() });
  let found = await helpers.getMessageById(msg.id);
  t.truthy(found);
  const success = await helpers.deleteMessage(msg.id);
  t.true(success);
  found = await helpers.getMessageById(msg.id);
  t.falsy(found);
});
