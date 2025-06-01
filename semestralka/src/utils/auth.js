import crypto from 'crypto';
import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Generate a random session ID
export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash a password with a salt
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify a password against a hash
export function verifyPassword(password, hashedPassword) {
  const [salt, hash] = hashedPassword.split(':');
  const calculatedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === calculatedHash;
}

// Create a new session for a user
export async function createSession(userId) {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days
  
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt
  });
  
  return sessionId;
}

// Validate a session
export async function validateSession(sessionId) {
  if (!sessionId) return null;
  
  const session = await db.select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  
  if (session.length === 0) return null;
  
  const { userId, expiresAt } = session[0];
  
  // Check if session has expired
  if (new Date(expiresAt) < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }
  
  // Get user data
  const user = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (user.length === 0) return null;
  
  return { user: user[0], sessionId };
}

// Delete a session
export async function deleteSession(sessionId) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
