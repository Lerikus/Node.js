import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { renderer } from './utils/renderer.js';
import { homeController } from './controllers/homeController.js';
import { authController } from './controllers/authController.js';
import { channelController } from './controllers/channelController.js';
import { messageController } from './controllers/messageController.js';
import { requireAuth, populateUser, guestOnly } from './middleware/authMiddleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = new Hono();

// Set up static file handling
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

app.get('/static/*', async (c) => {
  const filePath = c.req.path.replace('/static/', '');
  const fullPath = path.join(publicDir, filePath);
  
  try {
    if (!fs.existsSync(fullPath)) {
      return c.notFound();
    }
    
    const content = await fs.promises.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    
    // Set appropriate content-type
    let contentType = 'text/plain';
    if (ext === '.css') contentType = 'text/css';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.header('Content-Type', contentType);
    return c.body(content);
  } catch (err) {
    return c.notFound();
  }
});

// Set up rendering middleware
app.use('*', renderer);

// Middleware to populate user for all routes
app.use('*', populateUser);

// Auth routes
app.get('/login', guestOnly, authController.loginPage);
app.post('/login', guestOnly, authController.login);
app.get('/register', guestOnly, authController.registerPage);
app.post('/register', guestOnly, authController.register);
app.get('/logout', authController.logout);

// Public routes
app.get('/', homeController.home);

// Protected routes - Channels
app.get('/channels', requireAuth, channelController.listChannels);
app.get('/channels/new', requireAuth, channelController.newChannel);
app.post('/channels', requireAuth, channelController.createChannel);
app.get('/channels/:id', requireAuth, channelController.showChannel);
app.get('/channels/:id/edit', requireAuth, channelController.editChannel);
app.post('/channels/:id/update', requireAuth, channelController.updateChannel);
app.post('/channels/:id/delete', requireAuth, channelController.deleteChannel);

// Protected routes - Messages API
app.post('/api/messages', requireAuth, messageController.createMessage);
app.get('/api/messages/:channelId', requireAuth, messageController.getMessages);

// 404 handler
app.notFound((c) => {
  return c.text('<h1>404 Not Found</h1>', 404, {
    'Content-Type': 'text/html; charset=utf-8'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
serve({
  port: PORT,
  fetch: app.fetch
}, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
