import { db } from '../db/index.js';
import { messages, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { broadcastMessageToChannel } from '../index.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Helper: save uploaded image and return its URL
async function saveImage(file) {
  if (!file || !file.filename) return null;
  const uploadsDir = path.resolve('public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const ext = path.extname(file.filename);
  const filename = uuidv4() + ext;
  const dest = path.join(uploadsDir, filename);
  await fs.promises.writeFile(dest, file.buffer);
  return `/uploads/${filename}`;
}

export const messageController = {
  // Create a new message (with optional image)
  createMessage: async (c) => {
    try {
      const user = c.get('user');
      let content, channelId, imageUrl = null;
      let file = null;
      if (c.req.headers['content-type'] && c.req.headers['content-type'].includes('multipart/form-data')) {
        const form = await c.req.parseBody();
        content = form.content;
        channelId = form.channelId;
        file = form.image;
      } else {
        const body = await c.req.json();
        content = body.content;
        channelId = body.channelId;
      }
      if (!content && !file) {
        return c.json({ error: 'Content or image required' }, 400);
      }
      if (!channelId) {
        return c.json({ error: 'channelId is required' }, 400);
      }
      if (file && file.buffer) {
        imageUrl = await saveImage(file);
      }
      // Insert the message (store content as-is)
      const result = await db.insert(messages).values({
        content: content || '',
        channelId: Number(channelId),
        userId: user.id,
        imageUrl
      }).returning();
      const newMessage = result[0];
      const messageWithUser = {
        ...newMessage,
        user: {
          id: user.id,
          username: user.username
        },
        imageUrl
      };
      broadcastMessageToChannel(channelId, messageWithUser);
      return c.json(messageWithUser, 201);
    } catch (error) {
      return c.json({ error: 'Failed to create message' }, 500);
    }
  },

  // Get messages for a channel
  getMessages: async (c) => {
    try {
      const channelId = c.req.param('channelId');
      const channelMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          channelId: messages.channelId,
          userId: messages.userId,
          createdAt: messages.createdAt,
          username: users.username,
          imageUrl: messages.imageUrl
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.channelId, Number(channelId)))
        .orderBy(desc(messages.createdAt))
        .limit(100);
      const formattedMessages = channelMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        channelId: msg.channelId,
        createdAt: msg.createdAt,
        user: {
          id: msg.userId,
          username: msg.username
        },
        imageUrl: msg.imageUrl
      }));
      return c.json(formattedMessages);
    } catch (error) {
      return c.json({ error: 'Failed to fetch messages' }, 500);
    }
  }
};
