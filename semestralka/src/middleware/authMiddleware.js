import { db } from '../db/index.js';
import { users, channels } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { parse } from 'cookie';

// Middleware to populate user if logged in
export const populateUser = async (c, next) => {
  try {
    const cookies = c.req.header('cookie') ? parse(c.req.header('cookie')) : {};
    const userIdStr = cookies.userId;
    
    if (userIdStr) {
      const userId = parseInt(userIdStr, 10);
      
      if (!isNaN(userId)) {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        
        if (user && user.length > 0) {
          c.set('user', user[0]);
        }
      }
    }
  } catch (error) {
    console.error('Error populating user:', error);
  }
  
  await next();
};

// Middleware to check if user is logged in
export const requireAuth = async (c, next) => {
  const user = c.get('user');
  
  if (!user) {
    return c.redirect('/login');
  }
  
  await next();
};

// Middleware to redirect authenticated users away from auth pages
export const guestOnly = async (c, next) => {
  const user = c.get('user');
  
  if (user) {
    try {
      const firstChannel = await db.select().from(channels).limit(1);
      if (firstChannel && firstChannel.length > 0) {
        return c.redirect(`/channels/${firstChannel[0].id}`);
      } else {
        return c.redirect('/channels/new');
      }
    } catch (error) {
      console.error('Error finding first channel:', error);
      return c.redirect('/');
    }
  }
  
  await next();
};
