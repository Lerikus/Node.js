import { db } from '../db/index.js';
import { users, channels, messages, sessions, channelMembers } from '../db/schema.js';
import { hashPassword } from './auth.js';

async function seed() {
  if (process.env.NODE_ENV === 'test') {
    // Remove all data in correct order for FKs
    await db.delete(channelMembers);
    await db.delete(messages);
    await db.delete(sessions);
    await db.delete(channels);
    await db.delete(users);
    // Insert test user
    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      password: hashPassword('admin123'),
    }).returning();
    // Create a test channel
    const [testChannel] = await db.insert(channels).values({
      name: 'test',
      description: 'Test channel',
      createdBy: adminUser.id
    }).returning();
    // Add user as admin member of the channel
    await db.insert(channelMembers).values({
      channelId: testChannel.id,
      userId: adminUser.id,
      role: 'admin',
      joinedAt: new Date()
    });
    process.exit(0);
  }
  
  // Create admin user
  const [adminUser] = await db.insert(users).values({
    username: 'admin',
    password: hashPassword('admin123'),
  }).returning();
  
  // Create some channels
  const channelsToCreate = [
    { name: 'general', description: 'General discussion', createdBy: adminUser.id },
    { name: 'random', description: 'Random stuff', createdBy: adminUser.id },
    { name: 'help', description: 'Get help with anything', createdBy: adminUser.id }
  ];
  
  for (const channelData of channelsToCreate) {
    const [channel] = await db.insert(channels).values(channelData).returning();
  }
  
  process.exit(0);
}

seed().catch(err => {
  process.exit(1);
});
