import { db } from '../db/index.js';
import { channelMembers, channels, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// This script will add existing users to existing channels as members
async function migrateChannelMembers() {
  try {
    // Get all channels
    const allChannels = await db.select().from(channels);
    const allUsers = await db.select().from(users);
    
    // For each channel, make the creator an admin
    for (const channel of allChannels) {
      
      // Check if creator is already a member
      const existingMembership = await db.select()
        .from(channelMembers)
        .where(
          eq(channelMembers.channelId, channel.id),
          eq(channelMembers.userId, channel.createdBy)
        )
        .limit(1);
      
      if (existingMembership.length === 0) {
        // Add creator as admin
        await db.insert(channelMembers).values({
          channelId: channel.id,
          userId: channel.createdBy,
          role: 'admin',
          joinedAt: channel.createdAt
        });
      } 
      
      // For "general" channel, add all users
      if (channel.name === 'general') {
        for (const user of allUsers) {
          // Skip if user is already the creator (we just added them)
          if (user.id === channel.createdBy) continue;
          
          // Check if user is already a member
          const existingMembership = await db.select()
            .from(channelMembers)
            .where(
              eq(channelMembers.channelId, channel.id),
              eq(channelMembers.userId, user.id)
            )
            .limit(1);
          
          if (existingMembership.length === 0) {
            // Add user as regular member
            await db.insert(channelMembers).values({
              channelId: channel.id,
              userId: user.id,
              role: 'member'
            });
          }
        }
      }
    }
    
  } catch (error) {
    // Handle error appropriately
  }
}

// Run the migration
migrateChannelMembers();
