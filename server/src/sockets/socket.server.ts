import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthenticatedUser } from '../middleware/auth.middleware';
import { prisma } from '../database/prisma';
import { MatchManager } from '../games/match.manager';

export let io: SocketIOServer;

// Map tracking active socket connections per user for multi-tab/device presence
const activeUserSockets = new Map<string, Set<string>>();

// Tracking active game room per user for reconnection handling
const userActiveRoom = new Map<string, string>(); // userId -> roomCode
const disconnectGraceTimers = new Map<string, NodeJS.Timeout>(); // `${userId}:${roomCode}` -> timer

// Security Rate Limiter: socketId -> action timestamps (sliding window)
const socketActionTimestamps = new Map<string, number[]>();

export function checkActionRateLimit(socketId: string, maxPerSecond = 10): boolean {
  const now = Date.now();
  let timestamps = socketActionTimestamps.get(socketId) || [];
  timestamps = timestamps.filter((t) => now - t < 1000);
  if (timestamps.length >= maxPerSecond) {
    socketActionTimestamps.set(socketId, timestamps);
    return false;
  }
  timestamps.push(now);
  socketActionTimestamps.set(socketId, timestamps);
  return true;
}

export function clearSocketRateLimit(socketId: string): void {
  socketActionTimestamps.delete(socketId);
}

export function isUserOnline(userId: string): boolean {
  const sockets = activeUserSockets.get(userId);
  return !!sockets && sockets.size > 0;
}

export function emitToUser(userId: string, event: string, payload: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

export function emitToConversation(conversationId: string, event: string, payload: any): void {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, payload);
  }
}

export function emitToRoom(roomCode: string, event: string, payload: any): void {
  if (io) {
    io.to(`room:${roomCode.toUpperCase()}`).emit(event, payload);
  }
}

async function notifyFriendsPresence(userId: string, isOnline: boolean, lastSeen: Date) {
  try {
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });

    for (const item of friendships) {
      emitToUser(item.friendId, 'presence:update', {
        userId,
        isOnline,
        lastSeen: lastSeen.toISOString(),
      });
    }
  } catch (err) {
    console.error('Failed to broadcast presence update to friends:', err);
  }
}

export function initializeSockets(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: ENV.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  // Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
        socket.data.user = decoded;
        socket.data.userId = decoded.userId;
      } catch (err) {
        console.log(`⚠️ [Socket.IO] Invalid token on handshake: ${socket.id}`);
      }
    }
    // Allow anonymous diagnostics connection, but tag authenticated sockets
    next();
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    const username = socket.data.user?.username;

    if (userId) {
      console.log(`🔌 [Socket.IO] Authenticated client connected: ${username} (${userId}) - socket: ${socket.id}`);
      // Join personal room for targeted alerts & direct invites
      socket.join(`user:${userId}`);

      // Track active sockets
      let userSockets = activeUserSockets.get(userId);
      const isFirstConnection = !userSockets || userSockets.size === 0;
      if (!userSockets) {
        userSockets = new Set();
        activeUserSockets.set(userId, userSockets);
      }
      userSockets.add(socket.id);

      if (isFirstConnection) {
        const now = new Date();
        await prisma.profile.updateMany({
          where: { userId },
          data: { isOnline: true, lastSeen: now },
        }).catch(() => null);

        notifyFriendsPresence(userId, true, now);
      }
    } else {
      console.log(`🔌 [Socket.IO] Anonymous client connected: ${socket.id}`);
    }

    socket.emit('connection:established', {
      socketId: socket.id,
      authenticated: !!userId,
      user: socket.data.user || null,
      timestamp: new Date().toISOString(),
      message: 'Connected to Social Gaming Realtime Gateway',
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Real-Time Chat Room Subscriptions & Typing Indicators
    socket.on('chat:join', (data: { conversationId: string }, cb?: any) => {
      if (data?.conversationId) {
        socket.join(`conversation:${data.conversationId}`);
        if (typeof cb === 'function') cb({ joined: true });
      }
    });

    socket.on('chat:leave', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.leave(`conversation:${data.conversationId}`);
      }
    });

    socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (userId && data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('chat:user_typing', {
          conversationId: data.conversationId,
          userId,
          username,
          isTyping: !!data.isTyping,
        });
      }
    });

    // Multiplayer Game Room Subscriptions & Lobby Synchronizations
    socket.on('room:join', (data: { roomCode: string }, cb?: any) => {
      if (data?.roomCode) {
        const code = data.roomCode.trim().toUpperCase();
        socket.join(`room:${code}`);

        if (userId) {
          userActiveRoom.set(userId, code);
          // If a disconnect grace countdown was pending for this user in this room, cancel it!
          const timerKey = `${userId}:${code}`;
          const pendingTimer = disconnectGraceTimers.get(timerKey);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            disconnectGraceTimers.delete(timerKey);
            emitToRoom(code, 'room:player_reconnected', {
              userId,
              username,
              roomCode: code,
              timestamp: new Date().toISOString(),
            });
            MatchManager.handlePlayerReconnect(code, userId);
          }
        }

        if (typeof cb === 'function') cb({ joined: true, roomCode: code });
      }
    });

    socket.on('room:leave', (data: { roomCode: string }) => {
      if (data?.roomCode) {
        const code = data.roomCode.trim().toUpperCase();
        socket.leave(`room:${code}`);

        if (userId && userActiveRoom.get(userId) === code) {
          userActiveRoom.delete(userId);
          const timerKey = `${userId}:${code}`;
          const pendingTimer = disconnectGraceTimers.get(timerKey);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            disconnectGraceTimers.delete(timerKey);
          }
        }
      }
    });

    // ------------------------------------------------------------------------
    // Real-Time Solo / AI Opponent Mode Events
    // ------------------------------------------------------------------------

    socket.on('solo:start', (data: { gameType: string; difficulty?: any; botId?: string }, cb?: any) => {
      if (!userId) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized' });
        return;
      }
      try {
        const { SoloManager } = require('../ai/solo.manager');
        const session = SoloManager.startSoloSession(
          userId,
          username || 'Player',
          data.gameType as any,
          data.difficulty || 'MEDIUM',
          data.botId
        );
        socket.join(`room:${session.roomCode}`);

        const payload = {
          success: true,
          roomCode: session.roomCode,
          matchId: session.match.matchId,
          gameType: session.match.gameType,
          players: session.match.players,
          aiProfile: session.botProfile,
          state: session.match.state,
          round: session.match.round,
          scores: session.match.scores,
          sequenceNumber: session.match.sequenceNumber,
        };

        if (typeof cb === 'function') cb(payload);
        socket.emit('solo:started', payload);
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('solo:get_state', (cb?: any) => {
      if (!userId) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized' });
        return;
      }
      try {
        const { SoloManager } = require('../ai/solo.manager');
        const match = SoloManager.getActiveSession(userId);
        if (match) {
          socket.join(`room:${match.roomCode}`);
          if (typeof cb === 'function') {
            cb({
              success: true,
              roomCode: match.roomCode,
              matchId: match.matchId,
              gameType: match.gameType,
              players: match.players,
              state: match.state,
              round: match.round,
              scores: match.scores,
              sequenceNumber: match.sequenceNumber,
            });
          }
        } else {
          if (typeof cb === 'function') cb({ success: false, error: 'No active solo match' });
        }
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('solo:forfeit', async (cb?: any) => {
      if (!userId) return;
      try {
        const { SoloManager } = require('../ai/solo.manager');
        await SoloManager.forfeitSession(userId);
        if (typeof cb === 'function') cb({ success: true });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    // ------------------------------------------------------------------------
    // Real-Time Authoritative Game Events (Tic-Tac-Toe, etc.)
    // ------------------------------------------------------------------------

    socket.on('game:action', async (data: { roomCode: string; action: any }, cb?: any) => {
      if (!userId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }

      // Security: Rate limiting action flood protection
      if (!checkActionRateLimit(socket.id, 10)) {
        if (typeof cb === 'function') {
          cb({ success: false, error: 'Action rate limit exceeded: maximum 10 actions per second' });
        }
        return;
      }

      try {
        const result = await MatchManager.handleAction(data.roomCode, userId, data.action);
        if (typeof cb === 'function') cb(result);
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:rematch_request', (data: { roomCode: string }, cb?: any) => {
      if (!userId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }
      try {
        const result = MatchManager.requestRematch(data.roomCode, userId);
        if (typeof cb === 'function') cb({ success: true, ...result });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:rematch_response', (data: { roomCode: string; accept: boolean }, cb?: any) => {
      if (!userId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }
      try {
        const result = MatchManager.respondRematch(data.roomCode, userId, !!data.accept);
        if (typeof cb === 'function') cb({ success: true, ...result });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:forfeit', async (data: { roomCode: string }, cb?: any) => {
      if (!userId || !data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Unauthorized or missing room code' });
        return;
      }
      try {
        await MatchManager.handleForfeit(data.roomCode, userId);
        if (typeof cb === 'function') cb({ success: true });
      } catch (err: any) {
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('game:get_state', (data: { roomCode: string }, cb?: any) => {
      if (!data?.roomCode) {
        if (typeof cb === 'function') cb({ success: false, error: 'Missing room code' });
        return;
      }
      const match = MatchManager.getMatch(data.roomCode);
      if (typeof cb === 'function') {
        if (match) {
          cb({
            success: true,
            sequenceNumber: match.sequenceNumber,
            state: match.state,
            round: match.round,
            scores: match.scores,
            players: match.players,
          });
        } else {
          cb({ success: false, error: 'No active match found in room' });
        }
      }
    });

    socket.on('disconnect', async (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);

      if (userId) {
        // Handle Multiplayer Room Disconnect Grace Window (30 seconds)
        const activeRoomCode = userActiveRoom.get(userId);
        if (activeRoomCode) {
          MatchManager.handlePlayerDisconnect(activeRoomCode, userId);

          const timerKey = `${userId}:${activeRoomCode}`;
          if (!disconnectGraceTimers.has(timerKey)) {
            emitToRoom(activeRoomCode, 'room:player_disconnected', {
              userId,
              username,
              roomCode: activeRoomCode,
              graceSeconds: 30,
              timestamp: new Date().toISOString(),
            });

            const graceTimer = setTimeout(async () => {
              disconnectGraceTimers.delete(timerKey);
              userActiveRoom.delete(userId);
              emitToRoom(activeRoomCode, 'room:player_abandoned', {
                userId,
                username,
                roomCode: activeRoomCode,
                timestamp: new Date().toISOString(),
              });
              await MatchManager.handleForfeit(activeRoomCode, userId);
            }, 30000);

            disconnectGraceTimers.set(timerKey, graceTimer);
          }
        }

        const userSockets = activeUserSockets.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            activeUserSockets.delete(userId);
            const now = new Date();
            await prisma.profile.updateMany({
              where: { userId },
              data: { isOnline: false, lastSeen: now },
            }).catch(() => null);

            notifyFriendsPresence(userId, false, now);
          }
        }
      }
    });
  });

  console.log('✅ Socket.IO Gateway initialized with Realtime Chat, Rooms & Presence support');
  return io;
}
