import { db } from '../db/index.js';
import { messages, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { broadcastMessageToChannel } from '../index.js';

export const messageController = {
  // Create a new message
  createMessage: async (c) => {
    try {
      const user = c.get('user');
      const { content, channelId } = await c.req.json();
      
      // Validate input
      if (!content || !channelId) {
        return c.json({ error: 'Content and channelId are required' }, 400);
      }
      
      // Insert the message
      const result = await db.insert(messages).values({
        content,
        channelId: Number(channelId),
        userId: user.id
      }).returning();
      
      const newMessage = result[0];
      
      // Get full user details for the response
      const messageWithUser = {
        ...newMessage,
        user: {
          id: user.id,
          username: user.username
        }
      };
      // Broadcast to WebSocket clients
      broadcastMessageToChannel(channelId, messageWithUser);
      return c.json(messageWithUser, 201);
    } catch (error) {
      console.error('Error creating message:', error);
      return c.json({ error: 'Failed to create message' }, 500);
    }
  },
  
  // Get messages for a channel
  getMessages: async (c) => {
    try {
      const channelId = c.req.param('channelId');
      
      // Get messages with user info
      const channelMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          channelId: messages.channelId,
          userId: messages.userId,
          createdAt: messages.createdAt,
          username: users.username
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.channelId, Number(channelId)))
        .orderBy(desc(messages.createdAt))
        .limit(100);
      
      // Format the messages for the client
      const formattedMessages = channelMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        channelId: msg.channelId,
        createdAt: msg.createdAt,
        user: {
          id: msg.userId,
          username: msg.username
        }
      }));
      
      return c.json(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return c.json({ error: 'Failed to fetch messages' }, 500);
    }
  }
};
