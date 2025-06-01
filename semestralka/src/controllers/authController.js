import { db } from '../db/index.js';
import { users, channels } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, createSession, deleteSession } from '../utils/auth.js';

export const authController = {
  // Show login form
  loginPage: async (c) => {
    return c.render('auth/login');
  },
  
  // Process login form
  login: async (c) => {
    try {
      const { username, password } = await c.req.parseBody();
      
      // Find user
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      
      if (result.length === 0) {
        return c.render('auth/login', { error: 'Invalid username or password' });
      }
      
      const user = result[0];
      
      // Verify password
      if (!verifyPassword(password, user.password)) {
        return c.render('auth/login', { error: 'Invalid username or password' });
      }
      
      // Create session
      const sessionId = await createSession(user.id);
      
      // Set cookie
      c.cookie('sessionId', sessionId, {
        httpOnly: true,
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: 'lax'
      });
      c.header('Set-Cookie', `userId=${user.id}; Path=/; HttpOnly`);
      
      // Fetch the first channel to redirect to
      const firstChannel = await db.select().from(channels).limit(1);
      
      // Redirect to first channel or fallback route
      if (firstChannel && firstChannel.length > 0) {
        return c.redirect(`/channels/${firstChannel[0].id}`);
      } else {
        return c.redirect('/channels');
      }
    } catch (error) {
      return c.render('auth/login', { error: 'An error occurred during login' });
    }
  },
  
  // Show registration form
  registerPage: async (c) => {
    return c.render('auth/register');
  },
  
  // Process registration form
  register: async (c) => {
    try {
      const { username, password, confirmPassword } = await c.req.parseBody();
      
      // Validate inputs
      if (!username || !password) {
        return c.render('auth/register', { error: 'Username and password are required' });
      }
      
      if (password !== confirmPassword) {
        return c.render('auth/register', { error: 'Passwords do not match' });
      }
      
      // Check if username already exists
      const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
      
      if (existingUser.length > 0) {
        return c.render('auth/register', { error: 'Username already exists' });
      }
      
      // Create user
      const hashedPassword = hashPassword(password);
      const newUser = await db.insert(users).values({
        username,
        password: hashedPassword
      }).returning();
      
      // Set cookie with user ID
      c.header('Set-Cookie', `userId=${newUser.id}; Path=/; HttpOnly`);
      
      // Fetch the first channel to redirect to
      const firstChannel = await db.select().from(channels).limit(1);
      
      // Redirect to first channel or fallback route
      if (firstChannel && firstChannel.length > 0) {
        return c.redirect(`/channels/${firstChannel[0].id}`);
      } else {
        return c.redirect('/channels');
      }
    } catch (error) {
      return c.render('auth/register', { error: 'An error occurred during registration' });
    }
  },
  
  // Logout
  logout: async (c) => {
    const sessionId = c.req.cookie('sessionId');
    
    if (sessionId) {
      await deleteSession(sessionId);
      c.cookie('sessionId', '', { maxAge: 0, path: '/' });
    }

    c.cookie('userId', '', { maxAge: 0, path: '/' });
    
    return c.redirect('/login');
  }
};
