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
import { WebSocketServer } from 'ws';

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
const server = serve({
  port: PORT,
  fetch: app.fetch
});

// --- WebSocket setup ---
const wss = new WebSocketServer({ server });

// Map of channelId to Set of WebSocket connections
const channelClients = new Map();

wss.on('connection', (ws, req) => {
  // Parse channelId from query string
  const url = new URL(req.url, `http://${req.headers.host}`);
  const channelId = url.searchParams.get('channelId');
  if (!channelId) {
    ws.close();
    return;
  }
  if (!channelClients.has(channelId)) channelClients.set(channelId, new Set());
  channelClients.get(channelId).add(ws);

  ws.on('close', () => {
    channelClients.get(channelId)?.delete(ws);
  });
});

// Helper to broadcast to all clients in a channel
export function broadcastMessageToChannel(channelId, message) {
  const clients = channelClients.get(String(channelId));
  if (clients) {
    const data = JSON.stringify({ type: 'new_message', message });
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) ws.send(data);
    }
  }
}
