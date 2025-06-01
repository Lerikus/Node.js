import { db } from '../db/index.js';
import { users, channels } from '../db/schema.js';
import { hashPassword } from './auth.js';

async function seed() {
  console.log('Seeding database...');
  
  // Create admin user
  const [adminUser] = await db.insert(users).values({
    username: 'admin',
    password: hashPassword('admin123'),
  }).returning();
  
  console.log('Created admin user:', adminUser);
  
  // Create some channels
  const channelsToCreate = [
    { name: 'general', description: 'General discussion', createdBy: adminUser.id },
    { name: 'random', description: 'Random stuff', createdBy: adminUser.id },
    { name: 'help', description: 'Get help with anything', createdBy: adminUser.id }
  ];
  
  for (const channelData of channelsToCreate) {
    const [channel] = await db.insert(channels).values(channelData).returning();
    console.log(`Created channel: ${channel.name}`);
  }
  
  console.log('Database seeded successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
