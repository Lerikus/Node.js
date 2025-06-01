import { db } from '../db/index.js';
import { channelMembers, channels, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// This script will add existing users to existing channels as members
async function migrateChannelMembers() {
  console.log('Starting migration: Adding channel members...');
  
  try {
    // Get all channels
    const allChannels = await db.select().from(channels);
    const allUsers = await db.select().from(users);
    
    console.log(`Found ${allChannels.length} channels and ${allUsers.length} users`);
    
    // For each channel, make the creator an admin
    for (const channel of allChannels) {
      console.log(`Processing channel: ${channel.name}`);
      
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
        console.log(`Added creator (ID: ${channel.createdBy}) as admin to channel: ${channel.name}`);
      } else {
        console.log(`Creator already a member of channel: ${channel.name}`);
      }
      
      // For "general" channel, add all users
      if (channel.name === 'general') {
        console.log('Adding all users to general channel...');
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
            console.log(`Added user ${user.username} to general channel`);
          }
        }
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run the migration
migrateChannelMembers();
