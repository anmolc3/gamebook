import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { connectDatabase, prisma } from './database/prisma';
import { initializeSockets } from './sockets/socket.server';
import authRoutes from './auth/auth.routes';
import profileRoutes from './profiles/profile.routes';
import friendsRoutes from './friends/friends.routes';
import chatRoutes from './chat/chat.routes';
import roomRoutes from './rooms/room.routes';
import gameRoutes from './games/game.routes';
import storiesRoutes from './stories/stories.routes';
import achievementsRoutes from './achievements/achievements.routes';
import notificationsRoutes from './notifications/notifications.routes';
import feedRoutes from './feeds/feed.routes';

const app = express();
const server = http.createServer(app);

// Global Middleware
app.use(cors({ origin: ENV.CORS_ORIGIN }));
app.use(express.json());

// Base Healthcheck Endpoint
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  res.status(200).json({
    status: 'ok',
    service: 'Social Multiplayer Gaming API',
    environment: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// Mount Feature API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/friends', friendsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/games', gameRoutes);
app.use('/api/v1/stories', storiesRoutes);
app.use('/api/v1/achievements', achievementsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/feeds', feedRoutes);

// Root API Welcome Endpoint
app.get('/api/v1', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the Social Multiplayer Gaming Platform API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      profiles: '/api/v1/profiles',
      friends: '/api/v1/friends',
      chat: '/api/v1/conversations',
      rooms: '/api/v1/rooms',
      games: '/api/v1/games',
      stories: '/api/v1/stories',
    },
  });
});

async function bootstrap() {
  console.log('🚀 Starting Social Multiplayer Gaming Platform Server...');
  
  // 1. Connect Database
  await connectDatabase();

  // 2. Initialize Real-Time WebSockets
  initializeSockets(server);

  // 3. Start Listening
  server.listen(ENV.PORT, () => {
    console.log(`🌐 Server listening on http://localhost:${ENV.PORT}`);
    console.log(`📡 Healthcheck available at http://localhost:${ENV.PORT}/health`);
  });
}

bootstrap().catch((err) => {
  console.error('💥 Fatal bootstrap error:', err);
  process.exit(1);
});

export { app, server };
