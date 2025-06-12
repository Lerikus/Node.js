import { db } from '../db/index.js';
import { channels } from '../db/schema.js';

export const homeController = {
  // Redirect to first channel if logged in, otherwise show home page
  home: async (c) => {
    const user = c.get('user');
    
    if (user) {
      try {
        // Find the first channel
        const firstChannel = await db.select().from(channels).limit(1);
        
        if (firstChannel && firstChannel.length > 0) {
          return c.redirect(`/channels/${firstChannel[0].id}`);
        } else {
          return c.redirect('/channels/new');
        }
      } catch (error) {
      }
    }
    
    // Show home page for guests
    return c.render('home', { title: 'Clask- Home' });
  }
};
